import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizationMembers, organizations, partnerMobilePushDevices } from "@/db/schema";

// Which Expo tokens of `partner_mobile_push_devices` a store's push goes to. Shared by the new-order /
// payment alerts and the order-chat push, so both apply the same rules:
// - by user, not by the store the device registered under: a device rings for every store its user is an
//   active member of (an owner of 12 stores gets every store's orders whichever store the app has open);
//   the row's `organization_id` is only the store selected at registration time and is not used here;
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
      eq(organizationMembers.userId, partnerMobilePushDevices.userId),
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.isActive, true),
    ))
    .where(eq(partnerMobilePushDevices.enabled, true));
  return pickPartnerPushTargets(rows);
}

export type PartnerPushStore = { id: string; name: string };

/** Store an alert belongs to (its name goes into the title, its id into `data` so a tap switches store). */
export async function partnerPushStore(organizationId: string): Promise<PartnerPushStore> {
  const row = (await getDb().select({ name: organizations.name }).from(organizations).where(eq(organizations.id, organizationId)).limit(1))[0];
  return { id: organizationId, name: row?.name?.trim() || "" };
}

/** "🔔 Có đơn hàng mới" + "ZhaoXi Car Đà Nẵng" → "🔔 ZhaoXi Car Đà Nẵng · Có đơn hàng mới" (emoji stays first). */
export function storeAlertTitle(storeName: string, title: string) {
  if (!storeName) return title;
  const match = /^(\p{Extended_Pictographic}\uFE0F?)\s+(.*)$/u.exec(title);
  return match ? `${match[1]} ${storeName} · ${match[2]}` : `${storeName} · ${title}`;
}

/**
 * `data` of every partner Expo push. `screen`, `orderId`, `kind` are what the standalone Partner app always read;
 * `miniappId` routes a tap in the ZhaoXi host; `organizationId` / `organizationName` let both apps switch to the
 * order's store before opening it. Old apps ignore the extra fields.
 */
export function partnerPushData(store: PartnerPushStore, fields: { orderId: string; kind: string; screen: "orders" | "messages"; moduleCode?: string | null }) {
  return {
    ...fields,
    miniappId: PARTNER_PUSH_MINIAPP_ID,
    organizationId: store.id,
    organizationName: store.name || null,
  };
}
