import { NextRequest } from "next/server";
import { analyticsService } from "@/lib/services/analytics-service";
import { success, failure } from "@/lib/core/api-response";
import { mayManageOrganization, requireSession } from "@/lib/security/route-authorization";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const gate = await requireSession(request, ["admin", "partner"]);
    if (!gate.ok) return gate.response;
    const organizationId = request.nextUrl.searchParams.get("organizationId") || undefined;
    if (gate.session.role === "partner") {
      if (!organizationId || !(await mayManageOrganization(gate.session, organizationId))) {
        return failure("Organization not found.", 404, undefined, "ORGANIZATION_NOT_FOUND");
      }
    }
    const days = Number(request.nextUrl.searchParams.get("days") || 30);
    return success(await analyticsService.overview({ organizationId, days }));
  } catch (error) {
    console.error(error);
    return failure("Unable to load analytics.", 500, undefined, "ANALYTICS_LOAD_FAILED");
  }
}
