import { success } from "@/lib/core/api-response"; import { sessionService } from "@/lib/services/session-service"; export const dynamic="force-dynamic";
export async function POST(request:Request){const body=await request.json().catch(()=>({}));if(body?.refreshToken)await sessionService.logout(String(body.refreshToken));return success({loggedOut:true});}
