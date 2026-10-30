export type Point = { latitude: number; longitude: number };

export type ApiModule = { code?: string; name?: string; description?: string; icon?: string; route?: string };

export type Service = {
  id: string;
  code: string;
  moduleCode: string;
  moduleName?: string;
  name?: string;
  summary?: string;
  priceFrom?: string | null;
  currency?: string;
  organizationId?: string | null;
  organizationCode?: string | null;
  organizationName?: string | null;
  organizationAddress?: string | null;
  organizationMetadata?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  distanceKm?: number | null;
  nearby?: boolean;
};

export type ServiceDetail = {
  id: string;
  code: string;
  moduleCode: string;
  name?: string;
  summary?: string;
  description?: string | null;
  priceFrom?: string | null;
  currency?: string;
  metadata?: Record<string, unknown>;
  organization?: { id?: string; code?: string; name?: string; description?: string | null; phone?: string | null; address?: string | null; metadata?: Record<string, unknown> } | null;
};

export type RestaurantStatusCode = "open" | "platform_paused" | "manual_paused" | "closed_hours" | "at_capacity";
export type RestaurantStatus = {
  open: boolean;
  code: RestaurantStatusCode;
  activeKitchenOrders?: number;
  capacityRemaining?: number;
  businessHoursToday?: { enabled: boolean; open: string; close: string };
  pauseReason?: string;
};

export type FoodPrice = {
  scheduledAvailable: boolean;
  promoActive: boolean;
  promotionType: string;
  promotionLabel: string;
  baseUnitPrice: number;
  effectiveUnitPrice: number;
  quantity: number;
  baseSubtotal: number;
  discount: number;
  finalSubtotal: number;
};

export type Recommendation = {
  id: string;
  kind: "partner_service" | "module_fallback";
  moduleCode: string;
  title: string;
  summary?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  priceFrom?: string | null;
  currency?: string;
  imageUrl?: string;
  imageKey: string;
  href: string;
  usageCount: number;
  isNew: boolean;
  reasonCode?: "favorite" | "recent_view" | "ordered" | "popular" | "new" | "explore";
};

export type FeedService = {
  id: string;
  code?: string;
  name?: string;
  moduleCode?: string;
  moduleName?: string;
  organizationCode?: string;
  organizationName?: string;
  imageUrl?: string | null;
  priceFrom?: number;
  currency?: string;
  publicHref?: string;
  metadata?: { organizationMetadata?: Record<string, unknown> } & Record<string, unknown>;
};

export type HomeFeed = {
  smartResume?: { service?: FeedService } | null;
  recentlyViewedPartners?: Array<{ id: string; code?: string; name?: string; href: string; verifiedBadgeCount?: number }>;
  favorites?: FeedService[];
  forYou?: FeedService[];
  intentShortcuts?: Array<{ id: string; label: string; shortcutHref: string; watchEnabled?: boolean; isPinned?: boolean }>;
};

export type UiConfig = {
  bannerContent?: Record<string, { title?: string; subtitle?: string; cityLabel?: string }>;
  recommendationCycleSeconds?: number;
};

export type DeliveryQuote = {
  eligible: boolean;
  distanceKm: number | null;
  fee: number | null;
  grossFee: number | null;
  distanceFee?: number | null;
  subsidy: number;
  customerDeliveryFee: number | null;
  currency: string;
  etaMinutes: number | null;
  routeDurationMinutes: number | null;
  zoneKm: number;
  subsidyActive: boolean;
  subsidyWindow?: { start: string; end: string } | null;
  weather?: { source: "open_meteo" | "unavailable"; precipitationMm: number; weatherCode: number | null; rainLevel: "none" | "light" | "moderate" | "heavy"; surcharge: number };
  distanceProvider?: "google_routes" | "geo_fallback" | null;
  reason: string;
};

export type CouponEvaluation = {
  valid: boolean;
  code: string;
  reason: string | null;
  couponId: string | null;
  title: string;
  discountType: "percent" | "fixed" | null;
  discountValue: number;
  discountAmount: number;
  itemSubtotalBeforeCoupon: number;
  itemSubtotalAfterCoupon: number;
};

export type AvailableCoupon = {
  id: string;
  code: string;
  title: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  eligible: boolean;
  remainingForCustomer: number;
};

export type PaymentMethod = "cash_on_delivery" | "bank_transfer" | "wechat_pay";
export type PaymentCapabilities = { cashOnDelivery: boolean; bankTransfer: boolean; wechatPay: boolean; wechatPayMode?: string; wechatPayCurrency?: string };

export type SavedAddress = { id: string; label: string; recipientName?: string | null; recipientPhone?: string | null; addressText: string; latitude?: number | null; longitude?: number | null; isDefault: boolean };
export type CustomerProfile = {
  user?: { id?: string; displayName?: string | null; phone?: string | null; email?: string | null; avatarUrl?: string | null };
  identity?: { isGuest?: boolean; zhaoxiId?: string | null };
  profile?: { addressText?: string | null; latitude?: number | null; longitude?: number | null; nationality?: string | null; cityName?: string | null; whatsapp?: string | null; wechatContactId?: string | null } | null;
  addresses?: SavedAddress[];
};

export type Order = {
  id: string;
  requestCode: string;
  status: string;
  title: string;
  description?: string | null;
  serviceName?: string | null;
  moduleName?: string | null;
  moduleCode?: string | null;
  organizationName?: string | null;
  addressText?: string | null;
  createdAt: string;
  details?: Record<string, unknown>;
};
export type OrderDetail = Order & { history: Array<{ id: string; toStatus: string; note?: string | null; createdAt: string }> };

export type DeliveryTracking = { job?: { status?: string; driverName?: string; driverPhone?: string; etaMinutes?: number } & Record<string, unknown> } & Record<string, unknown>;
export type SupportConfig = { zaloQrUrl?: string | null; wechatQrUrl?: string | null; zaloChatUrl?: string | null; wechatChatUrl?: string | null };

export type NotificationCategory = "order" | "housing" | "travel" | "payment" | "saved_search";
export type NotificationItem = {
  id: string;
  sourceType: string;
  sourceId: string;
  category: NotificationCategory;
  eventCode: string;
  status?: string;
  title: string;
  subtitle?: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};
export type NotificationPreferences = { orderEnabled: boolean; housingEnabled: boolean; travelEnabled: boolean; paymentEnabled: boolean; savedSearchEnabled: boolean };
export type NotificationInbox = {
  items: NotificationItem[];
  preferences: NotificationPreferences;
  summary: { unread: number; total: number; byCategory: Record<NotificationCategory, number> };
};
export type UnreadSummary = { messages: number; notifications: number; total: number };

export type ThreadKind = "support" | "housing" | "travel" | "payment";
export type MessageThreadSummary = { id: string; kind: ThreadKind; title: string; subtitle?: string; lastMessage: string; lastMessageAt: string; unreadCount: number; status?: string };
export type ChatMessage = { id: string; body: string; createdAt: string; senderRole?: string; sender?: string; customerReadAt?: string | null };
export type MessageThread = { thread: { id: string; kind: ThreadKind; title: string; status?: string }; messages: ChatMessage[] };

export type DiscoveryService = { id: string; name: string; moduleCode: string; moduleName?: string; organizationName?: string; organizationId?: string; imageUrl?: string | null; priceFrom?: number | string | null; currency?: string; publicHref?: string };
export type DiscoveryPartner = { organizationId: string; name: string; code?: string; description?: string | null; serviceCount?: number; badgeCount?: number; href?: string };
export type DiscoveryResult = { services?: DiscoveryService[]; partners?: DiscoveryPartner[] };

export type FavoriteItem = { id: string; code?: string; name?: string | null; summary?: string | null; priceFrom?: string | null; currency?: string; metadata?: Record<string, unknown>; moduleCode?: string };
export type HelpArticle = { id: string; slug?: string; title: string; summary?: string | null; body?: string | null; category?: string | null };
export type Payment = { id: string; requestId?: string | null; requestCode?: string | null; method?: string; status: string; amount: string | number; currency: string; createdAt: string };
export type DeviceSession = { sessionId: string; role: string; deviceId?: string; deviceName?: string; lastSeenAt: string; createdAt: string; isCurrent?: boolean };
