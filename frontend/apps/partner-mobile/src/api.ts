import * as SecureStore from "expo-secure-store";
import type { AnalyticsData, AuthState, Order, OrderChatAttachment, OrderChatMessage, OrderChatSummary, OrderChatThread, OrderFact, PartnerOrderAction, PartnerOrderKind, PartnerOrganization, QueueData, Session } from "./types";

const AUTH_KEY = "zhaoxi.partner.auth.v1";
const configuredUrl = process.env.EXPO_PUBLIC_API_URL || "https://zhaoxi-app-puce.vercel.app";
let API_URL = configuredUrl.replace(/\/$/, "");
let deviceName = "ZhaoXi Partner Mobile";

/** Mini app: dùng backend của host (`context.host.apiUrl`), để một bundle chạy đúng mọi môi trường. */
export function configureApi(options: { apiUrl?: string; deviceName?: string }) {
  if (options.apiUrl) API_URL = options.apiUrl.replace(/\/+$/, "");
  if (options.deviceName) deviceName = options.deviceName;
}

let auth: AuthState | null = null;
let refreshPromise: Promise<AuthState | null> | null = null;

export async function loadAuth() {
  const raw = await SecureStore.getItemAsync(AUTH_KEY);
  auth = raw ? JSON.parse(raw) as AuthState : null;
  return auth;
}

async function saveAuth(value: AuthState | null) {
  auth = value;
  if (value) await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(value), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
  else await SecureStore.deleteItemAsync(AUTH_KEY);
}

/** Bearer header for requests the app makes outside `request` (chat photos). */
export function authHeaders(): Record<string, string> {
  return auth?.accessToken ? { authorization: `Bearer ${auth.accessToken}` } : {};
}

async function raw(path: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    // Multipart uploads set their own boundary header.
    headers: { ...(init.body instanceof FormData ? {} : { "content-type": "application/json" }), ...authHeaders(), ...init.headers },
  });
}

async function refreshAuth() {
  if (!auth?.refreshToken) return null;
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/session/refresh`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: auth.refreshToken }),
    }).then(async response => {
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) { await saveAuth(null); return null; }
      await saveAuth({ ...(body.data as AuthState), hostUserId: auth?.hostUserId });
      return auth;
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await raw(path, init);
  if (response.status === 401 || response.status === 403) {
    if (await refreshAuth()) response = await raw(path, init);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    const code = String(body?.error?.code || "");
    const localizedErrors: Record<string, string> = {
      EXTERNAL_FULFILLMENT_REQUIRED: "Đơn hàng cũ này không hỗ trợ cập nhật trạng thái trên ứng dụng.",
      INVALID_FULFILLMENT_TRANSITION: "Trạng thái đơn đã thay đổi. Vui lòng tải lại danh sách.",
      REQUEST_NOT_FOUND: "Không tìm thấy đơn hàng này.",
      PARTNER_FORBIDDEN: "Bạn không có quyền cập nhật đơn của gian hàng này.",
      BANK_TRANSFER_VERIFICATION_REQUIRED: "Cần xác nhận thanh toán chuyển khoản trước khi nhận đơn.",
    };
    throw new Error(localizedErrors[code] || body?.error?.message || code || `API ${response.status}`);
  }
  return body.data as T;
}

export async function login(username: string, password: string, deviceId: string) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/auth/identity/account/login`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "partner", mode: "login", username: username.trim().toLowerCase(), password, locale: "vi-VN", deviceId, deviceName }),
    });
  } catch {
    throw new Error(`Không kết nối được máy chủ ${API_URL}. Hãy kiểm tra backend đang chạy.`);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.error?.message || "Đăng nhập thất bại.");
  return finishPartnerLogin(body.data);
}

export async function loginWithPhone(phone: string, pin: string, deviceId: string) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/auth/identity/pin/login`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "partner", phone, pin, deviceId, deviceName }),
    });
  } catch {
    throw new Error(`Không kết nối được máy chủ ${API_URL}. Hãy kiểm tra backend đang chạy.`);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.error?.message || "Số điện thoại hoặc mã PIN không chính xác.");
  return finishPartnerLogin(body.data);
}

/** Đổi mã role-switch (host xin bằng phiên khách, `bridge.createRoleHandoff`) lấy phiên partner của cùng tài khoản. */
export async function loginWithHandoff(code: string, deviceId: string, hostUserId: string) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/auth/role-switch/exchange`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, deviceId, deviceName }),
    });
  } catch {
    throw new Error(`Không kết nối được máy chủ ${API_URL}. Hãy kiểm tra backend đang chạy.`);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.error?.message || "Không vào được gian hàng bằng tài khoản ZhaoXi.");
  return finishPartnerLogin(body.data, hostUserId);
}

async function finishPartnerLogin(value: unknown, hostUserId?: string) {
  const data = value as AuthState | undefined;
  if (data?.session?.role !== "partner" || !data.session.organizationId) throw new Error("Tài khoản chưa được gán vào cửa hàng partner.");
  await saveAuth(hostUserId ? { ...data, hostUserId } : data);
  return auth!;
}

export async function logout(expoPushToken?: string) {
  if (expoPushToken) await request("/api/partner-push/mobile", { method: "DELETE", body: JSON.stringify({ expoPushToken }) }).catch(() => undefined);
  if (auth?.refreshToken) await raw("/api/auth/session/logout", { method: "POST", body: JSON.stringify({ refreshToken: auth.refreshToken }) }).catch(() => undefined);
  await saveAuth(null);
}

export const getPartnerOrganizations = () => request<{ organizations: PartnerOrganization[] }>("/api/account/me");
export async function switchPartnerOrganization(organizationId: string) {
  const session = await request<Session>("/api/auth/session/organization", { method: "POST", body: JSON.stringify({ organizationId }) });
  if (!auth) throw new Error("Phiên đăng nhập đã hết hạn.");
  await saveAuth({ ...auth, session });
  return auth;
}

const ACTIVE_STATUSES = ["new", "reviewing", "assigned", "accepted", "in_progress", "waiting_customer"];
const FINAL_STATUSES = ["completed", "cancelled", "rejected"];
const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);

/** Kind of an order; falls back to the old food marker when the backend has not sent `orderKind` yet. */
function orderKindOf(row: Record<string, unknown>, d: Record<string, unknown>): PartnerOrderKind {
  const kind = String(row.orderKind || "");
  if (kind === "food_delivery" || kind === "housing_inquiry" || kind === "travel_booking" || kind === "service_booking") return kind;
  if (row.moduleCode === "food" || d.deliveryFulfillmentMode === "external_manual") return "food_delivery";
  if (row.moduleCode === "housing") return "housing_inquiry";
  if (row.moduleCode === "travel") return "travel_booking";
  return "service_booking";
}

/** Food orders only count once they are in the kitchen/courier pipeline. */
function isPartnerOrder(row: Record<string, unknown>) {
  const d = (row.details && typeof row.details === "object" ? row.details : {}) as Record<string, unknown>;
  return orderKindOf(row, d) !== "food_delivery" || d.deliveryFulfillmentMode === "external_manual";
}

function mapServiceRequest(row: Record<string, unknown>, organizationId: string): Order {
  const d = (row.details && typeof row.details === "object" ? row.details : {}) as Record<string, unknown>;
  const status = String(row.status || "");
  const kind = orderKindOf(row, d);
  // Non-food orders have no kitchen stages: waiting until accepted, then "in progress".
  const stage = (kind === "food_delivery"
    ? String(d.fulfillmentStage || (status === "assigned" || status === "new" ? "assigned" : status === "completed" ? "handed_off" : "preparing"))
    : ["new", "reviewing", "assigned"].includes(status) ? "assigned" : "preparing") as Order["stage"];
  const createdAt = String(row.createdAt || "");
  const elapsedMinutes = createdAt ? Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)) : 0;
  const readyAt = typeof d.estimatedReadyAt === "string" ? d.estimatedReadyAt : null;
  const overdueMinutes = readyAt ? Math.max(0, Math.floor((Date.now() - new Date(readyAt).getTime()) / 60000)) : 0;
  return {
    requestId: String(row.id || ""), organizationId, kind, moduleName: row.moduleName ? String(row.moduleName) : undefined,
    facts: asArray<OrderFact>(row.orderFacts), actions: asArray<PartnerOrderAction>(row.partnerActions),
    requestCode: String(row.requestCode || ""), status, stage,
    priority: String(d.kitchenPriority || "normal") as Order["priority"], serviceName: String(row.serviceName || row.title || row.requestCode || "Đơn hàng"),
    customerName: String(row.customerName || "Khách hàng"), customerPhone: String(d.recipientPhone || row.customerPhone || ""), addressText: String(row.addressText || ""),
    quantity: Number(d.quantity || 1), totalAmount: Number(d.totalAmount || 0), itemSubtotal: Number(d.itemSubtotal ?? d.itemSubtotalBeforeCoupon ?? 0),
    deliveryGrossFee: Number(d.deliveryGrossFee || 0), deliverySubsidy: Number(d.deliverySubsidy || 0), customerDeliveryFee: Number(d.deliveryCustomerFee ?? d.customerDeliveryFee ?? 0), deliveryDistanceKm: Number(d.deliveryDistanceKm || 0),
    paymentMethod: String(d.paymentMethod || ""), paymentStatus: String(d.paymentStatus || ""), estimatedMinutes: Number(d.estimatedMinutes || 0), estimatedReadyAt: readyAt,
    overdueMinutes, elapsedMinutes, late: overdueMinutes > 0, deliveryProvider: String(d.deliveryProvider || ""), deliveryProviderLabel: String(d.deliveryProviderLabel || ""), createdAt,
  };
}

export async function getQueue(organizationId: string) {
  const rows = await request<Array<Record<string, unknown>>>(`/api/service-requests?scope=operations&organizationId=${encodeURIComponent(organizationId)}&locale=vi-VN`);
  const items = rows.filter(row => isPartnerOrder(row) && ACTIVE_STATUSES.includes(String(row.status))).map(row => mapServiceRequest(row, organizationId));
  return { generatedAt: new Date().toISOString(), counts: { waiting: items.filter(x => x.stage === "assigned").length, preparing: items.filter(x => x.stage === "preparing").length, ready: items.filter(x => x.stage === "ready_for_pickup").length, courier: items.filter(x => ["courier_booked", "handed_off"].includes(x.stage)).length, late: items.filter(x => x.late).length }, items } satisfies QueueData;
}

export async function getOrderHistory(organizationId: string) {
  const rows = await request<Array<Record<string, unknown>>>(`/api/service-requests?scope=operations&organizationId=${encodeURIComponent(organizationId)}&locale=vi-VN`);
  return rows.filter(row => isPartnerOrder(row) && FINAL_STATUSES.includes(String(row.status))).map(row => mapServiceRequest(row, organizationId));
}
/** Runs a non-food partner action on the endpoint that owns that order's state machine. */
export async function runServiceOrderAction(order: Order, action: PartnerOrderAction) {
  if (order.kind === "travel_booking") {
    return request(`/api/partner-travel-leads/${encodeURIComponent(order.requestId)}`, {
      method: "PATCH", body: JSON.stringify({ organizationId: order.organizationId, action: action === "accept" ? "confirm" : action }),
    });
  }
  const status = ({ accept: "accepted", start: "in_progress", complete: "completed", reject: "rejected", cancel: "cancelled" } as const)[action];
  return request(`/api/service-requests/${encodeURIComponent(order.requestId)}/status`, { method: "PATCH", body: JSON.stringify({ status, note: `partner_mobile:${status}` }) });
}
export const fulfill = (requestId: string, payload: Record<string, unknown>) => request(`/api/partner-fulfillment/${requestId}`, { method: "PATCH", body: JSON.stringify(payload) });
export const updateKitchen = (organizationId: string, requestId: string, payload: Record<string, unknown>) => request("/api/partner-kitchen", { method: "PATCH", body: JSON.stringify({ organizationId, requestId, ...payload }) });
export const registerPush = (organizationId: string, expoPushToken: string, platform: string, deviceId: string) => request("/api/partner-push/mobile", { method: "POST", body: JSON.stringify({ organizationId, expoPushToken, platform, deviceId }) });
export const getRestaurantAnalytics = (organizationId: string, days = 30, from?: string, to?: string) => {
  const query = new URLSearchParams({ organizationId, timezone: "Asia/Ho_Chi_Minh" });
  if (from && to) {
    query.set("from", from);
    query.set("to", to);
  } else {
    query.set("days", String(days));
  }
  return request<AnalyticsData>(`/api/partner-restaurant-analytics?${query.toString()}`);
};

// Order chat with the customer, one conversation per order.
const chatPath = (requestId: string) => `/api/partner-order-chats/${encodeURIComponent(requestId)}`;
export const getOrderChats = (organizationId: string) =>
  request<{ threads: OrderChatSummary[]; summary: { total: number; unread: number } }>(`/api/partner-order-chats?organizationId=${encodeURIComponent(organizationId)}`);
export const getOrderChatUnread = (organizationId: string) =>
  request<{ unread: number }>(`/api/partner-order-chats?summary=1&organizationId=${encodeURIComponent(organizationId)}`);
export const getOrderChat = (organizationId: string, requestId: string) =>
  request<OrderChatThread>(`${chatPath(requestId)}?organizationId=${encodeURIComponent(organizationId)}`);
export const sendOrderChat = (organizationId: string, requestId: string, message: string, clientMessageId: string, attachmentIds: string[] = []) =>
  request<OrderChatMessage>(chatPath(requestId), { method: "POST", body: JSON.stringify({ organizationId, message, clientMessageId, attachmentIds }) });
/** Uploads one already-compressed JPEG for the next message. */
export function uploadOrderChatPhoto(organizationId: string, requestId: string, photo: { uri: string; width: number; height: number }) {
  const form = new FormData();
  form.append("file", { uri: photo.uri, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
  form.append("width", String(photo.width));
  form.append("height", String(photo.height));
  form.append("organizationId", organizationId);
  return request<OrderChatAttachment>(`${chatPath(requestId)}/attachments`, { method: "POST", body: form });
}
export const orderChatPhotoUrl = (attachment: OrderChatAttachment, organizationId: string) => `${API_URL}${attachment.url}?organizationId=${encodeURIComponent(organizationId)}`;
export const markOrderChatRead = (organizationId: string, requestId: string) =>
  request(chatPath(requestId), { method: "PATCH", body: JSON.stringify({ organizationId }) });
