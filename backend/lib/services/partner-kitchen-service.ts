import {and,asc,desc,eq,inArray} from "drizzle-orm";
import {getDb} from "@/db";
import {organizationMembers,serviceRequests,services,serviceTranslations} from "@/db/schema";

type QueueStage="assigned"|"preparing"|"ready_for_pickup"|"courier_booked"|"handed_off";
const STAGES=new Set<QueueStage>(["assigned","preparing","ready_for_pickup","courier_booked","handed_off"]);

function asDate(value:unknown){if(typeof value!=="string")return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d}
function priorityValue(value:unknown){return value==="urgent"?2:value==="high"?1:0}

export class PartnerKitchenService{
 async authorize(userId:string,organizationId:string){
  const membership=(await getDb().select().from(organizationMembers).where(and(eq(organizationMembers.organizationId,organizationId),eq(organizationMembers.userId,userId),eq(organizationMembers.isActive,true))).limit(1))[0];
  if(!membership)throw new Error("PARTNER_FORBIDDEN");
 }
 async queue(userId:string,organizationId:string,locale:string){
  await this.authorize(userId,organizationId);
  const db=getDb(),now=Date.now();
  const rows=await db.select({
    requestId:serviceRequests.id,requestCode:serviceRequests.requestCode,status:serviceRequests.status,
    customerName:serviceRequests.customerName,customerPhone:serviceRequests.customerPhone,addressText:serviceRequests.addressText,
    details:serviceRequests.details,createdAt:serviceRequests.createdAt,updatedAt:serviceRequests.updatedAt,
    serviceId:services.id,serviceName:serviceTranslations.name,
  }).from(serviceRequests)
    .leftJoin(services,eq(serviceRequests.serviceId,services.id))
    .leftJoin(serviceTranslations,and(eq(serviceTranslations.serviceId,services.id),eq(serviceTranslations.locale,locale)))
    .where(and(eq(serviceRequests.assignedOrganizationId,organizationId),inArray(serviceRequests.status,["assigned","accepted","in_progress"])))
    .orderBy(asc(serviceRequests.createdAt)).limit(120);

  const items=rows.map(row=>{
    const d=(row.details||{}) as Record<string,unknown>;
    if(d.deliveryFulfillmentMode!=="external_manual")return null;
    const stage=(String(d.fulfillmentStage||"assigned") as QueueStage);
    if(!STAGES.has(stage))return null;
    const readyAt=asDate(d.estimatedReadyAt),startedAt=asDate(d.preparationStartedAt)||row.createdAt;
    const overdueMinutes=readyAt?Math.max(0,Math.floor((now-readyAt.getTime())/60000)):0;
    const elapsedMinutes=Math.max(0,Math.floor((now-startedAt.getTime())/60000));
    const priority=String(d.kitchenPriority||"normal");
    const sortScore=priorityValue(priority)*100000+(overdueMinutes>0?50000+overdueMinutes*100:0)+elapsedMinutes;
    const recipientPhone = (typeof d.recipientPhone === "string" && d.recipientPhone.trim()) ? d.recipientPhone.trim() : row.customerPhone;
    return{
      requestId:row.requestId,requestCode:row.requestCode,status:row.status,stage,priority,
      serviceId:row.serviceId,serviceName:row.serviceName||String(d.itemName||d.title||row.requestCode),
      customerName:row.customerName,customerPhone:recipientPhone,addressText:row.addressText,
      quantity:Number(d.quantity||1),itemSubtotal:Number(d.itemSubtotal||0),totalAmount:Number(d.totalAmount||0),
      estimatedMinutes:Number(d.estimatedMinutes||0),estimatedReadyAt:readyAt?.toISOString()||null,
      preparationStartedAt:startedAt.toISOString(),overdueMinutes,elapsedMinutes,late:overdueMinutes>0,
      courierName:String(d.courierName||""),courierReference:String(d.courierReference||""),
      sortScore,createdAt:row.createdAt.toISOString(),
    };
  }).filter(Boolean) as any[];

  items.sort((a,b)=>b.sortScore-a.sortScore||new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());
  return{
    generatedAt:new Date().toISOString(),
    counts:{
      waiting:items.filter(x=>x.stage==="assigned").length,
      preparing:items.filter(x=>x.stage==="preparing").length,
      ready:items.filter(x=>x.stage==="ready_for_pickup").length,
      courier:items.filter(x=>["courier_booked","handed_off"].includes(x.stage)).length,
      late:items.filter(x=>x.late).length,
    },
    items,
  };
 }
 async setPriority(userId:string,organizationId:string,requestId:string,priority:"normal"|"high"|"urgent"){
  await this.authorize(userId,organizationId);
  const db=getDb();
  const row=(await db.select().from(serviceRequests).where(and(eq(serviceRequests.id,requestId),eq(serviceRequests.assignedOrganizationId,organizationId))).limit(1))[0];
  if(!row)throw new Error("REQUEST_NOT_FOUND");
  const details=(row.details||{}) as Record<string,unknown>;
  const [updated]=await db.update(serviceRequests).set({details:{...details,kitchenPriority:priority,kitchenPriorityUpdatedAt:new Date().toISOString()},updatedAt:new Date()}).where(eq(serviceRequests.id,requestId)).returning();
  return updated;
 }
 async adjustEta(userId:string,organizationId:string,requestId:string,minutes:number){
  await this.authorize(userId,organizationId);
  const db=getDb(),now=new Date();
  const row=(await db.select().from(serviceRequests).where(and(eq(serviceRequests.id,requestId),eq(serviceRequests.assignedOrganizationId,organizationId))).limit(1))[0];
  if(!row)throw new Error("REQUEST_NOT_FOUND");
  const details=(row.details||{}) as Record<string,unknown>;
  const safe=[5,10,15,20,25,30,35,40,45,60,75,90].includes(minutes)?minutes:15;
  const [updated]=await db.update(serviceRequests).set({details:{...details,estimatedMinutes:safe,estimatedReadyAt:new Date(now.getTime()+safe*60000).toISOString(),kitchenEtaUpdatedAt:now.toISOString()},updatedAt:now}).where(eq(serviceRequests.id,requestId)).returning();
  return updated;
 }
}
export const partnerKitchenService=new PartnerKitchenService();
