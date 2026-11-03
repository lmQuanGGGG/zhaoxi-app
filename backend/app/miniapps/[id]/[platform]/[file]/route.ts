import { failure } from "@/lib/core/api-response";
import { MINIAPP_ID_PATTERN, MINIAPP_PLATFORMS, type MiniAppPlatform } from "@/lib/miniapps/manifest";
import { miniAppRegistryService } from "@/lib/services/miniapp-registry-service";

export const dynamic = "force-dynamic";

// The host's release CDN (`EXPO_PUBLIC_MINIAPP_CDN_URL` defaults to `${API_URL}/miniapps`):
//   /miniapps/<id>/<platform>/manifest.json[?v=<version>]  current signed manifest
//   /miniapps/<id>/<platform>/<id>-<version>.<platform>.js  bundle it points to (relative)
// Integrity comes from the Ed25519 signature the host checks, not from this route.
export async function GET(request: Request, { params }: { params: Promise<{ id: string; platform: string; file: string }> }) {
  const { id, platform, file } = await params;
  if (!MINIAPP_ID_PATTERN.test(id) || !MINIAPP_PLATFORMS.includes(platform as MiniAppPlatform)) return failure("Not found.", 404, undefined, "MINIAPP_NOT_FOUND");
  try {
    if (file === "manifest.json") {
      const version = new URL(request.url).searchParams.get("v");
      const found = await miniAppRegistryService.manifest(id, platform as MiniAppPlatform, version);
      if (!found) return failure("Not found.", 404, undefined, "MINIAPP_NOT_FOUND");
      // Short CDN life: publish, rollback and the kill switch reach hosts within a minute.
      return Response.json(found.manifest, { headers: { "cache-control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30", "x-content-type-options": "nosniff" } });
    }
    if (!file.startsWith(`${id}-`) || !file.endsWith(`.${platform}.js`)) return failure("Not found.", 404, undefined, "MINIAPP_NOT_FOUND");
    const location = await miniAppRegistryService.bundle(id, platform as MiniAppPlatform, file);
    if (!location) return failure("Not found.", 404, undefined, "MINIAPP_NOT_FOUND");
    if (location.kind === "redirect") return Response.redirect(location.url, 302);
    // File names carry the version and the manifest pins the hash: the bytes never change.
    return new Response(new Uint8Array(location.data), {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "content-length": String(location.data.length),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (e) {
    console.error(e);
    return failure("Unable to load mini app.", 500, undefined, "MINIAPP_SERVE_FAILED");
  }
}
