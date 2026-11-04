import { authenticatedSession } from "@/lib/auth-request";
import { failure, success } from "@/lib/core/api-response";
import { MiniAppRegistryError, miniAppRegistryService } from "@/lib/services/miniapp-registry-service";

export const dynamic = "force-dynamic";

// PATCH { action: "publish" | "rollout" | "rollback", rolloutPercent?, reason? }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await authenticatedSession(request);
  if (!s || s.role !== "admin") return failure("Admin required.", 403, undefined, "ADMIN_REQUIRED");
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return failure("Release not found.", 404, undefined, "RELEASE_NOT_FOUND");
    return success(await miniAppRegistryService.releaseAction(s.userId, id, await request.json().catch(() => ({}))));
  } catch (e) {
    if (e instanceof MiniAppRegistryError) return failure(e.message, e.status, undefined, e.code);
    console.error(e);
    return failure("Unable to update release.", 500, undefined, "ADMIN_MINIAPP_RELEASE_FAILED");
  }
}
