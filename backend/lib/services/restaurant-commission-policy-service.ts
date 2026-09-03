import {and,desc,eq,isNull,lte,or,gte} from "drizzle-orm";
import {getDb} from "@/db";
import {operationsAuditLogs,restaurantCommissionPolicies} from "@/db/schema";

export type CommissionPolicyInput={organizationId?:string|null;mode?:"percentage"|"fixed_per_order"|"hybrid";percentageBps?:number;fixedPerOrder?:number;enabled?:boolean;effectiveFrom?:string|null;effectiveTo?:string|null;note?:string};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(Number(v)||0)));
export class RestaurantCommissionPolicyService{
 async list(){return getDb().select().from(restaurantCommissionPolicies).orderBy(desc(restaurantCommissionPolicies.updatedAt)).limit(500)}
 async save(adminUserId:string,input:CommissionPolicyInput){
  const db=getDb(),organizationId=input.organizationId||null,scope=organizationId?"organization":"global",mode=["percentage","fixed_per_order","hybrid"].includes(String(input.mode))?input.mode!:"percentage";
  const percentageBps=clamp(Number(input.percentageBps),0,10000),fixedPerOrder=clamp(Number(input.fixedPerOrder),0,10_000_000);
  const effectiveFrom=input.effectiveFrom?new Date(input.effectiveFrom):null,effectiveTo=input.effectiveTo?new Date(input.effectiveTo):null;
  if(effectiveFrom&&Number.isNaN(effectiveFrom.getTime()))throw new Error("COMMISSION_EFFECTIVE_FROM_INVALID");
  if(effectiveTo&&Number.isNaN(effectiveTo.getTime()))throw new Error("COMMISSION_EFFECTIVE_TO_INVALID");
  if(effectiveFrom&&effectiveTo&&effectiveTo<=effectiveFrom)throw new Error("COMMISSION_EFFECTIVE_RANGE_INVALID");
  const existing=(await db.select().from(restaurantCommissionPolicies).where(organizationId?eq(restaurantCommissionPolicies.organizationId,organizationId):and(eq(restaurantCommissionPolicies.scope,"global"),isNull(restaurantCommissionPolicies.organizationId))).orderBy(desc(restaurantCommissionPolicies.updatedAt)).limit(1))[0];
  const values={scope,organizationId,mode,percentageBps,fixedPerOrder,enabled:input.enabled===true,effectiveFrom,effectiveTo,note:String(input.note||"").slice(0,500)||null,updatedByUserId:adminUserId,updatedAt:new Date()};
  if(existing){const[row]=await db.update(restaurantCommissionPolicies).set(values).where(eq(restaurantCommissionPolicies.id,existing.id)).returning();await db.insert(operationsAuditLogs).values({actorUserId:adminUserId,area:"restaurant_commission_policy",action:"update",targetType:"restaurant_commission_policy",targetId:row.id,beforeState:existing,afterState:row,metadata:{scope,organizationId}});return row}
  const[row]=await db.insert(restaurantCommissionPolicies).values(values).returning();await db.insert(operationsAuditLogs).values({actorUserId:adminUserId,area:"restaurant_commission_policy",action:"create",targetType:"restaurant_commission_policy",targetId:row.id,beforeState:null,afterState:row,metadata:{scope,organizationId}});return row;
 }
 async resolve(organizationId:string,at=new Date()){
  const rows=await this.list(),active=(x:any)=>x.enabled&&(!x.effectiveFrom||new Date(x.effectiveFrom)<=at)&&(!x.effectiveTo||new Date(x.effectiveTo)>=at);
  const organization=rows.find((x:any)=>x.organizationId===organizationId&&active(x));
  const global=rows.find((x:any)=>x.scope==="global"&&!x.organizationId&&active(x));
  const row=organization||global;
  if(!row)return{id:null,source:"default",mode:"percentage",percentageBps:0,fixedPerOrder:0,enabled:false,note:"Default zero-fee policy"};
  return{id:row.id,source:organization?"organization":"global",mode:row.mode,percentageBps:row.percentageBps,fixedPerOrder:row.fixedPerOrder,enabled:row.enabled,note:row.note||""};
 }
 calculate(policy:any,foodRevenue:number,orderCount:number){
  if(!policy?.enabled)return 0;
  const percentage=policy.mode==="percentage"||policy.mode==="hybrid"?Math.round(Math.max(0,foodRevenue)*policy.percentageBps/10000):0;
  const fixed=policy.mode==="fixed_per_order"||policy.mode==="hybrid"?Math.max(0,orderCount)*policy.fixedPerOrder:0;
  return Math.max(0,percentage+fixed);
 }
}
export const restaurantCommissionPolicyService=new RestaurantCommissionPolicyService();
