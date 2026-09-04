import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", ["active", "disabled", "pending"]);
export const organizationStatusEnum = pgEnum("organization_status", ["pending", "active", "suspended"]);
export const organizationMemberRoleEnum = pgEnum("organization_member_role", ["owner", "manager", "staff"]);
export const requestStatusEnum = pgEnum("request_status", [
  "new",
  "reviewing",
  "assigned",
  "accepted",
  "in_progress",
  "waiting_customer",
  "completed",
  "cancelled",
  "rejected",
]);

export const languages = pgTable("languages", {
  code: varchar("code", { length: 10 }).primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  nativeName: varchar("native_name", { length: 80 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  isEnabled: boolean("is_enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cities = pgTable("cities", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  countryCode: varchar("country_code", { length: 2 }).notNull().default("VN"),
  nameVi: varchar("name_vi", { length: 120 }).notNull(),
  nameZhCn: varchar("name_zh_cn", { length: 120 }).notNull(),
  nameZhTw: varchar("name_zh_tw", { length: 120 }),
  nameEn: varchar("name_en", { length: 120 }),
  timezone: varchar("timezone", { length: 60 }).notNull().default("Asia/Ho_Chi_Minh"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wechatOpenId: varchar("wechat_open_id", { length: 128 }),
    wechatUnionId: varchar("wechat_union_id", { length: 128 }),
    nickname: varchar("nickname", { length: 120 }),
    avatarUrl: text("avatar_url"),
    phone: varchar("phone", { length: 30 }),
    email: varchar("email", { length: 255 }),
    preferredLocale: varchar("preferred_locale", { length: 10 })
      .notNull()
      .default("zh-CN")
      .references(() => languages.code),
    cityId: uuid("city_id").references(() => cities.id),
    status: userStatusEnum("status").notNull().default("active"),
    isGuest: boolean("is_guest").notNull().default(false),
    pinHash: text("pin_hash"),
    passwordHash: text("password_hash"),
    pinFailedAttempts: integer("pin_failed_attempts").notNull().default(0),
    pinLockedUntil: timestamp("pin_locked_until", { withTimezone: true }),
    profileCompletedAt: timestamp("profile_completed_at", { withTimezone: true }),
    guestExpiresAt: timestamp("guest_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_wechat_open_id_unique").on(table.wechatOpenId),
    index("users_phone_idx").on(table.phone),
    index("users_email_idx").on(table.email),
  ],
);

/**
 * A phone number can be used for exactly one registration OTP. This prevents
 * repeated OTP spend for the same number, even when requests land on separate
 * server instances.
 */
export const phoneOtpRegistrations = pgTable(
  "phone_otp_registrations",
  {
    phone: varchar("phone", { length: 30 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 160 }),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (table) => [index("phone_otp_registrations_user_idx").on(table.userId)],
);


export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 24 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.role] }), index("user_roles_role_idx").on(table.role)],
);

export const partnerPushSubscriptions = pgTable("partner_push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("partner_push_subscriptions_org_idx").on(table.organizationId)]);


export const customerProfiles = pgTable(
  "customer_profiles",
  {
    userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    nationality: varchar("nationality", { length: 80 }),
    gender: varchar("gender", { length: 24 }),
    birthday: varchar("birthday", { length: 10 }),
    cityName: varchar("city_name", { length: 120 }),
    addressText: text("address_text"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    whatsapp: varchar("whatsapp", { length: 40 }),
    wechatContactId: varchar("wechat_contact_id", { length: 128 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customer_profiles_city_idx").on(table.cityName),
  ],
);

export const customerSavedAddresses = pgTable(
  "customer_saved_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 80 }).notNull(),
    recipientName: varchar("recipient_name", { length: 120 }),
    recipientPhone: varchar("recipient_phone", { length: 30 }),
    addressText: text("address_text").notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customer_saved_addresses_user_idx").on(table.userId),
    index("customer_saved_addresses_default_idx").on(table.userId, table.isDefault),
  ],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 40 }).notNull().unique(),
    type: varchar("type", { length: 40 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description"),
    phone: varchar("phone", { length: 30 }),
    email: varchar("email", { length: 255 }),
    cityId: uuid("city_id").references(() => cities.id),
    addressText: text("address_text"),
    status: organizationStatusEnum("status").notNull().default("pending"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("organizations_type_idx").on(table.type), index("organizations_city_idx").on(table.cityId)],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: organizationMemberRoleEnum("role").notNull().default("staff"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.userId] })],
);

export const wechatLoginSessions = pgTable(
  "wechat_login_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    state: varchar("state", { length: 96 }).notNull().unique(),
    role: varchar("role", { length: 24 }).notNull(),
    locale: varchar("locale", { length: 10 }).notNull().default("zh-CN"),
    status: varchar("status", { length: 24 }).notNull().default("waiting_scan"),
    returnUrl: text("return_url"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    wechatOpenId: varchar("wechat_open_id", { length: 128 }),
    wechatUnionId: varchar("wechat_union_id", { length: 128 }),
    errorCode: varchar("error_code", { length: 80 }),
    exchangeCodeHash: varchar("exchange_code_hash", { length: 64 }),
    exchangeExpiresAt: timestamp("exchange_expires_at", { withTimezone: true }),
    exchangedAt: timestamp("exchanged_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("wechat_login_sessions_status_idx").on(table.status),
    index("wechat_login_sessions_user_idx").on(table.userId),
    index("wechat_login_sessions_expires_idx").on(table.expiresAt),
    index("wechat_login_sessions_status_expires_idx").on(table.status, table.expiresAt),
  ],
);



export const customerUiSettings = pgTable("customer_ui_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  scope: varchar("scope", { length: 40 }).notNull().default("default").unique(),
  bannerEffect: integer("banner_effect").notNull().default(0),
  bannerAutoCycle: boolean("banner_auto_cycle").notNull().default(false),
  bannerCycleSeconds: integer("banner_cycle_seconds").notNull().default(20),
  recommendationCycleSeconds: integer("recommendation_cycle_seconds").notNull().default(60),
  bannerContent: jsonb("banner_content").$type<Record<string,{ title:string; subtitle:string; cityLabel?:string }>>().notNull().default({}),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});




export const deliveryPricingPolicies = pgTable("delivery_pricing_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  scope: varchar("scope", { length: 40 }).notNull().default("default").unique(),
  baseFee: integer("base_fee").notNull().default(15000),
  baseDistanceKm: numeric("base_distance_km", { precision: 8, scale: 2 }).notNull().default("2"),
  perKmFee: integer("per_km_fee").notNull().default(8000),
  partnerSubsidyAmount: integer("partner_subsidy_amount").notNull().default(20000),
  subsidyWindows: jsonb("subsidy_windows").$type<Array<{start:string;end:string}>>().notNull().default([
    { start:"07:00", end:"10:00" },
    { start:"13:00", end:"16:00" },
  ]),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Ho_Chi_Minh"),
  maxDeliveryRadiusKm: numeric("max_delivery_radius_km", { precision: 8, scale: 2 }).notNull().default("15"),
  distanceProvider: varchar("distance_provider", { length: 32 }).notNull().default("google_routes"),
  allowGeoFallback: boolean("allow_geo_fallback").notNull().default(true),
  enabled: boolean("enabled").notNull().default(true),
  weatherSurchargeEnabled: boolean("weather_surcharge_enabled").notNull().default(true),
  weatherLightRainFee: integer("weather_light_rain_fee").notNull().default(4000),
  weatherModerateRainFee: integer("weather_moderate_rain_fee").notNull().default(7000),
  weatherHeavyRainFee: integer("weather_heavy_rain_fee").notNull().default(10000),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customerNotificationStates = pgTable("customer_notification_states", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventKey: varchar("event_key", { length: 220 }).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({columns:[table.userId,table.eventKey]}),
  index("customer_notification_states_user_idx").on(table.userId),
]);

export const customerSupportSettings = pgTable("customer_support_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  scope: varchar("scope", { length: 40 }).notNull().default("default").unique(),
  basicAssistantEnabled: boolean("basic_assistant_enabled").notNull().default(true),
  paidHumanEnabled: boolean("paid_human_enabled").notNull().default(true),
  paidHumanFee: integer("paid_human_fee").notNull().default(50000),
  paidHumanCurrency: varchar("paid_human_currency", { length: 8 }).notNull().default("VND"),
  emergencyPriority: boolean("emergency_priority").notNull().default(true),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trustedDeviceIdentities = pgTable(
  "trusted_device_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("trusted_device_identities_user_idx").on(table.userId),
    index("trusted_device_identities_status_exp_idx").on(table.status, table.expiresAt),
  ],
);

export const qrPairingSessions = pgTable(
  "qr_pairing_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(), secretHash: varchar("secret_hash", { length: 64 }).notNull(), requestedRole: varchar("requested_role", { length: 24 }).notNull(), locale: varchar("locale", { length: 10 }).notNull().default("zh-CN"), status: varchar("status", { length: 24 }).notNull().default("waiting_scan"), userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), exchangeCodeHash: varchar("exchange_code_hash", { length: 64 }), exchangeExpiresAt: timestamp("exchange_expires_at", { withTimezone: true }), exchangedAt: timestamp("exchanged_at", { withTimezone: true }), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), confirmedAt: timestamp("confirmed_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("qr_pairing_sessions_status_idx").on(table.status), index("qr_pairing_sessions_expires_idx").on(table.expiresAt)],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 24 }).notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    accessTokenHash: varchar("access_token_hash", { length: 64 }).notNull().unique(),
    refreshTokenHash: varchar("refresh_token_hash", { length: 64 }).notNull().unique(),
    deviceId: varchar("device_id", { length: 128 }),
    deviceName: varchar("device_name", { length: 180 }),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }).notNull(),
    refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("auth_sessions_user_idx").on(table.userId),
    index("auth_sessions_status_idx").on(table.status),
    index("auth_sessions_refresh_exp_idx").on(table.refreshExpiresAt),
    index("auth_sessions_device_idx").on(table.deviceId),
    index("auth_sessions_user_status_refresh_idx").on(table.userId, table.status, table.refreshExpiresAt),
  ],
);

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    icon: varchar("icon", { length: 40 }),
    route: varchar("route", { length: 120 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isEnabled: boolean("is_enabled").notNull().default(true),
    isEmergency: boolean("is_emergency").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("modules_sort_order_idx").on(table.sortOrder)],
);

export const moduleTranslations = pgTable(
  "module_translations",
  {
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 10 })
      .notNull()
      .references(() => languages.code),
    name: varchar("name", { length: 120 }).notNull(),
    shortName: varchar("short_name", { length: 60 }),
    description: text("description"),
  },
  (table) => [primaryKey({ columns: [table.moduleId, table.locale] })],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    code: varchar("code", { length: 80 }).notNull().unique(),
    priceFrom: numeric("price_from", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("VND"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("services_module_idx").on(table.moduleId), index("services_org_idx").on(table.organizationId)],
);

export const serviceTranslations = pgTable(
  "service_translations",
  {
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 10 })
      .notNull()
      .references(() => languages.code),
    name: varchar("name", { length: 160 }).notNull(),
    summary: text("summary"),
    description: text("description"),
  },
  (table) => [primaryKey({ columns: [table.serviceId, table.locale] })],
);



export const customerSavedSearchAlertEvents = pgTable("customer_saved_search_alert_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  savedSearchId: uuid("saved_search_id").notNull().references(() => customerSavedSearches.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 32 }).notNull().default("new_match"),
  matchFingerprint: varchar("match_fingerprint", { length: 160 }).notNull().default("initial"),
  isBaseline: boolean("is_baseline").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("customer_saved_search_alert_events_unique").on(table.savedSearchId, table.serviceId, table.eventType, table.matchFingerprint),
  index("customer_saved_search_alert_events_user_idx").on(table.userId, table.createdAt),
  index("customer_saved_search_alert_events_search_idx").on(table.savedSearchId, table.createdAt),
]);


export const customerSupportThreads = pgTable("customer_support_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: varchar("subject", { length: 180 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("open"),
  priority: varchar("priority", { length: 16 }).notNull().default("normal"),
  assignedAdminUserId: uuid("assigned_admin_user_id").references(() => users.id, { onDelete: "set null" }),
  supervisorAdminUserId: uuid("supervisor_admin_user_id").references(() => users.id, { onDelete: "set null" }),
  escalationLevel: integer("escalation_level").notNull().default(0),
  escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  escalationReason: text("escalation_reason"),
  firstResponseDueAt: timestamp("first_response_due_at", { withTimezone: true }),
  resolutionDueAt: timestamp("resolution_due_at", { withTimezone: true }),
  firstRespondedAt: timestamp("first_responded_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("customer_support_threads_customer_idx").on(table.customerId, table.lastMessageAt),
  index("customer_support_threads_assignment_idx").on(table.assignedAdminUserId, table.status, table.lastMessageAt),
  index("customer_support_threads_escalation_idx").on(table.escalationLevel, table.status, table.lastMessageAt),
  index("customer_support_threads_priority_idx").on(table.priority, table.status, table.lastMessageAt),
]);

export const customerSupportMessages = pgTable("customer_support_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull().references(() => customerSupportThreads.id, { onDelete: "cascade" }),
  senderRole: varchar("sender_role", { length: 20 }).notNull(),
  senderUserId: uuid("sender_user_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  customerReadAt: timestamp("customer_read_at", { withTimezone: true }),
  adminReadAt: timestamp("admin_read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("customer_support_messages_thread_idx").on(table.threadId, table.createdAt),
]);

export const supportSlaPolicies = pgTable("support_sla_policies", {
  priority: varchar("priority", { length: 16 }).primaryKey(),
  firstResponseMinutes: integer("first_response_minutes").notNull(),
  resolutionMinutes: integer("resolution_minutes").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supportThreadEvents = pgTable("support_thread_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull().references(() => customerSupportThreads.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 48 }).notNull(),
  fromAgentUserId: uuid("from_agent_user_id").references(() => users.id, { onDelete: "set null" }),
  toAgentUserId: uuid("to_agent_user_id").references(() => users.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<Record<string,unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("support_thread_events_thread_idx").on(table.threadId, table.createdAt),
  index("support_thread_events_actor_idx").on(table.actorUserId, table.createdAt),
]);

export const supportSatisfaction = pgTable("support_satisfaction", {
  threadId: uuid("thread_id").primaryKey().references(() => customerSupportThreads.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("support_satisfaction_customer_idx").on(table.customerId, table.createdAt),
  check("support_satisfaction_rating_check", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
]);

export const customerNotificationPreferences = pgTable("customer_notification_preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  orderEnabled: boolean("order_enabled").notNull().default(true),
  housingEnabled: boolean("housing_enabled").notNull().default(true),
  travelEnabled: boolean("travel_enabled").notNull().default(true),
  paymentEnabled: boolean("payment_enabled").notNull().default(true),
  savedSearchEnabled: boolean("saved_search_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customerNotificationReceipts = pgTable("customer_notification_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceType: varchar("source_type", { length: 32 }).notNull(),
  sourceId: varchar("source_id", { length: 120 }).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("customer_notification_receipts_unique").on(table.userId, table.sourceType, table.sourceId),
  index("customer_notification_receipts_user_idx").on(table.userId, table.updatedAt),
]);

export const customerFavorites = pgTable("customer_favorites", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({columns:[table.userId,table.serviceId]}), index("customer_favorites_user_idx").on(table.userId)]);

export const customerBrowsingHistory = pgTable("customer_browsing_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("customer_history_user_viewed_idx").on(table.userId, table.viewedAt.desc())]);

export const customerSavedSearches = pgTable("customer_saved_searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 120 }).notNull(),
  query: text("query").notNull().default(""),
  moduleCode: varchar("module_code", { length: 40 }),
  filters: jsonb("filters").$type<Record<string,unknown>>().notNull().default({}),
  isPinned: boolean("is_pinned").notNull().default(false),
  watchEnabled: boolean("watch_enabled").notNull().default(false),
  watchEnabledAt: timestamp("watch_enabled_at", { withTimezone: true }),
  lastWatchCheckedAt: timestamp("last_watch_checked_at", { withTimezone: true }),
  lastAlertAt: timestamp("last_alert_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("customer_saved_searches_user_idx").on(table.userId),
  index("customer_saved_searches_pinned_idx").on(table.userId, table.isPinned),
]);

export const customerCoupons = pgTable("customer_coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  title: jsonb("title").$type<Record<string,string>>().notNull().default({}),
  description: jsonb("description").$type<Record<string,string>>().notNull().default({}),
  discountType: varchar("discount_type", { length: 24 }).notNull().default("fixed"),
  discountValue: integer("discount_value").notNull().default(0),
  minSpend: integer("min_spend").notNull().default(0),
  currency: varchar("currency", { length: 8 }).notNull().default("VND"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customerCouponClaims = pgTable("customer_coupon_claims", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  couponId: uuid("coupon_id").notNull().references(() => customerCoupons.id, { onDelete: "cascade" }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  usedAt: timestamp("used_at", { withTimezone: true }),
}, (table) => [primaryKey({columns:[table.userId,table.couponId]}), index("customer_coupon_claims_user_idx").on(table.userId)]);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 24 }).notNull(),
    blobUrl: text("blob_url").notNull(),
    pathname: text("pathname"),
    mimeType: varchar("mime_type", { length: 120 }),
    sizeBytes: integer("size_bytes"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("media_assets_org_idx").on(table.organizationId),
    index("media_assets_service_idx").on(table.serviceId),
    index("media_assets_kind_idx").on(table.kind),
  ],
);

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestCode: varchar("request_code", { length: 40 }).notNull().unique(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id),
    serviceId: uuid("service_id").references(() => services.id),
    customerId: uuid("customer_id").references(() => users.id),
    assignedOrganizationId: uuid("assigned_organization_id").references(() => organizations.id),
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    locale: varchar("locale", { length: 10 }).notNull().default("zh-CN").references(() => languages.code),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 30 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    status: requestStatusEnum("status").notNull().default("new"),
    priority: integer("priority").notNull().default(0),
    cityId: uuid("city_id").references(() => cities.id),
    addressText: text("address_text"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("service_requests_status_idx").on(table.status),
    index("service_requests_module_idx").on(table.moduleId),
    index("service_requests_customer_idx").on(table.customerId),
    index("service_requests_created_at_idx").on(table.createdAt),
  ],
);

export const serviceRequestStatusHistory = pgTable(
  "service_request_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    fromStatus: requestStatusEnum("from_status"),
    toStatus: requestStatusEnum("to_status").notNull(),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("request_status_history_request_idx").on(table.requestId)],
);


export const restaurantCoupons = pgTable("restaurant_coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 40 }).notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  discountType: varchar("discount_type", { length: 20 }).notNull(),
  discountValue: integer("discount_value").notNull(),
  maxDiscountAmount: integer("max_discount_amount"),
  minOrderAmount: integer("min_order_amount").notNull().default(0),
  totalUsageLimit: integer("total_usage_limit"),
  perCustomerLimit: integer("per_customer_limit").notNull().default(1),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  enabled: boolean("enabled").notNull().default(true),
  usedCount: integer("used_count").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("restaurant_coupons_org_code_unique").on(table.organizationId, table.code),
  index("restaurant_coupons_org_idx").on(table.organizationId),
  index("restaurant_coupons_enabled_idx").on(table.enabled),
]);

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id").notNull().references(() => restaurantCoupons.id, { onDelete: "restrict" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestId: uuid("request_id").notNull().references(() => serviceRequests.id, { onDelete: "cascade" }).unique(),
  couponCode: varchar("coupon_code", { length: 40 }).notNull(),
  itemSubtotalBeforeCoupon: integer("item_subtotal_before_coupon").notNull(),
  discountAmount: integer("discount_amount").notNull(),
  itemSubtotalAfterCoupon: integer("item_subtotal_after_coupon").notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("coupon_redemptions_coupon_idx").on(table.couponId),
  index("coupon_redemptions_customer_idx").on(table.customerId),
  index("coupon_redemptions_coupon_customer_idx").on(table.couponId, table.customerId),
]);

export const driverProfiles = pgTable(
  "driver_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 24 }).notNull().default("offline"),
    phone: varchar("phone", { length: 30 }),
    vehicleType: varchar("vehicle_type", { length: 40 }).notNull().default("motorbike"),
    plateNumber: varchar("plate_number", { length: 40 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("driver_profiles_status_idx").on(table.status), index("driver_profiles_user_idx").on(table.userId)],
);

export const deliveryJobs = pgTable(
  "delivery_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull().unique().references(() => serviceRequests.id, { onDelete: "cascade" }),
    driverId: uuid("driver_id").references(() => driverProfiles.id, { onDelete: "set null" }),
    status: varchar("status", { length: 32 }).notNull().default("searching_driver"),
    pickupAddress: text("pickup_address"),
    pickupLatitude: numeric("pickup_latitude", { precision: 10, scale: 7 }),
    pickupLongitude: numeric("pickup_longitude", { precision: 10, scale: 7 }),
    dropoffAddress: text("dropoff_address"),
    dropoffLatitude: numeric("dropoff_latitude", { precision: 10, scale: 7 }),
    dropoffLongitude: numeric("dropoff_longitude", { precision: 10, scale: 7 }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("delivery_jobs_status_idx").on(table.status), index("delivery_jobs_driver_idx").on(table.driverId), index("delivery_jobs_created_idx").on(table.createdAt)],
);


export const deliveryJobEvents = pgTable(
  "delivery_job_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id").notNull().references(() => deliveryJobs.id, { onDelete: "cascade" }),
    driverId: uuid("driver_id").references(() => driverProfiles.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 48 }).notNull(),
    fromStatus: varchar("from_status", { length: 32 }),
    toStatus: varchar("to_status", { length: 32 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("delivery_job_events_job_idx").on(table.jobId),
    index("delivery_job_events_driver_idx").on(table.driverId),
    index("delivery_job_events_created_idx").on(table.createdAt),
  ],
);

export const driverLocations = pgTable(
  "driver_locations",
  {
    driverId: uuid("driver_id").primaryKey().references(() => driverProfiles.id, { onDelete: "cascade" }),
    latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
    accuracyMeters: numeric("accuracy_meters", { precision: 10, scale: 2 }),
    heading: numeric("heading", { precision: 8, scale: 2 }),
    speedMps: numeric("speed_mps", { precision: 10, scale: 2 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const driverLocationHistory = pgTable(
  "driver_location_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    driverId: uuid("driver_id").notNull().references(() => driverProfiles.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => deliveryJobs.id, { onDelete: "cascade" }),
    latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
    accuracyMeters: numeric("accuracy_meters", { precision: 10, scale: 2 }),
    heading: numeric("heading", { precision: 8, scale: 2 }),
    speedMps: numeric("speed_mps", { precision: 10, scale: 2 }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("driver_location_history_driver_idx").on(table.driverId),
    index("driver_location_history_job_idx").on(table.jobId),
    index("driver_location_history_recorded_idx").on(table.recordedAt),
  ],
);



export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull().references(() => serviceRequests.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 32 }).notNull().default("cash_on_delivery"),
    provider: varchar("provider", { length: 32 }).notNull().default("zhaoxi"),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("VND"),
    idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull().unique(),
    providerReference: varchar("provider_reference", { length: 180 }),
    checkoutPayload: jsonb("checkout_payload").$type<Record<string, unknown>>().notNull().default({}),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payment_transactions_request_idx").on(table.requestId),
    index("payment_transactions_status_idx").on(table.status),
    index("payment_transactions_provider_ref_idx").on(table.providerReference),
  ],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id").notNull().references(() => paymentTransactions.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("payment_events_payment_idx").on(table.paymentId), index("payment_events_created_idx").on(table.createdAt)],
);


export const paymentProviderEvents = pgTable(
  "payment_provider_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { length: 40 }).notNull(),
    providerEventId: varchar("provider_event_id", { length: 180 }).notNull(),
    paymentId: uuid("payment_id").references(() => paymentTransactions.id, { onDelete: "set null" }),
    providerTransactionId: varchar("provider_transaction_id", { length: 180 }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
    signatureTimestamp: varchar("signature_timestamp", { length: 32 }),
    signatureNonce: varchar("signature_nonce", { length: 180 }),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    uniqueIndex("payment_provider_events_provider_event_unique").on(table.provider, table.providerEventId),
    index("payment_provider_events_payment_idx").on(table.paymentId),
    index("payment_provider_events_transaction_idx").on(table.providerTransactionId),
    index("payment_provider_events_received_idx").on(table.receivedAt),
  ],
);

export const supportConversations = pgTable(
  "support_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    role: varchar("role", { length: 24 }).notNull().default("customer"),
    locale: varchar("locale", { length: 10 }).notNull().default("vi-VN"),
    subject: varchar("subject", { length: 240 }).notNull().default("ZhaoXi Support"),
    status: varchar("status", { length: 24 }).notNull().default("open"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("support_conversations_user_idx").on(table.userId), index("support_conversations_org_idx").on(table.organizationId), index("support_conversations_status_idx").on(table.status)],
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => supportConversations.id, { onDelete: "cascade" }),
    senderRole: varchar("sender_role", { length: 24 }).notNull(),
    body: text("body").notNull(),
    intent: varchar("intent", { length: 60 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("support_messages_conversation_idx").on(table.conversationId), index("support_messages_created_idx").on(table.createdAt)],
);


export const runtimeEvents = pgTable(
  "runtime_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    app: varchar("app", { length: 24 }).notNull(),
    environment: varchar("environment", { length: 24 }).notNull().default("production"),
    severity: varchar("severity", { length: 16 }).notNull().default("error"),
    eventType: varchar("event_type", { length: 64 }).notNull().default("runtime_error"),
    message: text("message").notNull(),
    digest: varchar("digest", { length: 180 }),
    route: text("route"),
    release: varchar("release", { length: 40 }).notNull().default("15.1.0"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("runtime_events_created_idx").on(table.createdAt),
    index("runtime_events_app_idx").on(table.app),
    index("runtime_events_severity_idx").on(table.severity),
    index("runtime_events_type_idx").on(table.eventType),
  ],
);


export const betaFeedback = pgTable(
  "beta_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    app: varchar("app", { length: 24 }).notNull(),
    category: varchar("category", { length: 32 }).notNull().default("general"),
    rating: integer("rating"),
    message: text("message").notNull(),
    route: text("route"),
    release: varchar("release", { length: 40 }).notNull().default("15.2.0"),
    channel: varchar("channel", { length: 16 }).notNull().default("beta"),
    status: varchar("status", { length: 24 }).notNull().default("new"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("beta_feedback_created_idx").on(table.createdAt),
    index("beta_feedback_app_idx").on(table.app),
    index("beta_feedback_status_idx").on(table.status),
    index("beta_feedback_release_idx").on(table.release),
  ],
);


// Sprint 15.3 Beta Access Control & Invite System
export const betaInvites = pgTable("beta_invites", {
  id: uuid("id").primaryKey().defaultRandom(), codeHash: varchar("code_hash", {length:64}).notNull().unique(), codeHint: varchar("code_hint", {length:16}).notNull(),
  label: varchar("label", {length:120}), role: varchar("role", {length:24}).notNull().default("customer"), maxUses: integer("max_uses").notNull().default(1), usedCount: integer("used_count").notNull().default(0),
  status: varchar("status", {length:24}).notNull().default("active"), expiresAt: timestamp("expires_at", {withTimezone:true}), createdBy: uuid("created_by").references(()=>users.id,{onDelete:"set null"}),
  createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(), updatedAt: timestamp("updated_at", {withTimezone:true}).notNull().defaultNow(),
}, t=>[index("beta_invites_status_idx").on(t.status), index("beta_invites_role_idx").on(t.role)]);
export const betaAccess = pgTable("beta_access", {
  id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}), role: varchar("role", {length:24}).notNull(),
  status: varchar("status", {length:24}).notNull().default("active"), source: varchar("source", {length:24}).notNull().default("invite"), inviteId: uuid("invite_id").references(()=>betaInvites.id,{onDelete:"set null"}),
  grantedBy: uuid("granted_by").references(()=>users.id,{onDelete:"set null"}), notes: text("notes"), createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(), updatedAt: timestamp("updated_at", {withTimezone:true}).notNull().defaultNow(),
}, t=>[uniqueIndex("beta_access_user_role_unique").on(t.userId,t.role), index("beta_access_status_idx").on(t.status)]);
export const betaInviteRedemptions = pgTable("beta_invite_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(), inviteId: uuid("invite_id").notNull().references(()=>betaInvites.id,{onDelete:"cascade"}), userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}), role: varchar("role", {length:24}).notNull(), createdAt: timestamp("created_at", {withTimezone:true}).notNull().defaultNow(),
}, t=>[index("beta_redemptions_invite_idx").on(t.inviteId), index("beta_redemptions_user_idx").on(t.userId)]);


// Sprint 15.4 Beta Onboarding & Role Provisioning
export const onboardingApplications = pgTable("onboarding_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  role: varchar("role",{length:24}).notNull(),
  status: varchar("status",{length:24}).notNull().default("draft"),
  displayName: varchar("display_name",{length:120}), phone: varchar("phone",{length:30}), city: varchar("city",{length:120}),
  businessName: varchar("business_name",{length:180}), businessType: varchar("business_type",{length:40}), addressText: text("address_text"),
  vehicleType: varchar("vehicle_type",{length:40}), plateNumber: varchar("plate_number",{length:32}), notes: text("notes"),
  reviewNote: text("review_note"), reviewedBy: uuid("reviewed_by").references(()=>users.id,{onDelete:"set null"}),
  submittedAt: timestamp("submitted_at",{withTimezone:true}), reviewedAt: timestamp("reviewed_at",{withTimezone:true}),
  createdAt: timestamp("created_at",{withTimezone:true}).notNull().defaultNow(), updatedAt: timestamp("updated_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[uniqueIndex("onboarding_user_role_unique").on(t.userId,t.role),index("onboarding_status_idx").on(t.status),index("onboarding_role_idx").on(t.role)]);


export const roleSwitchHandoffs = pgTable(
  "role_switch_handoffs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeHash: varchar("code_hash", { length: 64 }).notNull().unique(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetRole: varchar("target_role", { length: 24 }).notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("role_switch_handoffs_user_idx").on(table.userId), index("role_switch_handoffs_expires_idx").on(table.expiresAt)],
);

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 120 }).notNull().unique(),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(false),
    killSwitch: boolean("kill_switch").notNull().default(false),
    channels: jsonb("channels").$type<string[]>().notNull().default(["beta"]),
    roles: jsonb("roles").$type<string[]>().notNull().default(["customer","partner","driver","admin"]),
    rolloutPercent: integer("rollout_percent").notNull().default(100),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("feature_flags_enabled_idx").on(table.enabled), index("feature_flags_key_idx").on(table.key)],
);

export const runtimeControls = pgTable(
  "runtime_controls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    app: varchar("app", { length: 24 }).notNull().unique(),
    accessMode: varchar("access_mode", { length: 24 }).notNull().default("beta"),
    publicRolloutPercent: integer("public_rollout_percent").notNull().default(100),
    maintenanceEnabled: boolean("maintenance_enabled").notNull().default(false),
    maintenanceMessage: jsonb("maintenance_message").$type<Record<string, string>>().notNull().default({}),
    notice: jsonb("notice").$type<Record<string, string>>().notNull().default({}),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("runtime_controls_app_idx").on(table.app)],
);

export const releaseApprovals = pgTable(
  "release_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    version: varchar("version", { length: 40 }).notNull(),
    releaseCandidate: varchar("release_candidate", { length: 80 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("approved"),
    note: text("note"),
    snapshot: jsonb("snapshot").$type<{ runtimeControls: unknown[]; featureFlags: unknown[] }>().notNull(),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    rolledBackBy: uuid("rolled_back_by").references(() => users.id, { onDelete: "set null" }),
    rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("release_approvals_created_idx").on(table.createdAt),
    index("release_approvals_status_idx").on(table.status),
  ],
);

export const releaseAlertPolicies = pgTable(
  "release_alert_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 80 }).notNull().unique(),
    name: varchar("name", { length: 180 }).notNull(),
    metric: varchar("metric", { length: 80 }).notNull(),
    comparator: varchar("comparator", { length: 8 }).notNull().default(">="),
    threshold: numeric("threshold", { precision: 12, scale: 2 }).notNull(),
    severity: varchar("severity", { length: 16 }).notNull().default("warning"),
    windowMinutes: integer("window_minutes").notNull().default(60),
    enabled: boolean("enabled").notNull().default(true),
    cooldownMinutes: integer("cooldown_minutes").notNull().default(30),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("release_alert_policies_enabled_idx").on(table.enabled)],
);

export const releaseIncidents = pgTable(
  "release_incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    policyId: uuid("policy_id").references(() => releaseAlertPolicies.id, { onDelete: "set null" }),
    policyKey: varchar("policy_key", { length: 80 }).notNull(),
    metric: varchar("metric", { length: 80 }).notNull(),
    severity: varchar("severity", { length: 16 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("open"),
    observedValue: numeric("observed_value", { precision: 12, scale: 2 }).notNull(),
    threshold: numeric("threshold", { precision: 12, scale: 2 }).notNull(),
    windowMinutes: integer("window_minutes").notNull(),
    message: text("message").notNull(),
    releaseVersion: varchar("release_version", { length: 40 }),
    acknowledgedBy: uuid("acknowledged_by").references(() => users.id, { onDelete: "set null" }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("release_incidents_status_idx").on(table.status), index("release_incidents_created_idx").on(table.createdAt)],
);

export const uiAcceptanceItems = pgTable(
  "ui_acceptance_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemKey: varchar("item_key", { length: 120 }).notNull().unique(),
    app: varchar("app", { length: 24 }).notNull(),
    category: varchar("category", { length: 60 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    route: varchar("route", { length: 240 }),
    priority: varchar("priority", { length: 16 }).notNull().default("high"),
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    notes: text("notes"),
    evidenceUrl: text("evidence_url"),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ui_acceptance_items_app_idx").on(table.app),
    index("ui_acceptance_items_status_idx").on(table.status),
    index("ui_acceptance_items_priority_idx").on(table.priority),
  ],
);

export const rolloutGuardPolicies = pgTable(
  "rollout_guard_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    app: varchar("app", { length: 24 }).notNull().unique(),
    enabled: boolean("enabled").notNull().default(true),
    healthWindowMinutes: integer("health_window_minutes").notNull().default(60),
    warningMaxPercent: integer("warning_max_percent").notNull().default(25),
    criticalFallbackPercent: integer("critical_fallback_percent").notNull().default(5),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("rollout_guard_policies_app_idx").on(table.app)],
);

export const rolloutGuardEvents = pgTable(
  "rollout_guard_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    app: varchar("app", { length: 24 }).notNull(),
    healthStatus: varchar("health_status", { length: 24 }).notNull(),
    previousPercent: integer("previous_percent").notNull(),
    nextPercent: integer("next_percent").notNull(),
    action: varchar("action", { length: 40 }).notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("rollout_guard_events_app_idx").on(table.app), index("rollout_guard_events_created_idx").on(table.createdAt)],
);

export const releaseAuditEvents = pgTable(
  "release_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: varchar("actor_type", { length: 24 }).notNull().default("user"),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 80 }).notNull(),
    resourceId: varchar("resource_id", { length: 160 }),
    app: varchar("app", { length: 24 }),
    beforeState: jsonb("before_state").$type<Record<string, unknown> | null>(),
    afterState: jsonb("after_state").$type<Record<string, unknown> | null>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("release_audit_events_created_idx").on(table.createdAt),
    index("release_audit_events_resource_idx").on(table.resourceType),
    index("release_audit_events_actor_idx").on(table.actorUserId),
  ],
);

export const restaurantCommissionPolicies = pgTable("restaurant_commission_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  scope: varchar("scope", { length: 24 }).notNull().default("global"),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  mode: varchar("mode", { length: 24 }).notNull().default("percentage"),
  percentageBps: integer("percentage_bps").notNull().default(0),
  fixedPerOrder: integer("fixed_per_order").notNull().default(0),
  enabled: boolean("enabled").notNull().default(false),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  note: varchar("note", { length: 500 }),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("restaurant_commission_policies_scope_idx").on(table.scope),
  index("restaurant_commission_policies_org_idx").on(table.organizationId),
  index("restaurant_commission_policies_enabled_idx").on(table.enabled),
]);

export const restaurantSettlements = pgTable("restaurant_settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  currency: varchar("currency", { length: 8 }).notNull().default("VND"),
  orderCount: integer("order_count").notNull().default(0),
  itemBaseRevenue: integer("item_base_revenue").notNull().default(0),
  promotionDiscount: integer("promotion_discount").notNull().default(0),
  couponDiscount: integer("coupon_discount").notNull().default(0),
  foodRevenue: integer("food_revenue").notNull().default(0),
  deliveryGrossFee: integer("delivery_gross_fee").notNull().default(0),
  deliverySubsidy: integer("delivery_subsidy").notNull().default(0),
  customerDeliveryFee: integer("customer_delivery_fee").notNull().default(0),
  customerPaid: integer("customer_paid").notNull().default(0),
  partnerPayable: integer("partner_payable").notNull().default(0),
  platformCommission: integer("platform_commission").notNull().default(0),
  adjustments: integer("adjustments").notNull().default(0),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull().default({}),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  confirmedByUserId: uuid("confirmed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  paidByUserId: uuid("paid_by_user_id").references(() => users.id, { onDelete: "set null" }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("restaurant_settlements_org_period_unique").on(table.organizationId, table.periodStart, table.periodEnd),
  index("restaurant_settlements_org_idx").on(table.organizationId),
  index("restaurant_settlements_status_idx").on(table.status),
]);

export const restaurantSettlementAdjustments = pgTable("restaurant_settlement_adjustments", {
  id: uuid("id").primaryKey().defaultRandom(),
  settlementId: uuid("settlement_id").notNull().references(() => restaurantSettlements.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("restaurant_settlement_adjustments_settlement_idx").on(table.settlementId)]);

export const operationsAuditLogs = pgTable(
  "operations_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: varchar("actor_type", { length: 24 }).notNull().default("admin"),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    area: varchar("area", { length: 80 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    targetType: varchar("target_type", { length: 80 }),
    targetId: varchar("target_id", { length: 160 }),
    beforeState: jsonb("before_state").$type<unknown>(),
    afterState: jsonb("after_state").$type<unknown>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("operations_audit_logs_area_idx").on(table.area),
    index("operations_audit_logs_created_idx").on(table.createdAt),
    index("operations_audit_logs_actor_idx").on(table.actorUserId),
  ],
);


export const partnerPaymentTransactions = pgTable(
  "partner_payment_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull().references(() => serviceRequests.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    intentId: varchar("intent_id", { length: 120 }).notNull(),
    provider: varchar("provider", { length: 40 }).notNull(),
    merchantId: varchar("merchant_id", { length: 180 }).notNull(),
    providerReference: varchar("provider_reference", { length: 220 }),
    eventType: varchar("event_type", { length: 40 }).notNull(),
    status: varchar("status", { length: 40 }).notNull(),
    amount: integer("amount").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("VND"),
    source: varchar("source", { length: 40 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 220 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    requestIdx: index("partner_payment_transactions_request_idx").on(table.requestId),
    organizationIdx: index("partner_payment_transactions_org_idx").on(table.organizationId),
    intentIdx: index("partner_payment_transactions_intent_idx").on(table.intentId),
    createdIdx: index("partner_payment_transactions_created_idx").on(table.createdAt),
    idempotencyUnique: uniqueIndex("partner_payment_transactions_idempotency_unique").on(table.idempotencyKey),
  }),
);


// ZhaoXi 17.1 — Support CRM, Macros, Tags, Internal Notes & Automation Rules
export const supportTags = pgTable("support_tags",{
 id:uuid("id").primaryKey().defaultRandom(),name:varchar("name",{length:80}).notNull(),color:varchar("color",{length:24}).notNull().default("neutral"),isActive:boolean("is_active").notNull().default(true),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},table=>[uniqueIndex("support_tags_name_unique").on(table.name)]);

export const supportThreadTags = pgTable("support_thread_tags",{
 threadId:uuid("thread_id").notNull().references(()=>customerSupportThreads.id,{onDelete:"cascade"}),tagId:uuid("tag_id").notNull().references(()=>supportTags.id,{onDelete:"cascade"}),createdByUserId:uuid("created_by_user_id").references(()=>users.id,{onDelete:"set null"}),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},table=>[uniqueIndex("support_thread_tags_unique").on(table.threadId,table.tagId),index("support_thread_tags_thread_idx").on(table.threadId)]);

export const supportInternalNotes = pgTable("support_internal_notes",{
 id:uuid("id").primaryKey().defaultRandom(),threadId:uuid("thread_id").notNull().references(()=>customerSupportThreads.id,{onDelete:"cascade"}),authorAdminUserId:uuid("author_admin_user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),body:text("body").notNull(),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},table=>[index("support_internal_notes_thread_idx").on(table.threadId)]);

export const supportMacros = pgTable("support_macros",{
 id:uuid("id").primaryKey().defaultRandom(),title:varchar("title",{length:120}).notNull(),body:text("body").notNull(),locale:varchar("locale",{length:16}).notNull().default("vi-VN"),category:varchar("category",{length:60}).notNull().default("general"),isActive:boolean("is_active").notNull().default(true),createdByUserId:uuid("created_by_user_id").references(()=>users.id,{onDelete:"set null"}),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},table=>[index("support_macros_locale_idx").on(table.locale)]);

export const supportAutomationRules = pgTable("support_automation_rules",{
 id:uuid("id").primaryKey().defaultRandom(),name:varchar("name",{length:120}).notNull(),trigger:varchar("trigger",{length:60}).notNull(),conditions:jsonb("conditions").$type<Record<string,unknown>>().notNull().default({}),actions:jsonb("actions").$type<Record<string,unknown>>().notNull().default({}),isEnabled:boolean("is_enabled").notNull().default(true),createdByUserId:uuid("created_by_user_id").references(()=>users.id,{onDelete:"set null"}),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},table=>[index("support_automation_rules_trigger_idx").on(table.trigger)]);


// ZhaoXi 17.2 — Support Knowledge Base, Self-Service & Case Intelligence
export const supportKnowledgeArticles = pgTable("support_knowledge_articles",{
 id:uuid("id").primaryKey().defaultRandom(),
 slug:varchar("slug",{length:180}).notNull(),
 locale:varchar("locale",{length:16}).notNull().default("vi-VN"),
 title:varchar("title",{length:220}).notNull(),
 summary:text("summary").notNull().default(""),
 body:text("body").notNull(),
 category:varchar("category",{length:80}).notNull().default("general"),
 tags:jsonb("tags").$type<string[]>().notNull().default([]),
 status:varchar("status",{length:24}).notNull().default("draft"),
 publishedAt:timestamp("published_at",{withTimezone:true}),
 createdByUserId:uuid("created_by_user_id").references(()=>users.id,{onDelete:"set null"}),
 updatedByUserId:uuid("updated_by_user_id").references(()=>users.id,{onDelete:"set null"}),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},table=>[
 uniqueIndex("support_knowledge_articles_slug_locale_unique").on(table.slug,table.locale),
 index("support_knowledge_articles_status_idx").on(table.status,table.locale),
 index("support_knowledge_articles_category_idx").on(table.category,table.locale)
]);

export const supportKnowledgeFeedback = pgTable("support_knowledge_feedback",{
 id:uuid("id").primaryKey().defaultRandom(),
 articleId:uuid("article_id").notNull().references(()=>supportKnowledgeArticles.id,{onDelete:"cascade"}),
 userId:uuid("user_id").references(()=>users.id,{onDelete:"set null"}),
 helpful:boolean("helpful").notNull(),
 comment:text("comment"),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},table=>[
 index("support_knowledge_feedback_article_idx").on(table.articleId,table.createdAt)
]);

export const supportKnowledgeViews = pgTable("support_knowledge_views",{
 id:uuid("id").primaryKey().defaultRandom(),
 articleId:uuid("article_id").notNull().references(()=>supportKnowledgeArticles.id,{onDelete:"cascade"}),
 userId:uuid("user_id").references(()=>users.id,{onDelete:"set null"}),
 source:varchar("source",{length:40}).notNull().default("help_center"),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},table=>[
 index("support_knowledge_views_article_idx").on(table.articleId,table.createdAt)
]);

// ZhaoXi 17.3 — Unified Customer Relationship Hub
export const customerRelationshipProfiles = pgTable("customer_relationship_profiles",{
 customerId:uuid("customer_id").primaryKey().references(()=>users.id,{onDelete:"cascade"}),
 relationshipStage:varchar("relationship_stage",{length:32}).notNull().default("active"),
 adminTags:jsonb("admin_tags").$type<string[]>().notNull().default([]),
 operationalNote:text("operational_note"),
 updatedByAdminUserId:uuid("updated_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
});
export const customerRelationshipEvents = pgTable("customer_relationship_events",{
 id:uuid("id").primaryKey().defaultRandom(),
 customerId:uuid("customer_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 actorAdminUserId:uuid("actor_admin_user_id").references(()=>users.id,{onDelete:"set null"}),
 eventType:varchar("event_type",{length:60}).notNull(),
 summary:text("summary").notNull(),
 metadata:jsonb("metadata").$type<Record<string,unknown>>().notNull().default({}),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},table=>[index("customer_relationship_events_customer_idx").on(table.customerId,table.createdAt)]);


// ZhaoXi 17.4 — Unified Customer Operations
export const customerOperationTasks = pgTable("customer_operation_tasks",{
 id:uuid("id").primaryKey().defaultRandom(),
 customerId:uuid("customer_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 title:varchar("title",{length:220}).notNull(),
 description:text("description"),
 taskType:varchar("task_type",{length:40}).notNull().default("follow_up"),
 priority:varchar("priority",{length:16}).notNull().default("normal"),
 status:varchar("status",{length:24}).notNull().default("open"),
 assignedAdminUserId:uuid("assigned_admin_user_id").references(()=>users.id,{onDelete:"set null"}),
 dueAt:timestamp("due_at",{withTimezone:true}),
 completedAt:timestamp("completed_at",{withTimezone:true}),
 sourceType:varchar("source_type",{length:48}),
 sourceId:varchar("source_id",{length:120}),
 createdByAdminUserId:uuid("created_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},table=>[
 index("customer_operation_tasks_customer_idx").on(table.customerId,table.status,table.dueAt),
 index("customer_operation_tasks_assignee_idx").on(table.assignedAdminUserId,table.status,table.dueAt)
]);

export const customerSegments = pgTable("customer_segments",{
 id:uuid("id").primaryKey().defaultRandom(),
 code:varchar("code",{length:60}).notNull().unique(),
 name:varchar("name",{length:120}).notNull(),
 description:text("description"),
 isActive:boolean("is_active").notNull().default(true),
 createdByAdminUserId:uuid("created_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
});

export const customerSegmentMembers = pgTable("customer_segment_members",{
 segmentId:uuid("segment_id").notNull().references(()=>customerSegments.id,{onDelete:"cascade"}),
 customerId:uuid("customer_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 addedByAdminUserId:uuid("added_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},table=>[
 primaryKey({columns:[table.segmentId,table.customerId]}),
 index("customer_segment_members_customer_idx").on(table.customerId)
]);

export const customerServiceRecoveryCases = pgTable("customer_service_recovery_cases",{
 id:uuid("id").primaryKey().defaultRandom(),
 customerId:uuid("customer_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 reason:varchar("reason",{length:120}).notNull(),
 summary:text("summary").notNull(),
 severity:varchar("severity",{length:16}).notNull().default("normal"),
 status:varchar("status",{length:24}).notNull().default("open"),
 assignedAdminUserId:uuid("assigned_admin_user_id").references(()=>users.id,{onDelete:"set null"}),
 dueAt:timestamp("due_at",{withTimezone:true}),
 resolutionNote:text("resolution_note"),
 resolvedAt:timestamp("resolved_at",{withTimezone:true}),
 sourceType:varchar("source_type",{length:48}),
 sourceId:varchar("source_id",{length:120}),
 createdByAdminUserId:uuid("created_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},table=>[
 index("customer_service_recovery_customer_idx").on(table.customerId,table.status,table.dueAt),
 index("customer_service_recovery_assignee_idx").on(table.assignedAdminUserId,table.status,table.dueAt)
]);

export const customerOperationEvents = pgTable("customer_operation_events",{
 id:uuid("id").primaryKey().defaultRandom(),
 customerId:uuid("customer_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
 actorAdminUserId:uuid("actor_admin_user_id").references(()=>users.id,{onDelete:"set null"}),
 entityType:varchar("entity_type",{length:40}).notNull(),
 entityId:uuid("entity_id"),
 action:varchar("action",{length:60}).notNull(),
 metadata:jsonb("metadata").$type<Record<string,unknown>>().notNull().default({}),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},table=>[
 index("customer_operation_events_customer_idx").on(table.customerId,table.createdAt)
]);

// ZhaoXi 17.5 — Unified Operations Command Center
export const operationsAgentCapacity = pgTable("operations_agent_capacity",{
 adminUserId:uuid("admin_user_id").primaryKey().references(()=>users.id,{onDelete:"cascade"}),
 dailyCapacity:integer("daily_capacity").notNull().default(20),
 warningLoadPercent:integer("warning_load_percent").notNull().default(80),
 criticalLoadPercent:integer("critical_load_percent").notNull().default(100),
 isAvailable:boolean("is_available").notNull().default(true),
 note:text("note"),
 updatedByAdminUserId:uuid("updated_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
});

// ZhaoXi 17.6 — Unified Operations Automation & Intelligent Routing
export const operationsRoutingPolicies = pgTable("operations_routing_policies",{
 id:uuid("id").primaryKey().defaultRandom(),
 name:varchar("name",{length:160}).notNull(),
 workKind:varchar("work_kind",{length:48}).notNull().default("all"),
 priorityWeight:integer("priority_weight").notNull().default(30),
 slaWeight:integer("sla_weight").notNull().default(40),
 capacityWeight:integer("capacity_weight").notNull().default(30),
 escalationMinutes:integer("escalation_minutes").notNull().default(120),
 isEnabled:boolean("is_enabled").notNull().default(true),
 createdByAdminUserId:uuid("created_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),
 updatedByAdminUserId:uuid("updated_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
});
export const operationsRoutingDecisions = pgTable("operations_routing_decisions",{
 id:uuid("id").primaryKey().defaultRandom(),workKind:varchar("work_kind",{length:48}).notNull(),workId:varchar("work_id",{length:120}).notNull(),
 recommendedAdminUserId:uuid("recommended_admin_user_id").references(()=>users.id,{onDelete:"set null"}),score:integer("score").notNull().default(0),reason:text("reason").notNull(),
 status:varchar("status",{length:24}).notNull().default("recommended"),decidedByAdminUserId:uuid("decided_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),decidedAt:timestamp("decided_at",{withTimezone:true}),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("operations_routing_decisions_work_idx").on(t.workKind,t.workId),index("operations_routing_decisions_status_idx").on(t.status,t.createdAt)]);

// ZhaoXi 17.7 — Operations Workflow Orchestration, Escalation Playbooks & Approval Center
export const operationsPlaybooks = pgTable("operations_playbooks",{
 id:uuid("id").primaryKey().defaultRandom(),code:varchar("code",{length:80}).notNull().unique(),name:varchar("name",{length:180}).notNull(),workKind:varchar("work_kind",{length:48}).notNull().default("all"),description:text("description"),triggerRisk:varchar("trigger_risk",{length:24}).notNull().default("critical"),steps:jsonb("steps").$type<Array<{key:string;title:string;requiresApproval?:boolean}>>().notNull().default([]),isEnabled:boolean("is_enabled").notNull().default(true),createdByAdminUserId:uuid("created_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
});
export const operationsWorkflowRuns = pgTable("operations_workflow_runs",{
 id:uuid("id").primaryKey().defaultRandom(),workKind:varchar("work_kind",{length:48}).notNull(),workId:varchar("work_id",{length:120}).notNull(),playbookId:uuid("playbook_id").notNull().references(()=>operationsPlaybooks.id,{onDelete:"restrict"}),status:varchar("status",{length:24}).notNull().default("proposed"),currentStep:integer("current_step").notNull().default(0),context:jsonb("context").$type<Record<string,unknown>>().notNull().default({}),proposedByAdminUserId:uuid("proposed_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),approvedByAdminUserId:uuid("approved_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),approvedAt:timestamp("approved_at",{withTimezone:true}),completedAt:timestamp("completed_at",{withTimezone:true}),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("operations_workflow_runs_work_idx").on(t.workKind,t.workId),index("operations_workflow_runs_status_idx").on(t.status,t.createdAt)]);
export const operationsApprovalRequests = pgTable("operations_approval_requests",{
 id:uuid("id").primaryKey().defaultRandom(),workflowRunId:uuid("workflow_run_id").notNull().references(()=>operationsWorkflowRuns.id,{onDelete:"cascade"}),stepKey:varchar("step_key",{length:80}).notNull(),title:varchar("title",{length:220}).notNull(),reason:text("reason"),status:varchar("status",{length:24}).notNull().default("pending"),requestedByAdminUserId:uuid("requested_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),decidedByAdminUserId:uuid("decided_by_admin_user_id").references(()=>users.id,{onDelete:"set null"}),decisionNote:text("decision_note"),decidedAt:timestamp("decided_at",{withTimezone:true}),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("operations_approval_requests_status_idx").on(t.status,t.createdAt)]);
export const operationsWorkflowEvents = pgTable("operations_workflow_events",{
 id:uuid("id").primaryKey().defaultRandom(),workflowRunId:uuid("workflow_run_id").notNull().references(()=>operationsWorkflowRuns.id,{onDelete:"cascade"}),actorAdminUserId:uuid("actor_admin_user_id").references(()=>users.id,{onDelete:"set null"}),eventType:varchar("event_type",{length:60}).notNull(),metadata:jsonb("metadata").$type<Record<string,unknown>>().notNull().default({}),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("operations_workflow_events_run_idx").on(t.workflowRunId,t.createdAt)]);
