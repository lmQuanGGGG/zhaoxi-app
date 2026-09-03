import {and,asc,desc,eq,gte,inArray} from "drizzle-orm";
import {getDb} from "@/db";
import {modules,operationsAuditLogs,organizationMembers,organizations,restaurantCoupons,serviceRequests,services} from "@/db/schema";
import {restaurantAnalyticsService} from "@/lib/services/restaurant-analytics-service";

type Period=7|30|90;
type PlatformControl={paused:boolean;reason:string;updatedAt?:string;updatedByUserId?:string};

function n(v:unknown){const x=Number(v);return Number.isFinite(x)?x:0}
function control(metadata:Record<string,unknown>|null|undefined):PlatformControl{
 const raw=(metadata?.platformRestaurantControl&&typeof metadata.platformRestaurantControl==="object"?metadata.platformRestaurantControl:{}) as Record<string,unknown>;
 return{paused:raw.paused===true,reason:String(raw.reason||"").slice(0,240),updatedAt:typeof raw.updatedAt==="string"?raw.updatedAt:undefined,updatedByUserId:typeof raw.updatedByUserId==="string"?raw.updatedByUserId:undefined};
}
function operations(metadata:Record<string,unknown>|null|undefined){
 const raw=(metadata?.restaurantOperations&&typeof metadata.restaurantOperations==="object"?metadata.restaurantOperations:{}) as Record<string,unknown>;
 return{
  manualPaused:raw.manualPaused===true,
  pauseReason:String(raw.pauseReason||""),
  maxActiveKitchenOrders:Math.max(1,n(raw.maxActiveKitchenOrders)||30),
  autoPauseWhenCapacity:raw.autoPauseWhenCapacity!==false,
  businessHoursEnabled:raw.businessHoursEnabled===true,
  timezone:String(raw.timezone||"Asia/Ho_Chi_Minh"),
 };
}

export class AdminRestaurantOversightService{
 async foodOrganizationIds(){
  const rows=await getDb().select({organizationId:services.organizationId}).from(services).innerJoin(modules,eq(services.moduleId,modules.id)).where(eq(modules.code,"food"));
  return [...new Set(rows.map(x=>x.organizationId).filter(Boolean))] as string[];
 }

 async list(period:Period=30){
  const db=getDb(),ids=await this.foodOrganizationIds();
  if(!ids.length)return{periodDays:period,summary:{restaurants:0,active:0,suspended:0,platformPaused:0,orders:0,completed:0,gmv:0},restaurants:[]};
  const start=new Date(Date.now()-(period-1)*86400000);start.setUTCHours(0,0,0,0);
  const [orgRows,serviceRows,requestRows,memberRows,couponRows]=await Promise.all([
   db.select().from(organizations).where(inArray(organizations.id,ids)).orderBy(asc(organizations.name)),
   db.select({id:services.id,organizationId:services.organizationId,isEnabled:services.isEnabled,metadata:services.metadata}).from(services).innerJoin(modules,eq(services.moduleId,modules.id)).where(and(eq(modules.code,"food"),inArray(services.organizationId,ids))),
   db.select().from(serviceRequests).where(and(inArray(serviceRequests.assignedOrganizationId,ids),gte(serviceRequests.createdAt,start))).orderBy(desc(serviceRequests.createdAt)).limit(10000),
   db.select().from(organizationMembers).where(inArray(organizationMembers.organizationId,ids)),
   db.select().from(restaurantCoupons).where(inArray(restaurantCoupons.organizationId,ids)),
  ]);

  const restaurants=orgRows.map(org=>{
   const orgServices=serviceRows.filter(x=>x.organizationId===org.id);
   const foodRequests=requestRows.filter(x=>x.assignedOrganizationId===org.id&&((x.details||{}) as Record<string,unknown>).deliveryFulfillmentMode==="external_manual");
   const completed=foodRequests.filter(x=>x.status==="completed");
   const cancelled=foodRequests.filter(x=>["cancelled","rejected"].includes(x.status));
   const activeOrders=foodRequests.filter(x=>["assigned","accepted","in_progress","waiting_customer"].includes(x.status));
   const gmv=completed.reduce((sum,x)=>sum+n(((x.details||{}) as Record<string,unknown>).totalAmount),0);
   const foodRevenue=completed.reduce((sum,x)=>sum+n(((x.details||{}) as Record<string,unknown>).itemSubtotal),0);
   const promotionDiscount=completed.reduce((sum,x)=>sum+n(((x.details||{}) as Record<string,unknown>).itemDiscount),0);
   const couponDiscount=completed.reduce((sum,x)=>sum+n(((x.details||{}) as Record<string,unknown>).couponDiscount),0);
   const deliverySubsidy=completed.reduce((sum,x)=>sum+n(((x.details||{}) as Record<string,unknown>).deliverySubsidy),0);
   const c=control((org.metadata||{}) as Record<string,unknown>),op=operations((org.metadata||{}) as Record<string,unknown>);
   const members=memberRows.filter(x=>x.organizationId===org.id);
   const coupons=couponRows.filter(x=>x.organizationId===org.id);
   return{
    id:org.id,code:org.code,name:org.name,phone:org.phone,addressText:org.addressText,status:org.status,
    platformControl:c,restaurantOperations:op,
    services:{total:orgServices.length,enabled:orgServices.filter(x=>x.isEnabled).length,soldOut:orgServices.filter(x=>((x.metadata||{}) as Record<string,unknown>).isAvailable===false).length},
    members:{total:members.length,active:members.filter(x=>x.isActive).length},
    coupons:{total:coupons.length,enabled:coupons.filter(x=>x.enabled).length,used:coupons.reduce((sum,x)=>sum+x.usedCount,0)},
    orders:{total:foodRequests.length,completed:completed.length,cancelled:cancelled.length,active:activeOrders.length},
    revenue:{gmv:Math.round(gmv),foodRevenue:Math.round(foodRevenue),promotionDiscount:Math.round(promotionDiscount),couponDiscount:Math.round(couponDiscount),deliverySubsidy:Math.round(deliverySubsidy)},
    createdAt:org.createdAt,updatedAt:org.updatedAt,
   };
  });
  return{
   periodDays:period,
   summary:{
    restaurants:restaurants.length,
    active:restaurants.filter(x=>x.status==="active").length,
    suspended:restaurants.filter(x=>x.status==="suspended").length,
    platformPaused:restaurants.filter(x=>x.platformControl.paused).length,
    orders:restaurants.reduce((a,x)=>a+x.orders.total,0),
    completed:restaurants.reduce((a,x)=>a+x.orders.completed,0),
    gmv:restaurants.reduce((a,x)=>a+x.revenue.gmv,0),
   },
   restaurants,
  };
 }

 async detail(organizationId:string,period:Period=30){
  const list=await this.list(period),restaurant=list.restaurants.find(x=>x.id===organizationId);
  if(!restaurant)throw new Error("RESTAURANT_NOT_FOUND");
  const analytics=await restaurantAnalyticsService.overviewForOrganization(organizationId,period,restaurant.restaurantOperations.timezone||"Asia/Ho_Chi_Minh");
  const db=getDb();
  const [members,coupons,serviceRows]=await Promise.all([
   db.select().from(organizationMembers).where(eq(organizationMembers.organizationId,organizationId)),
   db.select().from(restaurantCoupons).where(eq(restaurantCoupons.organizationId,organizationId)).orderBy(desc(restaurantCoupons.createdAt)).limit(100),
   db.select({id:services.id,code:services.code,priceFrom:services.priceFrom,currency:services.currency,isEnabled:services.isEnabled,metadata:services.metadata}).from(services).innerJoin(modules,eq(services.moduleId,modules.id)).where(and(eq(modules.code,"food"),eq(services.organizationId,organizationId))),
  ]);
  return{restaurant,analytics,members,coupons,services:serviceRows};
 }

 async update(organizationId:string,adminUserId:string,input:{action?:string;reason?:string}){
  const db=getDb(),org=(await db.select().from(organizations).where(eq(organizations.id,organizationId)).limit(1))[0];
  if(!org)throw new Error("RESTAURANT_NOT_FOUND");
  const action=String(input.action||""),metadata=(org.metadata||{}) as Record<string,unknown>,now=new Date();
  const c=control(metadata);
  if(action==="activate"){
   const[row]=await db.update(organizations).set({status:"active",updatedAt:now}).where(eq(organizations.id,organizationId)).returning();
   await db.insert(operationsAuditLogs).values({actorUserId:adminUserId,area:"restaurant_oversight",action:"activate",targetType:"organization",targetId:organizationId,beforeState:{status:org.status,metadata:org.metadata},afterState:{status:row.status,metadata:row.metadata},metadata:{reason:String(input.reason||"").slice(0,240)}});return row;
  }
  if(action==="suspend"){
   const reason=String(input.reason||"").trim().slice(0,240);
   const[row]=await db.update(organizations).set({status:"suspended",metadata:{...metadata,platformRestaurantControl:{...c,suspendReason:reason,suspendedAt:now.toISOString(),suspendedByUserId:adminUserId}},updatedAt:now}).where(eq(organizations.id,organizationId)).returning();
   await db.insert(operationsAuditLogs).values({actorUserId:adminUserId,area:"restaurant_oversight",action:"suspend",targetType:"organization",targetId:organizationId,beforeState:{status:org.status,metadata:org.metadata},afterState:{status:row.status,metadata:row.metadata},metadata:{reason}});return row;
  }
  if(action==="pause"){
   const reason=String(input.reason||"").trim().slice(0,240);
   const[row]=await db.update(organizations).set({metadata:{...metadata,platformRestaurantControl:{paused:true,reason,updatedAt:now.toISOString(),updatedByUserId:adminUserId}},updatedAt:now}).where(eq(organizations.id,organizationId)).returning();
   await db.insert(operationsAuditLogs).values({actorUserId:adminUserId,area:"restaurant_oversight",action:"pause",targetType:"organization",targetId:organizationId,beforeState:{status:org.status,platformControl:c},afterState:{status:row.status,platformControl:control((row.metadata||{}) as Record<string,unknown>)},metadata:{reason}});return row;
  }
  if(action==="resume"){
   const[row]=await db.update(organizations).set({metadata:{...metadata,platformRestaurantControl:{paused:false,reason:"",updatedAt:now.toISOString(),updatedByUserId:adminUserId}},updatedAt:now}).where(eq(organizations.id,organizationId)).returning();
   await db.insert(operationsAuditLogs).values({actorUserId:adminUserId,area:"restaurant_oversight",action:"resume",targetType:"organization",targetId:organizationId,beforeState:{status:org.status,platformControl:c},afterState:{status:row.status,platformControl:control((row.metadata||{}) as Record<string,unknown>)},metadata:{reason:String(input.reason||"").slice(0,240)}});return row;
  }
  throw new Error("ADMIN_RESTAURANT_ACTION_UNSUPPORTED");
 }
}
export const adminRestaurantOversightService=new AdminRestaurantOversightService();
