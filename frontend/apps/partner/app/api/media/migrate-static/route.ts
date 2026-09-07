import { put } from "@vercel/blob";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 6;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

function backendUrl() {
  const configured = process.env.ZHAOXI_BACKEND_URL || process.env.NEXT_PUBLIC_ZHAOXI_API_URL || "https://zhaoxi-app-puce.vercel.app";
  return (configured.includes("zhaoxi-backend.vercel.app") ? "https://zhaoxi-app-puce.vercel.app" : configured).replace(/\/+$/, "");
}

function accessToken(request: Request) {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("zx_access_v2="))?.slice("zx_access_v2=".length) || "";
}

function extension(contentType: string, sourceUrl: string) {
  const known: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
  if (known[contentType]) return known[contentType];
  const fromUrl = sourceUrl.split("?")[0].match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  return fromUrl && /^[a-z0-9]+$/.test(fromUrl) ? fromUrl : "jpg";
}

function staticVercelUrl(value: unknown) {
  if (typeof value !== "string" || !value) return false;
  try { return new URL(value).hostname.endsWith(".vercel.app"); } catch { return false; }
}

export async function POST(request: Request) {
  try {
    const access = accessToken(request);
    if (!access) return Response.json({ ok: false, error: "Authentication required." }, { status: 401 });
    const token = process.env.PUBLIC_MEDIA_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return Response.json({ ok: false, error: "Vercel Blob is not configured." }, { status: 503 });
    const body = await request.json().catch(() => null) as { organizationId?: string } | null;
    const organizationId = String(body?.organizationId || "").trim();
    if (!organizationId) return Response.json({ ok: false, error: "organizationId is required." }, { status: 400 });
    const headers = { authorization: `Bearer ${decodeURIComponent(access)}` };
    const servicesResponse = await fetch(`${backendUrl()}/api/services?organizationId=${encodeURIComponent(organizationId)}&includeDrafts=1`, { headers, cache: "no-store" });
    const servicesEnvelope = await servicesResponse.json().catch(() => null);
    if (!servicesResponse.ok || !Array.isArray(servicesEnvelope?.data)) return Response.json({ ok: false, error: "Unable to load this store's images." }, { status: servicesResponse.status || 503 });

    const allStatic = servicesEnvelope.data.filter((service: { metadata?: { imageUrl?: unknown } }) => staticVercelUrl(service?.metadata?.imageUrl));
    const candidates = allStatic.slice(0, BATCH_SIZE);
    const migrated: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];
    for (const service of candidates) {
      const sourceUrl = String(service.metadata.imageUrl);
      try {
        const source = await fetch(sourceUrl, { cache: "no-store" });
        const contentType = source.headers.get("content-type")?.split(";")[0].toLowerCase() || "";
        const size = Number(source.headers.get("content-length") || 0);
        if (!source.ok || !contentType.startsWith("image/") || size > MAX_FILE_SIZE) throw new Error("SOURCE_IMAGE_UNAVAILABLE");
        const bytes = await source.arrayBuffer();
        if (!bytes.byteLength || bytes.byteLength > MAX_FILE_SIZE) throw new Error("SOURCE_IMAGE_TOO_LARGE");
        const blob = await put(`zhaoxi/${organizationId}/migrated-items/${service.id}.${extension(contentType, sourceUrl)}`, new Blob([bytes], { type: contentType }), { access: "public", addRandomSuffix: true, token });
        const update = await fetch(`${backendUrl()}/api/services/${encodeURIComponent(service.id)}`, { method: "PATCH", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ organizationId, metadata: { imageUrl: blob.url, migratedFromImageUrl: sourceUrl, migratedToBlobAt: new Date().toISOString() } }), cache: "no-store" });
        if (!update.ok) throw new Error("DATABASE_UPDATE_FAILED");
        migrated.push(service.id);
      } catch (error) {
        failed.push({ id: String(service.id), reason: error instanceof Error ? error.message : "MIGRATION_FAILED" });
      }
    }
    return Response.json({ ok: true, data: { migrated: migrated.length, failed, remaining: Math.max(0, allStatic.length - migrated.length) } });
  } catch (error) {
    console.error("Static image migration failed", error);
    return Response.json({ ok: false, error: "Unable to migrate images." }, { status: 500 });
  }
}
