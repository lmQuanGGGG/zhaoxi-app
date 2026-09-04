import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({path:".env.local"});
dotenv.config();
const url=process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
if(!url)throw new Error("POSTGRES_URL or DATABASE_URL is required");

const notes=["PARTNER_ACCEPTED_FOOD_ORDER","FOOD_PREPARING","FOOD_READY_FOR_PICKUP","EXTERNAL_COURIER_BOOKED","FOOD_HANDED_TO_COURIER","EXTERNAL_DELIVERY_DELIVERED","FOOD_ORDER_CANCELLED"];
const sql=postgres(url,{ssl:"require",max:1,prepare:false});
try{
  const deleted=await sql`
    with duplicate_rows as (
      select id,row_number() over (partition by request_id,note order by created_at,id) as row_number
      from service_request_status_history
      where note = any(${notes})
    )
    delete from service_request_status_history history
    using duplicate_rows duplicates
    where history.id=duplicates.id and duplicates.row_number>1
    returning history.id
  `;
  console.log(`Removed ${deleted.length} duplicate food fulfillment timeline entries.`);
}finally{
  await sql.end({timeout:5});
}
