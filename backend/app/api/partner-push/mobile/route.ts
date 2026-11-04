import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { partnerMobilePushDevices } from "@/db/schema";
import { authenticatedSession } from "@/lib/auth-request";
import { errorResponse, json } from "@/lib/api";
import { mayManageOrganization } from "@/lib/security/route-authorization";

export const dynamic = "force-dynamic";

function validExpoToken(value: string) {
  return /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(value);
}

export async function POST(request: Request) {
  const session = await authenticatedSession(request);
  if (!session || session.role !== "partner") return errorResponse("Partner required.", 401);
  const body = await request.json().catch(() => null);
  const organizationId = String(body?.organizationId || session.organizationId || "");
  const expoPushToken = String(body?.expoPushToken || "");
  const platform = String(body?.platform || "");
  if (!organizationId || !validExpoToken(expoPushToken) || !["ios", "android"].includes(platform)) {
    return errorResponse("Invalid mobile push registration.", 422);
  }
  if (!(await mayManageOrganization(session, organizationId))) return errorResponse("Organization not found.", 404);
  await getDb().insert(partnerMobilePushDevices).values({
    userId: session.userId,
    organizationId,
    expoPushToken,
    platform,
    deviceId: String(body?.deviceId || "").slice(0, 180) || null,
  }).onConflictDoUpdate({
    target: partnerMobilePushDevices.expoPushToken,
    set: { userId: session.userId, organizationId, platform, deviceId: String(body?.deviceId || "").slice(0, 180) || null, enabled: true, updatedAt: new Date() },
  });
  return json({ ok: true });
}

/**
 * Partner session: removes its own registration (standalone Partner app / mini app logout).
 * Any other signed-in session (the ZhaoXi host app, customer or guest): releases this device's own token from
 * every store, whoever registered it. The host calls this when its user signs out, switches account or stops
 * being a partner, because the partner session that registered the token lives inside the mini app.
 * Holding the token is the proof: Expo tokens are random, never listed by any API, and the only effect is that
 * this device stops receiving store alerts.
 */
export async function DELETE(request: Request) {
  const session = await authenticatedSession(request);
  if (!session) return errorResponse("Authentication required.", 401);
  const body = await request.json().catch(() => null);
  const expoPushToken = String(body?.expoPushToken || "");
  if (session.role !== "partner") {
    if (!validExpoToken(expoPushToken)) return errorResponse("Invalid mobile push registration.", 422);
    await getDb().delete(partnerMobilePushDevices).where(eq(partnerMobilePushDevices.expoPushToken, expoPushToken));
    return json({ ok: true });
  }
  if (expoPushToken) {
    await getDb().delete(partnerMobilePushDevices).where(and(
      eq(partnerMobilePushDevices.userId, session.userId),
      eq(partnerMobilePushDevices.expoPushToken, expoPushToken),
    ));
  }
  return json({ ok: true });
}
