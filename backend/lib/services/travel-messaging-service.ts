import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {organizationMembers,serviceRequests,serviceRequestStatusHistory} from "@/db/schema";

type ActorRole="customer"|"partner";
type Message={id:string;senderRole:ActorRole;senderUserId:string;body:string;createdAt:string;customerReadAt?:string|null;partnerReadAt?:string|null};
function clean(v:unknown,max=2000){return String(v||"").trim().slice(0,max)}
function d(row:any){return(row.details||{}) as Record<string,unknown>}
function isTravel(row:any){return d(row).inquiryType==="travel_experience_inquiry"}
function timeline(details:Record<string,unknown>,actorRole:string,action:string,note?:string,extra:Record<string,unknown>={}){
 const current=Array.isArray(details.travelTimeline)?details.travelTimeline.filter(x=>x&&typeof x==="object").slice(-199):[];
 return[...current,{id:crypto.randomUUID(),actorRole,action,at:new Date().toISOString(),note:note||null,...extra}];
}

export class TravelMessagingService{
 private async lead(id:string){const row=(await getDb().select().from(serviceRequests).where(eq(serviceRequests.id,id)).limit(1))[0];if(!row||!isTravel(row))throw new Error("TRAVEL_BOOKING_NOT_FOUND");return row}
 private async partner(userId:string,organizationId:string){const m=(await getDb().select().from(organizationMembers).where(and(eq(organizationMembers.userId,userId),eq(organizationMembers.organizationId,organizationId),eq(organizationMembers.isActive,true))).limit(1))[0];if(!m)throw new Error("PARTNER_FORBIDDEN")}
 private messages(details:Record<string,unknown>):Message[]{return Array.isArray(details.travelMessages)?details.travelMessages.filter((x):x is Message=>Boolean(x)&&typeof x==="object").slice(-199):[]}
 private async send(row:any,role:ActorRole,userId:string,bodyInput:unknown){
  const body=clean(bodyInput);if(!body)throw new Error("TRAVEL_MESSAGE_REQUIRED");const db=getDb(),details=d(row),now=new Date().toISOString();
  const message:Message={id:crypto.randomUUID(),senderRole:role,senderUserId:userId,body,createdAt:now,customerReadAt:role==="customer"?now:null,partnerReadAt:role==="partner"?now:null};
  const next={...details,travelMessages:[...this.messages(details),message],travelTimeline:timeline(details,role,"message",body.slice(0,300)),travelLastMessageAt:now};
  const[updated]=await db.update(serviceRequests).set({details:next,updatedAt:new Date()}).where(eq(serviceRequests.id,row.id)).returning();
  await db.insert(serviceRequestStatusHistory).values({requestId:row.id,toStatus:row.status,note:`TRAVEL_MESSAGE:${role}`});
  return{request:updated,message};
 }
 async customerSend(userId:string,id:string,body:unknown){const row=await this.lead(id);if(row.customerId!==userId)throw new Error("TRAVEL_BOOKING_FORBIDDEN");return this.send(row,"customer",userId,body)}
 async partnerSend(userId:string,organizationId:string,id:string,body:unknown){await this.partner(userId,organizationId);const row=await this.lead(id);if(row.assignedOrganizationId!==organizationId)throw new Error("PARTNER_FORBIDDEN");return this.send(row,"partner",userId,body)}
 private async markRead(row:any,viewer:ActorRole){const details=d(row),now=new Date().toISOString(),messages=this.messages(details).map(m=>viewer==="customer"&&m.senderRole==="partner"&&!m.customerReadAt?{...m,customerReadAt:now}:viewer==="partner"&&m.senderRole==="customer"&&!m.partnerReadAt?{...m,partnerReadAt:now}:m);const[u]=await getDb().update(serviceRequests).set({details:{...details,travelMessages:messages},updatedAt:new Date()}).where(eq(serviceRequests.id,row.id)).returning();return u}
 async customerRead(userId:string,id:string){const row=await this.lead(id);if(row.customerId!==userId)throw new Error("TRAVEL_BOOKING_FORBIDDEN");return this.markRead(row,"customer")}
 async partnerRead(userId:string,organizationId:string,id:string){await this.partner(userId,organizationId);const row=await this.lead(id);if(row.assignedOrganizationId!==organizationId)throw new Error("PARTNER_FORBIDDEN");return this.markRead(row,"partner")}
}
export const travelMessagingService=new TravelMessagingService();
