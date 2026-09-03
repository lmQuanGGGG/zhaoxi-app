import dotenv from "dotenv";
import postgres from "postgres";
dotenv.config({ path: ".env.local" }); dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url) throw new Error("POSTGRES_URL or DATABASE_URL is required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS wechat_login_sessions_status_expires_idx ON wechat_login_sessions(status, expires_at);
    CREATE INDEX IF NOT EXISTS auth_sessions_user_status_refresh_idx ON auth_sessions(user_id, status, refresh_expires_at);
  `);
  console.log("Sprint 16.10 authentication preflight & WeChat session hardening migration applied.");
} finally { await sql.end({timeout:5}); }
