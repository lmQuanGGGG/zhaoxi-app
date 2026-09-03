import type {CustomerPoint} from "@/lib/services/customer-location-service";

export type DeliveryWeather={
  source:"open_meteo"|"unavailable";
  temperature?:number;
  precipitationMm:number;
  weatherCode:number|null;
  rainLevel:"none"|"light"|"moderate"|"heavy";
  surcharge:number;
};

export type WeatherPolicyConfig = {
  weatherSurchargeEnabled?: boolean;
  weatherLightRainFee?: number;
  weatherModerateRainFee?: number;
  weatherHeavyRainFee?: number;
};

const CACHE_TTL_MS=10*60*1000;
const cache=new Map<string,{expiresAt:number;value:DeliveryWeather}>();
const none=():DeliveryWeather=>({source:"unavailable",precipitationMm:0,weatherCode:null,rainLevel:"none",surcharge:0});
const number=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0};
const keyFor=(point:CustomerPoint)=>`${point.latitude.toFixed(2)},${point.longitude.toFixed(2)}`;

function quoteRain(precipitationMm:number,weatherCode:number|null,config?:WeatherPolicyConfig):Pick<DeliveryWeather,"rainLevel"|"surcharge">{
  if(config?.weatherSurchargeEnabled===false)return{rainLevel:"none",surcharge:0};
  const lightFee=config?.weatherLightRainFee??4_000;
  const modFee=config?.weatherModerateRainFee??7_000;
  const heavyFee=config?.weatherHeavyRainFee??10_000;
  const thunderstorm=weatherCode!==null&&weatherCode>=95;
  if(thunderstorm||precipitationMm>=4)return{rainLevel:"heavy",surcharge:heavyFee};
  if(precipitationMm>=1)return{rainLevel:"moderate",surcharge:modFee};
  if(precipitationMm>0||(weatherCode!==null&&[51,53,55,56,57,61,63,65,80,81,82].includes(weatherCode)))return{rainLevel:"light",surcharge:lightFee};
  return{rainLevel:"none",surcharge:0};
}

export class DeliveryWeatherService{
  async current(point:CustomerPoint,config?:WeatherPolicyConfig):Promise<DeliveryWeather>{
    const key=keyFor(point),cached=cache.get(key),now=Date.now();
    if(cached&&cached.expiresAt>now){
      const dynamicSurcharge=quoteRain(cached.value.precipitationMm,cached.value.weatherCode,config);
      return {...cached.value,...dynamicSurcharge};
    }
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),3500);
    try{
      const query=new URLSearchParams({latitude:String(point.latitude),longitude:String(point.longitude),current:"temperature_2m,precipitation,rain,showers,weather_code",timezone:"auto"});
      const response=await fetch(`https://api.open-meteo.com/v1/forecast?${query}`,{signal:controller.signal,cache:"no-store"});
      if(!response.ok)throw new Error(`weather_${response.status}`);
      const body=await response.json() as {current?:Record<string,unknown>};
      const current=body.current||{};
      const temp=Number.isFinite(Number(current.temperature_2m))?Math.round(Number(current.temperature_2m)):undefined;
      const precipitation=Math.max(number(current.precipitation),number(current.rain),number(current.showers));
      const code=Number.isFinite(Number(current.weather_code))?Number(current.weather_code):null;
      const value:DeliveryWeather={source:"open_meteo",temperature:temp,precipitationMm:precipitation,weatherCode:code,...quoteRain(precipitation,code,config)};
      cache.set(key,{expiresAt:now+CACHE_TTL_MS,value});
      return value;
    }catch{
      return none();
    }finally{clearTimeout(timeout)}
  }
}

export const deliveryWeatherService=new DeliveryWeatherService();
