/**
 * Ed25519 public keys the registry accepts on upload. Keep this list in step with the
 * host's `frontend/apps/customer-mobile/src/miniapps/keys.ts` (tests/miniapp-registry.integration.test.ts
 * fails when they drift): a build the host would reject must not be publishable.
 *
 * - `prod` keys are always accepted.
 * - `dev` keys only when `MINIAPP_ACCEPT_DEV_KEYS=1` (local / staging backends). Production
 *   never sets it, because release hosts refuse dev-signed bundles.
 *
 * Add a key: `npx zhaoxi-miniapp keygen` prints `{ keyId, publicKey }`; paste it here and in keys.ts.
 * Revoke: delete the line here and in keys.ts, then ship a new host build.
 */
export type MiniAppTrustedKey = { keyId: string; publicKey: string; env: "dev" | "prod"; note: string };

export const miniAppTrustedKeys: MiniAppTrustedKey[] = [
  { keyId: "5d81cc2da9ad8163", publicKey: "3FVJYQfo6kYDwWgqj1/c+qtkVUbApIkkWGUiyvnRpUA=", env: "prod", note: "zhaoxi-miniapp-prod-2026-11" },
  { keyId: "588b24b78faa74ad", publicKey: "yQ4YgirQuyo4gxJwmjJqI3ZgYLuPl48U+JmfP9ju/rw=", env: "dev", note: "zhaoxi-dev-2026-11" },
  { keyId: "098cfe54f8425da6", publicKey: "FHY4gY7s53u2rB4rvCtRWMaOdwDvpXMH4LOh/falg8s=", env: "dev", note: "zhaoxi-partner-dev-2026-11" },
];

export function acceptsDevKeys() {
  return process.env.MINIAPP_ACCEPT_DEV_KEYS === "1";
}

export function findTrustedKey(keyId: string) {
  return miniAppTrustedKeys.find((key) => key.keyId === keyId && (key.env === "prod" || acceptsDevKeys())) ?? null;
}
