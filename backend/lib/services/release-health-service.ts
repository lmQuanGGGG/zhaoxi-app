import {and,count,desc,eq,gte,isNull,or} from "drizzle-orm";
import {getDb} from "@/db";
import {deliveryJobs,paymentTransactions,releaseApprovals,runtimeEvents,serviceRequests,supportConversations} from "@/db/schema";

function ratio(a:number,b:number){return b>0?Math.round((a/b)*1000)/10:0}
export class ReleaseHealthService{
  async snapshot(minutes=60){
    const db=getDb();const windowMinutes=Math.max(15,Math.min(1440,Math.round(Number(minutes)||60)));const since=new Date(Date.now()-windowMinutes*60_000);
    const [errors]=await db.select({value:count()}).from(runtimeEvents).where(and(gte(runtimeEvents.createdAt,since),isNull(runtimeEvents.resolvedAt)));
    const [critical]=await db.select({value:count()}).from(runtimeEvents).where(and(gte(runtimeEvents.createdAt,since),eq(runtimeEvents.severity,"critical"),isNull(runtimeEvents.resolvedAt)));
    const [requests]=await db.select({value:count()}).from(serviceRequests).where(gte(serviceRequests.createdAt,since));
    const [completed]=await db.select({value:count()}).from(serviceRequests).where(and(gte(serviceRequests.createdAt,since),eq(serviceRequests.status,"completed")));
    const [failedOrders]=await db.select({value:count()}).from(serviceRequests).where(and(gte(serviceRequests.createdAt,since),or(eq(serviceRequests.status,"cancelled"),eq(serviceRequests.status,"rejected"))));
    const [payments]=await db.select({value:count()}).from(paymentTransactions).where(gte(paymentTransactions.createdAt,since));
    const [paid]=await db.select({value:count()}).from(paymentTransactions).where(and(gte(paymentTransactions.createdAt,since),eq(paymentTransactions.status,"paid")));
    const [failedPayments]=await db.select({value:count()}).from(paymentTransactions).where(and(gte(paymentTransactions.createdAt,since),eq(paymentTransactions.status,"failed")));
    const [deliveries]=await db.select({value:count()}).from(deliveryJobs).where(gte(deliveryJobs.createdAt,since));
    const [delivered]=await db.select({value:count()}).from(deliveryJobs).where(and(gte(deliveryJobs.createdAt,since),eq(deliveryJobs.status,"delivered")));
    const [openSupport]=await db.select({value:count()}).from(supportConversations).where(or(eq(supportConversations.status,"open"),eq(supportConversations.status,"waiting_agent"),eq(supportConversations.status,"escalated")));
    const latestRelease=(await db.select().from(releaseApprovals).orderBy(desc(releaseApprovals.createdAt)).limit(1))[0]||null;
    const requestCount=Number(requests?.value||0),failedOrderCount=Number(failedOrders?.value||0),paymentCount=Number(payments?.value||0),failedPaymentCount=Number(failedPayments?.value||0),errorCount=Number(errors?.value||0),criticalCount=Number(critical?.value||0);
    const orderFailureRate=ratio(failedOrderCount,requestCount);const paymentFailureRate=ratio(failedPaymentCount,paymentCount);
    const alerts:Array<{level:"warning"|"critical";code:string;message:string}>=[];
    if(criticalCount>0)alerts.push({level:"critical",code:"CRITICAL_RUNTIME_EVENTS",message:`${criticalCount} unresolved critical runtime event(s)`});
    if(errorCount>=10)alerts.push({level:"warning",code:"RUNTIME_ERROR_SPIKE",message:`${errorCount} unresolved runtime events in ${windowMinutes} min`});
    if(requestCount>=5&&orderFailureRate>=20)alerts.push({level:orderFailureRate>=35?"critical":"warning",code:"ORDER_FAILURE_RATE",message:`Order failure rate ${orderFailureRate}%`});
    if(paymentCount>=3&&paymentFailureRate>=15)alerts.push({level:paymentFailureRate>=30?"critical":"warning",code:"PAYMENT_FAILURE_RATE",message:`Payment failure rate ${paymentFailureRate}%`});
    const status=alerts.some(a=>a.level==="critical")?"critical":alerts.length?"warning":"healthy";
    return {status,windowMinutes,release:latestRelease?{id:latestRelease.id,version:latestRelease.version,status:latestRelease.status,createdAt:latestRelease.createdAt}:null,metrics:{runtimeErrors:errorCount,criticalErrors:criticalCount,requests:requestCount,completed:Number(completed?.value||0),failedOrders:failedOrderCount,orderFailureRate,payments:paymentCount,paid:Number(paid?.value||0),failedPayments:failedPaymentCount,paymentFailureRate,deliveries:Number(deliveries?.value||0),delivered:Number(delivered?.value||0),openSupport:Number(openSupport?.value||0)},alerts,timestamp:new Date().toISOString()}
  }
}
export const releaseHealthService=new ReleaseHealthService();
