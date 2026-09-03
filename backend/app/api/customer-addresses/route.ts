import {authenticatedSession} from "@/lib/auth-request";
import {failure,success} from "@/lib/core/api-response";
import {customerProfileService} from "@/lib/services/customer-profile-service";
export const dynamic="force-dynamic";

export async function GET(r:Request){
  const s=await authenticatedSession(r);
  if(!s||s.role!=="customer")return failure("Customer authentication required.",401,undefined,"CUSTOMER_AUTH_REQUIRED");
  try{return success((await customerProfileService.get(s.userId)).addresses)}
  catch(e){console.error(e);return failure("Unable to load addresses.",500,undefined,"ADDRESS_LOAD_FAILED")}
}
export async function POST(r:Request){
  const s=await authenticatedSession(r);
  if(!s||s.role!=="customer")return failure("Customer authentication required.",401,undefined,"CUSTOMER_AUTH_REQUIRED");
  try{return success(await customerProfileService.addAddress(s.userId,await r.json().catch(()=>({}))),{status:201})}
  catch(e){console.error(e);return failure("Unable to save address.",422,undefined,"ADDRESS_SAVE_FAILED")}
}
