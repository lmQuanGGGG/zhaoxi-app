import dotenv from "dotenv";
import postgres from "postgres";
dotenv.config({ path: ".env.local" }); dotenv.config();

const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url) throw new Error("POSTGRES_URL or DATABASE_URL is required");

const required=[
  "users","organizations","service_requests","delivery_jobs",
  "wechat_login_sessions","auth_sessions","release_audit_events","operations_audit_logs"
];

const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
  const missing=[];
  for(const name of required){
    const [row]=await sql`select to_regclass(${`public.${name}`}) as relation`;
    if(!row?.relation) missing.push(name);
  }
  if(missing.length) throw new Error(`Sprint 16.11 integration gate missing required tables: ${missing.join(", ")}`);
  console.log("Sprint 16.11 pre-production integration schema gate passed; no destructive migration required.");
} finally { await sql.end({timeout:5}); }
