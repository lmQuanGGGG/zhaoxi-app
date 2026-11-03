import webpush from "web-push";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { partnerMobilePushDevices, partnerPushSubscriptions } from "@/db/schema";

// Push for a new customer message in an order chat, to every device of the
// store: the partner mobile app (Expo) and the partner web (Web Push). Kept apart
// from the new-order alerts so a chat message never rings the loud order bell.

const publicKey = process.env.ZHAOXI_WEB_PUSH_PUBLIC_KEY;
const privateKey = process.env.ZHAOXI_WEB_PUSH_PRIVATE_KEY;
const webEnabled = Boolean(publicKey && privateKey);
if (webEnabled) webpush.setVapidDetails("mailto:admin@zhaoxi.vn", publicKey!, privateKey!);

type OrderMessagePush = { requestId: string; title: string; body: string };
type ExpoTicket = { status?: string; details?: { error?: string } };

async function sendMobile(organizationId: string, message: OrderMessagePush) {
  const db = getDb();
  const devices = await db
    .select({ id: partnerMobilePushDevices.id, token: partnerMobilePushDevices.expoPushToken })
    .from(partnerMobilePushDevices)
    .where(and(eq(partnerMobilePushDevices.organizationId, organizationId), eq(partnerMobilePushDevices.enabled, true)));
  const seen = new Set<string>();
  const unique = devices.filter((device) => device.token && !seen.has(device.token) && Boolean(seen.add(device.token)));
  if (!unique.length) return 0;
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", "accept-encoding": "gzip, deflate" },
    body: JSON.stringify(unique.map((device) => ({
      to: device.token,
      title: message.title,
      body: message.body,
      sound: "default",
      priority: "high",
      channelId: "messages",
      data: { orderId: message.requestId, kind: "order_message", screen: "messages" },
    }))),
  });
  if (!response.ok) return 0;
  const payload = (await response.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
  const tickets = Array.isArray(payload?.data) ? payload.data : [];
  const stale = tickets.flatMap((ticket, index) => (ticket?.details?.error === "DeviceNotRegistered" && unique[index] ? [unique[index].id] : []));
  if (stale.length) await db.update(partnerMobilePushDevices).set({ enabled: false, updatedAt: new Date() }).where(inArray(partnerMobilePushDevices.id, stale));
  return tickets.filter((ticket) => ticket.status === "ok").length;
}

async function sendWeb(organizationId: string, message: OrderMessagePush) {
  if (!webEnabled) return 0;
  const db = getDb();
  const subscriptions = await db.select().from(partnerPushSubscriptions).where(eq(partnerPushSubscriptions.organizationId, organizationId));
  const payload = JSON.stringify({ title: message.title, body: message.body, url: `/messages?order=${message.requestId}`, tag: `zhaoxi-chat-${message.requestId}`, renotify: true, requireInteraction: false });
  let sent = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload);
      sent++;
    } catch (error) {
      const code = Number((error as { statusCode?: number })?.statusCode || 0);
      if (code === 404 || code === 410) await db.delete(partnerPushSubscriptions).where(eq(partnerPushSubscriptions.id, subscription.id));
    }
  }));
  return sent;
}

export const partnerOrderMessagePushService = {
  async send(organizationId: string, message: OrderMessagePush) {
    const [mobile, web] = await Promise.all([sendMobile(organizationId, message), sendWeb(organizationId, message)]);
    return { sent: mobile + web };
  },
};
