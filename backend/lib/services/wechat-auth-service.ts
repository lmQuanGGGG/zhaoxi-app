import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import QRCode from "qrcode";
import { getDb } from "@/db";
import { organizationMembers, organizations, userRoles, users, wechatLoginSessions } from "@/db/schema";
import { normalizeAuthLocale, safeAuthReturnUrl, weChatConfiguration } from "@/lib/auth-input";

export type WeChatRole = "customer" | "partner" | "admin" | "driver";
export type WeChatLoginState = "waiting_scan" | "confirmed" | "expired" | "error";

export type WeChatClientSession = {
  id: string;
  role: WeChatRole;
  state: WeChatLoginState;
  expiresAt: string;
  qrSvg?: string;
  authUrl?: string;
  configured: boolean;
  errorCode?: string;
  exchangeCode?: string;
  exchangeExpiresAt?: string;
  session?: {
    role: WeChatRole;
    userId: string;
    displayName: string;
    phone?: string;
    avatarUrl?: string;
    organizationId?: string;
    organizationName?: string;
    organizationCode?: string;
    organizationType?: string;
    authMethod: "wechat";
  };
};

type WeChatTokenPayload = {
  access_token?: string;
  openid?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

type WeChatProfile = {
  openid: string;
  unionid?: string;
  nickname?: string;
  headimgurl?: string;
  errcode?: number;
  errmsg?: string;
};

function appId() { return process.env.WECHAT_OPEN_APP_ID?.trim() || ""; }
function appSecret() { return process.env.WECHAT_OPEN_APP_SECRET?.trim() || ""; }
function configured() { return weChatConfiguration().configured; }
function sessionTtlMs() { return 5 * 60 * 1000; }
function exchangeTtlMs() { return 90 * 1000; }
function exchangeHash(value:string){ return crypto.createHash("sha256").update(value).digest("hex"); }

function authorizeUrl(callbackUrl: string, state: string) {
  const params = new URLSearchParams({
    appid: appId(),
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "snsapi_login",
    state,
  });
  return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
}

async function findOrCreateUser(token: WeChatTokenPayload) {
  const db = getDb();
  const key = token.unionid || token.openid;
  if (!key || !token.openid) throw new Error("WECHAT_IDENTITY_MISSING");
  const existing = token.unionid
    ? (await db.select().from(users).where(eq(users.wechatUnionId, token.unionid)).limit(1))[0]
    : (await db.select().from(users).where(eq(users.wechatOpenId, token.openid)).limit(1))[0];

  let profile: WeChatProfile | null = null;
  if (token.access_token) {
    const url = new URL("https://api.weixin.qq.com/sns/userinfo");
    url.searchParams.set("access_token", token.access_token);
    url.searchParams.set("openid", token.openid);
    url.searchParams.set("lang", "zh_CN");
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const body = await response.json() as WeChatProfile;
    if (!body.errcode) profile = body;
  }

  if (existing) {
    if (existing.status !== "active") throw new Error("USER_DISABLED");
    const [updated] = await db.update(users).set({
      wechatOpenId: token.openid,
      wechatUnionId: token.unionid || existing.wechatUnionId,
      nickname: profile?.nickname || existing.nickname,
      avatarUrl: profile?.headimgurl || existing.avatarUrl,
      updatedAt: new Date(),
    }).where(eq(users.id, existing.id)).returning();
    return updated;
  }

  const [created] = await db.insert(users).values({
    wechatOpenId: token.openid,
    wechatUnionId: token.unionid,
    nickname: profile?.nickname || "WeChat User",
    avatarUrl: profile?.headimgurl,
    preferredLocale: "zh-CN",
    status: "active",
  }).returning();
  return created;
}

async function roleContext(userId: string, role: WeChatRole, openid: string) {
  const db = getDb();
  if (role === "customer") return { allowed: true as const };
  if (role === "partner") {
    const row = (await db.select({
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationCode: organizations.code,
      organizationType: organizations.type,
    }).from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.isActive, true), eq(organizations.status, "active")))
      .limit(1))[0];
    return row ? { allowed: true as const, ...row } : { allowed: false as const, errorCode: "PARTNER_NOT_LINKED" };
  }
  if (role === "driver") {
    const explicitDriver = (await db.select().from(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.role, "driver"), eq(userRoles.isActive, true))).limit(1))[0];
    const driverAllowlist = (process.env.ZHAOXI_DRIVER_WECHAT_OPENIDS || "").split(",").map((x) => x.trim()).filter(Boolean);
    return explicitDriver || driverAllowlist.includes(openid) ? { allowed: true as const } : { allowed: false as const, errorCode: "DRIVER_NOT_AUTHORIZED" };
  }
  const explicit = (await db.select().from(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.role, "admin"), eq(userRoles.isActive, true))).limit(1))[0];
  const allowlist = (process.env.ZHAOXI_ADMIN_WECHAT_OPENIDS || "").split(",").map((x) => x.trim()).filter(Boolean);
  return explicit || allowlist.includes(openid) ? { allowed: true as const } : { allowed: false as const, errorCode: "ADMIN_NOT_AUTHORIZED" };
}

export class WeChatAuthService {
  isConfigured() { return configured(); }

  async createQrSession(input: { role: WeChatRole; locale?: string; returnUrl?: string; callbackOrigin: string }): Promise<WeChatClientSession> {
    const db = getDb();
    const state = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + sessionTtlMs());
    const [row] = await db.insert(wechatLoginSessions).values({
      state,
      role: input.role,
      locale: normalizeAuthLocale(input.locale),
      returnUrl: safeAuthReturnUrl(input.returnUrl),
      status: configured() ? "waiting_scan" : "error",
      errorCode: configured() ? undefined : "WECHAT_NOT_CONFIGURED",
      expiresAt,
    }).returning();

    if (!configured()) return { id: row.id, role: input.role, state: "error", expiresAt: expiresAt.toISOString(), configured: false, errorCode: "WECHAT_NOT_CONFIGURED" };
    const callback = new URL("/api/auth/wechat/callback", input.callbackOrigin);
    const url = authorizeUrl(callback.toString(), state);
    const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, width: 232, errorCorrectionLevel: "M" });
    return { id: row.id, role: input.role, state: "waiting_scan", expiresAt: expiresAt.toISOString(), qrSvg, authUrl: url, configured: true };
  }

  async getQrSession(id: string): Promise<WeChatClientSession | null> {
    const db = getDb();
    const row = (await db.select().from(wechatLoginSessions).where(eq(wechatLoginSessions.id, id)).limit(1))[0];
    if (!row) return null;
    if (row.expiresAt.getTime() <= Date.now() && row.status === "waiting_scan") {
      await db.update(wechatLoginSessions).set({ status: "expired", updatedAt: new Date() }).where(eq(wechatLoginSessions.id, row.id));
      return { id: row.id, role: row.role as WeChatRole, state: "expired", expiresAt: row.expiresAt.toISOString(), configured: configured() };
    }
    if (row.status !== "confirmed" || !row.userId) {
      return { id: row.id, role: row.role as WeChatRole, state: row.status as WeChatLoginState, expiresAt: row.expiresAt.toISOString(), configured: configured(), errorCode: row.errorCode || undefined };
    }
    const user = (await db.select().from(users).where(eq(users.id, row.userId)).limit(1))[0];
    if (!user) return { id: row.id, role: row.role as WeChatRole, state: "error", expiresAt: row.expiresAt.toISOString(), configured: configured(), errorCode: "USER_NOT_FOUND" };
    const org = row.organizationId ? (await db.select().from(organizations).where(eq(organizations.id, row.organizationId)).limit(1))[0] : undefined;
    const exchangeCode=crypto.randomBytes(36).toString("base64url");
    const exchangeExpiresAt=new Date(Date.now()+exchangeTtlMs());
    await db.update(wechatLoginSessions).set({exchangeCodeHash:exchangeHash(exchangeCode),exchangeExpiresAt,updatedAt:new Date()}).where(eq(wechatLoginSessions.id,row.id));
    return {
      id: row.id, role: row.role as WeChatRole, state: "confirmed", expiresAt: row.expiresAt.toISOString(), configured: configured(), exchangeCode, exchangeExpiresAt:exchangeExpiresAt.toISOString(),
      session: { role: row.role as WeChatRole, userId: user.id, displayName: user.nickname || "WeChat User", phone: user.phone || undefined, avatarUrl: user.avatarUrl || undefined, organizationId: org?.id, organizationName: org?.name, organizationCode: org?.code, organizationType: org?.type, authMethod: "wechat" },
    };
  }

  async consumeExchange(input:{sessionId:string;exchangeCode:string}) {
    const db=getDb();
    const row=(await db.select().from(wechatLoginSessions).where(eq(wechatLoginSessions.id,input.sessionId)).limit(1))[0];
    if(!row || row.status!=="confirmed" || !row.userId || !row.exchangeCodeHash || !row.exchangeExpiresAt) return {ok:false as const,errorCode:"EXCHANGE_NOT_READY"};
    if(row.exchangedAt || row.exchangeExpiresAt.getTime()<=Date.now()) return {ok:false as const,errorCode:"EXCHANGE_EXPIRED"};
    const a=Buffer.from(row.exchangeCodeHash); const b=Buffer.from(exchangeHash(input.exchangeCode));
    if(a.length!==b.length || !crypto.timingSafeEqual(a,b)) return {ok:false as const,errorCode:"EXCHANGE_INVALID"};
    const [claimed]=await db.update(wechatLoginSessions).set({exchangedAt:new Date(),exchangeCodeHash:null,updatedAt:new Date()}).where(and(
      eq(wechatLoginSessions.id,row.id),
      eq(wechatLoginSessions.exchangeCodeHash,row.exchangeCodeHash),
      isNull(wechatLoginSessions.exchangedAt),
    )).returning({id:wechatLoginSessions.id});
    if(!claimed) return {ok:false as const,errorCode:"EXCHANGE_INVALID"};
    return {ok:true as const,userId:row.userId,role:row.role as WeChatRole,organizationId:row.organizationId||undefined};
  }

  async confirmFromCallback(input: { code?: string; state?: string }) {
    if (!input.code || !input.state) return { ok: false as const, errorCode: "CALLBACK_MISSING_CODE" };
    if (!configured()) return { ok: false as const, errorCode: "WECHAT_NOT_CONFIGURED" };
    const db = getDb();
    const row = (await db.select().from(wechatLoginSessions).where(eq(wechatLoginSessions.state, input.state)).limit(1))[0];
    if (!row) return { ok: false as const, errorCode: "SESSION_NOT_FOUND" };
    if (row.status === "confirmed") return { ok: true as const, role: row.role as WeChatRole };
    if (row.status !== "waiting_scan") return { ok: false as const, errorCode: row.errorCode || "SESSION_NOT_ACTIVE" };
    if (row.expiresAt.getTime() <= Date.now()) {
      await db.update(wechatLoginSessions).set({ status: "expired", updatedAt: new Date() }).where(eq(wechatLoginSessions.id, row.id));
      return { ok: false as const, errorCode: "SESSION_EXPIRED" };
    }

    const tokenUrl = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
    tokenUrl.searchParams.set("appid", appId());
    tokenUrl.searchParams.set("secret", appSecret());
    tokenUrl.searchParams.set("code", input.code);
    tokenUrl.searchParams.set("grant_type", "authorization_code");
    const tokenResponse = await fetch(tokenUrl, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const token = await tokenResponse.json() as WeChatTokenPayload;
    if (!token.access_token || !token.openid || token.errcode) {
      await db.update(wechatLoginSessions).set({ status: "error", errorCode: `WECHAT_${token.errcode || "TOKEN_ERROR"}`, updatedAt: new Date() }).where(eq(wechatLoginSessions.id, row.id));
      return { ok: false as const, errorCode: "WECHAT_TOKEN_ERROR" };
    }

    let user;
    try { user = await findOrCreateUser(token); } catch (error) {
      const code=error instanceof Error?error.message:"WECHAT_USER_RESOLUTION_FAILED";
      await db.update(wechatLoginSessions).set({ status:"error", errorCode:code, updatedAt:new Date() }).where(eq(wechatLoginSessions.id,row.id));
      return { ok:false as const, errorCode:code };
    }
    const context = await roleContext(user.id, row.role as WeChatRole, token.openid);
    if (!context.allowed) {
      await db.update(wechatLoginSessions).set({ status: "error", errorCode: context.errorCode, userId: user.id, wechatOpenId: token.openid, wechatUnionId: token.unionid, updatedAt: new Date() }).where(eq(wechatLoginSessions.id, row.id));
      return { ok: false as const, errorCode: context.errorCode };
    }

    await db.update(wechatLoginSessions).set({
      status: "confirmed",
      userId: user.id,
      organizationId: "organizationId" in context ? context.organizationId : undefined,
      wechatOpenId: token.openid,
      wechatUnionId: token.unionid,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(wechatLoginSessions.id, row.id));
    return { ok: true as const, role: row.role as WeChatRole };
  }
}

export const wechatAuthService = new WeChatAuthService();
