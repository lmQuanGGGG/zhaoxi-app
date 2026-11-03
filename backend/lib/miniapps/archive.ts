import { inflateRawSync } from "node:zlib";
import { MiniAppManifestError, MINIAPP_PLATFORMS, parseManifest, type MiniAppManifest, type MiniAppPlatform } from "./manifest";

export type UploadedFile = { path: string; data: Buffer };
export type PlatformBuild = { platform: MiniAppPlatform; manifest: MiniAppManifest; bundle: Buffer };

/** One bundle may be at most this big once unzipped; the request itself is capped lower by the platform (4.5 MB). */
export const MAX_BUNDLE_BYTES = 10 * 1024 * 1024;
const MAX_ENTRIES = 200;

const fail = (code: string, message: string): never => {
  throw new MiniAppManifestError(code, message);
};

/**
 * Minimal ZIP reader (stored + deflate, no ZIP64, no encryption): enough for `dist/` zipped by
 * Finder, `zip -r` or CI. Every entry is size-capped before and while inflating.
 */
export function readZip(archive: Buffer): UploadedFile[] {
  let eocd = -1;
  for (let i = archive.length - 22; i >= Math.max(0, archive.length - 22 - 0xffff); i -= 1) {
    if (archive.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) fail("ARCHIVE_INVALID", "not a zip file");
  const count = archive.readUInt16LE(eocd + 10);
  let offset = archive.readUInt32LE(eocd + 16);
  if (count === 0xffff || offset === 0xffffffff) fail("ARCHIVE_UNSUPPORTED", "ZIP64 archives are not supported");
  if (count > MAX_ENTRIES) fail("ARCHIVE_TOO_MANY_FILES", `zip has ${count} entries (max ${MAX_ENTRIES})`);
  const files: UploadedFile[] = [];
  for (let n = 0; n < count; n += 1) {
    if (offset + 46 > archive.length || archive.readUInt32LE(offset) !== 0x02014b50) fail("ARCHIVE_INVALID", "broken zip central directory");
    const flags = archive.readUInt16LE(offset + 8);
    const method = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const size = archive.readUInt32LE(offset + 24);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localOffset = archive.readUInt32LE(offset + 42);
    const name = archive.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    offset += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith("/")) continue;
    if (flags & 1) fail("ARCHIVE_UNSUPPORTED", "encrypted zip entries are not supported");
    if (size > MAX_BUNDLE_BYTES) fail("BUNDLE_TOO_LARGE", `${name} is larger than ${MAX_BUNDLE_BYTES / 1024 / 1024} MB`);
    if (localOffset + 30 > archive.length || archive.readUInt32LE(localOffset) !== 0x04034b50) fail("ARCHIVE_INVALID", `broken zip entry ${name}`);
    const start = localOffset + 30 + archive.readUInt16LE(localOffset + 26) + archive.readUInt16LE(localOffset + 28);
    const raw = archive.subarray(start, start + compressedSize);
    if (raw.length !== compressedSize) fail("ARCHIVE_INVALID", `truncated zip entry ${name}`);
    let data: Buffer;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) {
      try {
        data = inflateRawSync(raw, { maxOutputLength: MAX_BUNDLE_BYTES });
      } catch {
        return fail("ARCHIVE_INVALID", `cannot inflate ${name}`);
      }
    } else return fail("ARCHIVE_UNSUPPORTED", `zip compression method ${method} is not supported`);
    if (data.length !== size) fail("ARCHIVE_INVALID", `size mismatch in ${name}`);
    files.push({ path: name, data });
  }
  return files;
}

/**
 * Picks `<platform>/manifest.json` and its bundle out of an upload. Accepts the `dist/` folder
 * itself, its parent, or a zip of either: only the last two path segments count
 * (`…/ios/manifest.json`, `…/ios/<id>-<version>.ios.js`). macOS metadata is ignored.
 */
export function collectBuilds(files: UploadedFile[]): PlatformBuild[] {
  const byPlatform = new Map<MiniAppPlatform, Map<string, Buffer>>();
  for (const file of files) {
    const parts = file.path.replace(/\\/g, "/").split("/").filter((part) => part && part !== ".");
    if (parts.some((part) => part === ".." || part === "__MACOSX" || part.startsWith("._"))) continue;
    if (parts.length < 2) continue;
    const [platform, name] = parts.slice(-2) as [MiniAppPlatform, string];
    if (!MINIAPP_PLATFORMS.includes(platform)) continue;
    const entries = byPlatform.get(platform) ?? new Map<string, Buffer>();
    if (entries.has(name)) fail("UPLOAD_DUPLICATE_FILE", `${platform}/${name} appears twice`);
    entries.set(name, file.data);
    byPlatform.set(platform, entries);
  }
  const builds: PlatformBuild[] = [];
  for (const [platform, entries] of byPlatform) {
    const manifestBytes = entries.get("manifest.json");
    if (!manifestBytes) continue;
    let json: unknown;
    try {
      json = JSON.parse(manifestBytes.toString("utf8"));
    } catch {
      fail("MANIFEST_INVALID", `${platform}/manifest.json is not valid JSON`);
    }
    const manifest = parseManifest(json);
    if (manifest.platform !== platform) fail("MANIFEST_PLATFORM_MISMATCH", `${platform}/manifest.json says platform ${manifest.platform}`);
    const bundle = entries.get(manifest.bundle);
    if (!bundle) fail("BUNDLE_MISSING", `${platform}/${manifest.bundle} is missing from the upload`);
    builds.push({ platform, manifest, bundle: bundle! });
  }
  if (!builds.length) fail("UPLOAD_EMPTY", "no ios/manifest.json or android/manifest.json found (upload the dist folder or a zip of it)");
  const ids = new Set(builds.map((build) => `${build.manifest.id}@${build.manifest.version}`));
  if (ids.size > 1) fail("UPLOAD_MIXED_BUILDS", `one upload must hold one mini app version, got ${[...ids].join(", ")}`);
  return builds.sort((a, b) => a.platform.localeCompare(b.platform));
}
