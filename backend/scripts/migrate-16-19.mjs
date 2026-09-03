import dotenv from "dotenv";import postgres from "postgres";dotenv.config({path:".env.local"});dotenv.config();
const u=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;if(!u)throw new Error("DATABASE_URL required");const sql=postgres(u,{ssl:"require",max:1,prepare:false});
try{
await sql`create table if not exists customer_favorites(user_id uuid not null references users(id) on delete cascade,service_id uuid not null references services(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,service_id))`;
await sql`create index if not exists customer_favorites_user_idx on customer_favorites(user_id)`;
await sql`create table if not exists customer_browsing_history(id uuid primary key default gen_random_uuid(),user_id uuid not null references users(id) on delete cascade,service_id uuid not null references services(id) on delete cascade,viewed_at timestamptz not null default now())`;
await sql`create index if not exists customer_history_user_viewed_idx on customer_browsing_history(user_id,viewed_at desc)`;
await sql`create table if not exists customer_coupons(id uuid primary key default gen_random_uuid(),code varchar(64) not null unique,title jsonb not null default '{}'::jsonb,description jsonb not null default '{}'::jsonb,discount_type varchar(24) not null default 'fixed',discount_value integer not null default 0,min_spend integer not null default 0,currency varchar(8) not null default 'VND',starts_at timestamptz,expires_at timestamptz,is_active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`;
await sql`create table if not exists customer_coupon_claims(user_id uuid not null references users(id) on delete cascade,coupon_id uuid not null references customer_coupons(id) on delete cascade,claimed_at timestamptz not null default now(),used_at timestamptz,primary key(user_id,coupon_id))`;
await sql`create index if not exists customer_coupon_claims_user_idx on customer_coupon_claims(user_id)`;
await sql`insert into customer_coupons(code,title,description,discount_type,discount_value,min_spend,currency,is_active)
values('WELCOME50','{"zh-CN":"新用户优惠","zh-TW":"新用戶優惠","vi-VN":"Ưu đãi chào mừng","en-US":"Welcome offer"}','{"zh-CN":"首次使用赵喜可领取","zh-TW":"首次使用趙喜可領取","vi-VN":"Dành cho lần đầu sử dụng ZhaoXi","en-US":"For your first ZhaoXi experience"}','fixed',50000,200000,'VND',true) on conflict(code) do nothing`;
console.log("Sprint 16.19 favorites, history & coupons migration applied.");
}finally{await sql.end({timeout:5})}
