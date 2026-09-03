import {and,asc,desc,eq,gte,inArray} from "drizzle-orm";
import {getDb} from "@/db";
import {modules,organizations,serviceRequests,services} from "@/db/schema";

type Period=7|30|90;
type Stage="new"|"contacted"|"viewing"|"negotiating"|"won"|"lost";
const stages:Stage[]=["new","contacted","viewing","negotiating","won","lost"];
const activeStatuses=new Set(["available","reserved","rented"]);
function d(row:any){return (row.details||{}) as Record<string,unknown>}
function m(row:any){return (row.metadata||{}) as Record<string,unknown>}
function stageOf(row:any):Stage{const x=String(d(row).housingLeadStage||"new") as Stage;return stages.includes(x)?x:"new"}
function listingStatus(row:any){const x=String(m(row).housingAvailabilityStatus||m(row).availabilityStatus||m(row).housingStatus||"available").toLowerCase();return activeStatuses.has(x)?x:"available"}
function ms(v:unknown){const x=new Date(String(v||"")).getTime();return Number.isFinite(x)?x:0}
function firstPartnerActivity(row:any){
 const x=d(row),history=Array.isArray(x.housingFollowupHistory)?x.housingFollowupHistory.filter(v=>v&&typeof v==="object") as Record<string,unknown>[]:[];
 const times=history.filter(h=>String(h.actorRole||"")==="partner").map(h=>ms(h.at)).filter(Boolean);
 const stageAt=ms(x.housingLeadStageUpdatedAt);if(stageAt)times.push(stageAt);
 return times.length?Math.min(...times):0;
}
function rate(a:number,b:number){return a>0?Math.round((b/a)*1000)/10:0}

export class HousingAnalyticsService{
 private async housingOrgIds(){
  const rows=await getDb().select({organizationId:services.organizationId}).from(services).innerJoin(modules,eq(services.moduleId,modules.id)).where(eq(modules.code,"housing"));
  return [...new Set(rows.map(x=>x.organizationId).filter(Boolean))] as string[];
 }
 async overview(input:{organizationId?:string;period?:Period}={}){
  const db=getDb(),period=input.period||30,start=new Date(Date.now()-(period-1)*86400000);start.setUTCHours(0,0,0,0);
  const ids=input.organizationId?[input.organizationId]:await this.housingOrgIds();
  if(!ids.length)return{periodDays:period,summary:this.emptySummary(),organizations:[],topListings:[],upcomingViewings:[]};
  const [orgs,listings,requests]=await Promise.all([
   db.select({id:organizations.id,code:organizations.code,name:organizations.name,status:organizations.status}).from(organizations).where(inArray(organizations.id,ids)).orderBy(asc(organizations.name)),
   db.select({id:services.id,code:services.code,organizationId:services.organizationId,isEnabled:services.isEnabled,metadata:services.metadata}).from(services).innerJoin(modules,eq(services.moduleId,modules.id)).where(and(eq(modules.code,"housing"),inArray(services.organizationId,ids))),
   db.select().from(serviceRequests).where(and(inArray(serviceRequests.assignedOrganizationId,ids),gte(serviceRequests.createdAt,start))).orderBy(desc(serviceRequests.createdAt)).limit(10000),
  ]);
  const leads=requests.filter(x=>{const z=d(x);return z.housingLead===true&&z.inquiryType==="rental_inquiry"});
  const build=(organizationId:string)=>{
   const ls=listings.filter(x=>x.organizationId===organizationId),rs=leads.filter(x=>x.assignedOrganizationId===organizationId);
   const funnel=Object.fromEntries(stages.map(s=>[s,rs.filter(x=>stageOf(x)===s).length])) as Record<Stage,number>;
   const responseMinutes=rs.map(x=>{const first=firstPartnerActivity(x);return first?Math.max(0,(first-x.createdAt.getTime())/60000):null}).filter((x):x is number=>x!==null);
   const appointments=rs.map(x=>({row:x,appointment:(d(x).housingAppointment&&typeof d(x).housingAppointment==="object"?d(x).housingAppointment:null) as Record<string,unknown>|null})).filter(x=>x.appointment);
   const now=Date.now();
   return{
    listings:{total:ls.length,enabled:ls.filter(x=>x.isEnabled).length,available:ls.filter(x=>listingStatus(x)==="available").length,reserved:ls.filter(x=>listingStatus(x)==="reserved").length,rented:ls.filter(x=>listingStatus(x)==="rented").length},
    leads:{total:rs.length,funnel,viewingOrBeyond:funnel.viewing+funnel.negotiating+funnel.won,won:funnel.won,lost:funnel.lost,viewingConversionRate:rate(rs.length,funnel.viewing+funnel.negotiating+funnel.won),winRate:rate(rs.length,funnel.won)},
    response:{responded:responseMinutes.length,unanswered:Math.max(0,rs.length-responseMinutes.length),averageMinutes:responseMinutes.length?Math.round(responseMinutes.reduce((a,x)=>a+x,0)/responseMinutes.length):null},
    appointments:{total:appointments.length,confirmed:appointments.filter(x=>x.appointment?.status==="confirmed").length,completed:appointments.filter(x=>x.appointment?.status==="completed").length,cancelled:appointments.filter(x=>x.appointment?.status==="cancelled").length,upcoming:appointments.filter(x=>x.appointment?.status==="confirmed"&&ms(x.appointment?.scheduledAt)>now).length},
   };
  };
  const organizationsData=orgs.map(org=>({organization:org,...build(org.id)}));
  const summary=organizationsData.reduce((a,x)=>({
   listings:a.listings+x.listings.total,available:a.available+x.listings.available,reserved:a.reserved+x.listings.reserved,rented:a.rented+x.listings.rented,
   leads:a.leads+x.leads.total,viewingOrBeyond:a.viewingOrBeyond+x.leads.viewingOrBeyond,won:a.won+x.leads.won,lost:a.lost+x.leads.lost,
   responded:a.responded+x.response.responded,responseMinutesTotal:a.responseMinutesTotal+(x.response.averageMinutes??0)*x.response.responded,
   upcomingViewings:a.upcomingViewings+x.appointments.upcoming
  }),{listings:0,available:0,reserved:0,rented:0,leads:0,viewingOrBeyond:0,won:0,lost:0,responded:0,responseMinutesTotal:0,upcomingViewings:0});
  const topListings=listings.map(listing=>{const rs=leads.filter(x=>x.serviceId===listing.id);return{id:listing.id,code:listing.code,organizationId:listing.organizationId,status:listingStatus(listing),leads:rs.length,viewings:rs.filter(x=>["viewing","negotiating","won"].includes(stageOf(x))).length,won:rs.filter(x=>stageOf(x)==="won").length}}).sort((a,z)=>z.leads-a.leads).slice(0,20);
  const upcomingViewings=leads.map(row=>{const a=(d(row).housingAppointment&&typeof d(row).housingAppointment==="object"?d(row).housingAppointment:null) as Record<string,unknown>|null;return{requestId:row.id,requestCode:row.requestCode,organizationId:row.assignedOrganizationId,customerName:row.customerName,serviceId:row.serviceId,scheduledAt:String(a?.scheduledAt||""),status:String(a?.status||"")}}).filter(x=>x.status==="confirmed"&&ms(x.scheduledAt)>Date.now()).sort((a,z)=>ms(a.scheduledAt)-ms(z.scheduledAt)).slice(0,50);
  return{periodDays:period,summary:{...summary,viewingConversionRate:rate(summary.leads,summary.viewingOrBeyond),winRate:rate(summary.leads,summary.won),averageResponseMinutes:summary.responded?Math.round(summary.responseMinutesTotal/summary.responded):null},organizations:organizationsData,topListings,upcomingViewings};
 }
 private emptySummary(){return{listings:0,available:0,reserved:0,rented:0,leads:0,viewingOrBeyond:0,won:0,lost:0,responded:0,responseMinutesTotal:0,upcomingViewings:0,viewingConversionRate:0,winRate:0,averageResponseMinutes:null}}
}
export const housingAnalyticsService=new HousingAnalyticsService();
