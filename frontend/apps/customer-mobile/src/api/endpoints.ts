import { json, request, requestRaw } from "./client";
import type {
  AccountAccess, ApiModule, AvailableCoupon, ChatAttachment, ChatMessage, CouponEvaluation, CustomerProfile, DeliveryQuote, DeliveryTracking, DeviceSession, DiscoveryResult,
  FavoriteItem, FoodPrice, HelpArticle, HomeFeed, HousingInquiry, MessageThread, MessageThreadSummary, NotificationInbox, NotificationPreferences,
  Order, OrderDetail, PartnerPaymentState, Payment, PaymentCapabilities, Point, Recommendation, RestaurantStatus, SavedAddress, Service, ServiceDetail,
  SupportConfig, TravelBooking, TravelSlot, UiConfig, UnreadSummary,
} from "./types";

const q = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  return search.toString();
};

// Catalogue & discovery -------------------------------------------------------
export async function getModules(locale: string) {
  const body = await requestRaw<ApiModule[] | { data?: ApiModule[] }>(`/api/modules?${q({ locale })}`);
  return Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
}
export const getUiConfig = () => request<UiConfig | null>("/api/customer-ui-config");
export async function getRecommendations(locale: string, offset = 0) {
  const body = await requestRaw<{ data?: Recommendation[]; personalized?: boolean }>(`/api/customer-recommendations?${q({ locale, limit: 12, offset })}`);
  return { items: Array.isArray(body?.data) ? body.data : [], personalized: Boolean(body?.personalized) };
}
export const getHomeFeed = (locale: string) => request<HomeFeed | null>(`/api/customer-home-feed?${q({ locale })}`);
export const getNearbyServices = (module: string, locale: string, point?: Point | null) =>
  request<Service[]>(`/api/customer-nearby-services?${q({ module, locale, limit: 100, lat: point?.latitude, lng: point?.longitude })}`);
export const getOrganizationServices = (organizationId: string, locale: string, module = "food") =>
  request<Service[]>(`/api/services?${q({ module, organizationId, locale })}`);
export const getService = (id: string, locale: string) => request<ServiceDetail>(`/api/services/${encodeURIComponent(id)}?${q({ locale })}`);
export const getRestaurantStatuses = (ids: string[]) => request<Record<string, RestaurantStatus>>(`/api/restaurant-status?${q({ ids: ids.join(",") })}`);
export const getRestaurantStatus = (id: string) => request<RestaurantStatus>(`/api/restaurant-status/${encodeURIComponent(id)}`);
export function getFoodPricing(lines: Array<{ id: string; quantity: number }>) {
  const params = new URLSearchParams({ ids: lines.map((line) => line.id).join(",") });
  for (const line of lines) params.set(`q_${line.id}`, String(Math.max(1, line.quantity)));
  return request<Record<string, FoodPrice>>(`/api/food-pricing?${params}`);
}
export const searchDiscovery = (query: string, locale: string, module?: string) =>
  request<DiscoveryResult>(`/api/public/discovery?${q({ q: query, locale, limit: 60, module })}`);
export const recordView = (serviceId: string) => request(`/api/customer-discovery/views/${encodeURIComponent(serviceId)}`, { method: "POST", body: "{}" });

// Personal data ------------------------------------------------------------------
export const getFavoriteState = (serviceId: string) => request<{ favorite: boolean }>(`/api/customer-discovery/favorites/${encodeURIComponent(serviceId)}`);
export const setFavorite = (serviceId: string, favorite: boolean) =>
  request<{ favorite: boolean }>(`/api/customer-discovery/favorites/${encodeURIComponent(serviceId)}`, { method: "PUT", body: json({ favorite }) });
export const getFavorites = (locale: string) => request<FavoriteItem[]>(`/api/customer-favorites?${q({ locale })}`);
export const getHistory = (locale: string) => request<FavoriteItem[]>(`/api/customer-history?${q({ locale })}`);
export const getProfile = () => request<CustomerProfile>("/api/customer-profile");
export const getAccountAccess = () => request<AccountAccess>("/api/account/me");
export const updateProfile = (patch: { displayName?: string; phone?: string; addressText?: string; latitude?: number; longitude?: number }) =>
  request<CustomerProfile>("/api/customer-profile", { method: "PATCH", body: json(patch) });
export const addAddress = (input: Omit<SavedAddress, "id" | "isDefault"> & { isDefault?: boolean }) =>
  request<SavedAddress>("/api/customer-addresses", { method: "POST", body: json(input) });
export const setDefaultAddress = (id: string) => request(`/api/customer-addresses/${encodeURIComponent(id)}`, { method: "PATCH", body: json({ isDefault: true }) });
export const deleteAddress = (id: string) => request(`/api/customer-addresses/${encodeURIComponent(id)}`, { method: "DELETE" });

// Checkout -------------------------------------------------------------------------
export const getCoupons = (organizationId: string, itemSubtotal: number) =>
  request<AvailableCoupon[]>(`/api/customer-coupons?${q({ organizationId, itemSubtotal })}`);
export const evaluateCoupon = (organizationId: string, code: string, itemSubtotal: number) =>
  request<CouponEvaluation>("/api/customer-coupons", { method: "POST", body: json({ organizationId, code: code.trim().toUpperCase(), itemSubtotal }) });
export const getDeliveryQuote = (serviceId: string, point: Point) =>
  request<DeliveryQuote>("/api/delivery/quote", { method: "POST", body: json({ serviceId, ...point }) });
export const getPaymentCapabilities = () => request<PaymentCapabilities>("/api/payments/capabilities");
export type CreatedRequest = { id: string; requestCode: string };
export async function createServiceRequest(payload: Record<string, unknown>) {
  const body = await requestRaw<{ ok: boolean; data?: CreatedRequest; routing?: { organizationCode?: string; organizationName?: string }; error?: { message?: string; code?: string } }>(
    "/api/service-requests", { method: "POST", body: json(payload) },
  );
  if (!body?.ok || !body.data) throw new Error(body?.error?.message || body?.error?.code || "REQUEST_FAILED");
  return { ...body.data, routing: body.routing };
}
export const createHousingInquiry = (payload: Record<string, unknown>) => request<CreatedRequest>("/api/housing-inquiries", { method: "POST", body: json(payload) });
export const createTravelInquiry = (payload: Record<string, unknown>) => request<CreatedRequest>("/api/travel-inquiries", { method: "POST", body: json(payload) });

export const getTravelAvailability = (serviceId: string, from: string) =>
  request<{ slots?: TravelSlot[] }>(`/api/travel-availability?${q({ serviceId, from, days: 30 })}`);

// Housing inquiries & travel bookings ------------------------------------------------------
const enc = encodeURIComponent;
export const getHousingInquiries = () => request<HousingInquiry[]>("/api/customer-housing-inquiries");
export const housingAppointment = (id: string, payload: { action: "propose" | "confirm" | "cancel" | "note"; note?: string; scheduledAt?: string }) =>
  request(`/api/customer-housing-inquiries/${enc(id)}/appointment`, { method: "PATCH", body: json(payload) });
export const sendHousingMessage = (id: string, message: string) =>
  request(`/api/customer-housing-inquiries/${enc(id)}/messages`, { method: "POST", body: json({ message }) });
export const markHousingMessagesRead = (id: string) => request(`/api/customer-housing-inquiries/${enc(id)}/messages`, { method: "PATCH", body: "{}" });
export const getTravelBookings = () => request<TravelBooking[]>("/api/customer-travel-inquiries");
export const cancelTravelBooking = (id: string) => request(`/api/customer-travel-inquiries/${enc(id)}`, { method: "PATCH", body: json({ action: "cancel" }) });
export const sendTravelMessage = (id: string, message: string) =>
  request(`/api/customer-travel-inquiries/${enc(id)}/messages`, { method: "POST", body: json({ message }) });
export const markTravelMessagesRead = (id: string) => request(`/api/customer-travel-inquiries/${enc(id)}/messages`, { method: "PATCH", body: "{}" });
export const getTravelPayment = (id: string) => request<PartnerPaymentState>(`/api/customer-travel-inquiries/${enc(id)}/payment`);
export const startTravelPayment = (id: string) =>
  request<{ intent?: PartnerPaymentState["intent"] }>(`/api/customer-travel-inquiries/${enc(id)}/payment`, { method: "POST", body: "{}" });
export const openPaymentSupport = (requestId: string, category: "payment" | "refund", message: string) =>
  request(`/api/customer-payment-support/${enc(requestId)}`, { method: "POST", body: json({ category, message }) });
export const sendPaymentSupportMessage = (requestId: string, message: string) =>
  request(`/api/customer-payment-support/${enc(requestId)}/messages`, { method: "POST", body: json({ message }) });
export const markPaymentSupportRead = (requestId: string) => request(`/api/customer-payment-support/${enc(requestId)}/messages`, { method: "PATCH", body: "{}" });

// Beta feedback (PWA /feedback → backend /api/feedback) -------------------------------------
export type FeedbackCategory = "general" | "bug" | "suggestion" | "payment" | "delivery" | "partner" | "account";
export const sendFeedback = (input: { category: FeedbackCategory; rating: number; message: string; route?: string; release: string }) =>
  request("/api/feedback", { method: "POST", body: json({ app: "customer", channel: "beta", ...input }) });

// Orders & payments --------------------------------------------------------------------
export const getOrders = (locale: string) => request<Order[]>(`/api/service-requests?${q({ locale, mine: 1 })}`);
export const getOrder = (id: string, locale: string) => request<OrderDetail>(`/api/service-requests/${encodeURIComponent(id)}?${q({ locale })}`);
export const getDeliveryTracking = (id: string) => request<DeliveryTracking | null>(`/api/delivery/${encodeURIComponent(id)}`).catch(() => null);
export const getSupportConfig = () => request<SupportConfig>("/api/customer-support-config");
export const getPayments = (requestId?: string) => request<Payment[]>(`/api/payments?${q({ requestId })}`);
export const createPayment = (requestId: string, method: string) => request<Payment>("/api/payments", { method: "POST", body: json({ requestId, method }) });
export const reportPayment = (paymentId: string) => request<Payment>(`/api/payments/${encodeURIComponent(paymentId)}/report`, { method: "POST", body: "{}" });

// Notifications & messages ------------------------------------------------------------
export const getNotifications = (locale: string, filter: string) => request<NotificationInbox>(`/api/customer-notifications?${q({ locale, filter })}`);
export const markNotification = (sourceType: string, sourceId: string, patch: { read?: boolean; dismissed?: boolean }) =>
  request("/api/customer-notifications/receipt", { method: "PATCH", body: json({ sourceType, sourceId, ...patch }) });
export const markAllNotificationsRead = (locale: string) => request(`/api/customer-notifications/read-all?${q({ locale })}`, { method: "POST", body: "{}" });
export const updateNotificationPreferences = (patch: Partial<NotificationPreferences>) =>
  request<NotificationPreferences>("/api/customer-notifications/preferences", { method: "PATCH", body: json(patch) });
export const getUnreadSummary = (locale: string) => request<UnreadSummary>(`/api/customer-unread-summary?${q({ locale })}`);
export const getThreads = (locale: string) => request<{ threads: MessageThreadSummary[]; summary: { unread: number } }>(`/api/customer-messages?${q({ locale })}`);
export const getThread = (threadId: string) => request<MessageThread>(`/api/customer-messages/${encodeURIComponent(threadId)}`);
export const sendMessage = (threadId: string, message: string, clientMessageId?: string, attachmentIds?: string[]) =>
  request<ChatMessage>(`/api/customer-messages/${encodeURIComponent(threadId)}`, { method: "POST", body: json({ message, clientMessageId, attachmentIds }) });
/** Uploads one already-compressed JPEG for the next order-chat message. */
export function uploadChatPhoto(threadId: string, photo: { uri: string; width: number; height: number }) {
  const form = new FormData();
  form.append("file", { uri: photo.uri, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
  form.append("width", String(photo.width));
  form.append("height", String(photo.height));
  return request<ChatAttachment>(`/api/customer-messages/${encodeURIComponent(threadId)}/attachments`, { method: "POST", body: form });
}
export const markThreadRead = (threadId: string) => request(`/api/customer-messages/${encodeURIComponent(threadId)}`, { method: "PATCH", body: "{}" });
/** Opens a ZhaoXi support conversation; `id` is the full thread id (`support:<uuid>`) the chat screen takes. */
export const createSupportThread = (message: string, subject?: string) =>
  request<{ id: string }>("/api/customer-messages", { method: "POST", body: json({ message, subject: subject || undefined }) });

// Help ----------------------------------------------------------------------------------
export const getHelpArticles = (locale: string, query: string) => request<HelpArticle[]>(`/api/public-support-knowledge?${q({ locale, q: query })}`);
export const getHelpArticle = (idOrSlug: string, locale: string) => request<HelpArticle>(`/api/public-support-knowledge/${encodeURIComponent(idOrSlug)}?${q({ locale })}`);
export const sendHelpFeedback = (idOrSlug: string, locale: string, helpful: boolean) =>
  request(`/api/public-support-knowledge/${encodeURIComponent(idOrSlug)}/feedback?${q({ locale })}`, { method: "POST", body: json({ helpful }) });

// Account security -----------------------------------------------------------------------
export const getDevices = () => request<DeviceSession[]>("/api/auth/session/devices");
export const revokeDevice = (sessionId: string) => request("/api/auth/session/devices/revoke", { method: "POST", body: json({ sessionId }) });

// Push ------------------------------------------------------------------------------------
export const registerPushToken = (input: { expoPushToken: string; platform: string; deviceId: string; locale: string; promotionsEnabled: boolean }) =>
  request("/api/customer-push/mobile", { method: "POST", body: json(input) });
export const unregisterPushToken = (expoPushToken: string) => request("/api/customer-push/mobile", { method: "DELETE", body: json({ expoPushToken }) });
