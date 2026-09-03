import {eq,inArray,sql} from "drizzle-orm";
import {getDb} from "@/db";
import {serviceRequests,serviceRequestStatusHistory} from "@/db/schema";

function detailsOf(row:any){return (row.details||{}) as Record<string,unknown>}
export class HousingAppointmentReminderService{
 async evaluate(now=new Date()){
  const db=getDb(),rows=await db.select().from(serviceRequests).where(inArray(serviceRequests.status,["assigned","accepted","in_progress","waiting_customer"])).limit(5000);
  let emitted=0;
  for(const candidate of rows){
   const d=detailsOf(candidate),appt=(d.housingAppointment&&typeof d.housingAppointment==="object"?d.housingAppointment:null) as Record<string,unknown>|null;
   if(d.housingLead!==true||d.inquiryType!=="rental_inquiry"||!appt||appt.status!=="confirmed"||appt.reminderSentAt)continue;
   const reminder=new Date(String(appt.reminderAt||"")),scheduled=new Date(String(appt.scheduledAt||""));if(Number.isNaN(reminder.getTime())||Number.isNaN(scheduled.getTime())||reminder>now||scheduled<=now)continue;
   const didEmit=await db.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${candidate.id})::bigint)`);
    const row=(await tx.select().from(serviceRequests).where(eq(serviceRequests.id,candidate.id)).limit(1))[0];if(!row)return false;
    const current=detailsOf(row),currentAppt=(current.housingAppointment&&typeof current.housingAppointment==="object"?current.housingAppointment:null) as Record<string,unknown>|null;
    if(!currentAppt||currentAppt.status!=="confirmed"||currentAppt.reminderSentAt)return false;
    const due=new Date(String(currentAppt.reminderAt||"")),visit=new Date(String(currentAppt.scheduledAt||""));if(Number.isNaN(due.getTime())||Number.isNaN(visit.getTime())||due>now||visit<=now)return false;
    const nowIso=now.toISOString(),history=Array.isArray(current.housingFollowupHistory)?current.housingFollowupHistory.filter(x=>x&&typeof x==="object").slice(-199):[];
    const nextAppt={...currentAppt,reminderSentAt:nowIso};
    const nextHistory=[...history,{id:crypto.randomUUID(),actorRole:"system",action:"appointment_reminder",at:nowIso,scheduledAt:String(currentAppt.scheduledAt||""),note:"HOUSING_APPOINTMENT_REMINDER"}];
    await tx.update(serviceRequests).set({details:{...current,housingAppointment:nextAppt,housingFollowupHistory:nextHistory},updatedAt:new Date()}).where(eq(serviceRequests.id,row.id));
    await tx.insert(serviceRequestStatusHistory).values({requestId:row.id,toStatus:row.status,note:`HOUSING_APPOINTMENT_REMINDER:${String(currentAppt.scheduledAt||"")}`});
    return true;
   });
   if(didEmit)emitted++;
  }
  return{ok:true,emitted};
 }
}
export const housingAppointmentReminderService=new HousingAppointmentReminderService();
