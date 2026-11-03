import { authenticatedSession } from "@/lib/auth-request";
import { failure, success } from "@/lib/core/api-response";
import type { UploadedFile } from "@/lib/miniapps/archive";
import { readZip } from "@/lib/miniapps/archive";
import { MiniAppManifestError } from "@/lib/miniapps/manifest";
import { MiniAppRegistryError, miniAppRegistryService } from "@/lib/services/miniapp-registry-service";

export const dynamic = "force-dynamic";

const fail = (e: unknown, fallback: string) => {
  if (e instanceof MiniAppRegistryError) return failure(e.message, e.status, undefined, e.code);
  if (e instanceof MiniAppManifestError) return failure(e.message, 422, undefined, e.code);
  console.error(e);
  return failure("Mini app registry error.", 500, undefined, fallback);
};

// GET → every mini app with its releases (no bundle bytes).
export async function GET(request: Request) {
  const s = await authenticatedSession(request);
  if (!s || s.role !== "admin") return failure("Admin required.", 403, undefined, "ADMIN_REQUIRED");
  try {
    return success(await miniAppRegistryService.adminList());
  } catch (e) {
    return fail(e, "ADMIN_MINIAPPS_LOAD_FAILED");
  }
}

// POST multipart → upload one build of `zhaoxi-miniapp build`:
//   `archive`: a zip of dist/, or
//   `files`  : the files of dist/ (file name = relative path, e.g. dist/ios/manifest.json)
//   `notes`  : optional release note
// The server re-checks hash and Ed25519 signature against its trusted keys; releases start as draft.
export async function POST(request: Request) {
  const s = await authenticatedSession(request);
  if (!s || s.role !== "admin") return failure("Admin required.", 403, undefined, "ADMIN_REQUIRED");
  try {
    const form = await request.formData().catch(() => null);
    if (!form) return failure("Send multipart/form-data.", 400, undefined, "UPLOAD_INVALID");
    const files: UploadedFile[] = [];
    for (const item of form.getAll("archive")) {
      if (item instanceof File) files.push(...readZip(Buffer.from(await item.arrayBuffer())));
    }
    for (const item of form.getAll("files")) {
      if (item instanceof File) files.push({ path: item.name, data: Buffer.from(await item.arrayBuffer()) });
    }
    if (!files.length) return failure("Attach a zip (archive) or the dist files (files).", 400, undefined, "UPLOAD_EMPTY");
    const notes = String(form.get("notes") ?? "").trim().slice(0, 1000) || null;
    return success(await miniAppRegistryService.upload(s.userId, files, notes), { status: 201 });
  } catch (e) {
    return fail(e, "ADMIN_MINIAPP_UPLOAD_FAILED");
  }
}
