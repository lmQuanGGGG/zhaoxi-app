import dotenv from"dotenv";import postgres from"postgres";
dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`create table if not exists customer_support_threads(
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references users(id) on delete cascade,
  subject varchar(180) not null,
  status varchar(24) not null default 'open',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
 )`;
 await sql`create index if not exists customer_support_threads_customer_idx on customer_support_threads(customer_id,last_message_at)`;
 await sql`create table if not exists customer_support_messages(
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references customer_support_threads(id) on delete cascade,
  sender_role varchar(20) not null,
  sender_user_id uuid references users(id) on delete set null,
  body text not null,
  customer_read_at timestamptz,
  created_at timestamptz not null default now()
 )`;
 await sql`create index if not exists customer_support_messages_thread_idx on customer_support_messages(thread_id,created_at)`;
 console.log("Sprint 16.70 customer message center migration applied.");
}finally{await sql.end({timeout:5})}
