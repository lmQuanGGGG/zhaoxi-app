import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {modules,organizations,serviceRequests,serviceRequestStatusHistory,services} from "@/db/schema";

type Input={serviceId:string;customerId?:string;customerName:string;customerPhone:string;locale:string;visitDate?:string;visitTime?:string;guests?:number;adults?:number;children?:number;packageId?:string;preferredContact?:string;wechat?:string;whatsapp?:string;notes?:string};
function clean(v:unknown,max=1000){return String(v||"").trim().slice(0,max)}
function date(v:unknown){const s=clean(v,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:""}
function count(v:unknown,max=50){const n=Number(v);return Number.isFinite(n)?Math.max(1,Math.min(max,Math.round(n))):1}
function time(v:unknown){const s=clean(v,5);return /^\d{2}:\d{2}$/.test(s)?s:""}
function parseTimes(v:unknown){const raw=Array.isArray(v)?v.map(String):String(v||"").split(/[,;\s]+/);return raw.map(time).filter(Boolean)}
function parseDays(v:unknown){return(Array.isArray(v)?v.map(String):String(v||"").split(/[,;\s]+/)).map(x=>x.trim().slice(0,3).toLowerCase()).filter(Boolean)}

export class TravelInquiryService{
 async create(input:Input){
  const db=getDb();
  const row=(await db.select({
    serviceId:services.id,serviceCode:services.code,serviceMetadata:services.metadata,isEnabled:services.isEnabled,priceFrom:services.priceFrom,currency:services.currency,
    moduleId:modules.id,moduleCode:modules.code,
    organizationId:organizations.id,organizationName:organizations.name,organizationStatus:organizations.status
  }).from(services).innerJoin(modules,eq(services.moduleId,modules.id)).innerJoin(organizations,eq(services.organizationId,organizations.id))
   .where(and(eq(services.id,input.serviceId),eq(modules.code,"travel"),eq(services.isEnabled,true))).limit(1))[0];
  if(!row)throw new Error("TRAVEL_EXPERIENCE_NOT_FOUND");
  if(row.organizationStatus!=="active")throw new Error("TRAVEL_PARTNER_UNAVAILABLE");
  const metadata=(row.serviceMetadata||{}) as Record<string,unknown>;
  if(metadata.isAvailable===false||String(metadata.travelAvailabilityStatus||"available")==="unavailable")throw new Error("TRAVEL_EXPERIENCE_UNAVAILABLE");
  const customerName=clean(input.customerName,120),customerPhone=clean(input.customerPhone,30);if(!customerName)throw new Error("CUSTOMER_NAME_REQUIRED");if(!customerPhone)throw new Error("CUSTOMER_PHONE_REQUIRED");
  const visitDate=date(input.visitDate);if(!visitDate)throw new Error("TRAVEL_DATE_REQUIRED");
  const allowedDays=parseDays(metadata.availableDays),day=["sun","mon","tue","wed","thu","fri","sat"][new Date(`${visitDate}T00:00:00`).getDay()],blackout=new Set(Array.isArray(metadata.blackoutDates)?metadata.blackoutDates.map(String):[]);if(blackout.has(visitDate))throw new Error("TRAVEL_BLACKOUT_DATE");if(allowedDays.length&&!allowedDays.includes(day))throw new Error("TRAVEL_DATE_UNAVAILABLE");
  const times=parseTimes(metadata.startTimes||metadata.startTime||"09:00"),visitTime=time(input.visitTime)||times[0]||"09:00";if(times.length&&!times.includes(visitTime))throw new Error("TRAVEL_TIME_UNAVAILABLE");
  const noticeHours=Math.max(0,Number(metadata.bookingNoticeHours||0)),visitAt=new Date(`${visitDate}T${visitTime}:00`);if(Number.isFinite(visitAt.getTime())&&visitAt.getTime()<Date.now()+noticeHours*3600000)throw new Error("TRAVEL_BOOKING_NOTICE_TOO_SHORT");
  const maxGuests=Math.max(1,Number(metadata.maxGuests||20)),adults=Math.max(1,Math.round(Number(input.adults||input.guests||1))),children=Math.max(0,Math.round(Number(input.children||0))),guests=Math.min(maxGuests,adults+children);
  const packages=Array.isArray(metadata.travelPackages)?metadata.travelPackages.filter((x):x is Record<string,unknown>=>Boolean(x)&&typeof x==="object"&&x.isEnabled!==false):[];
  const pkg=packages.find(x=>String(x.id||"")===String(input.packageId||""))||packages[0]||null;
  if(pkg&&guests<Number(pkg.minGuests||1))throw new Error("TRAVEL_PACKAGE_MIN_GUESTS");
  if(pkg&&guests>Number(pkg.maxGuests||maxGuests))throw new Error("TRAVEL_PACKAGE_MAX_GUESTS");
  const pricingMode=String(pkg?.pricingMode||"per_person"),adultPrice=Number(pkg?.adultPrice||row.priceFrom||0),childPrice=Number(pkg?.childPrice||0),groupPrice=Number(pkg?.groupPrice||0),surcharge=Number(pkg?.surchargePerBooking||0);
  const quotedAmount=Math.max(0,Math.round((pricingMode==="group"?groupPrice:adultPrice*adults+childPrice*children)+surcharge));
  const preferredContact=["phone","wechat","whatsapp"].includes(clean(input.preferredContact,20))?clean(input.preferredContact,20):"phone";
  const requestCode=`ZX-T-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase()}`;
  const details={
   inquiryType:"travel_experience_inquiry",travelLead:true,paymentRequired:false,
   experienceId:row.serviceId,experienceType:clean(metadata.experienceType,80),destination:clean(metadata.destination,120),duration:clean(metadata.duration,80),
   departurePoint:clean(metadata.departurePoint,300),requestedDate:visitDate,requestedTime:visitTime,guests,adults,children,maxGuests,preferredContact,packageId:pkg?String(pkg.id||""):null,packageName:pkg?String(pkg.name||""):null,pricingMode,adultPrice,childPrice,groupPrice,surchargePerBooking:surcharge,quotedAmount,travelBookingStage:"requested",travelBookingUpdatedAt:new Date().toISOString(),travelTimeline:[{id:crypto.randomUUID(),actorRole:"customer",action:"requested",at:new Date().toISOString(),note:null}],
   wechat:clean(input.wechat,128)||null,whatsapp:clean(input.whatsapp,40)||null,notes:clean(input.notes,2000)||null,
   listedPrice:Number(row.priceFrom||0),currency:row.currency||"VND",source:"travel_marketplace_16.44"
  };
  const[created]=await db.insert(serviceRequests).values({
   requestCode,moduleId:row.moduleId,serviceId:row.serviceId,assignedOrganizationId:row.organizationId,status:"assigned",
   customerId:input.customerId,customerName,customerPhone,title:`Travel inquiry · ${row.serviceCode}`,description:clean(input.notes,2000)||undefined,locale:clean(input.locale,10)||"zh-CN",
   addressText:clean(metadata.departurePoint||metadata.destination||"",1000)||"Travel experience",details
  }).returning();
  await db.insert(serviceRequestStatusHistory).values({requestId:created.id,toStatus:"assigned",note:"TRAVEL_INQUIRY_ASSIGNED_TO_PARTNER"});
  return{...created,routing:{mode:"travel_partner_lead",organizationId:row.organizationId,organizationName:row.organizationName},paymentRequired:false};
 }
}
export const travelInquiryService=new TravelInquiryService();
