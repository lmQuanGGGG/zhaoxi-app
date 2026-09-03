import {authenticatedSession} from "@/lib/auth-request";
import {failure,success} from "@/lib/core/api-response";
import {releaseApprovalService} from "@/lib/services/release-approval-service";
export const dynamic="force-dynamic";
export async function GET(r:Request){
  const s=await authenticatedSession(r);
  if(!s||s.role!=="admin")return failure("Admin required.",403,undefined,"ADMIN_REQUIRED");
  return success(await releaseApprovalService.list());
}
export async function POST(r:Request){
  const s=await authenticatedSession(r);
  if(!s||s.role!=="admin")return failure("Admin required.",403,undefined,"ADMIN_REQUIRED");
  try{return success(await releaseApprovalService.approve(s.userId,await r.json().catch(()=>({}))),{status:201})}
  catch(e){const c=e instanceof Error?e.message:"RELEASE_APPROVAL_FAILED";return failure("Unable to approve release.",c==="RELEASE_NOT_READY"||c==="UI_ACCEPTANCE_NOT_READY"?409:422,undefined,c)}
}
