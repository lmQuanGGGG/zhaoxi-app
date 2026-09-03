CREATE TYPE "public"."organization_member_role" AS ENUM('owner', 'manager', 'staff');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('new', 'reviewing', 'assigned', 'accepted', 'in_progress', 'waiting_customer', 'completed', 'cancelled', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled', 'pending');--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(24) NOT NULL,
	"organization_id" uuid,
	"access_token_hash" varchar(64) NOT NULL,
	"refresh_token_hash" varchar(64) NOT NULL,
	"device_id" varchar(128),
	"device_name" varchar(180),
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"access_expires_at" timestamp with time zone NOT NULL,
	"refresh_expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_access_token_hash_unique" UNIQUE("access_token_hash"),
	CONSTRAINT "auth_sessions_refresh_token_hash_unique" UNIQUE("refresh_token_hash")
);
--> statement-breakpoint
CREATE TABLE "beta_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(24) NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"source" varchar(24) DEFAULT 'invite' NOT NULL,
	"invite_id" uuid,
	"granted_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beta_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"organization_id" uuid,
	"app" varchar(24) NOT NULL,
	"category" varchar(32) DEFAULT 'general' NOT NULL,
	"rating" integer,
	"message" text NOT NULL,
	"route" text,
	"release" varchar(40) DEFAULT '15.2.0' NOT NULL,
	"channel" varchar(16) DEFAULT 'beta' NOT NULL,
	"status" varchar(24) DEFAULT 'new' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beta_invite_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invite_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(24) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beta_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"code_hint" varchar(16) NOT NULL,
	"label" varchar(120),
	"role" varchar(24) DEFAULT 'customer' NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beta_invites_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"country_code" varchar(2) DEFAULT 'VN' NOT NULL,
	"name_vi" varchar(120) NOT NULL,
	"name_zh_cn" varchar(120) NOT NULL,
	"name_zh_tw" varchar(120),
	"name_en" varchar(120),
	"timezone" varchar(60) DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"coupon_code" varchar(40) NOT NULL,
	"item_subtotal_before_coupon" integer NOT NULL,
	"discount_amount" integer NOT NULL,
	"item_subtotal_after_coupon" integer NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_redemptions_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "customer_browsing_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_coupon_claims" (
	"user_id" uuid NOT NULL,
	"coupon_id" uuid NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "customer_coupon_claims_user_id_coupon_id_pk" PRIMARY KEY("user_id","coupon_id")
);
--> statement-breakpoint
CREATE TABLE "customer_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"title" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"description" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"discount_type" varchar(24) DEFAULT 'fixed' NOT NULL,
	"discount_value" integer DEFAULT 0 NOT NULL,
	"min_spend" integer DEFAULT 0 NOT NULL,
	"currency" varchar(8) DEFAULT 'VND' NOT NULL,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "customer_favorites" (
	"user_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_favorites_user_id_service_id_pk" PRIMARY KEY("user_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "customer_notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"order_enabled" boolean DEFAULT true NOT NULL,
	"housing_enabled" boolean DEFAULT true NOT NULL,
	"travel_enabled" boolean DEFAULT true NOT NULL,
	"payment_enabled" boolean DEFAULT true NOT NULL,
	"saved_search_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_notification_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" varchar(32) NOT NULL,
	"source_id" varchar(120) NOT NULL,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_notification_states" (
	"user_id" uuid NOT NULL,
	"event_key" varchar(220) NOT NULL,
	"read_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_notification_states_user_id_event_key_pk" PRIMARY KEY("user_id","event_key")
);
--> statement-breakpoint
CREATE TABLE "customer_operation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"actor_admin_user_id" uuid,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" uuid,
	"action" varchar(60) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_operation_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"title" varchar(220) NOT NULL,
	"description" text,
	"task_type" varchar(40) DEFAULT 'follow_up' NOT NULL,
	"priority" varchar(16) DEFAULT 'normal' NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"assigned_admin_user_id" uuid,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"source_type" varchar(48),
	"source_id" varchar(120),
	"created_by_admin_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"nationality" varchar(80),
	"gender" varchar(24),
	"birthday" varchar(10),
	"city_name" varchar(120),
	"address_text" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"whatsapp" varchar(40),
	"wechat_contact_id" varchar(128),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_relationship_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"actor_admin_user_id" uuid,
	"event_type" varchar(60) NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_relationship_profiles" (
	"customer_id" uuid PRIMARY KEY NOT NULL,
	"relationship_stage" varchar(32) DEFAULT 'active' NOT NULL,
	"admin_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"operational_note" text,
	"updated_by_admin_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_saved_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(80) NOT NULL,
	"recipient_name" varchar(120),
	"recipient_phone" varchar(30),
	"address_text" text NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_saved_search_alert_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saved_search_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"event_type" varchar(32) DEFAULT 'new_match' NOT NULL,
	"match_fingerprint" varchar(160) DEFAULT 'initial' NOT NULL,
	"is_baseline" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(120) NOT NULL,
	"query" text DEFAULT '' NOT NULL,
	"module_code" varchar(40),
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"watch_enabled" boolean DEFAULT false NOT NULL,
	"watch_enabled_at" timestamp with time zone,
	"last_watch_checked_at" timestamp with time zone,
	"last_alert_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_segment_members" (
	"segment_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"added_by_admin_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_segment_members_segment_id_customer_id_pk" PRIMARY KEY("segment_id","customer_id")
);
--> statement-breakpoint
CREATE TABLE "customer_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(60) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_admin_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_segments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "customer_service_recovery_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"reason" varchar(120) NOT NULL,
	"summary" text NOT NULL,
	"severity" varchar(16) DEFAULT 'normal' NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"assigned_admin_user_id" uuid,
	"due_at" timestamp with time zone,
	"resolution_note" text,
	"resolved_at" timestamp with time zone,
	"source_type" varchar(48),
	"source_id" varchar(120),
	"created_by_admin_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_role" varchar(20) NOT NULL,
	"sender_user_id" uuid,
	"body" text NOT NULL,
	"customer_read_at" timestamp with time zone,
	"admin_read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_support_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" varchar(40) DEFAULT 'default' NOT NULL,
	"basic_assistant_enabled" boolean DEFAULT true NOT NULL,
	"paid_human_enabled" boolean DEFAULT true NOT NULL,
	"paid_human_fee" integer DEFAULT 50000 NOT NULL,
	"paid_human_currency" varchar(8) DEFAULT 'VND' NOT NULL,
	"emergency_priority" boolean DEFAULT true NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_support_settings_scope_unique" UNIQUE("scope")
);
--> statement-breakpoint
CREATE TABLE "customer_support_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"subject" varchar(180) NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"priority" varchar(16) DEFAULT 'normal' NOT NULL,
	"assigned_admin_user_id" uuid,
	"supervisor_admin_user_id" uuid,
	"escalation_level" integer DEFAULT 0 NOT NULL,
	"escalated_at" timestamp with time zone,
	"escalation_reason" text,
	"first_response_due_at" timestamp with time zone,
	"resolution_due_at" timestamp with time zone,
	"first_responded_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_ui_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" varchar(40) DEFAULT 'default' NOT NULL,
	"banner_effect" integer DEFAULT 0 NOT NULL,
	"banner_auto_cycle" boolean DEFAULT false NOT NULL,
	"banner_cycle_seconds" integer DEFAULT 20 NOT NULL,
	"recommendation_cycle_seconds" integer DEFAULT 60 NOT NULL,
	"banner_content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_ui_settings_scope_unique" UNIQUE("scope")
);
--> statement-breakpoint
CREATE TABLE "delivery_job_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"driver_id" uuid,
	"event_type" varchar(48) NOT NULL,
	"from_status" varchar(32),
	"to_status" varchar(32),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"driver_id" uuid,
	"status" varchar(32) DEFAULT 'searching_driver' NOT NULL,
	"pickup_address" text,
	"pickup_latitude" numeric(10, 7),
	"pickup_longitude" numeric(10, 7),
	"dropoff_address" text,
	"dropoff_latitude" numeric(10, 7),
	"dropoff_longitude" numeric(10, 7),
	"assigned_at" timestamp with time zone,
	"picked_up_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_jobs_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "delivery_pricing_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" varchar(40) DEFAULT 'default' NOT NULL,
	"base_fee" integer DEFAULT 15000 NOT NULL,
	"base_distance_km" numeric(8, 2) DEFAULT '2' NOT NULL,
	"per_km_fee" integer DEFAULT 8000 NOT NULL,
	"partner_subsidy_amount" integer DEFAULT 20000 NOT NULL,
	"subsidy_windows" jsonb DEFAULT '[{"start":"07:00","end":"10:00"},{"start":"13:00","end":"16:00"}]'::jsonb NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"max_delivery_radius_km" numeric(8, 2) DEFAULT '15' NOT NULL,
	"distance_provider" varchar(32) DEFAULT 'google_routes' NOT NULL,
	"allow_geo_fallback" boolean DEFAULT true NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_pricing_policies_scope_unique" UNIQUE("scope")
);
--> statement-breakpoint
CREATE TABLE "driver_location_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"job_id" uuid,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"accuracy_meters" numeric(10, 2),
	"heading" numeric(8, 2),
	"speed_mps" numeric(10, 2),
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_locations" (
	"driver_id" uuid PRIMARY KEY NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"accuracy_meters" numeric(10, 2),
	"heading" numeric(8, 2),
	"speed_mps" numeric(10, 2),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'offline' NOT NULL,
	"phone" varchar(30),
	"vehicle_type" varchar(40) DEFAULT 'motorbike' NOT NULL,
	"plate_number" varchar(40),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "driver_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(120) NOT NULL,
	"name" varchar(180) NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"kill_switch" boolean DEFAULT false NOT NULL,
	"channels" jsonb DEFAULT '["beta"]'::jsonb NOT NULL,
	"roles" jsonb DEFAULT '["customer","partner","driver","admin"]'::jsonb NOT NULL,
	"rollout_percent" integer DEFAULT 100 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"code" varchar(10) PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"native_name" varchar(80) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_id" uuid,
	"kind" varchar(24) NOT NULL,
	"blob_url" text NOT NULL,
	"pathname" text,
	"mime_type" varchar(120),
	"size_bytes" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_translations" (
	"module_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"name" varchar(120) NOT NULL,
	"short_name" varchar(60),
	"description" text,
	CONSTRAINT "module_translations_module_id_locale_pk" PRIMARY KEY("module_id","locale")
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"icon" varchar(40),
	"route" varchar(120) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_emergency" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "onboarding_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(24) NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"display_name" varchar(120),
	"phone" varchar(30),
	"city" varchar(120),
	"business_name" varchar(180),
	"business_type" varchar(40),
	"address_text" text,
	"vehicle_type" varchar(40),
	"plate_number" varchar(32),
	"notes" text,
	"review_note" text,
	"reviewed_by" uuid,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations_agent_capacity" (
	"admin_user_id" uuid PRIMARY KEY NOT NULL,
	"daily_capacity" integer DEFAULT 20 NOT NULL,
	"warning_load_percent" integer DEFAULT 80 NOT NULL,
	"critical_load_percent" integer DEFAULT 100 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"note" text,
	"updated_by_admin_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations_approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_run_id" uuid NOT NULL,
	"step_key" varchar(80) NOT NULL,
	"title" varchar(220) NOT NULL,
	"reason" text,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"requested_by_admin_user_id" uuid,
	"decided_by_admin_user_id" uuid,
	"decision_note" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" varchar(24) DEFAULT 'admin' NOT NULL,
	"actor_user_id" uuid,
	"area" varchar(80) NOT NULL,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(80),
	"target_id" varchar(160),
	"before_state" jsonb,
	"after_state" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations_playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(180) NOT NULL,
	"work_kind" varchar(48) DEFAULT 'all' NOT NULL,
	"description" text,
	"trigger_risk" varchar(24) DEFAULT 'critical' NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_by_admin_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operations_playbooks_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "operations_routing_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_kind" varchar(48) NOT NULL,
	"work_id" varchar(120) NOT NULL,
	"recommended_admin_user_id" uuid,
	"score" integer DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(24) DEFAULT 'recommended' NOT NULL,
	"decided_by_admin_user_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations_routing_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"work_kind" varchar(48) DEFAULT 'all' NOT NULL,
	"priority_weight" integer DEFAULT 30 NOT NULL,
	"sla_weight" integer DEFAULT 40 NOT NULL,
	"capacity_weight" integer DEFAULT 30 NOT NULL,
	"escalation_minutes" integer DEFAULT 120 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_by_admin_user_id" uuid,
	"updated_by_admin_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations_workflow_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_run_id" uuid NOT NULL,
	"actor_admin_user_id" uuid,
	"event_type" varchar(60) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations_workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_kind" varchar(48) NOT NULL,
	"work_id" varchar(120) NOT NULL,
	"playbook_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'proposed' NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"proposed_by_admin_user_id" uuid,
	"approved_by_admin_user_id" uuid,
	"approved_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "organization_member_role" DEFAULT 'staff' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"type" varchar(40) NOT NULL,
	"name" varchar(180) NOT NULL,
	"description" text,
	"phone" varchar(30),
	"email" varchar(255),
	"city_id" uuid,
	"address_text" text,
	"status" "organization_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "partner_payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"intent_id" varchar(120) NOT NULL,
	"provider" varchar(40) NOT NULL,
	"merchant_id" varchar(180) NOT NULL,
	"provider_reference" varchar(220),
	"event_type" varchar(40) NOT NULL,
	"status" varchar(40) NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'VND' NOT NULL,
	"source" varchar(40) NOT NULL,
	"idempotency_key" varchar(220) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"event_type" varchar(80) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"method" varchar(32) DEFAULT 'cash_on_delivery' NOT NULL,
	"provider" varchar(32) DEFAULT 'zhaoxi' NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'VND' NOT NULL,
	"idempotency_key" varchar(180) NOT NULL,
	"provider_reference" varchar(180),
	"checkout_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "qr_pairing_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"secret_hash" varchar(64) NOT NULL,
	"requested_role" varchar(24) NOT NULL,
	"locale" varchar(10) DEFAULT 'zh-CN' NOT NULL,
	"status" varchar(24) DEFAULT 'waiting_scan' NOT NULL,
	"user_id" uuid,
	"exchange_code_hash" varchar(64),
	"exchange_expires_at" timestamp with time zone,
	"exchanged_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_alert_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(80) NOT NULL,
	"name" varchar(180) NOT NULL,
	"metric" varchar(80) NOT NULL,
	"comparator" varchar(8) DEFAULT '>=' NOT NULL,
	"threshold" numeric(12, 2) NOT NULL,
	"severity" varchar(16) DEFAULT 'warning' NOT NULL,
	"window_minutes" integer DEFAULT 60 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"cooldown_minutes" integer DEFAULT 30 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "release_alert_policies_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "release_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(40) NOT NULL,
	"release_candidate" varchar(80) NOT NULL,
	"status" varchar(24) DEFAULT 'approved' NOT NULL,
	"note" text,
	"snapshot" jsonb NOT NULL,
	"approved_by" uuid,
	"rolled_back_by" uuid,
	"rolled_back_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" varchar(24) DEFAULT 'user' NOT NULL,
	"actor_user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(80) NOT NULL,
	"resource_id" varchar(160),
	"app" varchar(24),
	"before_state" jsonb,
	"after_state" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid,
	"policy_key" varchar(80) NOT NULL,
	"metric" varchar(80) NOT NULL,
	"severity" varchar(16) NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"observed_value" numeric(12, 2) NOT NULL,
	"threshold" numeric(12, 2) NOT NULL,
	"window_minutes" integer NOT NULL,
	"message" text NOT NULL,
	"release_version" varchar(40),
	"acknowledged_by" uuid,
	"acknowledged_at" timestamp with time zone,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_commission_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" varchar(24) DEFAULT 'global' NOT NULL,
	"organization_id" uuid,
	"mode" varchar(24) DEFAULT 'percentage' NOT NULL,
	"percentage_bps" integer DEFAULT 0 NOT NULL,
	"fixed_per_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"note" varchar(500),
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" varchar(40) NOT NULL,
	"title" varchar(120) NOT NULL,
	"discount_type" varchar(20) NOT NULL,
	"discount_value" integer NOT NULL,
	"max_discount_amount" integer,
	"min_order_amount" integer DEFAULT 0 NOT NULL,
	"total_usage_limit" integer,
	"per_customer_limit" integer DEFAULT 1 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_settlement_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" varchar(500) NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"currency" varchar(8) DEFAULT 'VND' NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"item_base_revenue" integer DEFAULT 0 NOT NULL,
	"promotion_discount" integer DEFAULT 0 NOT NULL,
	"coupon_discount" integer DEFAULT 0 NOT NULL,
	"food_revenue" integer DEFAULT 0 NOT NULL,
	"delivery_gross_fee" integer DEFAULT 0 NOT NULL,
	"delivery_subsidy" integer DEFAULT 0 NOT NULL,
	"customer_delivery_fee" integer DEFAULT 0 NOT NULL,
	"customer_paid" integer DEFAULT 0 NOT NULL,
	"partner_payable" integer DEFAULT 0 NOT NULL,
	"platform_commission" integer DEFAULT 0 NOT NULL,
	"adjustments" integer DEFAULT 0 NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" uuid,
	"confirmed_by_user_id" uuid,
	"paid_by_user_id" uuid,
	"confirmed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_switch_handoffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"target_role" varchar(24) NOT NULL,
	"organization_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_switch_handoffs_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
CREATE TABLE "rollout_guard_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app" varchar(24) NOT NULL,
	"health_status" varchar(24) NOT NULL,
	"previous_percent" integer NOT NULL,
	"next_percent" integer NOT NULL,
	"action" varchar(40) NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rollout_guard_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app" varchar(24) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"health_window_minutes" integer DEFAULT 60 NOT NULL,
	"warning_max_percent" integer DEFAULT 25 NOT NULL,
	"critical_fallback_percent" integer DEFAULT 5 NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rollout_guard_policies_app_unique" UNIQUE("app")
);
--> statement-breakpoint
CREATE TABLE "runtime_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app" varchar(24) NOT NULL,
	"access_mode" varchar(24) DEFAULT 'beta' NOT NULL,
	"public_rollout_percent" integer DEFAULT 100 NOT NULL,
	"maintenance_enabled" boolean DEFAULT false NOT NULL,
	"maintenance_message" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notice" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runtime_controls_app_unique" UNIQUE("app")
);
--> statement-breakpoint
CREATE TABLE "runtime_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app" varchar(24) NOT NULL,
	"environment" varchar(24) DEFAULT 'production' NOT NULL,
	"severity" varchar(16) DEFAULT 'error' NOT NULL,
	"event_type" varchar(64) DEFAULT 'runtime_error' NOT NULL,
	"message" text NOT NULL,
	"digest" varchar(180),
	"route" text,
	"release" varchar(40) DEFAULT '15.1.0' NOT NULL,
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_request_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"from_status" "request_status",
	"to_status" "request_status" NOT NULL,
	"changed_by_user_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_code" varchar(40) NOT NULL,
	"module_id" uuid NOT NULL,
	"service_id" uuid,
	"customer_id" uuid,
	"assigned_organization_id" uuid,
	"assigned_user_id" uuid,
	"locale" varchar(10) DEFAULT 'zh-CN' NOT NULL,
	"customer_name" varchar(120) NOT NULL,
	"customer_phone" varchar(30) NOT NULL,
	"title" varchar(240) NOT NULL,
	"description" text,
	"status" "request_status" DEFAULT 'new' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"city_id" uuid,
	"address_text" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_requests_request_code_unique" UNIQUE("request_code")
);
--> statement-breakpoint
CREATE TABLE "service_translations" (
	"service_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"name" varchar(160) NOT NULL,
	"summary" text,
	"description" text,
	CONSTRAINT "service_translations_service_id_locale_pk" PRIMARY KEY("service_id","locale")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"organization_id" uuid,
	"code" varchar(80) NOT NULL,
	"price_from" numeric(14, 2),
	"currency" varchar(3) DEFAULT 'VND' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "support_automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"trigger" varchar(60) NOT NULL,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"organization_id" uuid,
	"role" varchar(24) DEFAULT 'customer' NOT NULL,
	"locale" varchar(10) DEFAULT 'vi-VN' NOT NULL,
	"subject" varchar(240) DEFAULT 'ZhaoXi Support' NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_internal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_admin_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_knowledge_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(180) NOT NULL,
	"locale" varchar(16) DEFAULT 'vi-VN' NOT NULL,
	"title" varchar(220) NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"category" varchar(80) DEFAULT 'general' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_knowledge_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"user_id" uuid,
	"helpful" boolean NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_knowledge_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"user_id" uuid,
	"source" varchar(40) DEFAULT 'help_center' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_macros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(120) NOT NULL,
	"body" text NOT NULL,
	"locale" varchar(16) DEFAULT 'vi-VN' NOT NULL,
	"category" varchar(60) DEFAULT 'general' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_role" varchar(24) NOT NULL,
	"body" text NOT NULL,
	"intent" varchar(60),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_satisfaction" (
	"thread_id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_satisfaction_rating_check" CHECK ("support_satisfaction"."rating" >= 1 AND "support_satisfaction"."rating" <= 5)
);
--> statement-breakpoint
CREATE TABLE "support_sla_policies" (
	"priority" varchar(16) PRIMARY KEY NOT NULL,
	"first_response_minutes" integer NOT NULL,
	"resolution_minutes" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"color" varchar(24) DEFAULT 'neutral' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_thread_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" varchar(48) NOT NULL,
	"from_agent_user_id" uuid,
	"to_agent_user_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_thread_tags" (
	"thread_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trusted_device_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trusted_device_identities_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "ui_acceptance_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_key" varchar(120) NOT NULL,
	"app" varchar(24) NOT NULL,
	"category" varchar(60) NOT NULL,
	"title" varchar(220) NOT NULL,
	"route" varchar(240),
	"priority" varchar(16) DEFAULT 'high' NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"evidence_url" text,
	"updated_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ui_acceptance_items_item_key_unique" UNIQUE("item_key")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role" varchar(24) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wechat_open_id" varchar(128),
	"wechat_union_id" varchar(128),
	"nickname" varchar(120),
	"avatar_url" text,
	"phone" varchar(30),
	"email" varchar(255),
	"preferred_locale" varchar(10) DEFAULT 'zh-CN' NOT NULL,
	"city_id" uuid,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"is_guest" boolean DEFAULT false NOT NULL,
	"profile_completed_at" timestamp with time zone,
	"guest_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wechat_login_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" varchar(96) NOT NULL,
	"role" varchar(24) NOT NULL,
	"locale" varchar(10) DEFAULT 'zh-CN' NOT NULL,
	"status" varchar(24) DEFAULT 'waiting_scan' NOT NULL,
	"return_url" text,
	"user_id" uuid,
	"organization_id" uuid,
	"wechat_open_id" varchar(128),
	"wechat_union_id" varchar(128),
	"error_code" varchar(80),
	"exchange_code_hash" varchar(64),
	"exchange_expires_at" timestamp with time zone,
	"exchanged_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wechat_login_sessions_state_unique" UNIQUE("state")
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_access" ADD CONSTRAINT "beta_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_access" ADD CONSTRAINT "beta_access_invite_id_beta_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."beta_invites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_access" ADD CONSTRAINT "beta_access_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_feedback" ADD CONSTRAINT "beta_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_feedback" ADD CONSTRAINT "beta_feedback_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_invite_redemptions" ADD CONSTRAINT "beta_invite_redemptions_invite_id_beta_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."beta_invites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_invite_redemptions" ADD CONSTRAINT "beta_invite_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_invites" ADD CONSTRAINT "beta_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_restaurant_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."restaurant_coupons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_browsing_history" ADD CONSTRAINT "customer_browsing_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_browsing_history" ADD CONSTRAINT "customer_browsing_history_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_coupon_claims" ADD CONSTRAINT "customer_coupon_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_coupon_claims" ADD CONSTRAINT "customer_coupon_claims_coupon_id_customer_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."customer_coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_notification_preferences" ADD CONSTRAINT "customer_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_notification_receipts" ADD CONSTRAINT "customer_notification_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_notification_states" ADD CONSTRAINT "customer_notification_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_operation_events" ADD CONSTRAINT "customer_operation_events_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_operation_events" ADD CONSTRAINT "customer_operation_events_actor_admin_user_id_users_id_fk" FOREIGN KEY ("actor_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_operation_tasks" ADD CONSTRAINT "customer_operation_tasks_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_operation_tasks" ADD CONSTRAINT "customer_operation_tasks_assigned_admin_user_id_users_id_fk" FOREIGN KEY ("assigned_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_operation_tasks" ADD CONSTRAINT "customer_operation_tasks_created_by_admin_user_id_users_id_fk" FOREIGN KEY ("created_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_relationship_events" ADD CONSTRAINT "customer_relationship_events_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_relationship_events" ADD CONSTRAINT "customer_relationship_events_actor_admin_user_id_users_id_fk" FOREIGN KEY ("actor_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_relationship_profiles" ADD CONSTRAINT "customer_relationship_profiles_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_relationship_profiles" ADD CONSTRAINT "customer_relationship_profiles_updated_by_admin_user_id_users_id_fk" FOREIGN KEY ("updated_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_saved_addresses" ADD CONSTRAINT "customer_saved_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_saved_search_alert_events" ADD CONSTRAINT "customer_saved_search_alert_events_saved_search_id_customer_saved_searches_id_fk" FOREIGN KEY ("saved_search_id") REFERENCES "public"."customer_saved_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_saved_search_alert_events" ADD CONSTRAINT "customer_saved_search_alert_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_saved_search_alert_events" ADD CONSTRAINT "customer_saved_search_alert_events_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_saved_searches" ADD CONSTRAINT "customer_saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segment_members" ADD CONSTRAINT "customer_segment_members_segment_id_customer_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."customer_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segment_members" ADD CONSTRAINT "customer_segment_members_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segment_members" ADD CONSTRAINT "customer_segment_members_added_by_admin_user_id_users_id_fk" FOREIGN KEY ("added_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segments" ADD CONSTRAINT "customer_segments_created_by_admin_user_id_users_id_fk" FOREIGN KEY ("created_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_service_recovery_cases" ADD CONSTRAINT "customer_service_recovery_cases_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_service_recovery_cases" ADD CONSTRAINT "customer_service_recovery_cases_assigned_admin_user_id_users_id_fk" FOREIGN KEY ("assigned_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_service_recovery_cases" ADD CONSTRAINT "customer_service_recovery_cases_created_by_admin_user_id_users_id_fk" FOREIGN KEY ("created_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_messages" ADD CONSTRAINT "customer_support_messages_thread_id_customer_support_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."customer_support_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_messages" ADD CONSTRAINT "customer_support_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_settings" ADD CONSTRAINT "customer_support_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_threads" ADD CONSTRAINT "customer_support_threads_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_threads" ADD CONSTRAINT "customer_support_threads_assigned_admin_user_id_users_id_fk" FOREIGN KEY ("assigned_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_threads" ADD CONSTRAINT "customer_support_threads_supervisor_admin_user_id_users_id_fk" FOREIGN KEY ("supervisor_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ui_settings" ADD CONSTRAINT "customer_ui_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_job_events" ADD CONSTRAINT "delivery_job_events_job_id_delivery_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."delivery_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_job_events" ADD CONSTRAINT "delivery_job_events_driver_id_driver_profiles_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."driver_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_jobs" ADD CONSTRAINT "delivery_jobs_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_jobs" ADD CONSTRAINT "delivery_jobs_driver_id_driver_profiles_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."driver_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_pricing_policies" ADD CONSTRAINT "delivery_pricing_policies_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_location_history" ADD CONSTRAINT "driver_location_history_driver_id_driver_profiles_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."driver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_location_history" ADD CONSTRAINT "driver_location_history_job_id_delivery_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."delivery_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_driver_id_driver_profiles_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."driver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_translations" ADD CONSTRAINT "module_translations_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_translations" ADD CONSTRAINT "module_translations_locale_languages_code_fk" FOREIGN KEY ("locale") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_applications" ADD CONSTRAINT "onboarding_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_applications" ADD CONSTRAINT "onboarding_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_agent_capacity" ADD CONSTRAINT "operations_agent_capacity_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_agent_capacity" ADD CONSTRAINT "operations_agent_capacity_updated_by_admin_user_id_users_id_fk" FOREIGN KEY ("updated_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_approval_requests" ADD CONSTRAINT "operations_approval_requests_workflow_run_id_operations_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "public"."operations_workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_approval_requests" ADD CONSTRAINT "operations_approval_requests_requested_by_admin_user_id_users_id_fk" FOREIGN KEY ("requested_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_approval_requests" ADD CONSTRAINT "operations_approval_requests_decided_by_admin_user_id_users_id_fk" FOREIGN KEY ("decided_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_audit_logs" ADD CONSTRAINT "operations_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_playbooks" ADD CONSTRAINT "operations_playbooks_created_by_admin_user_id_users_id_fk" FOREIGN KEY ("created_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_routing_decisions" ADD CONSTRAINT "operations_routing_decisions_recommended_admin_user_id_users_id_fk" FOREIGN KEY ("recommended_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_routing_decisions" ADD CONSTRAINT "operations_routing_decisions_decided_by_admin_user_id_users_id_fk" FOREIGN KEY ("decided_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_routing_policies" ADD CONSTRAINT "operations_routing_policies_created_by_admin_user_id_users_id_fk" FOREIGN KEY ("created_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_routing_policies" ADD CONSTRAINT "operations_routing_policies_updated_by_admin_user_id_users_id_fk" FOREIGN KEY ("updated_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_workflow_events" ADD CONSTRAINT "operations_workflow_events_workflow_run_id_operations_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "public"."operations_workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_workflow_events" ADD CONSTRAINT "operations_workflow_events_actor_admin_user_id_users_id_fk" FOREIGN KEY ("actor_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_workflow_runs" ADD CONSTRAINT "operations_workflow_runs_playbook_id_operations_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."operations_playbooks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_workflow_runs" ADD CONSTRAINT "operations_workflow_runs_proposed_by_admin_user_id_users_id_fk" FOREIGN KEY ("proposed_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations_workflow_runs" ADD CONSTRAINT "operations_workflow_runs_approved_by_admin_user_id_users_id_fk" FOREIGN KEY ("approved_by_admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payment_transactions" ADD CONSTRAINT "partner_payment_transactions_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payment_transactions" ADD CONSTRAINT "partner_payment_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payment_transactions_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_pairing_sessions" ADD CONSTRAINT "qr_pairing_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_alert_policies" ADD CONSTRAINT "release_alert_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_alert_policies" ADD CONSTRAINT "release_alert_policies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_approvals" ADD CONSTRAINT "release_approvals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_approvals" ADD CONSTRAINT "release_approvals_rolled_back_by_users_id_fk" FOREIGN KEY ("rolled_back_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_audit_events" ADD CONSTRAINT "release_audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_incidents" ADD CONSTRAINT "release_incidents_policy_id_release_alert_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."release_alert_policies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_incidents" ADD CONSTRAINT "release_incidents_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_incidents" ADD CONSTRAINT "release_incidents_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_commission_policies" ADD CONSTRAINT "restaurant_commission_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_commission_policies" ADD CONSTRAINT "restaurant_commission_policies_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_coupons" ADD CONSTRAINT "restaurant_coupons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_coupons" ADD CONSTRAINT "restaurant_coupons_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_settlement_adjustments" ADD CONSTRAINT "restaurant_settlement_adjustments_settlement_id_restaurant_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."restaurant_settlements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_settlement_adjustments" ADD CONSTRAINT "restaurant_settlement_adjustments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_settlements" ADD CONSTRAINT "restaurant_settlements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_settlements" ADD CONSTRAINT "restaurant_settlements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_settlements" ADD CONSTRAINT "restaurant_settlements_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_settlements" ADD CONSTRAINT "restaurant_settlements_paid_by_user_id_users_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_switch_handoffs" ADD CONSTRAINT "role_switch_handoffs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_switch_handoffs" ADD CONSTRAINT "role_switch_handoffs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollout_guard_policies" ADD CONSTRAINT "rollout_guard_policies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runtime_controls" ADD CONSTRAINT "runtime_controls_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_status_history" ADD CONSTRAINT "service_request_status_history_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_status_history" ADD CONSTRAINT "service_request_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assigned_organization_id_organizations_id_fk" FOREIGN KEY ("assigned_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_locale_languages_code_fk" FOREIGN KEY ("locale") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_translations" ADD CONSTRAINT "service_translations_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_translations" ADD CONSTRAINT "service_translations_locale_languages_code_fk" FOREIGN KEY ("locale") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_automation_rules" ADD CONSTRAINT "support_automation_rules_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_internal_notes" ADD CONSTRAINT "support_internal_notes_thread_id_customer_support_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."customer_support_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_internal_notes" ADD CONSTRAINT "support_internal_notes_author_admin_user_id_users_id_fk" FOREIGN KEY ("author_admin_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_knowledge_articles" ADD CONSTRAINT "support_knowledge_articles_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_knowledge_articles" ADD CONSTRAINT "support_knowledge_articles_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_knowledge_feedback" ADD CONSTRAINT "support_knowledge_feedback_article_id_support_knowledge_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."support_knowledge_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_knowledge_feedback" ADD CONSTRAINT "support_knowledge_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_knowledge_views" ADD CONSTRAINT "support_knowledge_views_article_id_support_knowledge_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."support_knowledge_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_knowledge_views" ADD CONSTRAINT "support_knowledge_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_macros" ADD CONSTRAINT "support_macros_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_conversation_id_support_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."support_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_satisfaction" ADD CONSTRAINT "support_satisfaction_thread_id_customer_support_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."customer_support_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_satisfaction" ADD CONSTRAINT "support_satisfaction_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_sla_policies" ADD CONSTRAINT "support_sla_policies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_thread_events" ADD CONSTRAINT "support_thread_events_thread_id_customer_support_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."customer_support_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_thread_events" ADD CONSTRAINT "support_thread_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_thread_events" ADD CONSTRAINT "support_thread_events_from_agent_user_id_users_id_fk" FOREIGN KEY ("from_agent_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_thread_events" ADD CONSTRAINT "support_thread_events_to_agent_user_id_users_id_fk" FOREIGN KEY ("to_agent_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_thread_tags" ADD CONSTRAINT "support_thread_tags_thread_id_customer_support_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."customer_support_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_thread_tags" ADD CONSTRAINT "support_thread_tags_tag_id_support_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."support_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_thread_tags" ADD CONSTRAINT "support_thread_tags_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_device_identities" ADD CONSTRAINT "trusted_device_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ui_acceptance_items" ADD CONSTRAINT "ui_acceptance_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_preferred_locale_languages_code_fk" FOREIGN KEY ("preferred_locale") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wechat_login_sessions" ADD CONSTRAINT "wechat_login_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wechat_login_sessions" ADD CONSTRAINT "wechat_login_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_status_idx" ON "auth_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "auth_sessions_refresh_exp_idx" ON "auth_sessions" USING btree ("refresh_expires_at");--> statement-breakpoint
CREATE INDEX "auth_sessions_device_idx" ON "auth_sessions" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_status_refresh_idx" ON "auth_sessions" USING btree ("user_id","status","refresh_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "beta_access_user_role_unique" ON "beta_access" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "beta_access_status_idx" ON "beta_access" USING btree ("status");--> statement-breakpoint
CREATE INDEX "beta_feedback_created_idx" ON "beta_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "beta_feedback_app_idx" ON "beta_feedback" USING btree ("app");--> statement-breakpoint
CREATE INDEX "beta_feedback_status_idx" ON "beta_feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "beta_feedback_release_idx" ON "beta_feedback" USING btree ("release");--> statement-breakpoint
CREATE INDEX "beta_redemptions_invite_idx" ON "beta_invite_redemptions" USING btree ("invite_id");--> statement-breakpoint
CREATE INDEX "beta_redemptions_user_idx" ON "beta_invite_redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "beta_invites_status_idx" ON "beta_invites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "beta_invites_role_idx" ON "beta_invites" USING btree ("role");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_coupon_idx" ON "coupon_redemptions" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_customer_idx" ON "coupon_redemptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_coupon_customer_idx" ON "coupon_redemptions" USING btree ("coupon_id","customer_id");--> statement-breakpoint
CREATE INDEX "customer_history_user_viewed_idx" ON "customer_browsing_history" USING btree ("user_id","viewed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "customer_coupon_claims_user_idx" ON "customer_coupon_claims" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_favorites_user_idx" ON "customer_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_notification_receipts_unique" ON "customer_notification_receipts" USING btree ("user_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "customer_notification_receipts_user_idx" ON "customer_notification_receipts" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "customer_notification_states_user_idx" ON "customer_notification_states" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_operation_events_customer_idx" ON "customer_operation_events" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "customer_operation_tasks_customer_idx" ON "customer_operation_tasks" USING btree ("customer_id","status","due_at");--> statement-breakpoint
CREATE INDEX "customer_operation_tasks_assignee_idx" ON "customer_operation_tasks" USING btree ("assigned_admin_user_id","status","due_at");--> statement-breakpoint
CREATE INDEX "customer_profiles_city_idx" ON "customer_profiles" USING btree ("city_name");--> statement-breakpoint
CREATE INDEX "customer_relationship_events_customer_idx" ON "customer_relationship_events" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "customer_saved_addresses_user_idx" ON "customer_saved_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_saved_addresses_default_idx" ON "customer_saved_addresses" USING btree ("user_id","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_saved_search_alert_events_unique" ON "customer_saved_search_alert_events" USING btree ("saved_search_id","service_id","event_type","match_fingerprint");--> statement-breakpoint
CREATE INDEX "customer_saved_search_alert_events_user_idx" ON "customer_saved_search_alert_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "customer_saved_search_alert_events_search_idx" ON "customer_saved_search_alert_events" USING btree ("saved_search_id","created_at");--> statement-breakpoint
CREATE INDEX "customer_saved_searches_user_idx" ON "customer_saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_saved_searches_pinned_idx" ON "customer_saved_searches" USING btree ("user_id","is_pinned");--> statement-breakpoint
CREATE INDEX "customer_segment_members_customer_idx" ON "customer_segment_members" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_service_recovery_customer_idx" ON "customer_service_recovery_cases" USING btree ("customer_id","status","due_at");--> statement-breakpoint
CREATE INDEX "customer_service_recovery_assignee_idx" ON "customer_service_recovery_cases" USING btree ("assigned_admin_user_id","status","due_at");--> statement-breakpoint
CREATE INDEX "customer_support_messages_thread_idx" ON "customer_support_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "customer_support_threads_customer_idx" ON "customer_support_threads" USING btree ("customer_id","last_message_at");--> statement-breakpoint
CREATE INDEX "customer_support_threads_assignment_idx" ON "customer_support_threads" USING btree ("assigned_admin_user_id","status","last_message_at");--> statement-breakpoint
CREATE INDEX "customer_support_threads_escalation_idx" ON "customer_support_threads" USING btree ("escalation_level","status","last_message_at");--> statement-breakpoint
CREATE INDEX "customer_support_threads_priority_idx" ON "customer_support_threads" USING btree ("priority","status","last_message_at");--> statement-breakpoint
CREATE INDEX "delivery_job_events_job_idx" ON "delivery_job_events" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "delivery_job_events_driver_idx" ON "delivery_job_events" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "delivery_job_events_created_idx" ON "delivery_job_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "delivery_jobs_status_idx" ON "delivery_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "delivery_jobs_driver_idx" ON "delivery_jobs" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "delivery_jobs_created_idx" ON "delivery_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "driver_location_history_driver_idx" ON "driver_location_history" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "driver_location_history_job_idx" ON "driver_location_history" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "driver_location_history_recorded_idx" ON "driver_location_history" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "driver_profiles_status_idx" ON "driver_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "driver_profiles_user_idx" ON "driver_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "feature_flags_key_idx" ON "feature_flags" USING btree ("key");--> statement-breakpoint
CREATE INDEX "media_assets_org_idx" ON "media_assets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "media_assets_service_idx" ON "media_assets" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "media_assets_kind_idx" ON "media_assets" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "modules_sort_order_idx" ON "modules" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_user_role_unique" ON "onboarding_applications" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "onboarding_status_idx" ON "onboarding_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "onboarding_role_idx" ON "onboarding_applications" USING btree ("role");--> statement-breakpoint
CREATE INDEX "operations_approval_requests_status_idx" ON "operations_approval_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "operations_audit_logs_area_idx" ON "operations_audit_logs" USING btree ("area");--> statement-breakpoint
CREATE INDEX "operations_audit_logs_created_idx" ON "operations_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "operations_audit_logs_actor_idx" ON "operations_audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "operations_routing_decisions_work_idx" ON "operations_routing_decisions" USING btree ("work_kind","work_id");--> statement-breakpoint
CREATE INDEX "operations_routing_decisions_status_idx" ON "operations_routing_decisions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "operations_workflow_events_run_idx" ON "operations_workflow_events" USING btree ("workflow_run_id","created_at");--> statement-breakpoint
CREATE INDEX "operations_workflow_runs_work_idx" ON "operations_workflow_runs" USING btree ("work_kind","work_id");--> statement-breakpoint
CREATE INDEX "operations_workflow_runs_status_idx" ON "operations_workflow_runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "organizations_type_idx" ON "organizations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "organizations_city_idx" ON "organizations" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "partner_payment_transactions_request_idx" ON "partner_payment_transactions" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "partner_payment_transactions_org_idx" ON "partner_payment_transactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "partner_payment_transactions_intent_idx" ON "partner_payment_transactions" USING btree ("intent_id");--> statement-breakpoint
CREATE INDEX "partner_payment_transactions_created_idx" ON "partner_payment_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_payment_transactions_idempotency_unique" ON "partner_payment_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "payment_events_payment_idx" ON "payment_events" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_events_created_idx" ON "payment_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payment_transactions_request_idx" ON "payment_transactions" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_transactions_provider_ref_idx" ON "payment_transactions" USING btree ("provider_reference");--> statement-breakpoint
CREATE INDEX "qr_pairing_sessions_status_idx" ON "qr_pairing_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "qr_pairing_sessions_expires_idx" ON "qr_pairing_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "release_alert_policies_enabled_idx" ON "release_alert_policies" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "release_approvals_created_idx" ON "release_approvals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "release_approvals_status_idx" ON "release_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "release_audit_events_created_idx" ON "release_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "release_audit_events_resource_idx" ON "release_audit_events" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "release_audit_events_actor_idx" ON "release_audit_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "release_incidents_status_idx" ON "release_incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "release_incidents_created_idx" ON "release_incidents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "restaurant_commission_policies_scope_idx" ON "restaurant_commission_policies" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "restaurant_commission_policies_org_idx" ON "restaurant_commission_policies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "restaurant_commission_policies_enabled_idx" ON "restaurant_commission_policies" USING btree ("enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurant_coupons_org_code_unique" ON "restaurant_coupons" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "restaurant_coupons_org_idx" ON "restaurant_coupons" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "restaurant_coupons_enabled_idx" ON "restaurant_coupons" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "restaurant_settlement_adjustments_settlement_idx" ON "restaurant_settlement_adjustments" USING btree ("settlement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurant_settlements_org_period_unique" ON "restaurant_settlements" USING btree ("organization_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "restaurant_settlements_org_idx" ON "restaurant_settlements" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "restaurant_settlements_status_idx" ON "restaurant_settlements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "role_switch_handoffs_user_idx" ON "role_switch_handoffs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "role_switch_handoffs_expires_idx" ON "role_switch_handoffs" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "rollout_guard_events_app_idx" ON "rollout_guard_events" USING btree ("app");--> statement-breakpoint
CREATE INDEX "rollout_guard_events_created_idx" ON "rollout_guard_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rollout_guard_policies_app_idx" ON "rollout_guard_policies" USING btree ("app");--> statement-breakpoint
CREATE INDEX "runtime_controls_app_idx" ON "runtime_controls" USING btree ("app");--> statement-breakpoint
CREATE INDEX "runtime_events_created_idx" ON "runtime_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "runtime_events_app_idx" ON "runtime_events" USING btree ("app");--> statement-breakpoint
CREATE INDEX "runtime_events_severity_idx" ON "runtime_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "runtime_events_type_idx" ON "runtime_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "request_status_history_request_idx" ON "service_request_status_history" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "service_requests_status_idx" ON "service_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_requests_module_idx" ON "service_requests" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "service_requests_customer_idx" ON "service_requests" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "service_requests_created_at_idx" ON "service_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "services_module_idx" ON "services" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "services_org_idx" ON "services" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "support_automation_rules_trigger_idx" ON "support_automation_rules" USING btree ("trigger");--> statement-breakpoint
CREATE INDEX "support_conversations_user_idx" ON "support_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_conversations_org_idx" ON "support_conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "support_conversations_status_idx" ON "support_conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_internal_notes_thread_idx" ON "support_internal_notes" USING btree ("thread_id");--> statement-breakpoint
CREATE UNIQUE INDEX "support_knowledge_articles_slug_locale_unique" ON "support_knowledge_articles" USING btree ("slug","locale");--> statement-breakpoint
CREATE INDEX "support_knowledge_articles_status_idx" ON "support_knowledge_articles" USING btree ("status","locale");--> statement-breakpoint
CREATE INDEX "support_knowledge_articles_category_idx" ON "support_knowledge_articles" USING btree ("category","locale");--> statement-breakpoint
CREATE INDEX "support_knowledge_feedback_article_idx" ON "support_knowledge_feedback" USING btree ("article_id","created_at");--> statement-breakpoint
CREATE INDEX "support_knowledge_views_article_idx" ON "support_knowledge_views" USING btree ("article_id","created_at");--> statement-breakpoint
CREATE INDEX "support_macros_locale_idx" ON "support_macros" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "support_messages_conversation_idx" ON "support_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "support_messages_created_idx" ON "support_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "support_satisfaction_customer_idx" ON "support_satisfaction" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "support_tags_name_unique" ON "support_tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "support_thread_events_thread_idx" ON "support_thread_events" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "support_thread_events_actor_idx" ON "support_thread_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "support_thread_tags_unique" ON "support_thread_tags" USING btree ("thread_id","tag_id");--> statement-breakpoint
CREATE INDEX "support_thread_tags_thread_idx" ON "support_thread_tags" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "trusted_device_identities_user_idx" ON "trusted_device_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trusted_device_identities_status_exp_idx" ON "trusted_device_identities" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "ui_acceptance_items_app_idx" ON "ui_acceptance_items" USING btree ("app");--> statement-breakpoint
CREATE INDEX "ui_acceptance_items_status_idx" ON "ui_acceptance_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ui_acceptance_items_priority_idx" ON "ui_acceptance_items" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "users_wechat_open_id_unique" ON "users" USING btree ("wechat_open_id");--> statement-breakpoint
CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "wechat_login_sessions_status_idx" ON "wechat_login_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wechat_login_sessions_user_idx" ON "wechat_login_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wechat_login_sessions_expires_idx" ON "wechat_login_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "wechat_login_sessions_status_expires_idx" ON "wechat_login_sessions" USING btree ("status","expires_at");