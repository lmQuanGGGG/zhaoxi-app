CREATE TABLE IF NOT EXISTS "customer_mobile_push_devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "expo_push_token" text NOT NULL UNIQUE,
  "platform" varchar(16) NOT NULL,
  "device_id" varchar(180),
  "locale" varchar(10),
  "promotions_enabled" boolean DEFAULT true NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "customer_mobile_push_devices_user_idx"
  ON "customer_mobile_push_devices" ("user_id");
CREATE INDEX IF NOT EXISTS "customer_mobile_push_devices_promotions_idx"
  ON "customer_mobile_push_devices" ("promotions_enabled", "enabled");
