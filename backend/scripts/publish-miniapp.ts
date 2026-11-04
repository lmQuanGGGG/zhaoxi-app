// Uploads a signed mini app build (`dist/` from `zhaoxi-miniapp build`) and publishes it, through the
// same service the admin "Mini app" page uses: server-side hash + signature check against the trusted
// keys (prod only unless MINIAPP_ACCEPT_DEV_KEYS=1), audit log entries, idempotent re-runs.
//
//   DATABASE_URL=… npx tsx scripts/publish-miniapp.ts <dist-dir> --admin <userId> [--percent 100]
//     [--title-vi "…"] [--title-en "…"] [--title-zh "…"] [--icon storefront-outline] [--tint #0B8F55]
//     [--audience partner|members|internal] [--notes "…"]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { miniAppRegistryService } from "@/lib/services/miniapp-registry-service";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const dist = args[0] ?? "";
const adminUserId = flag("admin") ?? "";
if (!dist || !adminUserId) throw new Error("usage: publish-miniapp.ts <dist-dir> --admin <userId> [options]");

const files = (function walk(dir: string): Array<{ path: string; data: Buffer }> {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [{ path: relative(dist, full), data: readFileSync(full) }];
  });
})(dist);

async function main() {
  const upload = await miniAppRegistryService.upload(adminUserId, files, flag("notes") ?? null);
  console.log(`uploaded ${upload.miniappId}@${upload.version}${upload.createdApp ? " (new app)" : ""}:`, upload.releases.map((r) => `${r.platform}${r.duplicate ? " (already there)" : ""}`).join(", "));

  const titles = { "vi-VN": flag("title-vi"), "en-US": flag("title-en"), "zh-CN": flag("title-zh"), "zh-TW": flag("title-zh") };
  const patch: Record<string, unknown> = {};
  if (Object.values(titles).some(Boolean)) patch.title = Object.fromEntries(Object.entries(titles).filter(([, v]) => v));
  for (const key of ["icon", "tint", "audience"] as const) if (flag(key) !== undefined) patch[key] = flag(key);
  if (Object.keys(patch).length) {
    await miniAppRegistryService.updateApp(adminUserId, upload.miniappId, patch);
    console.log("updated app:", Object.keys(patch).join(", "));
  }

  const percent = Number(flag("percent") ?? 100);
  for (const release of upload.releases) {
    if (release.status === "published") { console.log(`${release.platform}: already published`); continue; }
    await miniAppRegistryService.releaseAction(adminUserId, release.id, { action: "publish", rolloutPercent: percent });
    console.log(`${release.platform}: published at ${percent}%`);
  }
}

main().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
