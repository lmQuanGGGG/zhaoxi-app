import { failure, success } from "@/lib/core/api-response";
import { sessionService } from "@/lib/services/session-service";

export const dynamic = "force-dynamic";

function bearer(r: Request) {
  const h = r.headers.get("authorization") || "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
}

export async function POST(request: Request) {
  const token = bearer(request);
  if (!token) return failure("Authentication required.", 401, undefined, "AUTH_REQUIRED");

  try {
    const body = await request.json().catch(() => ({}));
    const organizationId = String(body.organizationId || "").trim();
    if (!organizationId) {
      return failure("organizationId is required.", 400, undefined, "ORGANIZATION_ID_REQUIRED");
    }

    const session = await sessionService.switchOrganization(token, organizationId);
    if (!session) {
      return failure("Session expired or invalid.", 401, undefined, "SESSION_EXPIRED");
    }

    return success(session);
  } catch (error) {
    const code = error instanceof Error ? error.message : "ORGANIZATION_SWITCH_FAILED";
    const status = code === "ORGANIZATION_ACCESS_DENIED" ? 403 : 422;
    return failure("Unable to switch organization.", status, undefined, code);
  }
}
