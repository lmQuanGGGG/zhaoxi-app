import crypto from "node:crypto";
import QRCode from "qrcode";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { qrPairingSessions, userRoles, users } from "@/db/schema";
import { trustedDeviceService } from "@/lib/services/trusted-device-service";

type PublicRole = "customer" | "partner";
const QR_TTL_MS = 3 * 60 * 1000;
const EXCHANGE_TTL_MS = 60 * 1000;
const token = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

class QrPairingService {
  async create(i: { role: PublicRole; locale?: string; origin: string }) {
    const db = getDb();
    const secret = token();
    // The browser owns this code from creation time. It never appears in the QR URL.
    const exchangeCode = token(36);
    const expiresAt = new Date(Date.now() + QR_TTL_MS);
    const [row] = await db.insert(qrPairingSessions).values({
      secretHash: hash(secret), requestedRole: i.role, locale: i.locale || "zh-CN", expiresAt,
      exchangeCodeHash: hash(exchangeCode), exchangeExpiresAt: new Date(Date.now() + QR_TTL_MS + EXCHANGE_TTL_MS),
    }).returning();
    const u = new URL(`/api/auth/qr/scan/${row.id}`, i.origin);
    u.searchParams.set("s", secret);
    u.searchParams.set("locale", i.locale || "zh-CN");
    return {
      id: row.id, role: i.role, state: "waiting_scan", expiresAt: expiresAt.toISOString(), exchangeCode,
      qrSvg: await QRCode.toString(u.toString(), { type: "svg", margin: 1, width: 248, errorCorrectionLevel: "M" }),
      scanUrl: u.toString(), handoff: "zhaoxi_qr", wechatIdentityVerified: false,
    };
  }

  async get(id: string) {
    const db = getDb();
    const r = (await db.select().from(qrPairingSessions).where(eq(qrPairingSessions.id, id)).limit(1))[0];
    if (!r) return null;
    if (r.expiresAt.getTime() <= Date.now() && r.status === "waiting_scan") {
      await db.update(qrPairingSessions).set({ status: "expired", updatedAt: new Date() })
        .where(and(eq(qrPairingSessions.id, id), eq(qrPairingSessions.status, "waiting_scan")));
      return { id, role: r.requestedRole, state: "expired", expiresAt: r.expiresAt.toISOString() };
    }
    return { id, role: r.requestedRole, state: r.status, expiresAt: r.expiresAt.toISOString() };
  }

  async confirm(i: { id: string; secret: string; trustedDeviceToken?: string | null }) {
    const db = getDb();
    const r = (await db.select().from(qrPairingSessions).where(and(
      eq(qrPairingSessions.id, i.id), eq(qrPairingSessions.secretHash, hash(i.secret)), eq(qrPairingSessions.status, "waiting_scan"),
    )).limit(1))[0];
    if (!r || r.expiresAt.getTime() <= Date.now()) return { ok: false as const, errorCode: "QR_INVALID_OR_EXPIRED" };

    const role: PublicRole = r.requestedRole === "partner" ? "partner" : "customer";
    const known = await trustedDeviceService.resolve(i.trustedDeviceToken);
    let user = known?.user;
    let trustedToken: string | undefined;
    // A scanner proves possession of the QR only; it does not prove a privileged ZhaoXi identity.
    // Customer may bootstrap a guest identity. Partner pairing requires a previously trusted ZhaoXi
    // device whose user already owns an active partner role. Never mint partner privilege from a scan.
    if (role === "partner") {
      if (!user) return { ok: false as const, errorCode: "PARTNER_QR_REQUIRES_TRUSTED_IDENTITY" };
      const partnerRole = (await db.select().from(userRoles).where(and(
        eq(userRoles.userId, user.id), eq(userRoles.role, "partner"), eq(userRoles.isActive, true),
      )).limit(1))[0];
      if (!partnerRole) return { ok: false as const, errorCode: "PARTNER_QR_NOT_AUTHORIZED" };
    } else if (!user) {
      [user] = await db.insert(users).values({
        nickname: "ZhaoXi Guest", preferredLocale: r.locale, status: "active", isGuest: true,
        guestExpiresAt: trustedDeviceService.guestExpiresAt(),
      }).returning();
      trustedToken = (await trustedDeviceService.createForUser(user.id)).raw;
      await db.insert(userRoles).values({ userId: user.id, role: "customer", isActive: true }).onConflictDoNothing();
    }
    const updated = await db.update(qrPairingSessions).set({ status: "confirmed", userId: user.id, confirmedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(qrPairingSessions.id, r.id), eq(qrPairingSessions.status, "waiting_scan"))).returning({ id: qrPairingSessions.id });
    if (!updated.length) return { ok: false as const, errorCode: "QR_ALREADY_USED" };
    return { ok: true as const, role, userId: user.id, reusedIdentity: Boolean(known), trustedToken, wechatIdentityVerified: false };
  }

  async consume(i: { id: string; exchangeCode: string }) {
    const db = getDb();
    const r = (await db.select().from(qrPairingSessions).where(eq(qrPairingSessions.id, i.id)).limit(1))[0];
    if (!r || r.status !== "confirmed" || !r.userId || !r.exchangeCodeHash || !r.exchangeExpiresAt || r.exchangedAt ||
        r.exchangeExpiresAt.getTime() <= Date.now() || hash(i.exchangeCode) !== r.exchangeCodeHash) {
      return { ok: false as const, errorCode: "EXCHANGE_INVALID" };
    }
    const consumed = await db.update(qrPairingSessions).set({ exchangedAt: new Date(), exchangeCodeHash: null, updatedAt: new Date() })
      .where(and(eq(qrPairingSessions.id, r.id), eq(qrPairingSessions.status, "confirmed"), isNull(qrPairingSessions.exchangedAt), eq(qrPairingSessions.exchangeCodeHash, hash(i.exchangeCode))))
      .returning({ id: qrPairingSessions.id });
    if (!consumed.length) return { ok: false as const, errorCode: "EXCHANGE_ALREADY_USED" };
    return { ok: true as const, userId: r.userId, role: (r.requestedRole === "partner" ? "partner" : "customer") as PublicRole };
  }
}
export const qrPairingService = new QrPairingService();
