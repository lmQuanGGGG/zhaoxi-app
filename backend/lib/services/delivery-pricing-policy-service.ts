import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {deliveryPricingPolicies} from "@/db/schema";

export type SubsidyWindow={start:string;end:string};
export type DeliveryPricingPolicy={
  scope:string;baseFee:number;baseDistanceKm:number;perKmFee:number;partnerSubsidyAmount:number;
  subsidyWindows:SubsidyWindow[];timezone:string;maxDeliveryRadiusKm:number;
  distanceProvider:string;allowGeoFallback:boolean;enabled:boolean;
  weatherSurchargeEnabled:boolean;weatherLightRainFee:number;weatherModerateRainFee:number;weatherHeavyRainFee:number;
};

export const DEFAULT_DELIVERY_PRICING_POLICY:DeliveryPricingPolicy={
  scope:"default",baseFee:15000,baseDistanceKm:2,perKmFee:8000,partnerSubsidyAmount:20000,
  subsidyWindows:[{start:"07:00",end:"10:00"},{start:"13:00",end:"16:00"}],
  timezone:"Asia/Ho_Chi_Minh",maxDeliveryRadiusKm:12,distanceProvider:"google_routes",
  allowGeoFallback:true,enabled:true,
  weatherSurchargeEnabled:true,weatherLightRainFee:4000,weatherModerateRainFee:7000,weatherHeavyRainFee:10000,
};

function finite(value:unknown,fallback:number,min=0,max=10_000_000){
  const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function windows(value:unknown):SubsidyWindow[]{
  if(!Array.isArray(value))return DEFAULT_DELIVERY_PRICING_POLICY.subsidyWindows;
  const valid=value.map((x:any)=>({start:String(x?.start||""),end:String(x?.end||"")})).filter(x=>/^\d{2}:\d{2}$/.test(x.start)&&/^\d{2}:\d{2}$/.test(x.end));
  return valid.length?valid.slice(0,8):DEFAULT_DELIVERY_PRICING_POLICY.subsidyWindows;
}
function normalize(row:any):DeliveryPricingPolicy{
  if(!row)return DEFAULT_DELIVERY_PRICING_POLICY;
  return{
    scope:row.scope||"default",baseFee:Number(row.baseFee),baseDistanceKm:Number(row.baseDistanceKm),
    perKmFee:Number(row.perKmFee),partnerSubsidyAmount:Number(row.partnerSubsidyAmount),
    subsidyWindows:windows(row.subsidyWindows),timezone:row.timezone||"Asia/Ho_Chi_Minh",
    maxDeliveryRadiusKm:Number(row.maxDeliveryRadiusKm),distanceProvider:row.distanceProvider||"google_routes",
    allowGeoFallback:row.allowGeoFallback!==false,enabled:row.enabled!==false,
    weatherSurchargeEnabled:row.weatherSurchargeEnabled!==false,
    weatherLightRainFee:finite(row.weatherLightRainFee,4000),
    weatherModerateRainFee:finite(row.weatherModerateRainFee,7000),
    weatherHeavyRainFee:finite(row.weatherHeavyRainFee,10000),
  };
}

export class DeliveryPricingPolicyService{
  async get():Promise<DeliveryPricingPolicy>{
    const row=(await getDb().select().from(deliveryPricingPolicies).where(eq(deliveryPricingPolicies.scope,"default")).limit(1))[0];
    return normalize(row);
  }
  async update(input:any,userId?:string):Promise<DeliveryPricingPolicy>{
    const current=await this.get();
    const values={
      scope:"default",
      baseFee:Math.round(finite(input?.baseFee,current.baseFee)),
      baseDistanceKm:finite(input?.baseDistanceKm,current.baseDistanceKm,.1,100).toFixed(2),
      perKmFee:Math.round(finite(input?.perKmFee,current.perKmFee)),
      partnerSubsidyAmount:Math.round(finite(input?.partnerSubsidyAmount,current.partnerSubsidyAmount)),
      subsidyWindows:windows(input?.subsidyWindows),
      timezone:String(input?.timezone||current.timezone).slice(0,64),
      maxDeliveryRadiusKm:finite(input?.maxDeliveryRadiusKm,current.maxDeliveryRadiusKm,1,200).toFixed(2),
      distanceProvider:["google_routes","geo_fallback"].includes(String(input?.distanceProvider))?String(input.distanceProvider):current.distanceProvider,
      allowGeoFallback:input?.allowGeoFallback!==false,
      enabled:input?.enabled!==false,
      weatherSurchargeEnabled:input?.weatherSurchargeEnabled!==false,
      weatherLightRainFee:Math.round(finite(input?.weatherLightRainFee,current.weatherLightRainFee)),
      weatherModerateRainFee:Math.round(finite(input?.weatherModerateRainFee,current.weatherModerateRainFee)),
      weatherHeavyRainFee:Math.round(finite(input?.weatherHeavyRainFee,current.weatherHeavyRainFee)),
      updatedByUserId:userId||null,updatedAt:new Date(),
    };
    const db=getDb();
    const existing=(await db.select().from(deliveryPricingPolicies).where(eq(deliveryPricingPolicies.scope,"default")).limit(1))[0];
    if(existing)await db.update(deliveryPricingPolicies).set(values).where(eq(deliveryPricingPolicies.id,existing.id));
    else await db.insert(deliveryPricingPolicies).values(values);
    return this.get();
  }
}
export const deliveryPricingPolicyService=new DeliveryPricingPolicyService();
