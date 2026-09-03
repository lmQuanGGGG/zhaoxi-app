import { failure, success } from "@/lib/core/api-response";
import { sessionService } from "@/lib/services/session-service";
export const dynamic="force-dynamic";
function bearer(r:Request){const h=r.headers.get("authorization")||"";return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():"";}
export async function POST(request:Request){const session=await sessionService.authenticate(bearer(request));if(!session)return failure("Authentication required.",401,undefined,"AUTH_REQUIRED");const body=await request.json().catch(()=>({}));const sessionId=String(body?.sessionId||"").trim();if(!sessionId)return failure("Session id is required.",422,undefined,"SESSION_ID_REQUIRED");const result=await sessionService.revokeDevice(session.userId,sessionId);if(!result.revoked)return failure("Session not found.",404,undefined,"SESSION_NOT_FOUND");return success({...result,currentSessionRevoked:session.sessionId===sessionId});}
