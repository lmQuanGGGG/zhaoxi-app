import postgres from"postgres";import dotenv from"dotenv";dotenv.config({path:".env.local"});dotenv.config();const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;if(!url)throw new Error("DATABASE_URL/POSTGRES_URL missing");const sql=postgres(url,{ssl:"require"});
try{
await sql`create table if not exists operations_agent_capacity(
 admin_user_id uuid primary key references users(id) on delete cascade,
 daily_capacity integer not null default 20,
 warning_load_percent integer not null default 80,
 critical_load_percent integer not null default 100,
 is_available boolean not null default true,
 note text,
 updated_by_admin_user_id uuid references users(id) on delete set null,
 updated_at timestamptz not null default now()
)`;
console.log("ZhaoXi 17.5 Unified Operations Command Center migration applied.");
}finally{await sql.end()}