import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {organizationMembers,serviceRequests,serviceRequestStatusHistory} from "@/db/schema";

type ActorRole="customer"|"partner";
type AppointmentStatus="proposed"|"confirmed"|"completed"|"cancelled";
type Action="propose"|"confirm"|"reschedule"|"complete"|"cancel"|"note";
type Appointment={status:AppointmentStatus;scheduledAt:string;proposedBy:ActorRole;note?:string|null;updatedAt:string;confirmedAt?:string|null;completedAt?:string|null;cancelledAt?:string|null;reminderAt?:string|null};
type HistoryEntry={id:string;actorRole:ActorRole;action:Action;at:string;note?:string|null;scheduledAt?:string|null};

function clean(v:unknown,max=1200){return String(v||"").trim().slice(0,max)}
function parseFuture(v:unknown){const d=new Date(String(v||""));if(Number.isNaN(d.getTime()))throw new Error("HOUSING_APPOINTMENT_TIME_INVALID");if(d.getTime()<Date.now()-5*60_000)throw new Error("HOUSING_APPOINTMENT_TIME_PAST");return d}
function reminderAt(d:Date){return new Date(d.getTime()-2*60*60*1000).toISOString()}
function detailsOf(row:any){return (row.details||{}) as Record<string,unknown>}
function housingLead(row:any){const d=detailsOf(row);return d.housingLead===true&&d.inquiryType==="rental_inquiry"}

export class HousingAppointmentService{
 private async lead(requestId:string){
  const row=(await getDb().select().from(serviceRequests).where(eq(serviceRequests.id,requestId)).limit(1))[0];
  if(!row||!housingLead(row))throw new Error("HOUSING_LEAD_NOT_FOUND");
  return row;
 }
 private async authorizePartner(userId:string,organizationId:string){
  const member=(await getDb().select().from(organizationMembers).where(and(eq(organizationMembers.userId,userId),eq(organizationMembers.organizationId,organizationId),eq(organizationMembers.isActive,true))).limit(1))[0];
  if(!member)throw new Error("PARTNER_FORBIDDEN");
 }
 private appendHistory(details:Record<string,unknown>,entry:Omit<HistoryEntry,"id"|"at">){
  const current=Array.isArray(details.housingFollowupHistory)?details.housingFollowupHistory.filter(x=>x&&typeof x==="object").slice(-99):[];
  return [...current,{id:crypto.randomUUID(),at:new Date().toISOString(),...entry}];
 }
 private async persist(row:any,actorRole:ActorRole,action:Action,appointment:Appointment|undefined,note:string,scheduledAt?:string){
  const db=getDb(),details=detailsOf(row),history=this.appendHistory(details,{actorRole,action,note:note||null,scheduledAt:scheduledAt||appointment?.scheduledAt||null});
  const stage=action==="confirm"?"viewing":action==="complete"?"negotiating":String(details.housingLeadStage||"new");
  const nextStatus=action==="confirm"||action==="complete"?"in_progress":row.status;
  const nextDetails={...details,housingLeadStage:stage,housingLeadStageUpdatedAt:action==="confirm"||action==="complete"?new Date().toISOString():details.housingLeadStageUpdatedAt,housingAppointment:appointment||details.housingAppointment||null,housingFollowupHistory:history,housingLastFollowupAt:new Date().toISOString()};
  const[updated]=await db.update(serviceRequests).set({status:nextStatus,details:nextDetails,updatedAt:new Date()}).where(eq(serviceRequests.id,row.id)).returning();
  await db.insert(serviceRequestStatusHistory).values({requestId:row.id,toStatus:nextStatus,note:`HOUSING_FOLLOWUP:${action}${scheduledAt?` · ${scheduledAt}`:""}${note?` · ${note}`:""}`});
  return updated;
 }

 async customerAction(userId:string,requestId:string,input:{action?:unknown;scheduledAt?:unknown;note?:unknown}){
  const row=await this.lead(requestId);if(row.customerId!==userId)throw new Error("CUSTOMER_HOUSING_LEAD_FORBIDDEN");
  const action=clean(input.action,30) as Action,note=clean(input.note);
  const current=(detailsOf(row).housingAppointment||null) as Appointment|null;
  if(action==="propose"){
   const when=parseFuture(input.scheduledAt);const appointment:Appointment={status:"proposed",scheduledAt:when.toISOString(),proposedBy:"customer",note:note||null,updatedAt:new Date().toISOString(),reminderAt:reminderAt(when)};
   return this.persist(row,"customer","propose",appointment,note,appointment.scheduledAt);
  }
  if(action==="confirm"){
   if(!current||current.status!=="proposed"||current.proposedBy!=="partner")throw new Error("HOUSING_APPOINTMENT_NOT_CONFIRMABLE");
   const appointment={...current,status:"confirmed" as const,confirmedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   return this.persist(row,"customer","confirm",appointment,note);
  }
  if(action==="cancel"){
   if(!current||current.status==="completed"||current.status==="cancelled")throw new Error("HOUSING_APPOINTMENT_NOT_CANCELLABLE");
   const appointment={...current,status:"cancelled" as const,cancelledAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   return this.persist(row,"customer","cancel",appointment,note);
  }
  if(action==="note")return this.persist(row,"customer","note",undefined,note);
  throw new Error("HOUSING_CUSTOMER_APPOINTMENT_ACTION_INVALID");
 }

 async partnerAction(userId:string,organizationId:string,requestId:string,input:{action?:unknown;scheduledAt?:unknown;note?:unknown}){
  await this.authorizePartner(userId,organizationId);const row=await this.lead(requestId);if(row.assignedOrganizationId!==organizationId)throw new Error("PARTNER_FORBIDDEN");
  const action=clean(input.action,30) as Action,note=clean(input.note),current=(detailsOf(row).housingAppointment||null) as Appointment|null;
  if(action==="confirm"){
   if(!current||current.status!=="proposed"||current.proposedBy!=="customer")throw new Error("HOUSING_APPOINTMENT_NOT_CONFIRMABLE");
   const appointment={...current,status:"confirmed" as const,confirmedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   return this.persist(row,"partner","confirm",appointment,note);
  }
  if(action==="reschedule"){
   const when=parseFuture(input.scheduledAt);const appointment:Appointment={status:"proposed",scheduledAt:when.toISOString(),proposedBy:"partner",note:note||null,updatedAt:new Date().toISOString(),reminderAt:reminderAt(when)};
   return this.persist(row,"partner","reschedule",appointment,note,appointment.scheduledAt);
  }
  if(action==="complete"){
   if(!current||current.status!=="confirmed")throw new Error("HOUSING_APPOINTMENT_NOT_COMPLETABLE");
   const appointment={...current,status:"completed" as const,completedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   return this.persist(row,"partner","complete",appointment,note);
  }
  if(action==="cancel"){
   if(!current||current.status==="completed"||current.status==="cancelled")throw new Error("HOUSING_APPOINTMENT_NOT_CANCELLABLE");
   const appointment={...current,status:"cancelled" as const,cancelledAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   return this.persist(row,"partner","cancel",appointment,note);
  }
  if(action==="note")return this.persist(row,"partner","note",undefined,note);
  throw new Error("HOUSING_PARTNER_APPOINTMENT_ACTION_INVALID");
 }
}
export const housingAppointmentService=new HousingAppointmentService();
