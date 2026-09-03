import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {organizations,services} from "@/db/schema";
import type {CustomerPoint} from "@/lib/services/customer-location-service";
import {deliveryPricingPolicyService,type DeliveryPricingPolicy,type SubsidyWindow} from "@/lib/services/delivery-pricing-policy-service";
import {googleRoutesService} from "@/lib/services/google-routes-service";
import {deliveryWeatherService,type DeliveryWeather} from "@/lib/services/delivery-weather-service";

function n(v:unknown){const x=Number(v);return Number.isFinite(x)?x:null}
function clockMinutes(date:Date,timeZone:string){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);
  const hour=Number(parts.find(x=>x.type==="hour")?.value||0),minute=Number(parts.find(x=>x.type==="minute")?.value||0);
  return hour*60+minute;
}
function hm(value:string){const [h,m]=value.split(":").map(Number);return h*60+m}
function activeWindow(date:Date,policy:DeliveryPricingPolicy):SubsidyWindow|null{
  const now=clockMinutes(date,policy.timezone);
  for(const window of policy.subsidyWindows){
    const start=hm(window.start),end=hm(window.end);
    if(Number.isFinite(start)&&Number.isFinite(end)){
      if(start<=end ? now>=start&&now<end : now>=start||now<end)return window;
    }
  }
  return null;
}

export type DeliveryQuote={
  eligible:boolean;
  distanceKm:number|null;
  fee:number|null; // backward-compatible alias for customerDeliveryFee
  grossFee:number|null;
  distanceFee:number|null;
  weather:DeliveryWeather;
  subsidy:number;
  customerDeliveryFee:number|null;
  currency:string;
  etaMinutes:number|null;
  routeDurationMinutes:number|null;
  zoneKm:number;
  subsidyActive:boolean;
  subsidyWindow:SubsidyWindow|null;
  distanceProvider:"google_routes"|"geo_fallback"|null;
  fulfillmentMode:"external_manual";
  reason:"ok"|"partner_location_missing"|"outside_service_zone"|"pricing_disabled"|"distance_unavailable";
};

export class DeliveryIntelligenceService{
  async quote(serviceId:string,destination:CustomerPoint,at=new Date()):Promise<DeliveryQuote>{
    const db=getDb();
    const row=(await db.select({service:services,organization:organizations}).from(services)
      .innerJoin(organizations,eq(services.organizationId,organizations.id))
      .where(eq(services.id,serviceId)).limit(1))[0];
    const policy=await deliveryPricingPolicyService.get();
    const currency=row?.service.currency||"VND";
    const noWeather:DeliveryWeather={source:"unavailable",precipitationMm:0,weatherCode:null,rainLevel:"none",surcharge:0};
    if(!policy.enabled)return{eligible:false,distanceKm:null,fee:null,grossFee:null,distanceFee:null,weather:noWeather,subsidy:0,customerDeliveryFee:null,currency,etaMinutes:null,routeDurationMinutes:null,zoneKm:policy.maxDeliveryRadiusKm,subsidyActive:false,subsidyWindow:null,distanceProvider:null,fulfillmentMode:"external_manual",reason:"pricing_disabled"};
    if(!row)return{eligible:false,distanceKm:null,fee:null,grossFee:null,distanceFee:null,weather:noWeather,subsidy:0,customerDeliveryFee:null,currency,etaMinutes:null,routeDurationMinutes:null,zoneKm:policy.maxDeliveryRadiusKm,subsidyActive:false,subsidyWindow:null,distanceProvider:null,fulfillmentMode:"external_manual",reason:"partner_location_missing"};

    const sm=(row.service.metadata||{}) as Record<string,unknown>,om=(row.organization.metadata||{}) as Record<string,unknown>;
    const lat=n(om.latitude??om.lat),lng=n(om.longitude??om.lng);
    const partnerZone=Math.max(1,n(sm.deliveryRadiusKm??om.deliveryRadiusKm)??policy.maxDeliveryRadiusKm);
    const zone=Math.min(partnerZone,policy.maxDeliveryRadiusKm);
    if(lat===null||lng===null)return{eligible:false,distanceKm:null,fee:null,grossFee:null,distanceFee:null,weather:noWeather,subsidy:0,customerDeliveryFee:null,currency,etaMinutes:null,routeDurationMinutes:null,zoneKm:zone,subsidyActive:false,subsidyWindow:null,distanceProvider:null,fulfillmentMode:"external_manual",reason:"partner_location_missing"};

    let route;
    try{
      route=await googleRoutesService.compute({latitude:lat,longitude:lng},destination,policy.allowGeoFallback,policy.distanceProvider==="geo_fallback"?"geo_fallback":"google_routes");
    }catch{
      return{eligible:false,distanceKm:null,fee:null,grossFee:null,distanceFee:null,weather:noWeather,subsidy:0,customerDeliveryFee:null,currency,etaMinutes:null,routeDurationMinutes:null,zoneKm:zone,subsidyActive:false,subsidyWindow:null,distanceProvider:null,fulfillmentMode:"external_manual",reason:"distance_unavailable"};
    }

    const distance=route.distanceKm;
    if(distance>zone)return{eligible:false,distanceKm:distance,fee:null,grossFee:null,distanceFee:null,weather:noWeather,subsidy:0,customerDeliveryFee:null,currency,etaMinutes:null,routeDurationMinutes:route.durationMinutes,zoneKm:zone,subsidyActive:false,subsidyWindow:null,distanceProvider:route.provider,fulfillmentMode:"external_manual",reason:"outside_service_zone"};

    const extraKm=Math.max(0,Math.ceil(distance-policy.baseDistanceKm));
    const distanceFee=Math.round(policy.baseFee+extraKm*policy.perKmFee);
    const weather=await deliveryWeatherService.current(destination,policy);
    const grossFee=distanceFee+weather.surcharge;
    const window=activeWindow(at,policy);
    const restaurantSubsidyEnabled=om.deliverySubsidyEnabled!==false&&sm.deliverySubsidyEnabled!==false;
    // Weather is charged transparently and is not absorbed by the restaurant subsidy.
    const subsidy=window&&restaurantSubsidyEnabled?Math.min(distanceFee,policy.partnerSubsidyAmount):0;
    const customerDeliveryFee=Math.max(0,grossFee-subsidy);
    const prep=Math.max(0,n(sm.preparationMinutes??om.preparationMinutes)??15);
    const routeMinutes=route.durationMinutes??Math.max(1,Math.ceil(distance/20*60));
    const eta=Math.max(5,prep+routeMinutes);

    return{
      eligible:true,distanceKm:distance,fee:customerDeliveryFee,grossFee,distanceFee,weather,subsidy,customerDeliveryFee,currency,
      etaMinutes:eta,routeDurationMinutes:route.durationMinutes,zoneKm:zone,
      subsidyActive:subsidy>0,subsidyWindow:window,distanceProvider:route.provider,
      fulfillmentMode:"external_manual",reason:"ok",
    };
  }
}
export const deliveryIntelligenceService=new DeliveryIntelligenceService();
