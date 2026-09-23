import {authenticatedSession} from "@/lib/auth-request";
import {failure,success} from "@/lib/core/api-response";
import {restaurantAnalyticsService} from "@/lib/services/restaurant-analytics-service";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  const s=await authenticatedSession(request);
  if(!s||s.role!=="partner")return failure("Partner required.",403,undefined,"PARTNER_REQUIRED");
  const u=new URL(request.url);
  const organizationId=u.searchParams.get("organizationId")||s.organizationId||"";
  const rawDays=Number(u.searchParams.get("days")||30);
  const days=rawDays===1||rawDays===7||rawDays===90?rawDays:30;
  const timeZone=String(u.searchParams.get("timezone")||"Asia/Ho_Chi_Minh");
  const from=u.searchParams.get("from")||undefined;
  const to=u.searchParams.get("to")||undefined;
  if(!organizationId)return failure("organizationId required.",422);
  try{
    return success(await restaurantAnalyticsService.overview(s.userId,organizationId,days,timeZone,from,to));
  }catch(e){
    const code=e instanceof Error?e.message:"RESTAURANT_ANALYTICS_FAILED";
    return failure("Unable to load restaurant analytics.",code==="PARTNER_FORBIDDEN"?403:500,undefined,code);
  }
}
