import {authenticatedSession} from "@/lib/auth-request";
import {failure,success} from "@/lib/core/api-response";
import {deliveryPricingPolicyService} from "@/lib/services/delivery-pricing-policy-service";
import {deliveryWeatherService} from "@/lib/services/delivery-weather-service";
export const dynamic="force-dynamic";

export async function GET(request:Request){
  const session=await authenticatedSession(request);
  if(!session||session.role!=="admin")return failure("Admin required.",403,undefined,"ADMIN_REQUIRED");
  try{
    const policy=await deliveryPricingPolicyService.get();
    const liveWeather=await deliveryWeatherService.current({latitude:16.0544,longitude:108.2022},policy);
    return success({...policy,liveWeather});
  }
  catch(error){console.error(error);return failure("Unable to load delivery pricing policy.",500,undefined,"DELIVERY_POLICY_LOAD_FAILED")}
}
export async function PATCH(request:Request){
  const session=await authenticatedSession(request);
  if(!session||session.role!=="admin")return failure("Admin required.",403,undefined,"ADMIN_REQUIRED");
  try{
    const updated=await deliveryPricingPolicyService.update(await request.json().catch(()=>({})),session.userId);
    const liveWeather=await deliveryWeatherService.current({latitude:16.0544,longitude:108.2022},updated);
    return success({...updated,liveWeather});
  }
  catch(error){console.error(error);return failure("Unable to update delivery pricing policy.",422,undefined,"DELIVERY_POLICY_UPDATE_FAILED")}
}
