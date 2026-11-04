import { authenticatedSession, bearer } from "@/lib/auth-request";
import { failure, success } from "@/lib/core/api-response";
import { MINIAPP_PLATFORMS, type MiniAppPlatform } from "@/lib/miniapps/manifest";
import { miniAppRegistryService } from "@/lib/services/miniapp-registry-service";

export const dynamic = "force-dynamic";

// GET ?platform=ios|android → mini apps the caller may see, each with the release version it should
// load (rollout is decided per user). Works without a session: then only apps open to everyone and
// fully rolled-out releases.
export async function GET(request: Request) {
  const platform = new URL(request.url).searchParams.get("platform") as MiniAppPlatform | null;
  if (!platform || !MINIAPP_PLATFORMS.includes(platform)) return failure("platform must be ios or android.", 400, undefined, "PLATFORM_INVALID");
  try {
    const session = await authenticatedSession(request);
    // A token that no longer authenticates (access tokens live 15 min) must not be answered like an
    // anonymous caller: the host would cache the guest catalog under the user's key and hide every
    // audience app (Partner) until the next refetch. 401 makes the client refresh and ask again.
    if (!session && bearer(request)) return failure("Session expired.", 401, undefined, "SESSION_EXPIRED");
    return success(await miniAppRegistryService.catalog(session?.userId ?? null, platform), { headers: { "cache-control": "private, no-store" } });
  } catch (e) {
    console.error(e);
    return failure("Unable to load mini apps.", 500, undefined, "MINIAPP_CATALOG_FAILED");
  }
}
