import * as SecureStore from "expo-secure-store";
import type { AnalyticsData, AuthState, Order, PartnerOrganization, QueueData, Session } from "./types";

const AUTH_KEY = "zhaoxi.partner.auth.v1";
const configuredUrl = process.env.EXPO_PUBLIC_API_URL || "https://zhaoxi-app-puce.vercel.app";
export const API_URL = configuredUrl.replace(/\/$/, "");

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

async function raw(path: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(auth?.accessToken ? { authorization: `Bearer ${auth.accessToken}` } : {}), ...init.headers },
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
      await saveAuth(body.data as AuthState);
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
      body: JSON.stringify({ role: "partner", mode: "login", username: username.trim().toLowerCase(), password, locale: "vi-VN", deviceId, deviceName: "ZhaoXi Partner Mobile" }),
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
      body: JSON.stringify({ role: "partner", phone, pin, deviceId, deviceName: "ZhaoXi Partner Mobile" }),
    });
  } catch {
    throw new Error(`Không kết nối được máy chủ ${API_URL}. Hãy kiểm tra backend đang chạy.`);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.error?.message || "Số điện thoại hoặc mã PIN không chính xác.");
  return finishPartnerLogin(body.data);
}

async function finishPartnerLogin(value: unknown) {
  const data = value as AuthState | undefined;
  if (data?.session?.role !== "partner" || !data.session.organizationId) throw new Error("Tài khoản chưa được gán vào cửa hàng partner.");
  await saveAuth(data);
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

function mapServiceRequest(row: Record<string, unknown>): Order {
  const d = (row.details && typeof row.details === "object" ? row.details : {}) as Record<string, unknown>;
  const status = String(row.status || "");
  const stage = String(d.fulfillmentStage || (status === "assigned" || status === "new" ? "assigned" : status === "completed" ? "handed_off" : "preparing")) as Order["stage"];
  const createdAt = String(row.createdAt || "");
  const elapsedMinutes = createdAt ? Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)) : 0;
  const readyAt = typeof d.estimatedReadyAt === "string" ? d.estimatedReadyAt : null;
  const overdueMinutes = readyAt ? Math.max(0, Math.floor((Date.now() - new Date(readyAt).getTime()) / 60000)) : 0;
  return {
    requestId: String(row.id || ""), requestCode: String(row.requestCode || ""), status, stage,
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
  const items = rows.filter(row => {
    const details = row.details && typeof row.details === "object" ? row.details as Record<string, unknown> : {};
    return details.deliveryFulfillmentMode === "external_manual" && ["new", "assigned", "accepted", "in_progress", "waiting_customer"].includes(String(row.status));
  }).map(mapServiceRequest);
  return { generatedAt: new Date().toISOString(), counts: { waiting: items.filter(x => x.stage === "assigned").length, preparing: items.filter(x => x.stage === "preparing").length, ready: items.filter(x => x.stage === "ready_for_pickup").length, courier: items.filter(x => ["courier_booked", "handed_off"].includes(x.stage)).length, late: items.filter(x => x.late).length }, items } satisfies QueueData;
}

export async function getOrderHistory(organizationId: string) {
  const rows = await request<Array<Record<string, unknown>>>(`/api/service-requests?scope=operations&organizationId=${encodeURIComponent(organizationId)}&locale=vi-VN`);
  return rows.filter(row => {
    const details = row.details && typeof row.details === "object" ? row.details as Record<string, unknown> : {};
    return details.deliveryFulfillmentMode === "external_manual" && ["completed", "cancelled", "rejected"].includes(String(row.status));
  }).map(mapServiceRequest);
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
