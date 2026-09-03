import {authenticatedSession} from "@/lib/auth-request";
import {errorResponse,json} from "@/lib/api";
import {localeFromRequest} from "@/lib/locale";
import {personalizedRecommendationService} from "@/lib/services/personalized-recommendation-service";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  try{
    const url=new URL(request.url);const session=await authenticatedSession(request);
    const locale=localeFromRequest(request);const limit=Number(url.searchParams.get("limit")||12);const offset=Number(url.searchParams.get("offset")||0);
    const userId=session?.role==="customer"?session.userId:undefined;
    return json({ok:true,personalized:Boolean(userId),locale,data:await personalizedRecommendationService.list(userId,locale,limit,offset)},{headers:{"cache-control":"no-store"}});
  }catch(error){console.error(error);return errorResponse("Unable to load personalized recommendations.",500)}
}
