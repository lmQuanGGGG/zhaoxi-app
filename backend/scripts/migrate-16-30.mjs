import dotenv from "dotenv";import postgres from "postgres";
dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`create table if not exists restaurant_coupons(
   id uuid primary key default gen_random_uuid(),
   organization_id uuid not null references organizations(id) on delete cascade,
   code varchar(40) not null,
   title varchar(120) not null,
   discount_type varchar(20) not null,
   discount_value integer not null,
   max_discount_amount integer,
   min_order_amount integer not null default 0,
   total_usage_limit integer,
   per_customer_limit integer not null default 1,
   starts_at timestamptz,
   ends_at timestamptz,
   enabled boolean not null default true,
   used_count integer not null default 0,
   metadata jsonb not null default '{}'::jsonb,
   created_by_user_id uuid references users(id) on delete set null,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   unique(organization_id,code)
 )`;
 await sql`create index if not exists restaurant_coupons_org_idx on restaurant_coupons(organization_id)`;
 await sql`create index if not exists restaurant_coupons_enabled_idx on restaurant_coupons(enabled)`;
 await sql`create table if not exists coupon_redemptions(
   id uuid primary key default gen_random_uuid(),
   coupon_id uuid not null references restaurant_coupons(id) on delete restrict,
   organization_id uuid not null references organizations(id) on delete cascade,
   customer_id uuid not null references users(id) on delete cascade,
   request_id uuid not null unique references service_requests(id) on delete cascade,
   coupon_code varchar(40) not null,
   item_subtotal_before_coupon integer not null,
   discount_amount integer not null,
   item_subtotal_after_coupon integer not null,
   redeemed_at timestamptz not null default now()
 )`;
 await sql`create index if not exists coupon_redemptions_coupon_idx on coupon_redemptions(coupon_id)`;
 await sql`create index if not exists coupon_redemptions_customer_idx on coupon_redemptions(customer_id)`;
 await sql`create index if not exists coupon_redemptions_coupon_customer_idx on coupon_redemptions(coupon_id,customer_id)`;
 console.log("Sprint 16.30 restaurant coupons & redemption control migration applied.");
}finally{await sql.end({timeout:5})}
