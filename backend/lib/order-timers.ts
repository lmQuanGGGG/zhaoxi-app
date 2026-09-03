import { driverService } from "@/lib/services/driver-service";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { serviceRequests, serviceRequestStatusHistory } from "@/db/schema";
export async function completeExpiredOrders(){
 const db=getDb(); const now=new Date();
 const rows=await db.select().from(serviceRequests).where(inArray(serviceRequests.status,["accepted","in_progress"]));
 for(const row of rows){const details=(row.details||{}) as Record<string,unknown>;const end=typeof details.estimatedCompletionAt==="string"?new Date(details.estimatedCompletionAt):null;if(!end||Number.isNaN(end.getTime())||end>now)continue;
  const external=details.deliveryFulfillmentMode==="external_manual"||details.driverDispatchRequired===false;
  if(external){
    if(details.fulfillmentStage==="ready_for_pickup"||details.fulfillmentStage==="courier_booked"||details.fulfillmentStage==="handed_off")continue;
    const nextDetails={...details,foodReadyAt:now.toISOString(),fulfillmentStage:"ready_for_pickup",deliveryStage:"external_delivery_pending"};
    const [updated]=await db.update(serviceRequests).set({status:"in_progress",details:nextDetails,updatedAt:now}).where(and(eq(serviceRequests.id,row.id),inArray(serviceRequests.status,["accepted","in_progress"]))).returning();
    if(updated)await db.insert(serviceRequestStatusHistory).values({requestId:row.id,fromStatus:row.status,toStatus:"in_progress",note:"AUTO_READY_FOR_EXTERNAL_PICKUP"});
  }else{
    const nextDetails={...details,autoCompletedAt:now.toISOString(),deliveryStage:"finding_courier"};
    const [updated]=await db.update(serviceRequests).set({status:"completed",details:nextDetails,updatedAt:now}).where(and(eq(serviceRequests.id,row.id),inArray(serviceRequests.status,["accepted","in_progress"]))).returning();
    if(updated){await db.insert(serviceRequestStatusHistory).values({requestId:row.id,fromStatus:row.status,toStatus:"completed",note:"AUTO_COMPLETED_FINDING_COURIER"});await driverService.ensureReadyJobs();}
  }
 }
}
