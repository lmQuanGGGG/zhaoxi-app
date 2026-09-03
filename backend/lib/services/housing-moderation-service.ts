import {and,asc,eq,inArray} from "drizzle-orm";
import {getDb} from "@/db";
import {modules,operationsAuditLogs,organizations,services,serviceTranslations} from "@/db/schema";

type Action="review"|"verify"|"unverify"|"hide"|"restore";
type Quality={score:number;issues:string[];staleDays:number};

function meta(row:any){return (row.metadata||{}) as Record<string,unknown>}
function clean(v:unknown,max=1200){return String(v||"").trim().slice(0,max)}
function daysSince(v:unknown){const t=new Date(String(v||"")).getTime();if(!Number.isFinite(t))return 999;return Math.max(0,Math.floor((Date.now()-t)/86400000))}
function quality(row:any):Quality{
 const m=meta(row),issues:string[]=[];let score=100;
 const gallery=Array.isArray(m.galleryUrls)?m.galleryUrls.filter(Boolean):[];
 const image=String(m.imageUrl||"");
 const price=Number(row.priceFrom||0),updated=row.updatedAt||m.inventoryUpdatedAt||m.syncedAt||m.publishedAt;
 const staleDays=daysSince(updated);
 const penalize=(code:string,n:number)=>{issues.push(code);score-=n};
 if(!row.name)penalize("missing_name",20);
 if(!row.summary&&!row.description)penalize("missing_description",10);
 if(!image)penalize("missing_cover_image",20);
 if(gallery.length<3)penalize("insufficient_gallery",10);
 if(!String(m.propertyType||""))penalize("missing_property_type",10);
 if(!String(m.district||""))penalize("missing_district",10);
 if(!String(m.propertyAddress||""))penalize("missing_address",10);
 if(price<=0)penalize("missing_price",20);
 if(Number(m.areaSqm||0)<=0)penalize("missing_area",5);
 if(staleDays>60)penalize("stale_over_60_days",15);else if(staleDays>30)penalize("stale_over_30_days",8);
 return{score:Math.max(0,score),issues,staleDays};
}

export class HousingModerationService{
 async list(locale="zh-CN"){
  const db=getDb();
  const rows=await db.select({
   id:services.id,code:services.code,organizationId:services.organizationId,priceFrom:services.priceFrom,currency:services.currency,isEnabled:services.isEnabled,metadata:services.metadata,createdAt:services.createdAt,updatedAt:services.updatedAt,
   organizationCode:organizations.code,organizationName:organizations.name,
   name:serviceTranslations.name,summary:serviceTranslations.summary,description:serviceTranslations.description,
  }).from(services).innerJoin(modules,eq(services.moduleId,modules.id)).leftJoin(organizations,eq(services.organizationId,organizations.id))
   .leftJoin(serviceTranslations,and(eq(serviceTranslations.serviceId,services.id),eq(serviceTranslations.locale,locale)))
   .where(eq(modules.code,"housing")).orderBy(asc(services.createdAt));
  const missing=rows.filter(x=>!x.name).map(x=>x.id);
  if(missing.length){
   const fallbacks=await db.select().from(serviceTranslations).where(inArray(serviceTranslations.serviceId,missing));
   for(const row of rows){if(row.name)continue;const f=fallbacks.find(x=>x.serviceId===row.id);if(f){row.name=f.name;row.summary=f.summary;row.description=f.description}}
  }
  const listings=rows.map(row=>{const m=meta(row),q=quality(row);return{...row,moderation:{status:String(m.moderationStatus||"unreviewed"),verified:m.adminVerified===true,hidden:m.adminHidden===true,reviewNote:String(m.adminReviewNote||""),reviewedAt:m.adminReviewedAt||null,reviewedBy:m.adminReviewedBy||null,qualityScore:q.score,qualityIssues:q.issues,staleDays:q.staleDays}}});
  const summary={total:listings.length,published:listings.filter(x=>x.isEnabled).length,hidden:listings.filter(x=>x.moderation.hidden).length,verified:listings.filter(x=>x.moderation.verified).length,needsReview:listings.filter(x=>x.moderation.status==="unreviewed").length,qualityBelow80:listings.filter(x=>x.moderation.qualityScore<80).length,stale:listings.filter(x=>x.moderation.staleDays>30).length};
  const partners=[...new Set(listings.map(x=>x.organizationId).filter(Boolean))].map(id=>{const ls=listings.filter(x=>x.organizationId===id);return{organizationId:id,organizationName:ls[0]?.organizationName||"",organizationCode:ls[0]?.organizationCode||"",total:ls.length,verified:ls.filter(x=>x.moderation.verified).length,hidden:ls.filter(x=>x.moderation.hidden).length,averageQuality:ls.length?Math.round(ls.reduce((a,x)=>a+x.moderation.qualityScore,0)/ls.length):0,stale:ls.filter(x=>x.moderation.staleDays>30).length}});
  return{summary,listings,partners};
 }
 async act(adminUserId:string,id:string,input:{action?:unknown;note?:unknown}){
  const action=String(input.action||"review") as Action;if(!["review","verify","unverify","hide","restore"].includes(action))throw new Error("HOUSING_MODERATION_ACTION_INVALID");
  const db=getDb(),row=(await db.select().from(services).where(eq(services.id,id)).limit(1))[0];if(!row)throw new Error("HOUSING_LISTING_NOT_FOUND");
  const module=(await db.select().from(modules).where(eq(modules.id,row.moduleId)).limit(1))[0];if(!module||module.code!=="housing")throw new Error("HOUSING_LISTING_NOT_FOUND");
  const m=meta(row),note=clean(input.note),now=new Date().toISOString();
  const q=quality({...row,name:"x",summary:"x",description:"x"});
  let isEnabled=row.isEnabled;let next:Record<string,unknown>={...m,adminReviewedAt:now,adminReviewedBy:adminUserId,adminReviewNote:note};
  if(action==="review")next={...next,moderationStatus:"reviewed"};
  if(action==="verify"){
   const snapshot=(await this.list("zh-CN")).listings.find(x=>x.id===id);if(!snapshot||snapshot.moderation.qualityScore<80)throw new Error("HOUSING_QUALITY_TOO_LOW_TO_VERIFY");
   if(m.adminHidden===true)throw new Error("HOUSING_LISTING_HIDDEN");
   next={...next,moderationStatus:"verified",adminVerified:true,adminVerifiedAt:now};
  }
  if(action==="unverify")next={...next,moderationStatus:"reviewed",adminVerified:false,adminVerifiedAt:null};
  if(action==="hide"){isEnabled=false;next={...next,moderationStatus:"hidden",adminHidden:true,adminHiddenAt:now,adminVerified:false};}
  if(action==="restore"){isEnabled=true;next={...next,moderationStatus:"reviewed",adminHidden:false,adminHiddenAt:null,syncStatus:"published",syncedAt:now};}
  const[updated]=await db.update(services).set({isEnabled,metadata:next,updatedAt:new Date()}).where(eq(services.id,id)).returning();
  await db.insert(operationsAuditLogs).values({actorUserId:adminUserId,area:"housing_moderation",action,targetType:"service",targetId:id,beforeState:{isEnabled:row.isEnabled,metadata:row.metadata},afterState:{isEnabled:updated.isEnabled,metadata:updated.metadata},metadata:{note,qualityScore:q.score}});
  return updated;
 }
}
export const housingModerationService=new HousingModerationService();
