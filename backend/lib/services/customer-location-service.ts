import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {
  customerProfiles,customerSavedAddresses,moduleTranslations,modules,organizations,
  services,serviceTranslations
} from "@/db/schema";

export type CustomerPoint={latitude:number;longitude:number};
export type CustomerLocationSource="current"|"default_address"|"profile"|"none";

// GPS coordinates rank nearby services well, but a customer should see a place
// name. Cache each small map area so the Home card does not geocode repeatedly.
const reverseAddressCache=new Map<string,{text:string;expiresAt:number}>();
const reverseAddressRequests=new Map<string,Promise<string>>();

function num(v:unknown){const n=Number(v);return Number.isFinite(n)?n:null}
function validPoint(lat:unknown,lng:unknown):CustomerPoint|null{
  const latitude=num(lat),longitude=num(lng);
  if(latitude===null||longitude===null||Math.abs(latitude)>90||Math.abs(longitude)>180)return null;
  return{latitude,longitude};
}
function orgPoint(metadata:Record<string,unknown>|null|undefined):CustomerPoint|null{
  const m=metadata||{};
  return validPoint(m.latitude,m.longitude)||validPoint(m.lat,m.lng);
}
function distanceKm(a:CustomerPoint,b:CustomerPoint){
  const R=6371,toRad=(x:number)=>x*Math.PI/180;
  const dLat=toRad(b.latitude-a.latitude),dLng=toRad(b.longitude-a.longitude);
  const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function imageUrl(serviceMetadata:Record<string,unknown>|null,organizationMetadata:Record<string,unknown>|null){
  const sm=serviceMetadata||{},om=organizationMetadata||{};
  if(typeof sm.imageUrl==="string"&&sm.imageUrl)return sm.imageUrl;
  const banners=Array.isArray(om.bannerUrls)?om.bannerUrls:[];
  if(typeof banners[0]==="string"&&banners[0])return banners[0];
  if(typeof om.logoUrl==="string"&&om.logoUrl)return om.logoUrl;
  return "";
}
function addressKey(point:CustomerPoint){return `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`}
function locationLabel(payload:any){
  const properties=payload?.features?.[0]?.properties||{};
  const value=(key:string)=>typeof properties[key]==="string"?properties[key].trim():"";
  const street=[value("housenumber"),value("street")].filter(Boolean).join(" ");
  const parts=[value("name"),street,value("locality"),value("district"),value("city")]
    .filter((item,index,all)=>item&&all.indexOf(item)===index).slice(0,3);
  return parts.join(", ");
}
async function reverseAddress(point:CustomerPoint){
  const key=addressKey(point),cached=reverseAddressCache.get(key);if(cached&&cached.expiresAt>Date.now())return cached.text;
  const pending=reverseAddressRequests.get(key);if(pending)return pending;
  const request=(async()=>{try{
    const params=new URLSearchParams({lat:String(point.latitude),lon:String(point.longitude)});
    const response=await fetch(`https://photon.komoot.io/reverse?${params.toString()}`,{headers:{accept:"application/json"},next:{revalidate:600}});
    if(!response.ok)return "";const text=locationLabel(await response.json());
    if(text)reverseAddressCache.set(key,{text,expiresAt:Date.now()+10*60_000});return text;
  }catch{return ""}finally{reverseAddressRequests.delete(key)}})();
  reverseAddressRequests.set(key,request);return request;
}

export class CustomerLocationService{
  async context(userId?:string,current?:CustomerPoint|null){
    if(current)return{source:"current" as CustomerLocationSource,point:current,addressText:await reverseAddress(current),label:""};
    if(!userId)return{source:"none" as CustomerLocationSource,point:null,addressText:"",label:""};
    const db=getDb();
    const saved=(await db.select().from(customerSavedAddresses).where(and(eq(customerSavedAddresses.userId,userId),eq(customerSavedAddresses.isDefault,true))).limit(1))[0];
    const savedPoint=saved?validPoint(saved.latitude,saved.longitude):null;
    if(saved&&savedPoint)return{source:"default_address" as CustomerLocationSource,point:savedPoint,addressText:saved.addressText,label:saved.label};
    const profile=(await db.select().from(customerProfiles).where(eq(customerProfiles.userId,userId)).limit(1))[0];
    const profilePoint=profile?validPoint(profile.latitude,profile.longitude):null;
    if(profile&&profilePoint)return{source:"profile" as CustomerLocationSource,point:profilePoint,addressText:profile.addressText||"",label:""};
    return{source:"none" as CustomerLocationSource,point:null,addressText:saved?.addressText||profile?.addressText||"",label:saved?.label||""};
  }

  async nearby(input:{userId?:string;locale:string;moduleCode?:string;current?:CustomerPoint|null;limit?:number;radiusKm?:number}){
    const db=getDb();
    const context=await this.context(input.userId,input.current);
    const filters=[eq(services.isEnabled,true),eq(modules.isEnabled,true),eq(organizations.status,"active")];
    if(input.moduleCode)filters.push(eq(modules.code,input.moduleCode));
    const rows=await db.select({
      id:services.id,code:services.code,moduleCode:modules.code,moduleName:moduleTranslations.name,
      name:serviceTranslations.name,summary:serviceTranslations.summary,priceFrom:services.priceFrom,currency:services.currency,
      serviceMetadata:services.metadata,organizationId:organizations.id,organizationCode:organizations.code,
      organizationName:organizations.name,organizationAddress:organizations.addressText,organizationMetadata:organizations.metadata,
    }).from(services)
      .innerJoin(modules,eq(services.moduleId,modules.id))
      .innerJoin(organizations,eq(services.organizationId,organizations.id))
      .leftJoin(serviceTranslations,and(eq(serviceTranslations.serviceId,services.id),eq(serviceTranslations.locale,input.locale)))
      .leftJoin(moduleTranslations,and(eq(moduleTranslations.moduleId,modules.id),eq(moduleTranslations.locale,input.locale)))
      .where(and(...filters)).limit(240);

    const radius=Math.max(1,Math.min(100,Number(input.radiusKm||30)));
    const scored=rows.map(row=>{
      const point=orgPoint(row.organizationMetadata);
      const distance=context.point&&point?distanceKm(context.point,point):null;
      return{
        id:row.id,code:row.code,moduleCode:row.moduleCode,moduleName:row.moduleName,
        name:row.name||row.code,summary:row.summary,priceFrom:row.priceFrom,currency:row.currency,
        metadata:row.serviceMetadata,organizationId:row.organizationId,organizationCode:row.organizationCode,
        organizationName:row.organizationName,organizationAddress:row.organizationAddress,
        organizationMetadata:row.organizationMetadata,imageUrl:imageUrl(row.serviceMetadata,row.organizationMetadata),
        distanceKm:distance===null?null:Number(distance.toFixed(2)),
        nearby:distance!==null&&distance<=radius,
      };
    });
    scored.sort((a,b)=>{
      if(a.distanceKm===null&&b.distanceKm!==null)return 1;
      if(a.distanceKm!==null&&b.distanceKm===null)return-1;
      if(a.distanceKm!==null&&b.distanceKm!==null&&a.distanceKm!==b.distanceKm)return a.distanceKm-b.distanceKm;
      return String(a.name).localeCompare(String(b.name));
    });
    return{context,radiusKm:radius,data:scored.slice(0,Math.max(1,Math.min(100,Number(input.limit||60))))};
  }
}
export const customerLocationService=new CustomerLocationService();
export {validPoint,distanceKm};
