import {and,eq,inArray,sql} from "drizzle-orm";
import {getDb} from "@/db";
import {travelPlatformFeeService} from "@/lib/services/travel-platform-fee-service";
import {organizationMembers,serviceRequests,serviceRequestStatusHistory,services,modules} from "@/db/schema";

type TravelAction="confirm"|"reject"|"complete"|"cancel";
const days=["sun","mon","tue","wed","thu","fri","sat"] as const;
function clean(v:unknown,max=1000){return String(v||"").trim().slice(0,max)}
function details(row:any){return (row.details||{}) as Record<string,unknown>}
function metadata(row:any){return (row.metadata||{}) as Record<string,unknown>}
function dateOnly(v:unknown){const s=clean(v,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:""}
function timeOnly(v:unknown){const s=clean(v,5);return /^\d{2}:\d{2}$/.test(s)?s:""}
function parseDays(v:unknown){const raw=Array.isArray(v)?v.map(String):String(v||"").split(/[,;\s]+/);const norm=raw.map(x=>x.trim().slice(0,3).toLowerCase()).filter(Boolean);return norm.filter(x=>days.includes(x as any))}
function parseTimes(v:unknown){const raw=Array.isArray(v)?v.map(String):String(v||"").split(/[,;\s]+/);return raw.map(timeOnly).filter(Boolean)}
function stageOf(row:any){return String(details(row).travelBookingStage||"requested")}
function countGuests(row:any){return Math.max(1,Number(details(row).guests||1))}
function dateMatches(date:string,allowed:string[]){if(!allowed.length)return true;const d=new Date(`${date}T00:00:00`);return allowed.includes(days[d.getDay()])}
function timeline(x:Record<string,unknown>,actorRole:string,action:string,note?:string){const current=Array.isArray(x.travelTimeline)?x.travelTimeline.filter(v=>v&&typeof v==="object").slice(-199):[];return[...current,{id:crypto.randomUUID(),actorRole,action,at:new Date().toISOString(),note:note||null}]}

export class TravelBookingService{
 private async partner(userId:string,organizationId:string){
  const m=(await getDb().select().from(organizationMembers).where(and(eq(organizationMembers.userId,userId),eq(organizationMembers.organizationId,organizationId),eq(organizationMembers.isActive,true))).limit(1))[0];
  if(!m)throw new Error("PARTNER_FORBIDDEN");
 }
 private async travelService(serviceId:string){
  const row=(await getDb().select({id:services.id,organizationId:services.organizationId,isEnabled:services.isEnabled,metadata:services.metadata}).from(services).innerJoin(modules,eq(services.moduleId,modules.id)).where(and(eq(services.id,serviceId),eq(modules.code,"travel"))).limit(1))[0];
  if(!row)throw new Error("TRAVEL_EXPERIENCE_NOT_FOUND");return row;
 }
 async availability(serviceId:string,from?:string,daysCount=30){
  const s=await this.travelService(serviceId),m=metadata(s),start=dateOnly(from)||new Date().toISOString().slice(0,10),allowedDays=parseDays(m.availableDays),times=parseTimes(m.startTimes||m.startTime||"09:00"),blackout=new Set((Array.isArray(m.blackoutDates)?m.blackoutDates.map(String):[])),maxGuests=Math.max(1,Number(m.maxGuests||20)),out:any[]=[];
  const requests=await getDb().select().from(serviceRequests).where(eq(serviceRequests.serviceId,serviceId));
  for(let i=0;i<Math.max(1,Math.min(60,daysCount));i++){
   const d=new Date(`${start}T00:00:00`);d.setDate(d.getDate()+i);const date=d.toISOString().slice(0,10);if(!dateMatches(date,allowedDays)||blackout.has(date))continue;
   for(const time of times){
    const used=requests.filter(r=>{const x=details(r);return x.inquiryType==="travel_experience_inquiry"&&String(x.requestedDate||"")===date&&String(x.requestedTime||"")===time&&stageOf(r)==="confirmed"}).reduce((a,r)=>a+countGuests(r),0);
    out.push({date,time,maxGuests,remainingGuests:Math.max(0,maxGuests-used),available:s.isEnabled&&m.isAvailable!==false&&used<maxGuests});
   }
  }
  return{serviceId,slots:out};
 }
 async customerList(userId:string){
  const rows=await getDb().select().from(serviceRequests).where(eq(serviceRequests.customerId,userId));
  return rows.filter(r=>details(r).inquiryType==="travel_experience_inquiry").sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime());
 }
 async partnerList(userId:string,organizationId:string){
  await this.partner(userId,organizationId);
  const rows=await getDb().select().from(serviceRequests).where(eq(serviceRequests.assignedOrganizationId,organizationId));
  return rows.filter(r=>details(r).inquiryType==="travel_experience_inquiry").sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime());
 }
 async customerCancel(userId:string,id:string){
  const db=getDb(),row=(await db.select().from(serviceRequests).where(eq(serviceRequests.id,id)).limit(1))[0];if(!row||row.customerId!==userId||details(row).inquiryType!=="travel_experience_inquiry")throw new Error("TRAVEL_BOOKING_NOT_FOUND");
  const d=details(row),stage=stageOf(row);if(["completed","cancelled","rejected"].includes(stage))throw new Error("TRAVEL_BOOKING_NOT_CANCELLABLE");
  const now=new Date().toISOString(),next={...d,travelBookingStage:"cancelled",travelBookingUpdatedAt:now,cancelledBy:"customer",travelPlatformFeeStatus:d.travelPlatformFeeSnapshot?"void":"not_due",travelTimeline:timeline(d,"customer","cancel")};
  const[u]=await db.update(serviceRequests).set({status:"cancelled",details:next,updatedAt:new Date()}).where(eq(serviceRequests.id,id)).returning();
  await db.insert(serviceRequestStatusHistory).values({requestId:id,toStatus:"cancelled",note:"TRAVEL_BOOKING_CANCELLED_BY_CUSTOMER"});return u;
 }
 async partnerAction(userId:string,organizationId:string,id:string,input:{action?:unknown;note?:unknown}){
  await this.partner(userId,organizationId);const db=getDb(),row=(await db.select().from(serviceRequests).where(eq(serviceRequests.id,id)).limit(1))[0];
  if(!row||row.assignedOrganizationId!==organizationId||details(row).inquiryType!=="travel_experience_inquiry")throw new Error("TRAVEL_BOOKING_NOT_FOUND");
  const action=String(input.action||"") as TravelAction,note=clean(input.note,1000);if(!["confirm","reject","complete","cancel"].includes(action))throw new Error("TRAVEL_BOOKING_ACTION_INVALID");
  if(action==="confirm"){
   return db.transaction(async tx=>{
    if(!row.serviceId)throw new Error("TRAVEL_EXPERIENCE_NOT_FOUND");
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${row.serviceId+"|"+String(details(row).requestedDate)+"|"+String(details(row).requestedTime)})::bigint)`);
    const current=(await tx.select().from(serviceRequests).where(eq(serviceRequests.id,id)).limit(1))[0];if(!current)throw new Error("TRAVEL_BOOKING_NOT_FOUND");
    const cd=details(current);if(stageOf(current)!=="requested")throw new Error("TRAVEL_BOOKING_NOT_CONFIRMABLE");
    const s=await this.travelService(current.serviceId!);const m=metadata(s),maxGuests=Math.max(1,Number(m.maxGuests||20)),same=await tx.select().from(serviceRequests).where(eq(serviceRequests.serviceId,current.serviceId!));
    const used=same.filter(r=>{const x=details(r);return r.id!==current.id&&x.inquiryType==="travel_experience_inquiry"&&String(x.requestedDate||"")===String(cd.requestedDate||"")&&String(x.requestedTime||"")===String(cd.requestedTime||"")&&stageOf(r)==="confirmed"}).reduce((a,r)=>a+countGuests(r),0);
    if(used+countGuests(current)>maxGuests)throw new Error("TRAVEL_SLOT_CAPACITY_EXCEEDED");
    const feePolicy=await travelPlatformFeeService.resolve(organizationId),platformFee=travelPlatformFeeService.calculate(feePolicy,Number(cd.quotedAmount||0));
    const now=new Date().toISOString(),next={...cd,travelBookingStage:"confirmed",travelBookingUpdatedAt:now,partnerNote:note||null,confirmedAt:now,paymentRouting:"direct_to_partner",platformDoesNotHoldCustomerFunds:true,travelPlatformFeeSnapshot:{policy:feePolicy,platformFee,quotedAmount:Number(cd.quotedAmount||0),snapshottedAt:now},travelPlatformFeeStatus:platformFee>0?"accrued":"not_due",travelTimeline:timeline(cd,"partner","confirm",note)};
    const[u]=await tx.update(serviceRequests).set({status:"accepted",details:next,updatedAt:new Date()}).where(eq(serviceRequests.id,id)).returning();
    await tx.insert(serviceRequestStatusHistory).values({requestId:id,toStatus:"accepted",note:`TRAVEL_BOOKING_CONFIRMED${note?` · ${note}`:""}`});return u;
   });
  }
  const d=details(row),stage=stageOf(row);
  if(action==="complete"&&stage!=="confirmed")throw new Error("TRAVEL_BOOKING_NOT_COMPLETABLE");
  if(["completed","cancelled","rejected"].includes(stage))throw new Error("TRAVEL_BOOKING_FINALIZED");
  const mapping:{[K in Exclude<TravelAction,"confirm">]:{stage:string,status:"completed"|"rejected"|"cancelled";event:string}}={
   reject:{stage:"rejected",status:"rejected",event:"TRAVEL_BOOKING_REJECTED"},
   complete:{stage:"completed",status:"completed",event:"TRAVEL_BOOKING_COMPLETED"},
   cancel:{stage:"cancelled",status:"cancelled",event:"TRAVEL_BOOKING_CANCELLED_BY_PARTNER"}
  };
  const x=mapping[action as Exclude<TravelAction,"confirm">],now=new Date().toISOString(),feeSnap=(d.travelPlatformFeeSnapshot||{}) as Record<string,unknown>,feeAmount=Number(feeSnap.platformFee||0),feeStatus=action==="complete"?(feeAmount>0?"due":"not_due"):"void",next={...d,travelBookingStage:x.stage,travelBookingUpdatedAt:now,partnerNote:note||null,travelCompletedAt:action==="complete"?now:d.travelCompletedAt||null,travelPlatformFeeStatus:feeStatus,travelTimeline:timeline(d,"partner",action,note)};
  const[u]=await db.update(serviceRequests).set({status:x.status,details:next,updatedAt:new Date()}).where(eq(serviceRequests.id,id)).returning();
  await db.insert(serviceRequestStatusHistory).values({requestId:id,toStatus:x.status,note:`${x.event}${note?` · ${note}`:""}`});return u;
 }
}
export const travelBookingService=new TravelBookingService();
