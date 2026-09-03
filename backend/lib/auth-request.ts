import { sessionService } from "@/lib/services/session-service";
export function bearer(request:Request){const value=request.headers.get("authorization")||"";return value.toLowerCase().startsWith("bearer ")?value.slice(7).trim():"";}
export async function authenticatedSession(request:Request){const token=bearer(request);return token?sessionService.authenticate(token):null;}
