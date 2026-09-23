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

export async function DELETE(request: Request) {
  const session = await authenticatedSession(request);
  if (!session || session.role !== "partner") return errorResponse("Partner required.", 401);
  const body = await request.json().catch(() => null);
  const expoPushToken = String(body?.expoPushToken || "");
  if (expoPushToken) {
    await getDb().delete(partnerMobilePushDevices).where(and(
      eq(partnerMobilePushDevices.userId, session.userId),
      eq(partnerMobilePushDevices.expoPushToken, expoPushToken),
    ));
  }
  return json({ ok: true });
}
