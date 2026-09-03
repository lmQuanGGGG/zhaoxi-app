import type {CustomerPoint} from "@/lib/services/customer-location-service";

export type RouteDistance={
  distanceKm:number;durationMinutes:number|null;provider:"google_routes"|"geo_fallback";
};

function durationMinutes(value:unknown){
  const match=String(value||"").match(/^([\d.]+)s$/);if(!match)return null;
  const seconds=Number(match[1]);return Number.isFinite(seconds)?Math.max(1,Math.ceil(seconds/60)):null;
}
function haversine(a:CustomerPoint,b:CustomerPoint){
  const R=6371,toRad=(x:number)=>x*Math.PI/180;
  const dLat=toRad(b.latitude-a.latitude),dLng=toRad(b.longitude-a.longitude);
  const h=Math.sin(dLat/2)**2+Math.cos(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

export class GoogleRoutesService{
  async compute(origin:CustomerPoint,destination:CustomerPoint,allowGeoFallback=true,preferredProvider:"google_routes"|"geo_fallback"="google_routes"):Promise<RouteDistance>{
    const key=process.env.GOOGLE_MAPS_ROUTES_API_KEY||process.env.GOOGLE_MAPS_API_KEY;
    if(preferredProvider==="google_routes"&&key){
      try{
        const response=await fetch("https://routes.googleapis.com/directions/v2:computeRoutes",{
          method:"POST",
          headers:{
            "content-type":"application/json",
            "X-Goog-Api-Key":key,
            "X-Goog-FieldMask":"routes.distanceMeters,routes.duration",
          },
          body:JSON.stringify({
            origin:{location:{latLng:origin}},
            destination:{location:{latLng:destination}},
            travelMode:"DRIVE",
            routingPreference:"TRAFFIC_AWARE",
            computeAlternativeRoutes:false,
            units:"METRIC",
          }),
          signal:AbortSignal.timeout(8000),
          cache:"no-store",
        });
        if(response.ok){
          const payload=await response.json() as any;
          const route=Array.isArray(payload?.routes)?payload.routes[0]:null;
          const meters=Number(route?.distanceMeters);
          if(Number.isFinite(meters)&&meters>=0){
            return{distanceKm:Number((meters/1000).toFixed(2)),durationMinutes:durationMinutes(route?.duration),provider:"google_routes"};
          }
        }else{
          console.error("Google Routes API error",response.status,await response.text().catch(()=>""));
        }
      }catch(error){console.error("Google Routes API unavailable",error)}
    }
    if(!allowGeoFallback)throw new Error("GOOGLE_ROUTES_UNAVAILABLE");
    return{distanceKm:Number(haversine(origin,destination).toFixed(2)),durationMinutes:null,provider:"geo_fallback"};
  }
}
export const googleRoutesService=new GoogleRoutesService();
