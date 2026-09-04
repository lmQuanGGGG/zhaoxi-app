import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "general";
}

function publicMediaToken() {
  return (
    process.env.PUBLIC_MEDIA_READ_WRITE_TOKEN ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    undefined
  );
}

export async function POST(request: Request) {
  try {
    const backend =
      process.env.ZHAOXI_BACKEND_URL ||
      process.env.NEXT_PUBLIC_ZHAOXI_API_URL ||
      "https://zhaoxi-app-puce.vercel.app";
    const access = request.headers.get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("zx_access_v2="))
      ?.slice("zx_access_v2=".length);
    if (!access) return Response.json({ ok: false, error: "Authentication required." }, { status: 401 });
    const sessionResponse = await fetch(`${backend}/api/auth/session/me`, {
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

    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: "Vui lòng chọn một tệp hình ảnh." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json({ ok: false, error: "Chỉ hỗ trợ JPG, PNG, WEBP và GIF." }, { status: 415 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ ok: false, error: "Ảnh phải nhỏ hơn 4 MB." }, { status: 413 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const pathname = `zhaoxi/${organizationId}/${folder}/${Date.now()}.${safeSegment(extension)}`;
    const token = publicMediaToken();

    let blobUrl = "";
    let blobPathname = pathname;

    if (token) {
      try {
        const blob = await put(pathname, file, {
          access: "public",
          addRandomSuffix: true,
          token,
        });
        blobUrl = blob.url;
        blobPathname = blob.pathname;
      } catch (err) {
        if (process.env.NODE_ENV === "production") throw err;
      }
    }

    if (!blobUrl) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const partnerPublic = path.resolve(process.cwd(), process.cwd().endsWith("partner") ? "public" : "apps/partner/public");
      const customerPublic = path.resolve(process.cwd(), process.cwd().endsWith("partner") ? "../customer/public" : "apps/customer/public");

      const localFile = path.join(partnerPublic, "uploads", pathname);
      await mkdir(path.dirname(localFile), { recursive: true });
      await writeFile(localFile, bytes);

      try {
        const customerFile = path.join(customerPublic, "uploads", pathname);
        await mkdir(path.dirname(customerFile), { recursive: true });
        await writeFile(customerFile, bytes);
      } catch {}

      blobUrl = `/uploads/${pathname}`;
      blobPathname = pathname;
    }

    const kind =
      folder === "logo"
        ? "logo"
        : folder === "banners"
          ? "banner"
          : folder === "items"
            ? "product"
            : "gallery";

    let media: unknown = null;
    let warning: string | undefined;
    try {
      const registration = await fetch(`${backend}/api/media`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${decodeURIComponent(access)}` },
        body: JSON.stringify({
          organizationId,
          kind,
          blobUrl,
          pathname: blobPathname,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
        cache: "no-store",
      });
      const registered = await registration.json().catch(() => null);
      if (registration.ok) media = registered?.data;
      else warning = String(registered?.error?.message || registered?.error || "Media metadata registration is pending.");
    } catch {
      warning = "Ảnh đã tải lên nhưng metadata sẽ được đồng bộ khi lưu dịch vụ.";
    }

    return Response.json({
      ok: true,
      data: {
        url: blobUrl,
        pathname: blobPathname,
        contentType: file.type,
        size: file.size,
        media,
      },
      warning,
    });
  } catch (error) {
    console.error("Partner public media upload failed", error);
    const message = error instanceof Error ? error.message : "Unable to upload image.";
    return Response.json(
      {
        ok: false,
        error: message.includes("token")
          ? "Public Blob chưa được kết nối đúng với project Partner."
          : message,
      },
      { status: 500 },
    );
  }
}
