import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({path:".env.local"});
dotenv.config();

const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("POSTGRES_URL or DATABASE_URL is required");

const organizationId="818e97fe-cdb0-41ae-b700-00668faa34ba";
// 15 Trung Lương 16, Hòa Xuân, Cẩm Lệ, Đà Nẵng.
const location={latitude:16.007,longitude:108.226,deliveryRadiusKm:15};
const sql=postgres(url,{ssl:"require",max:1,prepare:false});

try{
  const rows=await sql`
    update organizations
    set metadata=coalesce(metadata,'{}'::jsonb)||${sql.json(location)}::jsonb,
        updated_at=now()
    where id=${organizationId}
    returning id,name,address_text,metadata
  `;
  if(rows.length!==1)throw new Error("Hỷ Garden Coffee organization was not found");
  console.log(JSON.stringify(rows[0],null,2));
}finally{
  await sql.end({timeout:5});
}
