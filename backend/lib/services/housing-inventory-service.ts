import {and,asc,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {modules,operationsAuditLogs,organizationMembers,organizations,services,serviceTranslations} from "@/db/schema";

const locales=["zh-CN","zh-TW","vi-VN","en-US"] as const;
type Locale=typeof locales[number];
type Input={
 organizationId:string;locale?:string;name?:string;summary?:string;description?:string;price?:number|string;currency?:string;
 isPublished?:boolean;status?:string;propertyType?:string;bedrooms?:number;bathrooms?:number;areaSqm?:number;district?:string;
 propertyAddress?:string;furnished?:string;depositMonths?:number;availableFrom?:string;minLeaseMonths?:number;amenities?:string|string[];
 latitude?:number|string;longitude?:number|string;imageUrl?:string;galleryUrls?:string[];
};

function clean(v:unknown,max=500){return String(v||"").trim().slice(0,max)}
function n(v:unknown,min=0,max=1_000_000_000){const x=Number(v);return Number.isFinite(x)?Math.max(min,Math.min(max,x)):0}
function locale(v:unknown):Locale{return locales.includes(String(v) as Locale)?String(v) as Locale:"zh-CN"}
function status(v:unknown){const s=String(v||"available");return["available","reserved","rented"].includes(s)?s:"available"}
function date(v:unknown){const s=clean(v,10);return !s||/^\d{4}-\d{2}-\d{2}$/.test(s)?s:""}
function gallery(v:unknown){return Array.isArray(v)?v.map(x=>clean(x,2000)).filter(Boolean).slice(0,20):[]}

export class HousingInventoryService{
 async authorize(userId:string,organizationId:string){
  const m=(await getDb().select().from(organizationMembers).where(and(eq(organizationMembers.userId,userId),eq(organizationMembers.organizationId,organizationId),eq(organizationMembers.isActive,true))).limit(1))[0];
  if(!m)throw new Error("PARTNER_FORBIDDEN");
  return m;
 }
 async list(userId:string,organizationId:string,localeInput?:string){
  await this.authorize(userId,organizationId);const loc=locale(localeInput);
  return getDb().select({
   id:services.id,code:services.code,priceFrom:services.priceFrom,currency:services.currency,isEnabled:services.isEnabled,metadata:services.metadata,
   name:serviceTranslations.name,summary:serviceTranslations.summary,description:serviceTranslations.description,locale:serviceTranslations.locale,
  }).from(services).innerJoin(modules,eq(services.moduleId,modules.id)).leftJoin(serviceTranslations,and(eq(serviceTranslations.serviceId,services.id),eq(serviceTranslations.locale,loc)))
   .where(and(eq(modules.code,"housing"),eq(services.organizationId,organizationId))).orderBy(asc(services.createdAt));
 }
 private metadata(input:Input,current:Record<string,unknown>={}){
  const has=(key:keyof Input)=>Object.prototype.hasOwnProperty.call(input,key);
  const amenities=has("amenities")?(Array.isArray(input.amenities)?input.amenities.map(x=>clean(x,120)).filter(Boolean):clean(input.amenities,1000).split(/[,;\n]/).map(x=>x.trim()).filter(Boolean)):(Array.isArray(current.amenities)?current.amenities:[]);
  return {...current,
   propertyType:has("propertyType")?clean(input.propertyType,80):String(current.propertyType||""),
   bedrooms:has("bedrooms")?Math.round(n(input.bedrooms,0,30)):Number(current.bedrooms||0),
   bathrooms:has("bathrooms")?Math.round(n(input.bathrooms,0,30)):Number(current.bathrooms||0),
   areaSqm:has("areaSqm")?n(input.areaSqm,0,100000):Number(current.areaSqm||0),
   district:has("district")?clean(input.district,120):String(current.district||""),
   propertyAddress:has("propertyAddress")?clean(input.propertyAddress,500):String(current.propertyAddress||""),
   housingAvailabilityStatus:has("status")?status(input.status):status(current.housingAvailabilityStatus),
   furnished:has("furnished")&&["yes","no","partial"].includes(String(input.furnished))?input.furnished:String(current.furnished||"no"),
   depositMonths:has("depositMonths")?n(input.depositMonths,0,24):Number(current.depositMonths||0),
   availableFrom:has("availableFrom")?date(input.availableFrom):String(current.availableFrom||""),
   minLeaseMonths:has("minLeaseMonths")?Math.round(n(input.minLeaseMonths,0,120)):Number(current.minLeaseMonths||0),
   amenities,
   latitude:has("latitude")?(input.latitude===""||input.latitude==null?null:n(input.latitude,-90,90)):(current.latitude??null),
   longitude:has("longitude")?(input.longitude===""||input.longitude==null?null:n(input.longitude,-180,180)):(current.longitude??null),
   imageUrl:has("imageUrl")?clean(input.imageUrl,2000):String(current.imageUrl||""),
   galleryUrls:has("galleryUrls")?gallery(input.galleryUrls):(Array.isArray(current.galleryUrls)?current.galleryUrls:[]),
   inventoryUpdatedAt:new Date().toISOString(),
  };
 }
 async create(userId:string,input:Input){
  const organizationId=clean(input.organizationId,64);await this.authorize(userId,organizationId);const db=getDb();
  const org=(await db.select().from(organizations).where(eq(organizations.id,organizationId)).limit(1))[0];if(!org||org.status!=="active")throw new Error("HOUSING_ORGANIZATION_INACTIVE");
  const module=(await db.select().from(modules).where(eq(modules.code,"housing")).limit(1))[0];if(!module||!module.isEnabled)throw new Error("HOUSING_MODULE_UNAVAILABLE");
  const name=clean(input.name,160);if(!name)throw new Error("HOUSING_NAME_REQUIRED");const price=n(input.price,0,1_000_000_000);if(price<=0)throw new Error("HOUSING_PRICE_REQUIRED");
  const meta=this.metadata(input,{});
  if(!String(meta.propertyType||""))throw new Error("HOUSING_PROPERTY_TYPE_REQUIRED");
  if(!String(meta.district||""))throw new Error("HOUSING_DISTRICT_REQUIRED");
  const code=`ZX-HOUSE-${Date.now()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`,isEnabled=input.isPublished===true;
  const[row]=await db.insert(services).values({moduleId:module.id,organizationId,code,priceFrom:String(Math.round(price)),currency:clean(input.currency,3)||"VND",isEnabled,metadata:{...meta,syncStatus:isEnabled?"published":"draft",publishedAt:isEnabled?new Date().toISOString():null}}).returning();
  const loc=locale(input.locale);await db.insert(serviceTranslations).values({serviceId:row.id,locale:loc,name,summary:clean(input.summary,1000)||null,description:clean(input.description,5000)||null});
  await db.insert(operationsAuditLogs).values({actorUserId:userId,area:"housing_inventory",action:"create",targetType:"service",targetId:row.id,beforeState:null,afterState:{isEnabled:row.isEnabled,metadata:row.metadata},metadata:{organizationId}});
  return row;
 }
 async update(userId:string,id:string,input:Input){
  const db=getDb(),row=(await db.select().from(services).where(eq(services.id,id)).limit(1))[0];if(!row||!row.organizationId)throw new Error("HOUSING_LISTING_NOT_FOUND");
  await this.authorize(userId,row.organizationId);if(input.organizationId&&input.organizationId!==row.organizationId)throw new Error("PARTNER_FORBIDDEN");
  const module=(await db.select().from(modules).where(eq(modules.id,row.moduleId)).limit(1))[0];if(!module||module.code!=="housing")throw new Error("HOUSING_LISTING_NOT_FOUND");
  const price=input.price!==undefined?n(input.price,0,1_000_000_000):Number(row.priceFrom||0);if(price<=0)throw new Error("HOUSING_PRICE_REQUIRED");
  const current=(row.metadata||{}) as Record<string,unknown>,metadata=this.metadata(input,current);
  const publish=input.isPublished!==undefined?input.isPublished:row.isEnabled;
  if(publish&&current.adminHidden===true)throw new Error("HOUSING_LISTING_ADMIN_HIDDEN");
  if(publish&&(!String(metadata.propertyType||"")||!String(metadata.district||"")))throw new Error("HOUSING_PUBLISH_FIELDS_REQUIRED");
  const[updated]=await db.update(services).set({priceFrom:String(Math.round(price)),currency:clean(input.currency,3)||row.currency,isEnabled:publish,metadata:{...metadata,syncStatus:publish?"published":"draft",publishedAt:publish?(current.publishedAt||new Date().toISOString()):current.publishedAt||null,syncedAt:publish?new Date().toISOString():current.syncedAt||null},updatedAt:new Date()}).where(eq(services.id,id)).returning();
  const loc=locale(input.locale),name=clean(input.name,160);
  if(name)await db.insert(serviceTranslations).values({serviceId:id,locale:loc,name,summary:clean(input.summary,1000)||null,description:clean(input.description,5000)||null}).onConflictDoUpdate({target:[serviceTranslations.serviceId,serviceTranslations.locale],set:{name,summary:clean(input.summary,1000)||null,description:clean(input.description,5000)||null}});
  await db.insert(operationsAuditLogs).values({actorUserId:userId,area:"housing_inventory",action:"update",targetType:"service",targetId:id,beforeState:{isEnabled:row.isEnabled,metadata:row.metadata,priceFrom:row.priceFrom},afterState:{isEnabled:updated.isEnabled,metadata:updated.metadata,priceFrom:updated.priceFrom},metadata:{organizationId:row.organizationId}});
  return updated;
 }
 async archive(userId:string,id:string){
  const db=getDb(),row=(await db.select().from(services).where(eq(services.id,id)).limit(1))[0];if(!row||!row.organizationId)throw new Error("HOUSING_LISTING_NOT_FOUND");await this.authorize(userId,row.organizationId);
  const[updated]=await db.update(services).set({isEnabled:false,metadata:{...((row.metadata||{}) as Record<string,unknown>),syncStatus:"archived",archivedAt:new Date().toISOString()},updatedAt:new Date()}).where(eq(services.id,id)).returning();
  await db.insert(operationsAuditLogs).values({actorUserId:userId,area:"housing_inventory",action:"archive",targetType:"service",targetId:id,beforeState:{isEnabled:row.isEnabled,metadata:row.metadata},afterState:{isEnabled:updated.isEnabled,metadata:updated.metadata},metadata:{organizationId:row.organizationId}});
  return updated;
 }
}
export const housingInventoryService=new HousingInventoryService();
