import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {modules,organizations,serviceRequests,serviceRequestStatusHistory,services} from "@/db/schema";

export type HousingInquiryInput={
 serviceId:string;customerId?:string;customerName:string;customerPhone:string;locale:string;
 moveInDate?:string;leaseMonths?:number;occupants?:number;budget?:number;preferredContact?:string;
 wechat?:string;whatsapp?:string;notes?:string;
};

function clean(v:unknown,max=300){return String(v||"").trim().slice(0,max)}
function int(v:unknown,min:number,max:number,fallback=0){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback}
function date(v:unknown){const s=clean(v,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:""}

export class HousingInquiryService{
 async create(input:HousingInquiryInput){
  const db=getDb();
  const row=(await db.select({
   serviceId:services.id,serviceCode:services.code,serviceMetadata:services.metadata,isEnabled:services.isEnabled,priceFrom:services.priceFrom,currency:services.currency,
   moduleId:modules.id,moduleCode:modules.code,
   organizationId:organizations.id,organizationName:organizations.name,organizationStatus:organizations.status,
  }).from(services)
   .innerJoin(modules,eq(services.moduleId,modules.id))
   .innerJoin(organizations,eq(services.organizationId,organizations.id))
   .where(and(eq(services.id,input.serviceId),eq(modules.code,"housing"),eq(services.isEnabled,true)))
   .limit(1))[0];
  if(!row)throw new Error("HOUSING_LISTING_NOT_FOUND");
  if(row.organizationStatus!=="active")throw new Error("HOUSING_PARTNER_UNAVAILABLE");
  const metadata=(row.serviceMetadata||{}) as Record<string,unknown>;
  const availabilityStatus=String(metadata.housingAvailabilityStatus||"available");
  if(metadata.isAvailable===false||availabilityStatus==="rented"||availabilityStatus==="unavailable")throw new Error("HOUSING_LISTING_UNAVAILABLE");
  if(availabilityStatus==="reserved")throw new Error("HOUSING_LISTING_RESERVED");

  const name=clean(input.customerName,120),phone=clean(input.customerPhone,30);
  if(!name)throw new Error("CUSTOMER_NAME_REQUIRED");
  if(!phone)throw new Error("CUSTOMER_PHONE_REQUIRED");
  const moveInDate=date(input.moveInDate),availableFrom=date(metadata.availableFrom);
  if(moveInDate&&availableFrom&&moveInDate<availableFrom)throw new Error("HOUSING_MOVE_IN_BEFORE_AVAILABLE");
  const leaseMonths=int(input.leaseMonths,1,60,0),occupants=int(input.occupants,1,20,1),budget=Math.max(0,Math.round(Number(input.budget)||0));
  const preferredContact=["phone","wechat","whatsapp"].includes(clean(input.preferredContact,20))?clean(input.preferredContact,20):"phone";
  const requestCode=`ZX-H-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase()}`;
  const details={
   inquiryType:"rental_inquiry",
   housingLead:true,
   housingLeadStage:"new",
   housingAvailabilityAtInquiry:availabilityStatus,
   paymentRequired:false,
   listingId:row.serviceId,
   propertyType:clean(metadata.propertyType,80),
   district:clean(metadata.district,120),
   propertyAddress:clean(metadata.propertyAddress,500),
   bedrooms:Number(metadata.bedrooms||0),
   bathrooms:Number(metadata.bathrooms||0),
   areaSqm:Number(metadata.areaSqm||0),
   monthlyRent:Number(row.priceFrom||0),currency:row.currency||"VND",
   depositMonths:Number(metadata.depositMonths||0),
   availableFrom:clean(metadata.availableFrom,20),
   requestedMoveInDate:moveInDate||null,
   requestedLeaseMonths:leaseMonths||null,
   occupants,
   budget:budget||null,
   preferredContact,
   wechat:clean(input.wechat,128)||null,
   whatsapp:clean(input.whatsapp,40)||null,
   notes:clean(input.notes,2000)||null,
   source:"housing_listing_detail_16.38",
  };
  const[created]=await db.insert(serviceRequests).values({
   requestCode,moduleId:row.moduleId,serviceId:row.serviceId,assignedOrganizationId:row.organizationId,status:"assigned",
   customerId:input.customerId,customerName:name,customerPhone:phone,title:`Housing inquiry · ${row.serviceCode}`,
   description:clean(input.notes,2000)||undefined,locale:clean(input.locale,10)||"zh-CN",
   addressText:clean(metadata.propertyAddress||metadata.district||"",1000)||"Housing listing",
   latitude:metadata.latitude!=null?String(metadata.latitude):undefined,longitude:metadata.longitude!=null?String(metadata.longitude):undefined,
   details,
  }).returning();
  await db.insert(serviceRequestStatusHistory).values({requestId:created.id,toStatus:"assigned",note:"HOUSING_INQUIRY_ASSIGNED_TO_PARTNER"});
  return{...created,routing:{mode:"housing_partner_lead",organizationId:row.organizationId,organizationName:row.organizationName},paymentRequired:false};
 }
}
export const housingInquiryService=new HousingInquiryService();
