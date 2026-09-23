import {and,eq,sql} from "drizzle-orm";
import {getDb} from "@/db";
import {organizationMembers,paymentEvents,paymentTransactions,serviceRequests} from "@/db/schema";

export type FoodFulfillmentAction=
 "accept"|"start_preparing"|"ready_for_pickup"|"courier_booked"|"handed_off"|"delivered"|"cancelled";

export class PartnerFoodFulfillmentService{
 async authorize(userId:string,requestId:string){
  const db=getDb();
  // Keep the common authorized path to one database round trip. The fallback
  // query only runs for missing/forbidden requests so we can preserve the
  // existing error contract without slowing successful partner actions.
  const authorized=(await db.select({request:serviceRequests}).from(serviceRequests).innerJoin(organizationMembers,and(
    eq(organizationMembers.organizationId,serviceRequests.assignedOrganizationId),
    eq(organizationMembers.userId,userId),
    eq(organizationMembers.isActive,true)
  )).where(eq(serviceRequests.id,requestId)).limit(1))[0];
  if(authorized)return authorized.request;
  const request=(await db.select().from(serviceRequests).where(eq(serviceRequests.id,requestId)).limit(1))[0];
  if(!request)throw new Error("REQUEST_NOT_FOUND");
  if(!request.assignedOrganizationId)throw new Error("REQUEST_NOT_ASSIGNED");
  throw new Error("PARTNER_FORBIDDEN");
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
    if(details.paymentMethod==="bank_transfer"){
      const payment=(await db.select().from(paymentTransactions).where(eq(paymentTransactions.requestId,requestId)).limit(1))[0];
      if(!payment||payment.status!=="awaiting_payment"||!details.paymentCustomerReportedAt)throw new Error("BANK_TRANSFER_VERIFICATION_REQUIRED");
    }
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

  // Update the request and append its history in one SQL statement. This keeps
  // the transition atomic and avoids another Neon network round trip.
  const rows=await db.execute(sql`
    with updated as (
      update service_requests
      set status=${nextStatus}::request_status,
          details=${JSON.stringify(nextDetails)}::jsonb,
          updated_at=${now}
      where id=${requestId}::uuid
        and coalesce(details->>'fulfillmentStage','') <> ${targetStage}
      returning id,status,details,updated_at
    ), history as (
      insert into service_request_status_history
        (request_id,from_status,to_status,changed_by_user_id,note)
      select id,${current.status}::request_status,status,${userId}::uuid,${note}
      from updated
      returning id
    )
    select updated.status,updated.details,updated.updated_at,
           (select count(*)::int from history) as history_count
    from updated
  `) as unknown as Array<{status:typeof current.status;details:Record<string,unknown>;updated_at:Date}>;
  const row=rows[0];
  const updated=row?{...current,status:row.status,details:row.details,updatedAt:row.updated_at}:undefined;
  if(!updated)return (await db.select().from(serviceRequests).where(eq(serviceRequests.id,requestId)).limit(1))[0]||current;
  if(action==="accept"&&details.paymentMethod==="bank_transfer"){
    const payment=(await db.select().from(paymentTransactions).where(eq(paymentTransactions.requestId,requestId)).limit(1))[0];
    if(payment?.status==="awaiting_payment"){
      await db.update(paymentTransactions).set({status:"paid",paidAt:now,updatedAt:now,metadata:{...(payment.metadata||{}),verifiedByPartner:userId,verifiedAt:now.toISOString()}}).where(and(eq(paymentTransactions.id,payment.id),eq(paymentTransactions.status,"awaiting_payment")));
      await db.insert(paymentEvents).values({paymentId:payment.id,eventType:"PAYMENT_PARTNER_VERIFIED",payload:{partnerUserId:userId,requestCode:current.requestCode}});
      await db.update(serviceRequests).set({details:{...nextDetails,paymentStatus:"paid",paymentVerifiedAt:now.toISOString(),paymentVerifiedBy:userId},updatedAt:now}).where(eq(serviceRequests.id,requestId));
    }
  }
  return updated;
 }
}
export const partnerFoodFulfillmentService=new PartnerFoodFulfillmentService();
