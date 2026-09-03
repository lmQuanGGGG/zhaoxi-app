import dotenv from "dotenv";
import postgres from "postgres";
dotenv.config({path:".env.local"});dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("POSTGRES_URL or DATABASE_URL is required");
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS release_approvals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version varchar(40) NOT NULL,
    release_candidate varchar(80) NOT NULL,
    status varchar(24) NOT NULL DEFAULT 'approved',
    note text,
    snapshot jsonb NOT NULL,
    approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
    rolled_back_by uuid REFERENCES users(id) ON DELETE SET NULL,
    rolled_back_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS release_approvals_created_idx ON release_approvals(created_at);
  CREATE INDEX IF NOT EXISTS release_approvals_status_idx ON release_approvals(status);`);
  console.log("Sprint 16.1 release approval migration applied.");
}finally{await sql.end({timeout:5})}
