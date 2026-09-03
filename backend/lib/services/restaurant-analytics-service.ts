import {and,desc,eq,gte} from "drizzle-orm";
import {getDb} from "@/db";
import {couponRedemptions,organizationMembers,restaurantCoupons,serviceRequests} from "@/db/schema";

type Period=7|30|90;
type DailyRow={date:string;orders:number;completed:number;gmv:number;foodRevenue:number;promotionDiscount:number;couponDiscount:number;deliverySubsidy:number};

function n(v:unknown){const x=Number(v);return Number.isFinite(x)?x:0}
function dateKey(d:Date,timeZone:string){return new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(d)}
function pct(a:number,b:number){return b>0?Number((a/b*100).toFixed(1)):0}
function money(v:number){return Math.round(v)}
function parseDate(v:unknown){if(typeof v!=="string")return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d}

export class RestaurantAnalyticsService{
 async authorize(userId:string,organizationId:string){
  const member=(await getDb().select().from(organizationMembers).where(and(eq(organizationMembers.organizationId,organizationId),eq(organizationMembers.userId,userId),eq(organizationMembers.isActive,true))).limit(1))[0];
  if(!member)throw new Error("PARTNER_FORBIDDEN");
 }
 async overview(userId:string,organizationId:string,period:Period=30,timeZone="Asia/Ho_Chi_Minh"){
  await this.authorize(userId,organizationId);
  return this.overviewForOrganization(organizationId,period,timeZone);
 }
 async overviewForOrganization(organizationId:string,period:Period=30,timeZone="Asia/Ho_Chi_Minh"){
  const start=new Date(Date.now()-(period-1)*86400000);
  start.setUTCHours(0,0,0,0);
  const db=getDb();
  const rows=await db.select().from(serviceRequests).where(and(eq(serviceRequests.assignedOrganizationId,organizationId),gte(serviceRequests.createdAt,start))).orderBy(desc(serviceRequests.createdAt)).limit(5000);
  const foodRows=rows.filter(r=>((r.details||{}) as Record<string,unknown>).deliveryFulfillmentMode==="external_manual");
  const completed=foodRows.filter(r=>r.status==="completed");
  const cancelled=foodRows.filter(r=>["cancelled","rejected"].includes(r.status));
  const inProgress=foodRows.filter(r=>["assigned","accepted","in_progress","waiting_customer"].includes(r.status));

  let itemBaseRevenue=0,itemPromotionDiscount=0,couponDiscount=0,foodRevenue=0,deliveryGrossFee=0,deliverySubsidy=0,customerDeliveryFee=0,gmv=0;
  let prepMinutesTotal=0,prepCount=0;
  const items=new Map<string,{serviceId:string;name:string;quantity:number;revenue:number;discount:number;orders:Set<string>}>();
  const coupons=new Map<string,{code:string;orders:number;discount:number;revenue:number}>();
  const dailyMap=new Map<string,DailyRow>();

  for(let i=0;i<period;i++){const d=new Date(start.getTime()+i*86400000),key=dateKey(d,timeZone);dailyMap.set(key,{date:key,orders:0,completed:0,gmv:0,foodRevenue:0,promotionDiscount:0,couponDiscount:0,deliverySubsidy:0})}
  for(const row of foodRows){
    const d=(row.details||{}) as Record<string,unknown>,key=dateKey(row.createdAt,timeZone);
    const day=dailyMap.get(key);if(day)day.orders++;
    if(row.status!=="completed")continue;
    if(day)day.completed++;
    const base=n(d.itemBaseSubtotal||d.itemSubtotalBeforeCoupon||d.itemSubtotal),promotion=n(d.itemDiscount),coupon=n(d.couponDiscount),food=n(d.itemSubtotal),grossShip=n(d.deliveryGrossFee),subsidy=n(d.deliverySubsidy),customerShip=n(d.deliveryCustomerFee),total=n(d.totalAmount);
    itemBaseRevenue+=base;itemPromotionDiscount+=promotion;couponDiscount+=coupon;foodRevenue+=food;deliveryGrossFee+=grossShip;deliverySubsidy+=subsidy;customerDeliveryFee+=customerShip;gmv+=total;
    if(day){day.gmv+=total;day.foodRevenue+=food;day.promotionDiscount+=promotion;day.couponDiscount+=coupon;day.deliverySubsidy+=subsidy}
    const started=parseDate(d.preparationStartedAt||d.acceptedAt),ready=parseDate(d.foodReadyAt);
    if(started&&ready&&ready>=started){prepMinutesTotal+=(ready.getTime()-started.getTime())/60000;prepCount++}
    const lines=Array.isArray(d.items)?d.items as Array<Record<string,unknown>>:[];
    for(const line of lines){const serviceId=String(line.serviceId||"unknown"),name=String(line.name||line.itemName||line.title||serviceId),current=items.get(serviceId)||{serviceId,name,quantity:0,revenue:0,discount:0,orders:new Set<string>()};current.quantity+=n(line.quantity)||1;current.revenue+=n(line.subtotal);current.discount+=n(line.discount);current.orders.add(row.id);items.set(serviceId,current)}
    const code=String(d.couponCode||"").trim();if(code){const c=coupons.get(code)||{code,orders:0,discount:0,revenue:0};c.orders++;c.discount+=coupon;c.revenue+=total;coupons.set(code,c)}
  }

  const couponRows=await db.select().from(restaurantCoupons).where(eq(restaurantCoupons.organizationId,organizationId)).orderBy(desc(restaurantCoupons.usedCount)).limit(100);
  const redemptions=await db.select().from(couponRedemptions).where(and(eq(couponRedemptions.organizationId,organizationId),gte(couponRedemptions.redeemedAt,start))).orderBy(desc(couponRedemptions.redeemedAt)).limit(5000);
  const redemptionByCode=new Map<string,{redemptions:number;discount:number}>();
  for(const r of redemptions){const c=redemptionByCode.get(r.couponCode)||{redemptions:0,discount:0};c.redemptions++;c.discount+=r.discountAmount;redemptionByCode.set(r.couponCode,c)}

  const topItems=[...items.values()].map(x=>({...x,orders:x.orders.size})).sort((a,b)=>b.revenue-a.revenue||b.quantity-a.quantity).slice(0,10);
  const campaignPerformance=couponRows.map(row=>{const completedStats=coupons.get(row.code)||{orders:0,discount:0,revenue:0},redemption=redemptionByCode.get(row.code)||{redemptions:0,discount:0};return{id:row.id,code:row.code,title:row.title,enabled:row.enabled,usedCount:row.usedCount,totalUsageLimit:row.totalUsageLimit,completedOrders:completedStats.orders,completedDiscount:money(completedStats.discount),completedRevenue:money(completedStats.revenue),periodRedemptions:redemption.redemptions,periodRedeemedDiscount:money(redemption.discount),discountType:row.discountType,discountValue:row.discountValue}}).sort((a,b)=>b.completedRevenue-a.completedRevenue||b.periodRedemptions-a.periodRedemptions);

  return{
    periodDays:period,timeZone,generatedAt:new Date().toISOString(),
    orders:{total:foodRows.length,completed:completed.length,cancelled:cancelled.length,inProgress:inProgress.length,completionRate:pct(completed.length,foodRows.length),cancellationRate:pct(cancelled.length,foodRows.length)},
    revenue:{gmv:money(gmv),itemBaseRevenue:money(itemBaseRevenue),itemPromotionDiscount:money(itemPromotionDiscount),couponDiscount:money(couponDiscount),foodRevenue:money(foodRevenue),deliveryGrossFee:money(deliveryGrossFee),deliverySubsidy:money(deliverySubsidy),customerDeliveryFee:money(customerDeliveryFee),averageOrderValue:completed.length?money(gmv/completed.length):0},
    operations:{averagePreparationMinutes:prepCount?Number((prepMinutesTotal/prepCount).toFixed(1)):0,preparationSamples:prepCount},
    daily:[...dailyMap.values()].map(x=>({...x,gmv:money(x.gmv),foodRevenue:money(x.foodRevenue),promotionDiscount:money(x.promotionDiscount),couponDiscount:money(x.couponDiscount),deliverySubsidy:money(x.deliverySubsidy)})),
    topItems,
    campaignPerformance,
  };
 }
}
export const restaurantAnalyticsService=new RestaurantAnalyticsService();
