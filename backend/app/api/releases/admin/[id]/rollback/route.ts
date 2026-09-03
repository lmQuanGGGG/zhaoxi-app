import {authenticatedSession} from "@/lib/auth-request";
import {failure,success} from "@/lib/core/api-response";
import {releaseApprovalService} from "@/lib/services/release-approval-service";
export const dynamic="force-dynamic";
export async function POST(r:Request,{params}:{params:Promise<{id:string}>}){
  const s=await authenticatedSession(r);
  if(!s||s.role!=="admin")return failure("Admin required.",403,undefined,"ADMIN_REQUIRED");
  try{const{id}=await params;return success(await releaseApprovalService.rollback(id,s.userId))}
  catch(e){const c=e instanceof Error?e.message:"ROLLBACK_FAILED";return failure("Unable to rollback release.",422,undefined,c)}
}
