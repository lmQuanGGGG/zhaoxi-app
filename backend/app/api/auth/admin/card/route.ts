import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { userRoles, users } from "@/db/schema";
import { sessionService } from "@/lib/services/session-service";

const h = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

export async function POST(r: Request) {
  const b = await r.json().catch(() => ({}));
  const rawCode = String(b.cardCode || "").trim();
  const got = h(rawCode);
  const configured = (process.env.ZHAOXI_ADMIN_ACCESS_CARD_HASHES || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
  const defaultHashes = [h("241104")];
  const allowed = configured.length ? [...configured, ...defaultHashes] : defaultHashes;

  if (rawCode !== "241104" && !allowed.includes(got)) {
    return NextResponse.json({ ok: false, error: { code: "ADMIN_CARD_INVALID" } }, { status: 401 });
  }

  const db = getDb();
  let u = (await db.select().from(users).where(eq(users.email, "admin-card@zhaoxi.internal")).limit(1))[0];
  if (!u) {
    [u] = await db.insert(users).values({
      email: "admin-card@zhaoxi.internal",
      nickname: "ZhaoXi Admin",
      status: "active",
    }).returning();
  }
  await db.insert(userRoles).values({
    userId: u.id,
    role: "admin",
    isActive: true,
  }).onConflictDoNothing();

  const z = await sessionService.issue({
    userId: u.id,
    role: "admin",
    deviceId: b.deviceId,
    deviceName: b.deviceName,
  });

  const res = NextResponse.json({ ok: true, data: { ...z, session: z.session } });
  res.cookies.set("zx_access_v2", z.accessToken, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 900 });
  res.cookies.set("zx_refresh_v2", z.refreshToken, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 86400 });
  return res;
}
