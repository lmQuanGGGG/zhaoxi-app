import {eq,inArray,sql} from "drizzle-orm";
import {getDb} from "@/db";
import {serviceRequests,serviceRequestStatusHistory} from "@/db/schema";
function d(row:any){return(row.details||{}) as Record<string,unknown>}
export class TravelReminderService{
 async evaluate(now=new Date()){
  const db=getDb(),rows=await db.select().from(serviceRequests).where(inArray(serviceRequests.status,["accepted","in_progress"])).limit(5000);let emitted=0;
  for(const candidate of rows){
   const x=d(candidate);if(x.inquiryType!=="travel_experience_inquiry"||x.travelBookingStage!=="confirmed"||x.travelReminderSentAt)continue;
   const at=new Date(`${String(x.requestedDate||"")}T${String(x.requestedTime||"09:00")}:00`);if(Number.isNaN(at.getTime())||at<=now)continue;
   const reminderAt=new Date(at.getTime()-2*60*60*1000);if(reminderAt>now)continue;
   const did=await db.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${candidate.id+"|travel-reminder"})::bigint)`);
    const row=(await tx.select().from(serviceRequests).where(eq(serviceRequests.id,candidate.id)).limit(1))[0];if(!row)return false;
    const current=d(row);if(current.travelBookingStage!=="confirmed"||current.travelReminderSentAt)return false;
    const visit=new Date(`${String(current.requestedDate||"")}T${String(current.requestedTime||"09:00")}:00`);if(Number.isNaN(visit.getTime())||visit<=now||new Date(visit.getTime()-2*60*60*1000)>now)return false;
    const nowIso=now.toISOString(),timeline=Array.isArray(current.travelTimeline)?current.travelTimeline.filter(x=>x&&typeof x==="object").slice(-199):[];
    const next={...current,travelReminderAt:new Date(visit.getTime()-2*60*60*1000).toISOString(),travelReminderSentAt:nowIso,travelTimeline:[...timeline,{id:crypto.randomUUID(),actorRole:"system",action:"departure_reminder",at:nowIso,note:"TRAVEL_DEPARTURE_REMINDER",scheduledAt:visit.toISOString()}]};
    await tx.update(serviceRequests).set({details:next,updatedAt:new Date()}).where(eq(serviceRequests.id,row.id));
    await tx.insert(serviceRequestStatusHistory).values({requestId:row.id,toStatus:row.status,note:`TRAVEL_DEPARTURE_REMINDER:${visit.toISOString()}`});
    return true;
   });if(did)emitted++;
  }return{ok:true,emitted};
 }
}
export const travelReminderService=new TravelReminderService();
