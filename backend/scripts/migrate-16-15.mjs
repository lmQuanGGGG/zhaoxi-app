import dotenv from "dotenv";import postgres from "postgres";
dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
 await sql`create table if not exists customer_ui_settings(
   id uuid primary key default gen_random_uuid(),
   scope varchar(40) not null unique default 'default',
   banner_effect integer not null default 0,
   banner_auto_cycle boolean not null default false,
   banner_cycle_seconds integer not null default 20,
   recommendation_cycle_seconds integer not null default 60,
   banner_content jsonb not null default '{}'::jsonb,
   updated_by_user_id uuid references users(id) on delete set null,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 )`;
 await sql`insert into customer_ui_settings(scope,banner_effect,banner_auto_cycle,banner_cycle_seconds,recommendation_cycle_seconds,banner_content)
 values('default',0,false,20,60,'{"zh-CN":{"title":"欢迎来到岘港","subtitle":"赵喜陪伴您的每一天","cityLabel":"岘港"},"zh-TW":{"title":"歡迎來到峴港","subtitle":"趙喜陪伴您的每一天","cityLabel":"峴港"},"vi-VN":{"title":"Chào mừng đến Đà Nẵng","subtitle":"ZhaoXi đồng hành cùng bạn mỗi ngày","cityLabel":"Đà Nẵng"},"en-US":{"title":"Welcome to Da Nang","subtitle":"ZhaoXi is with you every day","cityLabel":"Da Nang"}}'::jsonb)
 on conflict(scope) do nothing`;
 console.log("Sprint 16.15 customer UI configuration migration applied.");
}finally{await sql.end({timeout:5})}
