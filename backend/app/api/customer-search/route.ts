import {authenticatedSession} from "@/lib/auth-request";
import {errorResponse,json} from "@/lib/api";
import {localeFromRequest} from "@/lib/locale";
import {customerSmartSearchService} from "@/lib/services/customer-smart-search-service";
import {validPoint} from "@/lib/services/customer-location-service";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 try{
  const url=new URL(request.url),session=await authenticatedSession(request);
  const locale=localeFromRequest(request),query=(url.searchParams.get("q")||"").trim();
  const moduleFilter=(url.searchParams.get("module")||"").trim()||undefined;
  const limit=Number(url.searchParams.get("limit")||40),userId=session?.role==="customer"?session.userId:undefined;
  const current=validPoint(url.searchParams.get("lat"),url.searchParams.get("lng"));
  const result=await customerSmartSearchService.search(userId,locale,query,moduleFilter,limit,current);
  return json({ok:true,locale,query,moduleFilter:moduleFilter||null,...result},{headers:{"cache-control":"no-store"}});
 }catch(error){console.error(error);return errorResponse("Unable to search ZhaoXi services.",500)}
}
