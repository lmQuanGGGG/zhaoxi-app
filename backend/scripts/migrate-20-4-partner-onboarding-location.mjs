import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({path:".env.local"});
dotenv.config();
const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;
if(!url)throw new Error("DATABASE_URL/POSTGRES_URL missing");
const sql=postgres(url,{ssl:"require"});
try {
  await sql`alter table onboarding_applications add column if not exists latitude numeric(10,7)`;
  await sql`alter table onboarding_applications add column if not exists longitude numeric(10,7)`;
  console.log("Partner onboarding location migration applied.");
} finally { await sql.end(); }
