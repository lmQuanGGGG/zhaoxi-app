import { failure, success } from "@/lib/core/api-response"; import { sessionService } from "@/lib/services/session-service";
export const dynamic="force-dynamic";
function bearer(r:Request){const h=r.headers.get("authorization")||"";return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():"";}
export async function GET(request:Request){const value=bearer(request);if(!value)return failure("Authentication required.",401,undefined,"AUTH_REQUIRED");const session=await sessionService.authenticate(value);return session?success(session):failure("Session expired.",401,undefined,"SESSION_EXPIRED");}
