/**
 * Where bundle bytes live. The manifest is always served by the backend (rollout, rollback and
 * the kill switch need it); only the immutable bundle file goes through a store.
 *
 * - `postgres` (default): bytes in `miniapp_releases.bundle_data`, served by
 *   `/miniapps/<id>/<platform>/<file>` with `immutable` caching so the CDN absorbs repeat downloads.
 * - An object store (Cloudflare R2, DigitalOcean Spaces, MinIO: all S3 API) would implement `put`
 *   with a signed PUT and `locate` with its public URL; the bundle route then redirects there and
 *   the host URL does not change. Not wired yet: needs the owner to pick and create the bucket.
 */
export type StoredBundle = { storage: string; storageKey: string | null; bundleData: Buffer | null };
export type BundleLocation = { kind: "bytes"; data: Buffer } | { kind: "redirect"; url: string };

export interface MiniAppBundleStore {
  readonly name: string;
  put(input: { miniappId: string; platform: string; file: string; data: Buffer }): Promise<StoredBundle>;
  locate(row: StoredBundle): BundleLocation | null;
}

const postgresStore: MiniAppBundleStore = {
  name: "postgres",
  async put({ data }) {
    return { storage: "postgres", storageKey: null, bundleData: data };
  },
  locate(row) {
    return row.bundleData ? { kind: "bytes", data: row.bundleData } : null;
  },
};

export function bundleStore(): MiniAppBundleStore {
  const driver = process.env.MINIAPP_BUNDLE_STORE || "postgres";
  if (driver !== "postgres") throw new Error(`MINIAPP_BUNDLE_STORE=${driver} is not supported yet`);
  return postgresStore;
}

/** Store that wrote a release; used when serving rows written by an older driver. */
export function storeFor(storage: string): MiniAppBundleStore | null {
  return storage === "postgres" ? postgresStore : null;
}
