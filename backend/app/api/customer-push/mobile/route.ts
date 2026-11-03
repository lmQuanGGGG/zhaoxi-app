import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { customerMobilePushDevices } from "@/db/schema";
import { authenticatedSession } from "@/lib/auth-request";
import { failure, success } from "@/lib/core/api-response";

export const dynamic = "force-dynamic";

const LOCALES = new Set(["vi-VN", "zh-CN", "zh-TW", "en-US"]);

function validExpoToken(value: string) {
  return /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(value);
}

/** Registers (or re-assigns) an Expo push token to the signed-in customer. */
export async function POST(request: Request) {
  const session = await authenticatedSession(request);
  if (!session || session.role !== "customer") return failure("Customer required.", 401, undefined, "CUSTOMER_AUTH_REQUIRED");
  const body = await request.json().catch(() => null);
  const expoPushToken = String(body?.expoPushToken || "");
  const platform = String(body?.platform || "");
  if (!validExpoToken(expoPushToken) || !["ios", "android"].includes(platform)) {
    return failure("Invalid mobile push registration.", 422, undefined, "PUSH_REGISTRATION_INVALID");
  }
  const locale = LOCALES.has(String(body?.locale)) ? String(body.locale) : null;
  const deviceId = String(body?.deviceId || "").slice(0, 180) || null;
  const promotionsEnabled = body?.promotionsEnabled !== false;
  await getDb().insert(customerMobilePushDevices).values({
    userId: session.userId, expoPushToken, platform, deviceId, locale, promotionsEnabled,
  }).onConflictDoUpdate({
    target: customerMobilePushDevices.expoPushToken,
    set: { userId: session.userId, platform, deviceId, locale, promotionsEnabled, enabled: true, updatedAt: new Date() },
  });
  return success({ registered: true });
}

export async function DELETE(request: Request) {
  const session = await authenticatedSession(request);
  if (!session || session.role !== "customer") return failure("Customer required.", 401, undefined, "CUSTOMER_AUTH_REQUIRED");
  const body = await request.json().catch(() => null);
  const expoPushToken = String(body?.expoPushToken || "");
  if (expoPushToken) {
    await getDb().delete(customerMobilePushDevices).where(and(
      eq(customerMobilePushDevices.userId, session.userId),
      eq(customerMobilePushDevices.expoPushToken, expoPushToken),
    ));
  }
  return success({ registered: false });
}
