import { authenticatedSession } from "@/lib/auth-request";
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
    return success(await miniAppRegistryService.catalog(session?.userId ?? null, platform), { headers: { "cache-control": "private, no-store" } });
  } catch (e) {
    console.error(e);
    return failure("Unable to load mini apps.", 500, undefined, "MINIAPP_CATALOG_FAILED");
  }
}
