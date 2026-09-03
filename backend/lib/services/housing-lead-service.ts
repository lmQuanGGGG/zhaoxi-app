import {and,desc,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {modules,organizationMembers,serviceRequests,serviceRequestStatusHistory,services} from "@/db/schema";

export type HousingLeadStage="new"|"contacted"|"viewing"|"negotiating"|"won"|"lost";
const stages:HousingLeadStage[]=["new","contacted","viewing","negotiating","won","lost"];
function stage(v:unknown):HousingLeadStage{const s=String(v||"new") as HousingLeadStage;if(!stages.includes(s))throw new Error("HOUSING_LEAD_STAGE_INVALID");return s}
function clean(v:unknown,max=1000){return String(v||"").trim().slice(0,max)}

export class HousingLeadService{
 async authorizePartner(userId:string,organizationId:string){
  const m=(await getDb().select().from(organizationMembers).where(and(eq(organizationMembers.userId,userId),eq(organizationMembers.organizationId,organizationId),eq(organizationMembers.isActive,true))).limit(1))[0];
  if(!m)throw new Error("PARTNER_FORBIDDEN");
 }
 async listPartner(userId:string,organizationId:string){
  await this.authorizePartner(userId,organizationId);
  const rows=await getDb().select().from(serviceRequests).where(eq(serviceRequests.assignedOrganizationId,organizationId)).orderBy(desc(serviceRequests.createdAt)).limit(1000);
  return rows.filter(r=>{const d=(r.details||{}) as Record<string,unknown>;return d.housingLead===true&&d.inquiryType==="rental_inquiry"});
 }
 async update(userId:string,organizationId:string,requestId:string,input:{stage?:unknown;note?:unknown}){
  await this.authorizePartner(userId,organizationId);
  const db=getDb(),row=(await db.select().from(serviceRequests).where(and(eq(serviceRequests.id,requestId),eq(serviceRequests.assignedOrganizationId,organizationId))).limit(1))[0];
  if(!row)throw new Error("HOUSING_LEAD_NOT_FOUND");
  const details=(row.details||{}) as Record<string,unknown>;
  if(details.housingLead!==true||details.inquiryType!=="rental_inquiry")throw new Error("HOUSING_LEAD_NOT_FOUND");
  const next=stage(input.stage),note=clean(input.note,1000),now=new Date().toISOString();
  const status=next==="new"?"assigned":next==="contacted"?"accepted":next==="viewing"||next==="negotiating"?"in_progress":next==="won"?"completed":"rejected";
  const[updated]=await db.update(serviceRequests).set({status,details:{...details,housingLeadStage:next,housingLeadStageUpdatedAt:now,housingLeadNote:note||details.housingLeadNote||null},updatedAt:new Date()}).where(eq(serviceRequests.id,requestId)).returning();
  await db.insert(serviceRequestStatusHistory).values({requestId,toStatus:status,note:`HOUSING_LEAD_STAGE:${next}${note?` · ${note}`:""}`});
  return updated;
 }
 async listCustomer(userId:string){
  const rows=await getDb().select().from(serviceRequests).where(eq(serviceRequests.customerId,userId)).orderBy(desc(serviceRequests.createdAt)).limit(500);
  const housing=rows.filter(r=>{const d=(r.details||{}) as Record<string,unknown>;return d.housingLead===true&&d.inquiryType==="rental_inquiry"});
  if(!housing.length)return[];
  const ids=[...new Set(housing.map(x=>x.serviceId).filter(Boolean))] as string[];
  const serviceRows=(ids.length?await getDb().select({id:services.id,code:services.code,metadata:services.metadata}).from(services).innerJoin(modules,eq(services.moduleId,modules.id)).where(eq(modules.code,"housing")):[]) as Array<{id:string;code:string;metadata:Record<string,unknown>|null}>;
  const map=new Map<string,{id:string;code:string;metadata:Record<string,unknown>|null}>(serviceRows.map(x=>[x.id,x]));
  return housing.map(r=>{const d=(r.details||{}) as Record<string,unknown>,s=map.get(r.serviceId||"");return{...r,listing:{id:s?.id||r.serviceId,code:s?.code||"",imageUrl:String(((s?.metadata||{}) as Record<string,unknown>).imageUrl||"")},housingLeadStage:String(d.housingLeadStage||"new")}});
 }
}
export const housingLeadService=new HousingLeadService();
