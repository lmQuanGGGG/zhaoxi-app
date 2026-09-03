import dotenv from"dotenv";import postgres from"postgres";
dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`alter table customer_saved_searches add column if not exists watch_enabled boolean not null default false`;
 await sql`alter table customer_saved_searches add column if not exists watch_enabled_at timestamptz`;
 await sql`alter table customer_saved_searches add column if not exists last_watch_checked_at timestamptz`;
 await sql`alter table customer_saved_searches add column if not exists last_alert_at timestamptz`;
 await sql`create table if not exists customer_saved_search_alert_events(
  id uuid primary key default gen_random_uuid(),
  saved_search_id uuid not null references customer_saved_searches(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  event_type varchar(32) not null default 'new_match',
  match_fingerprint varchar(160) not null default 'initial',
  is_baseline boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
 )`;
 await sql`alter table customer_saved_search_alert_events add column if not exists match_fingerprint varchar(160) not null default 'initial'`;
 await sql`drop index if exists customer_saved_search_alert_events_unique`;
 await sql`create unique index if not exists customer_saved_search_alert_events_unique on customer_saved_search_alert_events(saved_search_id,service_id,event_type,match_fingerprint)`;
 await sql`create index if not exists customer_saved_search_alert_events_user_idx on customer_saved_search_alert_events(user_id,created_at)`;
 await sql`create index if not exists customer_saved_search_alert_events_search_idx on customer_saved_search_alert_events(saved_search_id,created_at)`;
 console.log("Sprint 16.68 saved search alerts & availability watch migration applied.");
}finally{await sql.end({timeout:5})}
