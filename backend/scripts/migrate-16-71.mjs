import dotenv from"dotenv";import postgres from"postgres";
dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`alter table customer_support_threads add column if not exists assigned_admin_user_id uuid references users(id) on delete set null`;
 await sql`alter table customer_support_threads add column if not exists first_response_due_at timestamptz`;
 await sql`alter table customer_support_threads add column if not exists first_responded_at timestamptz`;
 await sql`alter table customer_support_threads add column if not exists resolved_at timestamptz`;
 await sql`alter table customer_support_messages add column if not exists admin_read_at timestamptz`;
 await sql`create index if not exists customer_support_threads_assignment_idx on customer_support_threads(assigned_admin_user_id,status,last_message_at)`;
 console.log("Sprint 16.71 admin support desk migration applied.");
}finally{await sql.end({timeout:5})}
