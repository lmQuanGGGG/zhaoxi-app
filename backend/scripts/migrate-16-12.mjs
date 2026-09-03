import dotenv from "dotenv";
import postgres from "postgres";
dotenv.config({ path: ".env.local" }); dotenv.config();

const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url) throw new Error("POSTGRES_URL or DATABASE_URL is required");

const requiredColumns={
  users:["id","wechat_open_id","status"],
  wechat_login_sessions:["id","state","role","status","exchange_code_hash","exchange_expires_at","exchanged_at","expires_at"],
  auth_sessions:["id","user_id","role","access_token_hash","refresh_token_hash","status","access_expires_at","refresh_expires_at"],
  service_requests:["id","request_code","customer_id","status"],
  delivery_jobs:["id","request_id","driver_id","status"],
  release_audit_events:["id","action","created_at"],
  operations_audit_logs:["id","action","created_at"],
};

const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
  const missing=[];
  for(const [table,columns] of Object.entries(requiredColumns)){
    const rows=await sql`
      select column_name from information_schema.columns
      where table_schema='public' and table_name=${table}
    `;
    const found=new Set(rows.map(r=>r.column_name));
    for(const column of columns) if(!found.has(column)) missing.push(`${table}.${column}`);
  }
  if(missing.length) throw new Error(`Sprint 16.12 runtime contract gate missing columns: ${missing.join(", ")}`);
  console.log("Sprint 16.12 release-candidate runtime contract gate passed; no destructive migration required.");
} finally { await sql.end({timeout:5}); }
