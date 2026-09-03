CREATE TYPE "user_status" AS ENUM ('active','disabled','pending');
CREATE TYPE "organization_status" AS ENUM ('pending','active','suspended');
CREATE TYPE "organization_member_role" AS ENUM ('owner','manager','staff');
CREATE TYPE "request_status" AS ENUM ('new','reviewing','assigned','accepted','in_progress','waiting_customer','completed','cancelled','rejected');

CREATE TABLE "languages" (
  "code" varchar(10) PRIMARY KEY,
  "name" varchar(80) NOT NULL,
  "native_name" varchar(80) NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "is_enabled" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "cities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" varchar(40) NOT NULL UNIQUE,
  "country_code" varchar(2) NOT NULL DEFAULT 'VN',
  "name_vi" varchar(120) NOT NULL,
  "name_zh_cn" varchar(120) NOT NULL,
  "name_zh_tw" varchar(120),
  "name_en" varchar(120),
  "timezone" varchar(60) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  "is_enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "wechat_open_id" varchar(128),
  "wechat_union_id" varchar(128),
  "nickname" varchar(120),
  "avatar_url" text,
  "phone" varchar(30),
  "email" varchar(255),
  "preferred_locale" varchar(10) NOT NULL DEFAULT 'zh-CN' REFERENCES "languages"("code"),
  "city_id" uuid REFERENCES "cities"("id"),
  "status" "user_status" NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "users_wechat_open_id_unique" ON "users"("wechat_open_id");
CREATE INDEX "users_phone_idx" ON "users"("phone");

CREATE TABLE "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" varchar(40) NOT NULL UNIQUE,
  "type" varchar(40) NOT NULL,
  "name" varchar(180) NOT NULL,
  "description" text,
  "phone" varchar(30),
  "email" varchar(255),
  "city_id" uuid REFERENCES "cities"("id"),
  "address_text" text,
  "status" "organization_status" NOT NULL DEFAULT 'pending',
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "organizations_type_idx" ON "organizations"("type");
CREATE INDEX "organizations_city_idx" ON "organizations"("city_id");

CREATE TABLE "organization_members" (
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "organization_member_role" NOT NULL DEFAULT 'staff',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("organization_id","user_id")
);

CREATE TABLE "modules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" varchar(50) NOT NULL UNIQUE,
  "icon" varchar(40),
  "route" varchar(120) NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_enabled" boolean NOT NULL DEFAULT true,
  "is_emergency" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "modules_sort_order_idx" ON "modules"("sort_order");

CREATE TABLE "module_translations" (
  "module_id" uuid NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
  "locale" varchar(10) NOT NULL REFERENCES "languages"("code"),
  "name" varchar(120) NOT NULL,
  "short_name" varchar(60),
  "description" text,
  PRIMARY KEY ("module_id","locale")
);

CREATE TABLE "services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "module_id" uuid NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
  "organization_id" uuid REFERENCES "organizations"("id") ON DELETE SET NULL,
  "code" varchar(80) NOT NULL UNIQUE,
  "price_from" numeric(14,2),
  "currency" varchar(3) NOT NULL DEFAULT 'VND',
  "is_enabled" boolean NOT NULL DEFAULT true,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "services_module_idx" ON "services"("module_id");
CREATE INDEX "services_org_idx" ON "services"("organization_id");

CREATE TABLE "service_translations" (
  "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
  "locale" varchar(10) NOT NULL REFERENCES "languages"("code"),
  "name" varchar(160) NOT NULL,
  "summary" text,
  "description" text,
  PRIMARY KEY ("service_id","locale")
);

CREATE TABLE "service_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_code" varchar(40) NOT NULL UNIQUE,
  "module_id" uuid NOT NULL REFERENCES "modules"("id"),
  "service_id" uuid REFERENCES "services"("id"),
  "customer_id" uuid REFERENCES "users"("id"),
  "assigned_organization_id" uuid REFERENCES "organizations"("id"),
  "assigned_user_id" uuid REFERENCES "users"("id"),
  "locale" varchar(10) NOT NULL DEFAULT 'zh-CN' REFERENCES "languages"("code"),
  "customer_name" varchar(120) NOT NULL,
  "customer_phone" varchar(30) NOT NULL,
  "title" varchar(240) NOT NULL,
  "description" text,
  "status" "request_status" NOT NULL DEFAULT 'new',
  "priority" integer NOT NULL DEFAULT 0,
  "city_id" uuid REFERENCES "cities"("id"),
  "address_text" text,
  "latitude" numeric(10,7),
  "longitude" numeric(10,7),
  "details" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "service_requests_status_idx" ON "service_requests"("status");
CREATE INDEX "service_requests_module_idx" ON "service_requests"("module_id");
CREATE INDEX "service_requests_customer_idx" ON "service_requests"("customer_id");
CREATE INDEX "service_requests_created_at_idx" ON "service_requests"("created_at");

CREATE TABLE "service_request_status_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id" uuid NOT NULL REFERENCES "service_requests"("id") ON DELETE CASCADE,
  "from_status" "request_status",
  "to_status" "request_status" NOT NULL,
  "changed_by_user_id" uuid REFERENCES "users"("id"),
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "request_status_history_request_idx" ON "service_request_status_history"("request_id");
