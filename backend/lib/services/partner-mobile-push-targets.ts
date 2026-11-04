import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizationMembers, partnerMobilePushDevices } from "@/db/schema";

// Which Expo tokens of `partner_mobile_push_devices` a store's push goes to. Shared by the new-order /
// payment alerts and the order-chat push, so both apply the same rules:
// - only devices whose user is still an active member of the store (removed staff stop ringing even if
//   their app never unregistered);
// - one message per token;
// - one message per physical device: the standalone ZhaoXi Partner app and the ZhaoXi host app (mini
//   app `zhaoxi.partner`) each have their own token, but register the same `deviceId` (iOS identifierForVendor,
//   shared by apps of the same vendor). The registration refreshed last wins, i.e. the app the owner
//   opened most recently. Android ids differ per signing key, so there both apps still ring.

/** Mini app the host opens when a partner push is tapped. Old Partner apps ignore the extra field. */
export const PARTNER_PUSH_MINIAPP_ID = "zhaoxi.partner";

export type PartnerPushDeviceRow = { id: string; token: string; deviceId: string | null; updatedAt: Date };
export type PartnerPushTarget = { id: string; token: string };

/** Fallback ids an app writes when the OS gave none (`partner-ios`): not unique, never used to merge devices. */
const GENERIC_DEVICE_ID = /^(partner|ios|android)(-(ios|android))?$/i;

export function pickPartnerPushTargets(rows: readonly PartnerPushDeviceRow[]): PartnerPushTarget[] {
  const newestFirst = [...rows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const tokens = new Set<string>();
  const devices = new Set<string>();
  const picked: PartnerPushTarget[] = [];
  for (const row of newestFirst) {
    if (!row.token || tokens.has(row.token)) continue;
    const device = row.deviceId?.trim() || "";
    const deviceKey = device && !GENERIC_DEVICE_ID.test(device) ? device : "";
    if (deviceKey && devices.has(deviceKey)) continue;
    tokens.add(row.token);
    if (deviceKey) devices.add(deviceKey);
    picked.push({ id: row.id, token: row.token });
  }
  return picked;
}

export async function partnerMobilePushTargets(organizationId: string): Promise<PartnerPushTarget[]> {
  const rows = await getDb()
    .select({
      id: partnerMobilePushDevices.id,
      token: partnerMobilePushDevices.expoPushToken,
      deviceId: partnerMobilePushDevices.deviceId,
      updatedAt: partnerMobilePushDevices.updatedAt,
    })
    .from(partnerMobilePushDevices)
    .innerJoin(organizationMembers, and(
      eq(organizationMembers.organizationId, partnerMobilePushDevices.organizationId),
      eq(organizationMembers.userId, partnerMobilePushDevices.userId),
      eq(organizationMembers.isActive, true),
    ))
    .where(and(eq(partnerMobilePushDevices.organizationId, organizationId), eq(partnerMobilePushDevices.enabled, true)));
  return pickPartnerPushTargets(rows);
}
