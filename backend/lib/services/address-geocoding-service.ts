export type GeocodedAddress={latitude:number;longitude:number;formattedAddress:string};

function point(value:unknown):GeocodedAddress|null{
  const item=value as {geometry?:{location?:{lat?:unknown;lng?:unknown}};formatted_address?:unknown};
  const latitude=Number(item?.geometry?.location?.lat),longitude=Number(item?.geometry?.location?.lng);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return null;
  return {latitude,longitude,formattedAddress:String(item.formatted_address||"")};
}

/** Server-side address lookup. A failed lookup never prevents a partner from saving their profile. */
export class AddressGeocodingService{
  async lookup(address:string):Promise<GeocodedAddress|null>{
    const query=address.trim();
    const key=process.env.GOOGLE_MAPS_GEOCODING_API_KEY||process.env.GOOGLE_MAPS_API_KEY||process.env.GOOGLE_MAPS_ROUTES_API_KEY;
    if(!query)return null;
    if(key){
      try{
        const params=new URLSearchParams({address:query,key,region:"vn",language:"vi"});
        const response=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`,{signal:AbortSignal.timeout(8000),cache:"no-store"});
        if(response.ok){
          const payload=await response.json() as {status?:string;results?:unknown[]};
          const result=payload.status==="OK"?point(payload.results?.[0]):null;
          if(result)return result;
        }
      }catch(error){console.error("Google organization address geocoding unavailable",error)}
    }
    try{
      // This fallback runs only after an address is created/changed, never on page views.
      const params=new URLSearchParams({q:query,format:"jsonv2",limit:"1",countrycodes:"vn",addressdetails:"0"});
      const response=await fetch(`https://nominatim.openstreetmap.org/search?${params}`,{headers:{"user-agent":"ZhaoXi partner address setup/1.0","accept-language":"vi"},signal:AbortSignal.timeout(8000),cache:"no-store"});
      if(!response.ok)return null;
      const result=(await response.json() as Array<{lat?:unknown;lon?:unknown;display_name?:unknown}>)[0];
      const latitude=Number(result?.lat),longitude=Number(result?.lon);
      return Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180?{latitude,longitude,formattedAddress:String(result?.display_name||"")}:null;
    }catch(error){
      console.error("Organization address geocoding unavailable",error);
      return null;
    }
  }
}

export const addressGeocodingService=new AddressGeocodingService();
