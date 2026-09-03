import dotenv from"dotenv";import postgres from"postgres";
dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`alter table customer_support_threads add column if not exists priority varchar(16) not null default 'normal'`;
 await sql`alter table customer_support_threads add column if not exists supervisor_admin_user_id uuid references users(id) on delete set null`;
 await sql`alter table customer_support_threads add column if not exists escalation_level integer not null default 0`;
 await sql`alter table customer_support_threads add column if not exists escalated_at timestamptz`;
 await sql`alter table customer_support_threads add column if not exists escalation_reason text`;
 await sql`alter table customer_support_threads add column if not exists resolution_due_at timestamptz`;
 await sql`create table if not exists support_sla_policies(
  priority varchar(16) primary key,
  first_response_minutes integer not null,
  resolution_minutes integer not null,
  is_active boolean not null default true,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now()
 )`;
 await sql`insert into support_sla_policies(priority,first_response_minutes,resolution_minutes)
 values ('normal',240,1440),('urgent',60,480),('critical',15,120)
 on conflict(priority) do nothing`;
 await sql`update customer_support_threads set first_response_due_at=coalesce(first_response_due_at,created_at+interval '240 minutes') where first_responded_at is null`;
 await sql`update customer_support_threads set resolution_due_at=coalesce(resolution_due_at,created_at+interval '1440 minutes') where status<>'resolved'`;
 await sql`create table if not exists support_thread_events(
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references customer_support_threads(id) on delete cascade,
  actor_user_id uuid references users(id) on delete set null,
  action varchar(48) not null,
  from_agent_user_id uuid references users(id) on delete set null,
  to_agent_user_id uuid references users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
 )`;
 await sql`create index if not exists support_thread_events_thread_idx on support_thread_events(thread_id,created_at)`;
 await sql`create index if not exists support_thread_events_actor_idx on support_thread_events(actor_user_id,created_at)`;
 await sql`create table if not exists support_satisfaction(
  thread_id uuid primary key references customer_support_threads(id) on delete cascade,
  customer_id uuid not null references users(id) on delete cascade,
  rating integer not null check(rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
 )`;
 await sql`create index if not exists support_satisfaction_customer_idx on support_satisfaction(customer_id,created_at)`;
 await sql`create index if not exists customer_support_threads_priority_idx on customer_support_threads(priority,status,last_message_at)`;
 await sql`create index if not exists customer_support_threads_escalation_idx on customer_support_threads(escalation_level,status,last_message_at)`;
 console.log("ZhaoXi 17.0 cumulative support operations migration applied.");
}finally{await sql.end({timeout:5})}
