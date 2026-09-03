import dotenv from"dotenv";import postgres from"postgres";
dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`create table if not exists customer_notification_preferences(
  user_id uuid primary key references users(id) on delete cascade,
  order_enabled boolean not null default true,
  housing_enabled boolean not null default true,
  travel_enabled boolean not null default true,
  payment_enabled boolean not null default true,
  saved_search_enabled boolean not null default true,
  updated_at timestamptz not null default now()
 )`;
 await sql`create table if not exists customer_notification_receipts(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source_type varchar(32) not null,
  source_id varchar(120) not null,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
 )`;
 await sql`create unique index if not exists customer_notification_receipts_unique on customer_notification_receipts(user_id,source_type,source_id)`;
 await sql`create index if not exists customer_notification_receipts_user_idx on customer_notification_receipts(user_id,updated_at)`;
 console.log("Sprint 16.69 customer notification center migration applied.");
}finally{await sql.end({timeout:5})}
