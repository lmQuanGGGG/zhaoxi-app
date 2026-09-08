import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({path:".env.local"});
dotenv.config();

const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;
if(!url)throw new Error("DATABASE_URL/POSTGRES_URL missing");
const sql=postgres(url,{ssl:"require"});
try{
  await sql`alter table customer_support_settings add column if not exists zalo_qr_url text`;
  await sql`alter table customer_support_settings add column if not exists wechat_qr_url text`;
  await sql`alter table customer_support_settings add column if not exists zalo_chat_url text`;
  await sql`alter table customer_support_settings add column if not exists wechat_chat_url text`;
  await sql`update customer_support_settings set zalo_qr_url=coalesce(nullif(zalo_qr_url,''),'/support-qr/zalo.png'), wechat_qr_url=coalesce(nullif(wechat_qr_url,''),'/support-qr/wechat.png'), zalo_chat_url=coalesce(nullif(zalo_chat_url,''),'zalo://'), wechat_chat_url=coalesce(nullif(wechat_chat_url,''),'weixin://') where scope='default'`;
  console.log("Order support QR configuration migration applied.");
}finally{await sql.end()}
