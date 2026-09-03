import {
  boolean,
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_wechat_open_id_unique").on(table.wechatOpenId),
    index("users_phone_idx").on(table.phone),
  ],
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
  ],
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
