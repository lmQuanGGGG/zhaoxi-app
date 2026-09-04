import { del, put } from "@vercel/blob";

// The Partner Vercel project returns a platform 500 for Node.js route handlers.
// Keep this upload handler at Edge so it can return useful errors to the UI.
export const runtime = "edge";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "general";
}

function backendUrl() {
  const configured = process.env.ZHAOXI_BACKEND_URL || process.env.NEXT_PUBLIC_ZHAOXI_API_URL || "https://zhaoxi-app-puce.vercel.app";
  return (configured.includes("zhaoxi-backend.vercel.app") ? "https://zhaoxi-app-puce.vercel.app" : configured).replace(/\/+$/, "");
}

function blobToken() {
  return process.env.PUBLIC_MEDIA_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
}

export async function POST(request: Request) {
  try {
    const access = request.headers.get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("zx_access_v2="))
      ?.slice("zx_access_v2=".length);
    if (!access) return Response.json({ ok: false, error: "Authentication required." }, { status: 401 });

    const sessionResponse = await fetch(`${backendUrl()}/api/auth/session/me`, {
      headers: { authorization: `Bearer ${decodeURIComponent(access)}` },
      cache: "no-store",
    });
    const sessionEnvelope = await sessionResponse.json().catch(() => null);
    if (!sessionResponse.ok || sessionEnvelope?.data?.role !== "partner") {
      return Response.json({ ok: false, error: "Partner access required." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = safeSegment(String(formData.get("folder") || "media"));
    const organizationId = safeSegment(String(formData.get("organizationId") || "unknown"));
    if (!sessionEnvelope?.data?.organizationId || sessionEnvelope.data.organizationId !== organizationId) {
      return Response.json({ ok: false, error: "Organization access denied." }, { status: 403 });
    }
    if (!(file instanceof File)) return Response.json({ ok: false, error: "Vui lòng chọn một tệp hình ảnh." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return Response.json({ ok: false, error: "Chỉ hỗ trợ JPG, PNG, WEBP và GIF." }, { status: 415 });
    if (file.size > MAX_FILE_SIZE) return Response.json({ ok: false, error: "Ảnh phải nhỏ hơn 4 MB." }, { status: 413 });

    const token = blobToken();
    if (!token) {
      return Response.json({ ok: false, error: "Kho lưu ảnh chưa được kết nối cho Partner. Hãy thêm BLOB_READ_WRITE_TOKEN trên Vercel." }, { status: 503 });
    }

    const extension = safeSegment(file.name.split(".").pop()?.toLowerCase() || "jpg");
    const blob = await put(`zhaoxi/${organizationId}/${folder}/${Date.now()}.${extension}`, file, {
      access: "public",
      addRandomSuffix: true,
      token,
    });
    // The final URL is stored with the shop/product itself. Avoid creating a
    // second media_assets row for every draft upload; it would grow forever as
    // the owner tries different images.
    return Response.json({ ok: true, data: { url: blob.url, pathname: blob.pathname, contentType: file.type, size: file.size } });
  } catch (error) {
    console.error("Partner media upload failed", error);
    const message = error instanceof Error ? error.message : "Unable to upload image.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const access = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("zx_access_v2="))?.slice("zx_access_v2=".length);
    if (!access) return Response.json({ ok: false, error: "Authentication required." }, { status: 401 });
    const sessionResponse = await fetch(`${backendUrl()}/api/auth/session/me`, { headers: { authorization: `Bearer ${decodeURIComponent(access)}` }, cache: "no-store" });
    const sessionEnvelope = await sessionResponse.json().catch(() => null);
    if (!sessionResponse.ok || sessionEnvelope?.data?.role !== "partner") return Response.json({ ok: false, error: "Partner access required." }, { status: 403 });
    const body = await request.json().catch(() => null) as { organizationId?: string; kind?: "logo" | "banner"; keepUrls?: string[] } | null;
    const organizationId = safeSegment(String(body?.organizationId || ""));
    const kind = body?.kind;
    if (!organizationId || !kind || sessionEnvelope?.data?.organizationId !== organizationId) return Response.json({ ok: false, error: "Organization access denied." }, { status: 403 });
    const token = blobToken();
    if (!token) return Response.json({ ok: false, error: "Kho lưu ảnh chưa được kết nối cho Partner." }, { status: 503 });

    const keep = new Set((body?.keepUrls || []).filter((url): url is string => typeof url === "string"));
    const mediaResponse = await fetch(`${backendUrl()}/api/media?organizationId=${encodeURIComponent(organizationId)}&kind=${kind}`, { headers: { authorization: `Bearer ${decodeURIComponent(access)}` }, cache: "no-store" });
    const mediaPayload = await mediaResponse.json().catch(() => null);
    const stale = Array.isArray(mediaPayload?.data) ? mediaPayload.data.filter((asset: { blobUrl?: string }) => asset?.blobUrl && !keep.has(asset.blobUrl)) : [];
    await Promise.all(stale.map(async (asset: { id: string; blobUrl: string }) => {
      if (asset.blobUrl.includes(".blob.vercel-storage.com/")) await del(asset.blobUrl, { token }).catch(() => undefined);
      await fetch(`${backendUrl()}/api/media/${encodeURIComponent(asset.id)}?organizationId=${encodeURIComponent(organizationId)}`, { method: "DELETE", headers: { authorization: `Bearer ${decodeURIComponent(access)}` }, cache: "no-store" });
    }));
    return Response.json({ ok: true, data: { removed: stale.length } });
  } catch (error) {
    console.error("Partner media cleanup failed", error);
    return Response.json({ ok: false, error: "Không thể dọn ảnh cũ." }, { status: 500 });
  }
}
