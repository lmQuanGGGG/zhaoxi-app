import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {organizationMembers,serviceRequests,serviceRequestStatusHistory} from "@/db/schema";

type ActorRole="customer"|"partner";
type Message={id:string;senderRole:ActorRole;senderUserId:string;body:string;createdAt:string;customerReadAt?:string|null;partnerReadAt?:string|null};

function clean(v:unknown,max=2000){return String(v||"").trim().slice(0,max)}
function detailsOf(row:any){return (row.details||{}) as Record<string,unknown>}
function isHousingLead(row:any){const d=detailsOf(row);return d.housingLead===true&&d.inquiryType==="rental_inquiry"}

export class HousingMessagingService{
 private async lead(requestId:string){
  const row=(await getDb().select().from(serviceRequests).where(eq(serviceRequests.id,requestId)).limit(1))[0];
  if(!row||!isHousingLead(row))throw new Error("HOUSING_LEAD_NOT_FOUND");
  return row;
 }
 private async partnerMember(userId:string,organizationId:string){
  const member=(await getDb().select().from(organizationMembers).where(and(eq(organizationMembers.userId,userId),eq(organizationMembers.organizationId,organizationId),eq(organizationMembers.isActive,true))).limit(1))[0];
  if(!member)throw new Error("PARTNER_FORBIDDEN");
 }
 private messages(details:Record<string,unknown>):Message[]{
  return Array.isArray(details.housingMessages)?details.housingMessages.filter((x):x is Message=>Boolean(x)&&typeof x==="object").slice(-199):[];
 }
 private followup(details:Record<string,unknown>,actorRole:ActorRole,action:string,note:string){
  const current=Array.isArray(details.housingFollowupHistory)?details.housingFollowupHistory.filter(x=>x&&typeof x==="object").slice(-199):[];
  return [...current,{id:crypto.randomUUID(),actorRole,action,at:new Date().toISOString(),note}];
 }
 async customerSend(userId:string,requestId:string,bodyInput:unknown){
  const row=await this.lead(requestId);if(row.customerId!==userId)throw new Error("CUSTOMER_HOUSING_LEAD_FORBIDDEN");
  return this.send(row,"customer",userId,bodyInput);
 }
 async partnerSend(userId:string,organizationId:string,requestId:string,bodyInput:unknown){
  await this.partnerMember(userId,organizationId);const row=await this.lead(requestId);if(row.assignedOrganizationId!==organizationId)throw new Error("PARTNER_FORBIDDEN");
  return this.send(row,"partner",userId,bodyInput);
 }
 private async send(row:any,senderRole:ActorRole,senderUserId:string,bodyInput:unknown){
  const body=clean(bodyInput);if(!body)throw new Error("HOUSING_MESSAGE_REQUIRED");
  const db=getDb(),details=detailsOf(row),now=new Date().toISOString(),message:Message={id:crypto.randomUUID(),senderRole,senderUserId,body,createdAt:now,customerReadAt:senderRole==="customer"?now:null,partnerReadAt:senderRole==="partner"?now:null};
  const housingMessages=[...this.messages(details),message];
  const housingFollowupHistory=this.followup(details,senderRole,"message",body.slice(0,300));
  const[updated]=await db.update(serviceRequests).set({details:{...details,housingMessages,housingFollowupHistory,housingLastMessageAt:now,housingLastFollowupAt:now},updatedAt:new Date()}).where(eq(serviceRequests.id,row.id)).returning();
  await db.insert(serviceRequestStatusHistory).values({requestId:row.id,toStatus:row.status,note:`HOUSING_MESSAGE:${senderRole}`});
  return{request:updated,message};
 }
 async customerRead(userId:string,requestId:string){
  const row=await this.lead(requestId);if(row.customerId!==userId)throw new Error("CUSTOMER_HOUSING_LEAD_FORBIDDEN");
  return this.markRead(row,"customer");
 }
 async partnerRead(userId:string,organizationId:string,requestId:string){
  await this.partnerMember(userId,organizationId);const row=await this.lead(requestId);if(row.assignedOrganizationId!==organizationId)throw new Error("PARTNER_FORBIDDEN");
  return this.markRead(row,"partner");
 }
 private async markRead(row:any,viewer:ActorRole){
  const details=detailsOf(row),now=new Date().toISOString(),messages=this.messages(details).map(m=>viewer==="customer"&&m.senderRole==="partner"&&!m.customerReadAt?{...m,customerReadAt:now}:viewer==="partner"&&m.senderRole==="customer"&&!m.partnerReadAt?{...m,partnerReadAt:now}:m);
  const[updated]=await getDb().update(serviceRequests).set({details:{...details,housingMessages:messages},updatedAt:new Date()}).where(eq(serviceRequests.id,row.id)).returning();
  return updated;
 }
}
export const housingMessagingService=new HousingMessagingService();
