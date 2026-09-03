import dotenv from "dotenv";import postgres from "postgres";
dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`create table if not exists customer_notification_states(
   user_id uuid not null references users(id) on delete cascade,
   event_key varchar(220) not null,
   read_at timestamptz,
   deleted_at timestamptz,
   updated_at timestamptz not null default now(),
   primary key(user_id,event_key)
 )`;
 await sql`create index if not exists customer_notification_states_user_idx on customer_notification_states(user_id)`;
 console.log("Sprint 16.22 notification state & deep-link migration applied.");
}finally{await sql.end({timeout:5})}
