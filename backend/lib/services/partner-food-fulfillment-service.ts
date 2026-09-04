import {and,eq,sql} from "drizzle-orm";
import {getDb} from "@/db";
import {organizationMembers,serviceRequests,serviceRequestStatusHistory} from "@/db/schema";

export type FoodFulfillmentAction=
 "accept"|"start_preparing"|"ready_for_pickup"|"courier_booked"|"handed_off"|"delivered"|"cancelled";

export class PartnerFoodFulfillmentService{
 async authorize(userId:string,requestId:string){
  const db=getDb();
  const request=(await db.select().from(serviceRequests).where(eq(serviceRequests.id,requestId)).limit(1))[0];
  if(!request)throw new Error("REQUEST_NOT_FOUND");
  if(!request.assignedOrganizationId)throw new Error("REQUEST_NOT_ASSIGNED");
  const membership=(await db.select().from(organizationMembers).where(and(
    eq(organizationMembers.organizationId,request.assignedOrganizationId),
    eq(organizationMembers.userId,userId),
    eq(organizationMembers.isActive,true)
  )).limit(1))[0];
  if(!membership)throw new Error("PARTNER_FORBIDDEN");
  return request;
 }
 async update(userId:string,requestId:string,input:{action:FoodFulfillmentAction;estimatedMinutes?:number;courierName?:string;courierPhone?:string;courierReference?:string;note?:string}){
  const db=getDb(),current=await this.authorize(userId,requestId),now=new Date();
  const details=(current.details||{}) as Record<string,unknown>;
  if(details.deliveryFulfillmentMode!=="external_manual")throw new Error("EXTERNAL_FULFILLMENT_REQUIRED");

  const action=input.action;
  const nextDetails:Record<string,unknown>={...details};
  let nextStatus=current.status;
  const noteByAction:Record<FoodFulfillmentAction,string>={accept:"PARTNER_ACCEPTED_FOOD_ORDER",start_preparing:"FOOD_PREPARING",ready_for_pickup:"FOOD_READY_FOR_PICKUP",courier_booked:"EXTERNAL_COURIER_BOOKED",handed_off:"FOOD_HANDED_TO_COURIER",delivered:"EXTERNAL_DELIVERY_DELIVERED",cancelled:"FOOD_ORDER_CANCELLED"};
  const stageByAction:Record<FoodFulfillmentAction,string>={accept:"preparing",start_preparing:"preparing",ready_for_pickup:"ready_for_pickup",courier_booked:"courier_booked",handed_off:"handed_off",delivered:"delivered",cancelled:"cancelled"};
  const note=noteByAction[action];
  const targetStage=stageByAction[action];
  if(!targetStage)throw new Error("FULFILLMENT_ACTION_INVALID");
  // Replayed mobile taps and background retries must not create another timeline step.
  if(details.fulfillmentStage===targetStage)return current;

  if(action==="accept"){
    if(!["assigned","accepted","in_progress"].includes(current.status))throw new Error("INVALID_FULFILLMENT_TRANSITION");
    const minutes=[10,15,20,25,30,35,40,45,60].includes(Number(input.estimatedMinutes))?Number(input.estimatedMinutes):15;
    nextStatus="in_progress";
    Object.assign(nextDetails,{fulfillmentStage:"preparing",acceptedAt:details.acceptedAt||now.toISOString(),preparationStartedAt:now.toISOString(),estimatedMinutes:minutes,estimatedReadyAt:new Date(now.getTime()+minutes*60000).toISOString(),deliveryStage:"preparing"});
  }else if(action==="start_preparing"){
    if(!["assigned","accepted","in_progress"].includes(current.status))throw new Error("INVALID_FULFILLMENT_TRANSITION");
    nextStatus="in_progress";Object.assign(nextDetails,{fulfillmentStage:"preparing",preparationStartedAt:details.preparationStartedAt||now.toISOString(),deliveryStage:"preparing"});
  }else if(action==="ready_for_pickup"){
    if(current.status!=="in_progress")throw new Error("INVALID_FULFILLMENT_TRANSITION");
    nextStatus="in_progress";Object.assign(nextDetails,{fulfillmentStage:"ready_for_pickup",foodReadyAt:now.toISOString(),deliveryStage:"external_delivery_pending"});
  }else if(action==="courier_booked"){
    if(!["in_progress","waiting_customer"].includes(current.status))throw new Error("INVALID_FULFILLMENT_TRANSITION");
    nextStatus="in_progress";Object.assign(nextDetails,{fulfillmentStage:"courier_booked",courierBookedAt:now.toISOString(),courierName:String(input.courierName||"").slice(0,120),courierPhone:String(input.courierPhone||"").slice(0,40),courierReference:String(input.courierReference||"").slice(0,160),deliveryStage:"external_courier_booked"});
  }else if(action==="handed_off"){
    if(current.status!=="in_progress")throw new Error("INVALID_FULFILLMENT_TRANSITION");
    nextStatus="in_progress";Object.assign(nextDetails,{fulfillmentStage:"handed_off",handedOffAt:now.toISOString(),deliveryStage:"external_handed_off"});
  }else if(action==="delivered"){
    if(current.status!=="in_progress")throw new Error("INVALID_FULFILLMENT_TRANSITION");
    nextStatus="completed";Object.assign(nextDetails,{fulfillmentStage:"delivered",deliveredAt:now.toISOString(),deliveryStage:"delivered"});
  }else if(action==="cancelled"){
    if(["completed","cancelled","rejected"].includes(current.status))throw new Error("INVALID_FULFILLMENT_TRANSITION");
    nextStatus="cancelled";Object.assign(nextDetails,{fulfillmentStage:"cancelled",cancelledAt:now.toISOString(),deliveryStage:"cancelled"});
  }

  // This guard makes the transition atomic: only the first identical request wins.
  const [updated]=await db.update(serviceRequests).set({status:nextStatus as any,details:nextDetails,updatedAt:now}).where(and(eq(serviceRequests.id,requestId),sql`coalesce(${serviceRequests.details}->>'fulfillmentStage','') <> ${targetStage}`)).returning();
  if(!updated)return (await db.select().from(serviceRequests).where(eq(serviceRequests.id,requestId)).limit(1))[0]||current;
  await db.insert(serviceRequestStatusHistory).values({requestId,fromStatus:current.status,toStatus:nextStatus as any,note});
  return updated;
 }
}
export const partnerFoodFulfillmentService=new PartnerFoodFulfillmentService();
