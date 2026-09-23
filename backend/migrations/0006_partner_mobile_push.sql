CREATE TABLE IF NOT EXISTS "partner_mobile_push_devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "organization_id" uuid NOT NULL,
  "expo_push_token" text NOT NULL UNIQUE,
  "platform" varchar(16) NOT NULL,
  "device_id" varchar(180),
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "partner_mobile_push_devices_org_idx"
  ON "partner_mobile_push_devices" ("organization_id");
CREATE INDEX IF NOT EXISTS "partner_mobile_push_devices_user_idx"
  ON "partner_mobile_push_devices" ("user_id");
