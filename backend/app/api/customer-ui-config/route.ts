import { authenticatedSession } from "@/lib/auth-request";
import { failure, success } from "@/lib/core/api-response";
import { customerUiService } from "@/lib/services/customer-ui-service";
export const dynamic="force-dynamic";

export async function GET(){
  try{return success(await customerUiService.get())}
  catch(error){console.error(error);return failure("Unable to load customer UI configuration.",500,undefined,"CUSTOMER_UI_LOAD_FAILED")}
}
export async function PATCH(request:Request){
  const session=await authenticatedSession(request);
  if(!session||session.role!=="admin")return failure("Admin required.",403,undefined,"ADMIN_REQUIRED");
  try{return success(await customerUiService.update(await request.json().catch(()=>({})),session.userId))}
  catch(error){console.error(error);return failure("Unable to update customer UI configuration.",500,undefined,"CUSTOMER_UI_UPDATE_FAILED")}
}
