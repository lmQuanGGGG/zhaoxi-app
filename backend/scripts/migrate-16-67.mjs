import dotenv from"dotenv";import postgres from"postgres";
dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`create table if not exists customer_saved_searches(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label varchar(120) not null,
  query text not null default '',
  module_code varchar(40),
  filters jsonb not null default '{}'::jsonb,
  is_pinned boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
 )`;
 await sql`create index if not exists customer_saved_searches_user_idx on customer_saved_searches(user_id)`;
 await sql`create index if not exists customer_saved_searches_pinned_idx on customer_saved_searches(user_id,is_pinned)`;
 console.log("Sprint 16.67 customer intent memory & saved searches migration applied.");
}finally{await sql.end({timeout:5})}
