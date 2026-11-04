import {and,asc,desc,eq,gte,inArray,lte} from "drizzle-orm";
import {getDb} from "@/db";
import {couponRedemptions,organizationMembers,restaurantCoupons,serviceRequestStatusHistory,serviceRequests} from "@/db/schema";
import {COMPLETED_STATUS,resolveRevenueWindow,safeTimeZone,summarizeStoreRevenue,type RevenueOrderRow,type RevenueWindow} from "@/lib/services/partner-revenue";

function money(v:number){return Math.round(v)}

/**
 * Orders of the store that matter for a window: everything received in it, plus completed
 * orders whose completion may fall in it (completion is never after `updatedAt`).
 */
export async function loadStoreRevenueRows(organizationId:string,window:Pick<RevenueWindow,"start"|"end">){
  const db=getDb();
  const [received,completed]=await Promise.all([
    db.select().from(serviceRequests).where(and(eq(serviceRequests.assignedOrganizationId,organizationId),gte(serviceRequests.createdAt,window.start),lte(serviceRequests.createdAt,window.end))).orderBy(desc(serviceRequests.createdAt)).limit(5000),
    db.select().from(serviceRequests).where(and(eq(serviceRequests.assignedOrganizationId,organizationId),eq(serviceRequests.status,COMPLETED_STATUS),gte(serviceRequests.updatedAt,window.start),lte(serviceRequests.createdAt,window.end))).orderBy(desc(serviceRequests.updatedAt)).limit(5000),
  ]);
  // A completed order received in the window comes back from both queries: keep it once.
  const rows:RevenueOrderRow[]=[...new Map([...received,...completed].map(r=>[r.id,r])).values()];
  const completedIds=[...new Set(completed.map(r=>r.id))];
  const completedAt=new Map<string,Date>();
  for(let i=0;i<completedIds.length;i+=500){
    const history=await db.select({requestId:serviceRequestStatusHistory.requestId,createdAt:serviceRequestStatusHistory.createdAt}).from(serviceRequestStatusHistory).where(and(inArray(serviceRequestStatusHistory.requestId,completedIds.slice(i,i+500)),eq(serviceRequestStatusHistory.toStatus,COMPLETED_STATUS))).orderBy(asc(serviceRequestStatusHistory.createdAt));
    for(const h of history)if(!completedAt.has(h.requestId))completedAt.set(h.requestId,h.createdAt);
  }
  return{rows,completedAt};
}

export class RestaurantAnalyticsService{

 async authorize(userId:string,organizationId:string){
  const member=(await getDb().select().from(organizationMembers).where(and(eq(organizationMembers.organizationId,organizationId),eq(organizationMembers.userId,userId),eq(organizationMembers.isActive,true))).limit(1))[0];
  if(!member)throw new Error("PARTNER_FORBIDDEN");
 }
 async overview(userId:string,organizationId:string,period:number=30,timeZone="Asia/Ho_Chi_Minh",from?:string,to?:string){
  await this.authorize(userId,organizationId);
  return this.overviewForOrganization(organizationId,period,timeZone,from,to);
 }
 async overviewForOrganization(organizationId:string,period:number=30,timeZone="Asia/Ho_Chi_Minh",from?:string,to?:string){
  const tz=safeTimeZone(timeZone);
  const window=resolveRevenueWindow({period,from,to,timeZone:tz});
  const {start,end}=window;
  const db=getDb();
  const {rows,completedAt}=await loadStoreRevenueRows(organizationId,window);
  const summary=summarizeStoreRevenue({rows,completedAt,window,timeZone:tz});
  const coupons=summary.coupons;

  const couponRows=await db.select().from(restaurantCoupons).where(eq(restaurantCoupons.organizationId,organizationId)).orderBy(desc(restaurantCoupons.usedCount)).limit(100);
  const redemptions=await db.select().from(couponRedemptions).where(and(eq(couponRedemptions.organizationId,organizationId),gte(couponRedemptions.redeemedAt,start),lte(couponRedemptions.redeemedAt,end))).orderBy(desc(couponRedemptions.redeemedAt)).limit(5000);
  const redemptionByCode=new Map<string,{redemptions:number;discount:number}>();
  for(const r of redemptions){const c=redemptionByCode.get(r.couponCode)||{redemptions:0,discount:0};c.redemptions++;c.discount+=r.discountAmount;redemptionByCode.set(r.couponCode,c)}

  const campaignPerformance=couponRows.map(row=>{const completedStats=coupons.get(row.code)||{orders:0,discount:0,revenue:0},redemption=redemptionByCode.get(row.code)||{redemptions:0,discount:0};return{id:row.id,code:row.code,title:row.title,enabled:row.enabled,usedCount:row.usedCount,totalUsageLimit:row.totalUsageLimit,completedOrders:completedStats.orders,completedDiscount:money(completedStats.discount),completedRevenue:money(completedStats.revenue),periodRedemptions:redemption.redemptions,periodRedeemedDiscount:money(redemption.discount),discountType:row.discountType,discountValue:row.discountValue}}).sort((a,b)=>b.completedRevenue-a.completedRevenue||b.periodRedemptions-a.periodRedemptions);

  return {
    periodDays:window.dayKeys.length,from:from||undefined,to:to||undefined,timeZone:tz,generatedAt:new Date().toISOString(),
    orders:summary.orders,
    revenue:summary.revenue,
    operations:summary.operations,
    daily:summary.daily,
    topItems:summary.topItems,
    campaignPerformance,
  };
 }
}
export const restaurantAnalyticsService=new RestaurantAnalyticsService();
