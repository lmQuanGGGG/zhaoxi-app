import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({path:".env.local"});
dotenv.config();

const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("POSTGRES_URL or DATABASE_URL is required");

const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
  const rows=await sql`
    update delivery_pricing_policies
    set max_delivery_radius_km=12,
        updated_at=now()
    where scope='default'
    returning scope,max_delivery_radius_km,updated_at
  `;
  if(rows.length!==1)throw new Error("Default delivery pricing policy was not found");
  console.log(JSON.stringify(rows[0],null,2));
}finally{
  await sql.end({timeout:5});
}
