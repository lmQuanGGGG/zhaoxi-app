import {failure,success} from "@/lib/core/api-response";
import {authenticatedSession} from "@/lib/auth-request";
import {feedbackService} from "@/lib/services/feedback-service";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{const session=await authenticatedSession(request);if(session?.role!=="admin")return failure("Admin access required.",403);const u=new URL(request.url);return success(await feedbackService.list({days:Number(u.searchParams.get("days")||30),app:u.searchParams.get("app")||undefined,status:u.searchParams.get("status")||undefined}))}catch(e){console.error(e);return failure("Unable to load beta feedback.",500)}}
export async function POST(request:Request){try{const session=await authenticatedSession(request);const body=await request.json();return success(await feedbackService.create(body,session),{status:201})}catch(e){console.error(e);return failure(e instanceof Error?e.message:"Unable to submit feedback.",422)}}
