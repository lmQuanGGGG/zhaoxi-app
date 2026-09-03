import {and,desc,eq,ilike,or} from "drizzle-orm";
import {getDb} from "@/db";
import {
  customerBrowsingHistory,customerFavorites,customerProfiles,moduleTranslations,modules,
  organizations,serviceRequests,services,serviceTranslations
} from "@/db/schema";
import {personalizedRecommendationService} from "@/lib/services/personalized-recommendation-service";
import {customerLocationService,type CustomerPoint} from "@/lib/services/customer-location-service";

type ReasonCode="exact"|"favorite"|"recent_view"|"ordered"|"nearby"|"popular"|"new"|"explore";

function mediaUrl(serviceMetadata:Record<string,unknown>|null,orgMetadata:Record<string,unknown>|null){
  const sm=serviceMetadata||{},om=orgMetadata||{};
  if(typeof sm.imageUrl==="string"&&sm.imageUrl)return sm.imageUrl;
  const banners=Array.isArray(om.bannerUrls)?om.bannerUrls:[];
  if(typeof banners[0]==="string"&&banners[0])return banners[0];
  if(typeof om.logoUrl==="string"&&om.logoUrl)return om.logoUrl;
  return undefined;
}
function href(moduleCode:string,serviceId?:string,organizationId?:string|null){
  if(moduleCode==="food"&&organizationId)return `/restaurant/${organizationId}`;
  if(serviceId)return `/service/${serviceId}`;
  return `/services/${moduleCode}`;
}
function textScore(query:string,...values:Array<string|null|undefined>){
  const q=query.trim().toLocaleLowerCase();let score=0;
  for(const raw of values){
    const value=(raw||"").trim().toLocaleLowerCase();if(!value)continue;
    if(value===q)score+=180;
    else if(value.startsWith(q))score+=110;
    else if(value.includes(q))score+=60;
  }
  return score;
}

export class CustomerSmartSearchService{
  async search(userId:string|undefined,locale:string,query:string,moduleFilter?:string|null,limit=40,current?:CustomerPoint|null){
    const q=query.trim();
    const locationContext=await customerLocationService.context(userId,current);
    if(q.length<2){
      const discoveryAll=await personalizedRecommendationService.list(userId,locale,24,0);
      const discovery=moduleFilter?discoveryAll.filter(x=>x.moduleCode===moduleFilter):discoveryAll;
      return{
        mode:"discover" as const,
        personalized:Boolean(userId),
        data:discovery.slice(0,12).map(x=>({
          kind:x.kind==="module_fallback"?"module":"service",
          id:x.id,moduleCode:x.moduleCode,moduleName:null,name:x.title,summary:x.summary,
          organizationId:x.organizationId,organizationName:x.organizationName,priceFrom:x.priceFrom,currency:x.currency,
          imageUrl:x.imageUrl,href:x.href,score:x.personalizedScore,reasonCode:x.reasonCode,
        }))
      };
    }

    const db=getDb(),pattern=`%${q}%`;
    const [favoriteRows,historyRows,orderRows,profileRows]=userId?await Promise.all([
      db.select({serviceId:customerFavorites.serviceId}).from(customerFavorites).where(eq(customerFavorites.userId,userId)),
      db.select({serviceId:customerBrowsingHistory.serviceId}).from(customerBrowsingHistory).where(eq(customerBrowsingHistory.userId,userId)).orderBy(desc(customerBrowsingHistory.viewedAt)).limit(30),
      db.select({serviceId:serviceRequests.serviceId}).from(serviceRequests).where(eq(serviceRequests.customerId,userId)).orderBy(desc(serviceRequests.createdAt)).limit(30),
      db.select({cityName:customerProfiles.cityName}).from(customerProfiles).where(eq(customerProfiles.userId,userId)).limit(1),
    ]):[[],[],[],[]];

    const favoriteIds=new Set(favoriteRows.map(x=>x.serviceId));
    const recentIds=new Set(historyRows.slice(0,12).map(x=>x.serviceId));
    const orderedIds=new Set(orderRows.map(x=>x.serviceId).filter(Boolean) as string[]);
    const city=(profileRows[0]?.cityName||"").trim().toLocaleLowerCase();

    const filters=[eq(services.isEnabled,true),eq(modules.isEnabled,true),or(
      ilike(serviceTranslations.name,pattern),ilike(serviceTranslations.summary,pattern),
      ilike(organizations.name,pattern),ilike(organizations.description,pattern),
      ilike(organizations.addressText,pattern),ilike(moduleTranslations.name,pattern),
      ilike(moduleTranslations.description,pattern),ilike(modules.code,pattern)
    )];
    if(moduleFilter)filters.push(eq(modules.code,moduleFilter));

    const serviceRows=await db.select({
      id:services.id,moduleCode:modules.code,moduleName:moduleTranslations.name,
      name:serviceTranslations.name,summary:serviceTranslations.summary,priceFrom:services.priceFrom,currency:services.currency,
      metadata:services.metadata,createdAt:services.createdAt,
      organizationId:organizations.id,organizationName:organizations.name,organizationDescription:organizations.description,
      organizationAddress:organizations.addressText,organizationMetadata:organizations.metadata,
    }).from(services)
      .innerJoin(modules,eq(services.moduleId,modules.id))
      .innerJoin(organizations,and(eq(services.organizationId,organizations.id),eq(organizations.status,"active")))
      .leftJoin(serviceTranslations,and(eq(serviceTranslations.serviceId,services.id),eq(serviceTranslations.locale,locale)))
      .leftJoin(moduleTranslations,and(eq(moduleTranslations.moduleId,modules.id),eq(moduleTranslations.locale,locale)))
      .where(and(...filters)).limit(80);

    const data=serviceRows.map(row=>{
      const exact=textScore(q,row.name,row.organizationName,row.moduleName,row.summary,row.organizationDescription,row.organizationAddress);
      const favorite=favoriteIds.has(row.id),recent=recentIds.has(row.id),ordered=orderedIds.has(row.id);
      const meta=row.organizationMetadata||{};const lat=Number((meta as any).latitude??(meta as any).lat),lng=Number((meta as any).longitude??(meta as any).lng);
      let distance:number|null=null;
      if(locationContext.point&&Number.isFinite(lat)&&Number.isFinite(lng)){
        const a=locationContext.point,b={latitude:lat,longitude:lng};const R=6371,toRad=(x:number)=>x*Math.PI/180;
        const dLat=toRad(b.latitude-a.latitude),dLng=toRad(b.longitude-a.longitude),h=Math.sin(dLat/2)**2+Math.cos(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.sin(dLng/2)**2;
        distance=2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
      }
      const nearby=distance!==null?distance<=12:Boolean(city&&row.organizationAddress?.toLocaleLowerCase().includes(city));
      const ageDays=Math.max(0,(Date.now()-row.createdAt.getTime())/86400000),isNew=ageDays<=30;
      const distanceBoost=distance===null?0:Math.max(0,110-distance*7);
      const score=exact+(favorite?260:0)+(ordered?210:0)+(recent?150:0)+(nearby?75:0)+distanceBoost+(isNew?18:0);
      let reasonCode:ReasonCode=exact>=180?"exact":favorite?"favorite":ordered?"ordered":recent?"recent_view":nearby?"nearby":isNew?"new":"explore";
      return{
        kind:"service" as const,id:row.id,moduleCode:row.moduleCode,moduleName:row.moduleName,
        name:row.name||row.organizationName||row.moduleName||row.moduleCode,summary:row.summary||row.organizationDescription,
        organizationId:row.organizationId,organizationName:row.organizationName,priceFrom:row.priceFrom,currency:row.currency,
        imageUrl:mediaUrl(row.metadata,row.organizationMetadata),href:href(row.moduleCode,row.id,row.organizationId),
        distanceKm:distance===null?null:Number(distance.toFixed(2)),score,reasonCode,
      };
    }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));

    const seenOrganizations=new Set<string>();
    const organizationMatches:any[]=[];
    for(const row of serviceRows){
      if(!row.organizationId||seenOrganizations.has(row.organizationId))continue;
      const organizationScore=textScore(q,row.organizationName,row.organizationDescription,row.organizationAddress);
      if(organizationScore<60)continue;
      seenOrganizations.add(row.organizationId);
      const meta=row.organizationMetadata||{};const lat=Number((meta as any).latitude??(meta as any).lat),lng=Number((meta as any).longitude??(meta as any).lng);
      let distance:number|null=null;
      if(locationContext.point&&Number.isFinite(lat)&&Number.isFinite(lng)){
        const a=locationContext.point,b={latitude:lat,longitude:lng};const R=6371,toRad=(x:number)=>x*Math.PI/180;
        const dLat=toRad(b.latitude-a.latitude),dLng=toRad(b.longitude-a.longitude),h=Math.sin(dLat/2)**2+Math.cos(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.sin(dLng/2)**2;
        distance=2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
      }
      const nearby=distance!==null?distance<=12:Boolean(city&&row.organizationAddress?.toLocaleLowerCase().includes(city));
      organizationMatches.push({
        kind:"organization",id:row.organizationId,moduleCode:row.moduleCode,moduleName:row.moduleName,
        name:row.organizationName||row.moduleName||row.moduleCode,summary:row.organizationDescription||row.organizationAddress,
        organizationId:row.organizationId,organizationName:row.organizationName,priceFrom:null,currency:"VND",
        imageUrl:mediaUrl(null,row.organizationMetadata),href:row.moduleCode==="food"?`/restaurant/${row.organizationId}`:`/services/${row.moduleCode}`,
        distanceKm:distance===null?null:Number(distance.toFixed(2)),
        score:organizationScore+45+(nearby?75:0)+(distance===null?0:Math.max(0,80-distance*5)),reasonCode:(nearby?"nearby":"exact") as ReasonCode,
      });
    }
    data.push(...organizationMatches);

    // Add matching categories only if no module filter, keeping discovery routes visible.
    if(!moduleFilter){
      const moduleRows=await db.select({code:modules.code,name:moduleTranslations.name,description:moduleTranslations.description})
        .from(modules).leftJoin(moduleTranslations,and(eq(moduleTranslations.moduleId,modules.id),eq(moduleTranslations.locale,locale)))
        .where(and(eq(modules.isEnabled,true),or(ilike(moduleTranslations.name,pattern),ilike(moduleTranslations.description,pattern),ilike(modules.code,pattern)))).limit(12);
      for(const row of moduleRows)data.push({
        kind:"module" as any,id:`module:${row.code}`,moduleCode:row.code,moduleName:row.name,
        name:row.name||row.code,summary:row.description,organizationId:null,organizationName:null,priceFrom:null,currency:"VND",
        imageUrl:undefined,href:`/services/${row.code}`,score:textScore(q,row.name,row.description,row.code)+25,reasonCode:"exact" as ReasonCode,
      } as any);
    }

    return{mode:"search" as const,personalized:Boolean(userId),data:data.sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(60,limit)))};
  }
}
export const customerSmartSearchService=new CustomerSmartSearchService();
