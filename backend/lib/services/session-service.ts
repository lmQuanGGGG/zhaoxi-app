import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { authSessions, organizations, users } from "@/db/schema";
import type { WeChatRole } from "@/lib/services/wechat-auth-service";

const ACCESS_TTL_MS = 15 * 60 * 1000;
const refreshDays: Record<WeChatRole, number> = { customer: 30, partner: 14, admin: 1, driver: 7 };
const DAY = 24 * 60 * 60 * 1000;

function token() { return crypto.randomBytes(48).toString("base64url"); }
export function hashAuthToken(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }

export type PublicAuthSession = {
  sessionId: string; role: WeChatRole; userId: string; displayName: string; phone?: string; avatarUrl?: string;
  organizationId?: string; organizationName?: string; organizationCode?: string; organizationType?: string;
  authMethod: "guest"|"wechat"|"otp"|"qr"|"internal"; accessExpiresAt: string; refreshExpiresAt: string;
};

type IssueInput = { userId:string; role:WeChatRole; organizationId?:string; deviceId?:string; deviceName?:string };

async function publicSession(row: typeof authSessions.$inferSelect): Promise<PublicAuthSession> {
  const db=getDb();
  const user=(await db.select().from(users).where(eq(users.id,row.userId)).limit(1))[0];
  if(!user) throw new Error("USER_NOT_FOUND");
  const org=row.organizationId ? (await db.select().from(organizations).where(eq(organizations.id,row.organizationId)).limit(1))[0] : undefined;
  return {
    sessionId:row.id, role:row.role as WeChatRole, userId:user.id, displayName:user.nickname||"WeChat User",
    phone:user.phone||undefined, avatarUrl:user.avatarUrl||undefined, organizationId:org?.id, organizationName:org?.name,
    organizationCode:org?.code, organizationType:org?.type, authMethod:user.isGuest?"guest":(row.role==="admin"||row.role==="driver"?"internal":((row.role==="customer"||row.role==="partner")&&user.wechatOpenId?"wechat":(row.role==="customer"||row.role==="partner")&&user.phone?"otp":"qr")),
    accessExpiresAt:row.accessExpiresAt.toISOString(), refreshExpiresAt:row.refreshExpiresAt.toISOString(),
  };
}

export class SessionService {
  async issue(input: IssueInput) {
    const db=getDb(); const accessToken=token(); const refreshToken=token(); const now=Date.now();
    const [row]=await db.insert(authSessions).values({
      userId:input.userId, role:input.role, organizationId:input.organizationId, accessTokenHash:hashAuthToken(accessToken),
      refreshTokenHash:hashAuthToken(refreshToken), deviceId:input.deviceId, deviceName:input.deviceName, status:"active",
      accessExpiresAt:new Date(now+ACCESS_TTL_MS), refreshExpiresAt:new Date(now+refreshDays[input.role]*DAY), lastSeenAt:new Date(),
    }).returning();
    return { accessToken, refreshToken, session:await publicSession(row) };
  }

  async authenticate(accessToken:string) {
    const db=getDb(); const row=(await db.select().from(authSessions).where(and(eq(authSessions.accessTokenHash,hashAuthToken(accessToken)),eq(authSessions.status,"active"))).limit(1))[0];
    if(!row || row.accessExpiresAt.getTime()<=Date.now() || row.refreshExpiresAt.getTime()<=Date.now()) return null;
    await db.update(authSessions).set({lastSeenAt:new Date(),updatedAt:new Date()}).where(eq(authSessions.id,row.id));
    return publicSession(row);
  }

  async refresh(refreshToken:string) {
    const db=getDb(); const row=(await db.select().from(authSessions).where(and(eq(authSessions.refreshTokenHash,hashAuthToken(refreshToken)),eq(authSessions.status,"active"))).limit(1))[0];
    if(!row || row.refreshExpiresAt.getTime()<=Date.now()) return null;
    const nextAccess=token(); const nextRefresh=token(); const now=Date.now();
    const [updated]=await db.update(authSessions).set({
      accessTokenHash:hashAuthToken(nextAccess), refreshTokenHash:hashAuthToken(nextRefresh), accessExpiresAt:new Date(now+ACCESS_TTL_MS),
      refreshExpiresAt:new Date(now+refreshDays[row.role as WeChatRole]*DAY), lastSeenAt:new Date(), updatedAt:new Date(),
    }).where(and(
      eq(authSessions.id,row.id),
      eq(authSessions.status,"active"),
      eq(authSessions.refreshTokenHash,hashAuthToken(refreshToken)),
    )).returning();
    if(!updated) return null;
    return {accessToken:nextAccess,refreshToken:nextRefresh,session:await publicSession(updated)};
  }

  async logout(refreshToken:string) {
    const db=getDb();
    await db.update(authSessions).set({status:"revoked",revokedAt:new Date(),updatedAt:new Date()}).where(eq(authSessions.refreshTokenHash,hashAuthToken(refreshToken)));
  }

  async logoutAll(userId:string) {
    const db=getDb(); await db.update(authSessions).set({status:"revoked",revokedAt:new Date(),updatedAt:new Date()}).where(and(eq(authSessions.userId,userId),eq(authSessions.status,"active")));
  }

  async listDevices(userId:string,currentSessionId?:string) {
    const db=getDb(); const rows=await db.select().from(authSessions).where(and(eq(authSessions.userId,userId),eq(authSessions.status,"active")));
    return rows.filter(x=>x.refreshExpiresAt.getTime()>Date.now()).map(x=>({sessionId:x.id,role:x.role,deviceId:x.deviceId||undefined,deviceName:x.deviceName||undefined,lastSeenAt:x.lastSeenAt.toISOString(),createdAt:x.createdAt.toISOString(),refreshExpiresAt:x.refreshExpiresAt.toISOString(),isCurrent:currentSessionId===x.id}));
  }

  async revokeDevice(userId:string,sessionId:string) {
    const db=getDb();
    const row=(await db.select().from(authSessions).where(and(eq(authSessions.id,sessionId),eq(authSessions.userId,userId),eq(authSessions.status,"active"))).limit(1))[0];
    if(!row) return {revoked:false as const,reason:"SESSION_NOT_FOUND" as const};
    await db.update(authSessions).set({status:"revoked",revokedAt:new Date(),updatedAt:new Date()}).where(and(eq(authSessions.id,sessionId),eq(authSessions.userId,userId)));
    return {revoked:true as const,sessionId};
  }
}
export const sessionService=new SessionService();
