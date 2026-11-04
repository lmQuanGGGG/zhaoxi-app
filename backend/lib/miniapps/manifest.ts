import { createHash, createPublicKey, verify } from "node:crypto";
import { findTrustedKey } from "./trusted-keys";

/** Runtimes this registry accepts. Same number as `MINIAPP_RUNTIME_VERSION` in `@zhaoxi/miniapp-sdk`. */
export const SUPPORTED_MINIAPP_RUNTIMES = [1] as const;
export const MINIAPP_PLATFORMS = ["ios", "android"] as const;
export const MINIAPP_PERMISSIONS = ["user.profile", "api.zhaoxi", "auth.token", "navigation.host", "auth.handoff", "notifications.push"] as const;

export type MiniAppPlatform = (typeof MINIAPP_PLATFORMS)[number];

/** `dist/<platform>/manifest.json` written by `zhaoxi-miniapp build`. */
export type MiniAppManifest = {
  schema: 1;
  id: string;
  name: string;
  version: string;
  runtime: number;
  platform: MiniAppPlatform;
  bundle: string;
  sha256: string;
  size: number;
  permissions: string[];
  minHostVersion?: string;
  builtAt?: string;
  keyId: string;
  signature: string;
};

export const MINIAPP_ID_PATTERN = /^[a-z0-9]+(?:\.[a-z0-9-]+)+$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export class MiniAppManifestError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "MiniAppManifestError";
  }
}

const fail = (code: string, message: string): never => {
  throw new MiniAppManifestError(code, message);
};

/** Copy of `manifestSigningPayload` in the SDK (`src/types.ts`) and `tools/cli.mjs`; change all three together. */
export function manifestSigningPayload(manifest: Pick<MiniAppManifest, "id" | "version" | "platform" | "runtime" | "sha256" | "permissions">) {
  return ["zhaoxi-miniapp:v1", manifest.id, manifest.version, manifest.platform, String(manifest.runtime), manifest.sha256.toLowerCase(), [...manifest.permissions].sort().join(",")].join("\n");
}

/** First 16 hex chars of SHA-256(raw public key), as `zhaoxi-miniapp keygen` prints. */
export function keyIdOf(rawPublicKey: Buffer) {
  return createHash("sha256").update(rawPublicKey).digest("hex").slice(0, 16);
}

export function sha256Hex(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

/** Shape checks only; no hash or signature. */
export function parseManifest(value: unknown): MiniAppManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("MANIFEST_INVALID", "manifest.json is not an object");
  const m = value as Record<string, unknown>;
  if (m.schema !== 1) fail("MANIFEST_SCHEMA_UNSUPPORTED", `manifest schema ${String(m.schema)} is not supported`);
  if (typeof m.id !== "string" || !MINIAPP_ID_PATTERN.test(m.id) || m.id.length > 120) fail("MANIFEST_ID_INVALID", "id must look like zhaoxi.example");
  const id = m.id as string;
  if (typeof m.version !== "string" || !VERSION_PATTERN.test(m.version) || m.version.length > 40) fail("MANIFEST_VERSION_INVALID", "version must be semver (1.2.3)");
  const version = m.version as string;
  if (!MINIAPP_PLATFORMS.includes(m.platform as MiniAppPlatform)) fail("MANIFEST_PLATFORM_INVALID", "platform must be ios or android");
  const platform = m.platform as MiniAppPlatform;
  if (!SUPPORTED_MINIAPP_RUNTIMES.includes(m.runtime as 1)) fail("MANIFEST_RUNTIME_UNSUPPORTED", `runtime ${String(m.runtime)} is not supported (host runtime ${SUPPORTED_MINIAPP_RUNTIMES.join(", ")})`);
  // The host resolves the bundle next to the manifest; only the exact name the CLI writes is allowed.
  if (m.bundle !== `${id}-${version}.${platform}.js`) fail("MANIFEST_BUNDLE_INVALID", `bundle must be ${id}-${version}.${platform}.js`);
  if (typeof m.sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(m.sha256)) fail("MANIFEST_HASH_INVALID", "sha256 must be 64 hex characters");
  if (typeof m.size !== "number" || !Number.isInteger(m.size) || m.size <= 0) fail("MANIFEST_SIZE_INVALID", "size must be a positive integer");
  if (!Array.isArray(m.permissions) || m.permissions.some((p) => !MINIAPP_PERMISSIONS.includes(p as never))) fail("MANIFEST_PERMISSIONS_INVALID", `permissions must be from: ${MINIAPP_PERMISSIONS.join(", ")}`);
  if (m.minHostVersion !== undefined && (typeof m.minHostVersion !== "string" || !VERSION_PATTERN.test(m.minHostVersion))) fail("MANIFEST_MIN_HOST_INVALID", "minHostVersion must be semver");
  if (typeof m.name !== "string" || !m.name.trim()) fail("MANIFEST_NAME_INVALID", "name is required");
  if (typeof m.keyId !== "string" || typeof m.signature !== "string" || !m.keyId || !m.signature) fail("MANIFEST_UNSIGNED", "the build is not signed; set ZHAOXI_MINIAPP_SIGNING_KEY and rebuild");
  return m as unknown as MiniAppManifest;
}

/**
 * Server-side `zhaoxi-miniapp verify`: bundle hash and size match the manifest, the key is
 * trusted here, and the Ed25519 signature covers id, version, platform, runtime, hash and permissions.
 */
export function verifyRelease(manifest: MiniAppManifest, bundle: Buffer) {
  const actual = sha256Hex(bundle);
  if (actual !== manifest.sha256.toLowerCase()) fail("BUNDLE_HASH_MISMATCH", `bundle hash ${actual.slice(0, 12)}… does not match manifest ${manifest.sha256.slice(0, 12)}…`);
  if (bundle.length !== manifest.size) fail("BUNDLE_SIZE_MISMATCH", `bundle is ${bundle.length} bytes, manifest says ${manifest.size}`);
  const key = findTrustedKey(manifest.keyId);
  if (!key) fail("SIGNING_KEY_UNTRUSTED", `key ${manifest.keyId} is not in the trusted list`);
  const raw = Buffer.from(key!.publicKey, "base64");
  if (keyIdOf(raw) !== manifest.keyId) fail("SIGNING_KEY_MISMATCH", `keyId ${manifest.keyId} does not match the trusted key`);
  const publicKey = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: raw.toString("base64url") }, format: "jwk" });
  const ok = verify(null, Buffer.from(manifestSigningPayload(manifest), "utf8"), publicKey, Buffer.from(manifest.signature, "base64"));
  if (!ok) fail("SIGNATURE_INVALID", "signature is not valid for this manifest");
  return { keyEnv: key!.env };
}
