import { failure, success } from "@/lib/core/api-response";
import { sessionService } from "@/lib/services/session-service";
export const dynamic="force-dynamic";
function bearer(r:Request){const h=r.headers.get("authorization")||"";return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():"";}
export async function GET(request:Request){const session=await sessionService.authenticate(bearer(request));if(!session)return failure("Authentication required.",401,undefined,"AUTH_REQUIRED");return success(await sessionService.listDevices(session.userId,session.sessionId));}
