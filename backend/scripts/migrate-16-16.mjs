import dotenv from "dotenv";import postgres from "postgres";dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL required");const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`create table if not exists customer_support_settings(
  id uuid primary key default gen_random_uuid(),
  scope varchar(40) not null unique default 'default',
  basic_assistant_enabled boolean not null default true,
  paid_human_enabled boolean not null default true,
  paid_human_fee integer not null default 50000,
  paid_human_currency varchar(8) not null default 'VND',
  emergency_priority boolean not null default true,
  updated_by_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
 )`;
 await sql`insert into customer_support_settings(scope,basic_assistant_enabled,paid_human_enabled,paid_human_fee,paid_human_currency,emergency_priority) values('default',true,true,50000,'VND',true) on conflict(scope) do nothing`;
 console.log("Sprint 16.16 customer service & assistant configuration migration applied.");
}finally{await sql.end({timeout:5})}
