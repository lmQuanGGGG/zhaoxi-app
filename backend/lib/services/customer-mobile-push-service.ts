import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { customerMobilePushDevices, customerNotificationPreferences, modules, serviceRequests, users } from "@/db/schema";

// Native push for the ZhaoXi customer app (Expo). Every sender is best-effort:
// failures are logged and never change the outcome of the business request.

type Locale = "vi-VN" | "zh-CN" | "zh-TW" | "en-US";
type Category = "order" | "housing" | "travel" | "payment" | "message" | "promotion";
type Copy = Record<Locale, { title: string; body: string }>;
type ExpoMessage = { to: string; title: string; body: string; sound: "default"; priority: "high" | "normal"; channelId: string; data: Record<string, unknown>; ttl?: number };
type ExpoTicket = { status?: string; details?: { error?: string } };

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const LOCALES: readonly Locale[] = ["vi-VN", "zh-CN", "zh-TW", "en-US"];

function normalizeLocale(value?: string | null): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : "vi-VN";
}

const statusCopy: Record<Locale, Record<string, string>> = {
  "vi-VN": { new: "Đã gửi yêu cầu", reviewing: "Đang xem xét", assigned: "Đã gửi đến đối tác", accepted: "Đối tác đã nhận đơn", in_progress: "Đơn đang được xử lý", waiting_customer: "Đối tác đang chờ bạn phản hồi", completed: "Đơn đã hoàn thành", cancelled: "Đơn đã bị hủy", rejected: "Đối tác đã từ chối đơn" },
  "zh-CN": { new: "请求已提交", reviewing: "审核中", assigned: "已发送给商家", accepted: "商家已接单", in_progress: "订单处理中", waiting_customer: "商家等待您的回复", completed: "订单已完成", cancelled: "订单已取消", rejected: "商家已拒绝订单" },
  "zh-TW": { new: "請求已送出", reviewing: "審核中", assigned: "已發送給商家", accepted: "商家已接單", in_progress: "訂單處理中", waiting_customer: "商家等待您的回覆", completed: "訂單已完成", cancelled: "訂單已取消", rejected: "商家已拒絕訂單" },
  "en-US": { new: "Request submitted", reviewing: "Under review", assigned: "Sent to partner", accepted: "Partner accepted your order", in_progress: "Your order is in progress", waiting_customer: "The partner is waiting for you", completed: "Order completed", cancelled: "Order cancelled", rejected: "Partner declined the order" },
};

const fulfillmentCopy: Record<string, Copy> = {
  PARTNER_ACCEPTED_FOOD_ORDER: { "vi-VN": { title: "🍳 Nhà hàng đã nhận đơn", body: "Nhà hàng bắt đầu chuẩn bị món cho bạn" }, "zh-CN": { title: "🍳 餐厅已接单", body: "餐厅正在开始准备餐品" }, "zh-TW": { title: "🍳 餐廳已接單", body: "餐廳正在開始準備餐點" }, "en-US": { title: "🍳 Restaurant accepted", body: "The restaurant started preparing your food" } },
  FOOD_PREPARING: { "vi-VN": { title: "👨‍🍳 Đang chuẩn bị món", body: "Nhà hàng đang làm món cho đơn của bạn" }, "zh-CN": { title: "👨‍🍳 餐品正在准备", body: "餐厅正在制作您的订单" }, "zh-TW": { title: "👨‍🍳 餐點正在準備", body: "餐廳正在製作您的訂單" }, "en-US": { title: "👨‍🍳 Preparing your food", body: "The restaurant is making your order" } },
  FOOD_READY_FOR_PICKUP: { "vi-VN": { title: "🥡 Món đã sẵn sàng", body: "Đang chờ tài xế đến lấy món" }, "zh-CN": { title: "🥡 餐品已备好", body: "等待配送员到店取餐" }, "zh-TW": { title: "🥡 餐點已備好", body: "等待外送員到店取餐" }, "en-US": { title: "🥡 Food is ready", body: "Waiting for the driver to pick it up" } },
  AUTO_READY_FOR_EXTERNAL_PICKUP: { "vi-VN": { title: "🥡 Món đã sẵn sàng", body: "Đang chờ tài xế đến lấy món" }, "zh-CN": { title: "🥡 餐品已备好", body: "等待配送员到店取餐" }, "zh-TW": { title: "🥡 餐點已備好", body: "等待外送員到店取餐" }, "en-US": { title: "🥡 Food is ready", body: "Waiting for the driver to pick it up" } },
  EXTERNAL_COURIER_BOOKED: { "vi-VN": { title: "🛵 Đã bố trí tài xế", body: "Tài xế sẽ đến nhà hàng lấy món" }, "zh-CN": { title: "🛵 已安排配送", body: "配送员将前往餐厅取餐" }, "zh-TW": { title: "🛵 已安排配送", body: "外送員將前往餐廳取餐" }, "en-US": { title: "🛵 Courier arranged", body: "The driver will collect your food" } },
  FOOD_HANDED_TO_COURIER: { "vi-VN": { title: "🛵 Tài xế đang giao", body: "Món đang trên đường đến địa chỉ của bạn" }, "zh-CN": { title: "🛵 配送中", body: "配送员正把餐品送往您的地址" }, "zh-TW": { title: "🛵 配送中", body: "外送員正把餐點送往您的地址" }, "en-US": { title: "🛵 On the way", body: "The driver is delivering to your address" } },
  EXTERNAL_DELIVERY_DELIVERED: { "vi-VN": { title: "📍 Tài xế đã đến nơi", body: "Hãy xuống lấy hàng nhé" }, "zh-CN": { title: "📍 配送员已到达", body: "请下楼取餐" }, "zh-TW": { title: "📍 外送員已到達", body: "請下樓取餐" }, "en-US": { title: "📍 Driver has arrived", body: "Please come down to collect your order" } },
  FOOD_ORDER_CANCELLED: { "vi-VN": { title: "Đơn đã hủy", body: "Đơn này sẽ không được tiếp tục xử lý" }, "zh-CN": { title: "订单已取消", body: "该订单不会继续处理" }, "zh-TW": { title: "訂單已取消", body: "此訂單不會繼續處理" }, "en-US": { title: "Order cancelled", body: "This order will not be processed further" } },
};

const messageCopy: Copy = { "vi-VN": { title: "💬 Tin nhắn mới", body: "" }, "zh-CN": { title: "💬 新消息", body: "" }, "zh-TW": { title: "💬 新訊息", body: "" }, "en-US": { title: "💬 New message", body: "" } };
const paymentCopy: Copy = { "vi-VN": { title: "💳 Cập nhật thanh toán", body: "Đơn của bạn có cập nhật về thanh toán" }, "zh-CN": { title: "💳 支付更新", body: "您的订单有新的支付进展" }, "zh-TW": { title: "💳 付款更新", body: "您的訂單有新的付款進度" }, "en-US": { title: "💳 Payment update", body: "There is a payment update on your order" } };
const supportCopy: Copy = { "vi-VN": { title: "💬 ZhaoXi hỗ trợ đã trả lời", body: "" }, "zh-CN": { title: "💬 赵喜客服已回复", body: "" }, "zh-TW": { title: "💬 趙喜客服已回覆", body: "" }, "en-US": { title: "💬 ZhaoXi Support replied", body: "" } };

function categoryOf(note: string, moduleCode: string): Category {
  if (note.startsWith("PAYMENT_") || note.startsWith("TRAVEL_PARTNER_PAYMENT_")) return "payment";
  if (note.startsWith("HOUSING_") || moduleCode === "housing") return "housing";
  if (note.startsWith("TRAVEL_") || moduleCode === "travel") return "travel";
  return "order";
}

function preferenceAllows(prefs: typeof customerNotificationPreferences.$inferSelect | undefined, category: Category) {
  if (!prefs) return true;
  if (category === "order") return prefs.orderEnabled;
  if (category === "housing") return prefs.housingEnabled;
  if (category === "travel") return prefs.travelEnabled;
  if (category === "payment") return prefs.paymentEnabled;
  return true;
}

function channelFor(category: Category) {
  return category === "promotion" ? "promotions" : category === "message" ? "messages" : "orders";
}

function truncate(value: string, max = 140) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function deliver(messages: Array<{ deviceId: string; message: ExpoMessage }>) {
  let sent = 0;
  for (let start = 0; start < messages.length; start += 100) {
    const chunk = messages.slice(start, start + 100);
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", "accept-encoding": "gzip, deflate" },
      body: JSON.stringify(chunk.map((item) => item.message)),
    });
    if (!response.ok) {
      console.error("[customer-push] Expo push rejected", response.status);
      continue;
    }
    const payload = (await response.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
    const tickets = Array.isArray(payload?.data) ? payload.data : [];
    const stale = tickets.flatMap((ticket, index) => (ticket?.details?.error === "DeviceNotRegistered" && chunk[index] ? [chunk[index].deviceId] : []));
    if (stale.length) {
      await getDb().update(customerMobilePushDevices).set({ enabled: false, updatedAt: new Date() }).where(inArray(customerMobilePushDevices.id, stale));
    }
    sent += tickets.filter((ticket) => ticket.status === "ok").length;
  }
  return sent;
}

/** Runs after the HTTP response when called inside a request, otherwise immediately. */
function runInBackground(task: () => Promise<unknown>) {
  const run = () => task().catch((error) => console.error("[customer-push]", error));
  try {
    after(run);
  } catch {
    void run();
  }
}

export class CustomerMobilePushService {
  async sendToUser(userId: string, category: Category, build: (locale: Locale) => { title: string; body: string }, data: Record<string, unknown>) {
    const db = getDb();
    const [devices, userRows] = await Promise.all([
      db.select().from(customerMobilePushDevices).where(and(eq(customerMobilePushDevices.userId, userId), eq(customerMobilePushDevices.enabled, true))),
      db.select({ preferredLocale: users.preferredLocale }).from(users).where(eq(users.id, userId)).limit(1),
    ]);
    if (!devices.length) return { sent: 0 };
    const fallbackLocale = userRows[0]?.preferredLocale;
    const messages = devices.map((device) => {
      const copy = build(normalizeLocale(device.locale || fallbackLocale));
      return {
        deviceId: device.id,
        message: { to: device.expoPushToken, title: copy.title, body: copy.body, sound: "default" as const, priority: "high" as const, channelId: channelFor(category), data: { ...data, category } },
      };
    });
    return { sent: await deliver(messages) };
  }

  /** Notifies the customer about a new service_request_status_history entry written by someone else. */
  async notifyRequestEvent(input: { requestId: string; note?: string | null; toStatus?: string | null; actorUserId?: string | null }) {
    const db = getDb();
    const [row] = await db
      .select({ id: serviceRequests.id, customerId: serviceRequests.customerId, requestCode: serviceRequests.requestCode, title: serviceRequests.title, status: serviceRequests.status, moduleCode: modules.code })
      .from(serviceRequests)
      .leftJoin(modules, eq(modules.id, serviceRequests.moduleId))
      .where(eq(serviceRequests.id, input.requestId))
      .limit(1);
    if (!row?.customerId || row.customerId === input.actorUserId) return { sent: 0 };
    const note = String(input.note || "");
    // Messages the customer wrote themselves never notify the customer.
    if (/:customer(:|$)/.test(note)) return { sent: 0 };
    const category = categoryOf(note, String(row.moduleCode || ""));
    const [prefs] = await db.select().from(customerNotificationPreferences).where(eq(customerNotificationPreferences.userId, row.customerId)).limit(1);
    if (!preferenceAllows(prefs, category)) return { sent: 0 };

    const status = String(input.toStatus || row.status);
    const subject = truncate(`${row.requestCode} · ${row.title || ""}`, 90);
    const isMessage = /^(HOUSING_MESSAGE|TRAVEL_MESSAGE|PAYMENT_SUPPORT_MESSAGE):/.test(note);
    const threadKind = note.startsWith("HOUSING_") ? "housing" : note.startsWith("TRAVEL_") ? "travel" : "payment";
    const url = isMessage ? `/messages/${threadKind}:${row.id}` : `/order/${row.id}`;
    return this.sendToUser(row.customerId, isMessage ? "message" : category, (locale) => {
      if (isMessage) return { title: messageCopy[locale].title, body: subject };
      const fulfillment = fulfillmentCopy[note];
      if (fulfillment) return { title: fulfillment[locale].title, body: `${fulfillment[locale].body} · ${row.requestCode}` };
      if (category === "payment") return { title: paymentCopy[locale].title, body: `${paymentCopy[locale].body} · ${row.requestCode}` };
      return { title: statusCopy[locale][status] || statusCopy[locale].in_progress, body: subject };
    }, { url, requestId: row.id, note, status });
  }

  async notifySupportReply(customerId: string, threadId: string, body: string) {
    return this.sendToUser(customerId, "message", (locale) => ({ title: supportCopy[locale].title, body: truncate(body) }), { url: `/messages/support:${threadId}`, threadId: `support:${threadId}` });
  }

  /** Sends a promotion to every opted-in device, localized per device locale. */
  async broadcastPromotion(input: { copy: Partial<Record<Locale, { title: string; body: string }>>; url?: string; userIds?: string[] }) {
    const db = getDb();
    const filters = [eq(customerMobilePushDevices.enabled, true), eq(customerMobilePushDevices.promotionsEnabled, true)];
    if (input.userIds?.length) filters.push(inArray(customerMobilePushDevices.userId, input.userIds));
    const devices = await db.select().from(customerMobilePushDevices).where(and(...filters));
    const fallback = input.copy["vi-VN"] || Object.values(input.copy).find(Boolean);
    if (!fallback) return { sent: 0, targeted: 0 };
    const messages = devices.map((device) => {
      const copy = input.copy[normalizeLocale(device.locale)] || fallback;
      return {
        deviceId: device.id,
        message: { to: device.expoPushToken, title: copy.title, body: copy.body, sound: "default" as const, priority: "normal" as const, channelId: channelFor("promotion"), ttl: 86400, data: { url: input.url || "/coupons", category: "promotion" } },
      };
    });
    return { sent: await deliver(messages), targeted: devices.length };
  }

  notifyRequestEventAfterResponse(input: { requestId: string; note?: string | null; toStatus?: string | null; actorUserId?: string | null }) {
    runInBackground(() => this.notifyRequestEvent(input));
  }

  notifySupportReplyAfterResponse(customerId: string, threadId: string, body: string) {
    runInBackground(() => this.notifySupportReply(customerId, threadId, body));
  }
}

export const customerMobilePushService = new CustomerMobilePushService();
