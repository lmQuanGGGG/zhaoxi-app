-- Mini app registry: catalogue of mini apps the ZhaoXi host may open, and the
-- signed builds (one per platform and version) admins upload and publish.
-- Bundle bytes live in miniapp_releases.bundle_data (storage = 'postgres');
-- storage/storage_key leave room for an object store later.
-- Additive only; safe to re-run.
CREATE TABLE IF NOT EXISTS "miniapps" (
  "id" varchar(120) PRIMARY KEY NOT NULL,
  "title" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "subtitle" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "icon" varchar(80) DEFAULT 'cube-outline' NOT NULL,
  "tint" varchar(16) DEFAULT '#0FAF7A' NOT NULL,
  "chrome" varchar(8) DEFAULT 'light' NOT NULL,
  "audience" varchar(24),
  "enabled" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "miniapps_chrome_check" CHECK ("chrome" IN ('light', 'dark')),
  CONSTRAINT "miniapps_audience_check" CHECK ("audience" IS NULL OR "audience" IN ('members', 'partner', 'internal'))
);

CREATE TABLE IF NOT EXISTS "miniapp_releases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "miniapp_id" varchar(120) NOT NULL REFERENCES "miniapps"("id") ON DELETE cascade,
  "platform" varchar(8) NOT NULL,
  "version" varchar(40) NOT NULL,
  "runtime" integer NOT NULL,
  "manifest" jsonb NOT NULL,
  "sha256" varchar(64) NOT NULL,
  "size_bytes" integer NOT NULL,
  "key_id" varchar(16) NOT NULL,
  "bundle_file" varchar(200) NOT NULL,
  "storage" varchar(16) DEFAULT 'postgres' NOT NULL,
  "storage_key" text,
  "bundle_data" bytea,
  "status" varchar(16) DEFAULT 'draft' NOT NULL,
  "rollout_percent" integer DEFAULT 100 NOT NULL,
  "notes" text,
  "created_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "published_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "published_at" timestamp with time zone,
  "rolled_back_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "rolled_back_at" timestamp with time zone,
  "rollback_reason" text,
  CONSTRAINT "miniapp_releases_platform_check" CHECK ("platform" IN ('ios', 'android')),
  CONSTRAINT "miniapp_releases_status_check" CHECK ("status" IN ('draft', 'published', 'rolled_back')),
  CONSTRAINT "miniapp_releases_rollout_check" CHECK ("rollout_percent" BETWEEN 0 AND 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS "miniapp_releases_version_uidx"
  ON "miniapp_releases" ("miniapp_id", "platform", "version");
CREATE INDEX IF NOT EXISTS "miniapp_releases_live_idx"
  ON "miniapp_releases" ("miniapp_id", "platform", "status", "published_at");
CREATE INDEX IF NOT EXISTS "miniapp_releases_bundle_idx"
  ON "miniapp_releases" ("miniapp_id", "platform", "bundle_file");
