import dotenv from "dotenv";import postgres from "postgres";dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL required");const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`create table if not exists customer_profiles(
  user_id uuid primary key references users(id) on delete cascade,
  nationality varchar(80),gender varchar(24),birthday varchar(10),city_name varchar(120),
  address_text text,latitude numeric(10,7),longitude numeric(10,7),whatsapp varchar(40),
  wechat_contact_id varchar(128),notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
 )`;
 await sql`create index if not exists customer_profiles_city_idx on customer_profiles(city_name)`;
 await sql`create table if not exists customer_saved_addresses(
  id uuid primary key default gen_random_uuid(),user_id uuid not null references users(id) on delete cascade,
  label varchar(80) not null,recipient_name varchar(120),recipient_phone varchar(30),address_text text not null,
  latitude numeric(10,7),longitude numeric(10,7),is_default boolean not null default false,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
 )`;
 await sql`create index if not exists customer_saved_addresses_user_idx on customer_saved_addresses(user_id)`;
 await sql`create index if not exists customer_saved_addresses_default_idx on customer_saved_addresses(user_id,is_default)`;
 console.log("Sprint 16.18 customer profile, identity & saved addresses migration applied.");
}finally{await sql.end({timeout:5})}
