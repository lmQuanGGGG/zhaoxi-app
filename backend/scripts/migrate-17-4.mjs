import postgres from"postgres";import dotenv from"dotenv";dotenv.config({path:".env.local"});dotenv.config();const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;if(!url)throw new Error("DATABASE_URL/POSTGRES_URL missing");const sql=postgres(url,{ssl:"require"});
try{
await sql`create table if not exists customer_operation_tasks(
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references users(id) on delete cascade,
 title varchar(220) not null,
 description text,
 task_type varchar(40) not null default 'follow_up',
 priority varchar(16) not null default 'normal',
 status varchar(24) not null default 'open',
 assigned_admin_user_id uuid references users(id) on delete set null,
 due_at timestamptz,
 completed_at timestamptz,
 source_type varchar(48),
 source_id varchar(120),
 created_by_admin_user_id uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
)`;
await sql`create index if not exists customer_operation_tasks_customer_idx on customer_operation_tasks(customer_id,status,due_at)`;
await sql`create index if not exists customer_operation_tasks_assignee_idx on customer_operation_tasks(assigned_admin_user_id,status,due_at)`;

await sql`create table if not exists customer_segments(
 id uuid primary key default gen_random_uuid(),
 code varchar(60) not null unique,
 name varchar(120) not null,
 description text,
 is_active boolean not null default true,
 created_by_admin_user_id uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
)`;
await sql`create table if not exists customer_segment_members(
 segment_id uuid not null references customer_segments(id) on delete cascade,
 customer_id uuid not null references users(id) on delete cascade,
 added_by_admin_user_id uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 primary key(segment_id,customer_id)
)`;
await sql`create index if not exists customer_segment_members_customer_idx on customer_segment_members(customer_id)`;
await sql`insert into customer_segments(code,name,description)
values
 ('priority_follow_up','Priority Follow-up','Customers requiring prioritized operational follow-up'),
 ('service_recovery','Service Recovery','Customers with an active service recovery case'),
 ('high_engagement','High Engagement','Customers with sustained first-party ZhaoXi activity')
on conflict(code) do nothing`;

await sql`create table if not exists customer_service_recovery_cases(
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references users(id) on delete cascade,
 reason varchar(120) not null,
 summary text not null,
 severity varchar(16) not null default 'normal',
 status varchar(24) not null default 'open',
 assigned_admin_user_id uuid references users(id) on delete set null,
 due_at timestamptz,
 resolution_note text,
 resolved_at timestamptz,
 source_type varchar(48),
 source_id varchar(120),
 created_by_admin_user_id uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
)`;
await sql`create index if not exists customer_service_recovery_customer_idx on customer_service_recovery_cases(customer_id,status,due_at)`;
await sql`create index if not exists customer_service_recovery_assignee_idx on customer_service_recovery_cases(assigned_admin_user_id,status,due_at)`;

await sql`create table if not exists customer_operation_events(
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references users(id) on delete cascade,
 actor_admin_user_id uuid references users(id) on delete set null,
 entity_type varchar(40) not null,
 entity_id uuid,
 action varchar(60) not null,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
)`;
await sql`create index if not exists customer_operation_events_customer_idx on customer_operation_events(customer_id,created_at)`;
console.log("ZhaoXi 17.4 Unified Customer Operations migration applied.");
}finally{await sql.end()}