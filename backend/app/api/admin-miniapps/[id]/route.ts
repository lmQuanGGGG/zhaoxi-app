import { authenticatedSession } from "@/lib/auth-request";
import { failure, success } from "@/lib/core/api-response";
import { MiniAppRegistryError, miniAppRegistryService } from "@/lib/services/miniapp-registry-service";

export const dynamic = "force-dynamic";

// PATCH { title?, subtitle?, icon?, tint?, chrome?, audience?, enabled?, sortOrder? } → catalogue entry.
// `enabled: false` is the kill switch: the app leaves the catalogue and its manifest/bundle URLs 404.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await authenticatedSession(request);
  if (!s || s.role !== "admin") return failure("Admin required.", 403, undefined, "ADMIN_REQUIRED");
  try {
    const { id } = await params;
    return success(await miniAppRegistryService.updateApp(s.userId, id, await request.json().catch(() => ({}))));
  } catch (e) {
    if (e instanceof MiniAppRegistryError) return failure(e.message, e.status, undefined, e.code);
    console.error(e);
    return failure("Unable to update mini app.", 500, undefined, "ADMIN_MINIAPP_UPDATE_FAILED");
  }
}
