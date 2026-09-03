CREATE TABLE IF NOT EXISTS "media_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "service_id" uuid REFERENCES "services"("id") ON DELETE CASCADE,
  "kind" varchar(24) NOT NULL,
  "blob_url" text NOT NULL,
  "pathname" text,
  "mime_type" varchar(120),
  "size_bytes" integer,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_published" boolean DEFAULT false NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "media_assets_org_idx" ON "media_assets" ("organization_id");
CREATE INDEX IF NOT EXISTS "media_assets_service_idx" ON "media_assets" ("service_id");
CREATE INDEX IF NOT EXISTS "media_assets_kind_idx" ON "media_assets" ("kind");
