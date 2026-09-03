import dotenv from "dotenv";import postgres from "postgres";
dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`create table if not exists delivery_pricing_policies(
   id uuid primary key default gen_random_uuid(),
   scope varchar(40) not null unique default 'default',
   base_fee integer not null default 15000,
   base_distance_km numeric(8,2) not null default 2,
   per_km_fee integer not null default 8000,
   partner_subsidy_amount integer not null default 20000,
   subsidy_windows jsonb not null default '[{"start":"07:00","end":"10:00"},{"start":"13:00","end":"16:00"}]'::jsonb,
   timezone varchar(64) not null default 'Asia/Ho_Chi_Minh',
   max_delivery_radius_km numeric(8,2) not null default 15,
   distance_provider varchar(32) not null default 'google_routes',
   allow_geo_fallback boolean not null default true,
   enabled boolean not null default true,
   updated_by_user_id uuid references users(id) on delete set null,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 )`;
 await sql`insert into delivery_pricing_policies(
   scope,base_fee,base_distance_km,per_km_fee,partner_subsidy_amount,subsidy_windows,timezone,max_delivery_radius_km,distance_provider,allow_geo_fallback,enabled
 ) values(
   'default',15000,2,8000,20000,
   '[{"start":"07:00","end":"10:00"},{"start":"13:00","end":"16:00"}]'::jsonb,
   'Asia/Ho_Chi_Minh',15,'google_routes',true,true
 ) on conflict(scope) do nothing`;
 console.log("Sprint 16.25.1 external delivery pricing policy migration applied.");
}finally{await sql.end({timeout:5})}
