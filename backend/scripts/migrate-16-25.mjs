import dotenv from "dotenv";import postgres from "postgres";
dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`create table if not exists delivery_job_events(
   id uuid primary key default gen_random_uuid(),
   job_id uuid not null references delivery_jobs(id) on delete cascade,
   driver_id uuid references driver_profiles(id) on delete set null,
   event_type varchar(48) not null,
   from_status varchar(32),
   to_status varchar(32),
   metadata jsonb not null default '{}'::jsonb,
   created_at timestamptz not null default now()
 )`;
 await sql`create index if not exists delivery_job_events_job_idx on delivery_job_events(job_id)`;
 await sql`create index if not exists delivery_job_events_driver_idx on delivery_job_events(driver_id)`;
 await sql`create index if not exists delivery_job_events_created_idx on delivery_job_events(created_at)`;
 console.log("Sprint 16.25 driver dispatch, tracking timeline & fulfillment migration applied.");
}finally{await sql.end({timeout:5})}
