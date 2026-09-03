import {and,count,desc,eq,sql} from "drizzle-orm";
import {getDb} from "@/db";
import {couponRedemptions,organizationMembers,restaurantCoupons} from "@/db/schema";

type DiscountType="percent"|"fixed";
export type CouponInput={
 code:string;title:string;discountType:DiscountType;discountValue:number;maxDiscountAmount?:number|null;
 minOrderAmount?:number;totalUsageLimit?:number|null;perCustomerLimit?:number;startsAt?:string|null;endsAt?:string|null;enabled?:boolean;
};
export type CouponEvaluation={
 valid:boolean;code:string;reason:string|null;couponId:string|null;title:string;
 discountType:DiscountType|null;discountValue:number;discountAmount:number;
 itemSubtotalBeforeCoupon:number;itemSubtotalAfterCoupon:number;
};

function couponCode(value:unknown){
 const code=String(value||"").trim().toUpperCase();
 if(!/^[A-Z0-9_-]{3,40}$/.test(code))throw new Error("COUPON_CODE_INVALID");
 return code;
}
function money(value:unknown,fallback=0,max=100_000_000){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(max,Math.round(n))):fallback}
function positiveLimit(value:unknown,fallback:number|null,max=1_000_000){
 if(value===null||value===undefined||value==="")return fallback;
 const n=Number(value);return Number.isFinite(n)?Math.max(1,Math.min(max,Math.round(n))):fallback;
}
function dateValue(value:unknown){if(!value)return null;const d=new Date(String(value));return Number.isNaN(d.getTime())?null:d}
function serialize(row:any){
 return{
  id:row.id,organizationId:row.organizationId,code:row.code,title:row.title,discountType:row.discountType,discountValue:row.discountValue,
  maxDiscountAmount:row.maxDiscountAmount,minOrderAmount:row.minOrderAmount,totalUsageLimit:row.totalUsageLimit,
  perCustomerLimit:row.perCustomerLimit,startsAt:row.startsAt,endsAt:row.endsAt,enabled:row.enabled,usedCount:row.usedCount,
  createdAt:row.createdAt,updatedAt:row.updatedAt,
 };
}

export class RestaurantCouponService{
 async authorize(userId:string,organizationId:string){
  const member=(await getDb().select().from(organizationMembers).where(and(eq(organizationMembers.organizationId,organizationId),eq(organizationMembers.userId,userId),eq(organizationMembers.isActive,true))).limit(1))[0];
  if(!member)throw new Error("PARTNER_FORBIDDEN");
 }
 async listPartner(userId:string,organizationId:string){
  await this.authorize(userId,organizationId);
  const rows=await getDb().select().from(restaurantCoupons).where(eq(restaurantCoupons.organizationId,organizationId)).orderBy(desc(restaurantCoupons.createdAt)).limit(100);
  return rows.map(serialize);
 }
 async create(userId:string,organizationId:string,input:CouponInput){
  await this.authorize(userId,organizationId);
  const code=couponCode(input.code),type=String(input.discountType)==="fixed"?"fixed":"percent";
  const discountValue=type==="percent"?Math.max(1,Math.min(90,money(input.discountValue,10,90))):Math.max(1,money(input.discountValue,10000));
  const startsAt=dateValue(input.startsAt),endsAt=dateValue(input.endsAt);
  if(startsAt&&endsAt&&endsAt<=startsAt)throw new Error("COUPON_TIME_RANGE_INVALID");
  try{
   const[row]=await getDb().insert(restaurantCoupons).values({
    organizationId,code,title:String(input.title||code).trim().slice(0,120)||code,discountType:type,discountValue,
    maxDiscountAmount:type==="percent"?positiveLimit(input.maxDiscountAmount,null,100_000_000):null,
    minOrderAmount:money(input.minOrderAmount),totalUsageLimit:positiveLimit(input.totalUsageLimit,null),
    perCustomerLimit:positiveLimit(input.perCustomerLimit,1,100)??1,startsAt,endsAt,
    enabled:input.enabled!==false,createdByUserId:userId,
   }).returning();
   return serialize(row);
  }catch(e:any){if(String(e?.code)==="23505")throw new Error("COUPON_CODE_EXISTS");throw e}
 }
 async update(userId:string,organizationId:string,id:string,input:Partial<CouponInput>){
  await this.authorize(userId,organizationId);
  const current=(await getDb().select().from(restaurantCoupons).where(and(eq(restaurantCoupons.id,id),eq(restaurantCoupons.organizationId,organizationId))).limit(1))[0];
  if(!current)throw new Error("COUPON_NOT_FOUND");
  const type=input.discountType?String(input.discountType)==="fixed"?"fixed":"percent":current.discountType as DiscountType;
  const startsAt=input.startsAt===undefined?current.startsAt:dateValue(input.startsAt),endsAt=input.endsAt===undefined?current.endsAt:dateValue(input.endsAt);
  if(startsAt&&endsAt&&endsAt<=startsAt)throw new Error("COUPON_TIME_RANGE_INVALID");
  const values:any={updatedAt:new Date()};
  if(input.code!==undefined)values.code=couponCode(input.code);
  if(input.title!==undefined)values.title=String(input.title||"").trim().slice(0,120)||current.code;
  if(input.discountType!==undefined)values.discountType=type;
  if(input.discountValue!==undefined)values.discountValue=type==="percent"?Math.max(1,Math.min(90,money(input.discountValue,10,90))):Math.max(1,money(input.discountValue,10000));
  if(input.maxDiscountAmount!==undefined)values.maxDiscountAmount=type==="percent"?positiveLimit(input.maxDiscountAmount,null,100_000_000):null;
  if(input.minOrderAmount!==undefined)values.minOrderAmount=money(input.minOrderAmount);
  if(input.totalUsageLimit!==undefined)values.totalUsageLimit=positiveLimit(input.totalUsageLimit,null);
  if(input.perCustomerLimit!==undefined)values.perCustomerLimit=positiveLimit(input.perCustomerLimit,1,100)??1;
  if(input.startsAt!==undefined)values.startsAt=startsAt;if(input.endsAt!==undefined)values.endsAt=endsAt;
  if(input.enabled!==undefined)values.enabled=input.enabled!==false;
  try{
   const[row]=await getDb().update(restaurantCoupons).set(values).where(eq(restaurantCoupons.id,id)).returning();return serialize(row);
  }catch(e:any){if(String(e?.code)==="23505")throw new Error("COUPON_CODE_EXISTS");throw e}
 }
 async remove(userId:string,organizationId:string,id:string){
  await this.authorize(userId,organizationId);
  const current=(await getDb().select().from(restaurantCoupons).where(and(eq(restaurantCoupons.id,id),eq(restaurantCoupons.organizationId,organizationId))).limit(1))[0];
  if(!current)throw new Error("COUPON_NOT_FOUND");
  if(current.usedCount>0){const[row]=await getDb().update(restaurantCoupons).set({enabled:false,updatedAt:new Date()}).where(eq(restaurantCoupons.id,id)).returning();return{archived:true,coupon:serialize(row)}}
  await getDb().delete(restaurantCoupons).where(eq(restaurantCoupons.id,id));return{deleted:true};
 }
 private calculate(row:any,itemSubtotal:number):CouponEvaluation{
  const base=Math.max(0,Math.round(itemSubtotal));
  let discount=row.discountType==="percent"?Math.round(base*Number(row.discountValue)/100):Number(row.discountValue);
  if(row.discountType==="percent"&&row.maxDiscountAmount!==null&&row.maxDiscountAmount!==undefined)discount=Math.min(discount,Number(row.maxDiscountAmount));
  discount=Math.max(0,Math.min(base,Math.round(discount)));
  return{valid:true,code:row.code,reason:null,couponId:row.id,title:row.title,discountType:row.discountType,discountValue:Number(row.discountValue),discountAmount:discount,itemSubtotalBeforeCoupon:base,itemSubtotalAfterCoupon:Math.max(0,base-discount)};
 }
 async evaluate(organizationId:string,rawCode:string,itemSubtotal:number,customerId?:string,at=new Date()):Promise<CouponEvaluation>{
  const code=couponCode(rawCode),row=(await getDb().select().from(restaurantCoupons).where(and(eq(restaurantCoupons.organizationId,organizationId),eq(restaurantCoupons.code,code))).limit(1))[0];
  const invalid=(reason:string,title=""):CouponEvaluation=>({valid:false,code,reason,couponId:row?.id||null,title:title||row?.title||"",discountType:row?.discountType==="percent"||row?.discountType==="fixed"?row.discountType:null,discountValue:Number(row?.discountValue||0),discountAmount:0,itemSubtotalBeforeCoupon:Math.max(0,Math.round(itemSubtotal)),itemSubtotalAfterCoupon:Math.max(0,Math.round(itemSubtotal))});
  if(!row)return invalid("COUPON_NOT_FOUND");if(!row.enabled)return invalid("COUPON_DISABLED");
  if(row.startsAt&&at<row.startsAt)return invalid("COUPON_NOT_STARTED");if(row.endsAt&&at>row.endsAt)return invalid("COUPON_EXPIRED");
  if(itemSubtotal<row.minOrderAmount)return invalid("COUPON_MIN_ORDER_NOT_MET");
  if(row.totalUsageLimit!==null&&row.usedCount>=row.totalUsageLimit)return invalid("COUPON_USAGE_LIMIT_REACHED");
  if(customerId){
   const [{value}]=await getDb().select({value:count()}).from(couponRedemptions).where(and(eq(couponRedemptions.couponId,row.id),eq(couponRedemptions.customerId,customerId)));
   if(Number(value)>=row.perCustomerLimit)return invalid("COUPON_CUSTOMER_LIMIT_REACHED");
  }
  return this.calculate(row,itemSubtotal);
 }
 async available(organizationId:string,itemSubtotal=0,customerId?:string){
  const rows=await getDb().select().from(restaurantCoupons).where(and(eq(restaurantCoupons.organizationId,organizationId),eq(restaurantCoupons.enabled,true))).orderBy(desc(restaurantCoupons.createdAt)).limit(50);
  const now=new Date(),out=[];
  for(const row of rows){
   if(row.startsAt&&now<row.startsAt)continue;if(row.endsAt&&now>row.endsAt)continue;
   let customerUsed=0;if(customerId){const[{value}]=await getDb().select({value:count()}).from(couponRedemptions).where(and(eq(couponRedemptions.couponId,row.id),eq(couponRedemptions.customerId,customerId)));customerUsed=Number(value)}
   if(row.totalUsageLimit!==null&&row.usedCount>=row.totalUsageLimit)continue;if(customerUsed>=row.perCustomerLimit)continue;
   out.push({...serialize(row),eligible:itemSubtotal>=row.minOrderAmount,remainingForCustomer:Math.max(0,row.perCustomerLimit-customerUsed)});
  }
  return out;
 }
 async redeem(input:{organizationId:string;couponId:string;customerId:string;requestId:string;itemSubtotalBeforeCoupon:number;expectedDiscount:number}){
  const db=getDb();
  return db.transaction(async tx=>{
   await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.couponId})::bigint)`);
   const row=(await tx.select().from(restaurantCoupons).where(and(eq(restaurantCoupons.id,input.couponId),eq(restaurantCoupons.organizationId,input.organizationId))).limit(1))[0];
   if(!row||!row.enabled)throw new Error("COUPON_UNAVAILABLE_AT_REDEMPTION");
   const now=new Date();if(row.startsAt&&now<row.startsAt)throw new Error("COUPON_NOT_STARTED");if(row.endsAt&&now>row.endsAt)throw new Error("COUPON_EXPIRED");
   if(input.itemSubtotalBeforeCoupon<row.minOrderAmount)throw new Error("COUPON_MIN_ORDER_NOT_MET");
   if(row.totalUsageLimit!==null&&row.usedCount>=row.totalUsageLimit)throw new Error("COUPON_USAGE_LIMIT_REACHED");
   const[{value}]=await tx.select({value:count()}).from(couponRedemptions).where(and(eq(couponRedemptions.couponId,row.id),eq(couponRedemptions.customerId,input.customerId)));
   if(Number(value)>=row.perCustomerLimit)throw new Error("COUPON_CUSTOMER_LIMIT_REACHED");
   const evaluation=this.calculate(row,input.itemSubtotalBeforeCoupon);
   if(evaluation.discountAmount!==Math.round(input.expectedDiscount))throw new Error("COUPON_PRICE_CHANGED");
   await tx.insert(couponRedemptions).values({couponId:row.id,organizationId:input.organizationId,customerId:input.customerId,requestId:input.requestId,couponCode:row.code,itemSubtotalBeforeCoupon:evaluation.itemSubtotalBeforeCoupon,discountAmount:evaluation.discountAmount,itemSubtotalAfterCoupon:evaluation.itemSubtotalAfterCoupon});
   await tx.update(restaurantCoupons).set({usedCount:row.usedCount+1,updatedAt:now}).where(eq(restaurantCoupons.id,row.id));
   return evaluation;
  });
 }
}
export const restaurantCouponService=new RestaurantCouponService();
