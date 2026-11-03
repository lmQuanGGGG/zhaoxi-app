// End-to-end check of the mini app registry: an admin uploads a signed `dist/` (zip or files), the server
// re-verifies hash + Ed25519 signature, publishes with a rollout, the host reads catalogue → manifest →
// bundle, then a rollback and the kill switch take effect. Every action lands in operations_audit_logs.
// Runs only against a throwaway local Postgres: TEST_DATABASE_URL=postgres://...@localhost:PORT/db
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { readFileSync } from "node:fs";
import { after as afterAll, before, describe, it } from "node:test";
import { crc32, deflateRawSync } from "node:zlib";

const testUrl = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(testUrl);
if (isLocal) {
  process.env.DATABASE_URL = testUrl;
  delete process.env.POSTGRES_URL;
}

type Json = Record<string, unknown>;
type Envelope<T> = { ok: boolean; data: T; error?: { code?: string; message?: string } };
type Release = { id: string; platform: string; version: string; status: string; rolloutPercent: number; duplicate?: boolean };
type CatalogItem = { id: string; audience: string | null; release: { version: string; sha256: string } };
type Manifest = { id: string; version: string; platform: string; runtime: number; bundle: string; sha256: string; size: number; permissions: string[]; keyId: string; signature: string };
type Key = { privateKey: KeyObject; keyId: string; publicKey: string };

function makeKey(): Key {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const raw = Buffer.from(publicKey.export({ format: "jwk" }).x as string, "base64url");
  return { privateKey, publicKey: raw.toString("base64"), keyId: createHash("sha256").update(raw).digest("hex").slice(0, 16) };
}

/** Same output as `zhaoxi-miniapp build` (tools/cli.mjs). */
function buildDist(id: string, version: string, key: Key, options: { platforms?: string[]; permissions?: string[]; code?: string } = {}) {
  const files: { path: string; data: Buffer }[] = [];
  for (const platform of options.platforms ?? ["ios", "android"]) {
    const code = Buffer.from(options.code ?? `/* zhaoxi-miniapp ${id}@${version} runtime=1 */\n(function (__zx) { return __zx.run(0); })`, "utf8");
    const manifest: Json = {
      schema: 1, id, name: "Registry Test", version, runtime: 1, platform, bundle: `${id}-${version}.${platform}.js`,
      sha256: createHash("sha256").update(code).digest("hex"), size: code.length, permissions: options.permissions ?? ["api.zhaoxi", "user.profile"], builtAt: new Date().toISOString(),
    };
    const payload = ["zhaoxi-miniapp:v1", id, version, platform, "1", manifest.sha256, [...(manifest.permissions as string[])].sort().join(",")].join("\n");
    manifest.keyId = key.keyId;
    manifest.signature = sign(null, Buffer.from(payload, "utf8"), key.privateKey).toString("base64");
    files.push({ path: `dist/${platform}/manifest.json`, data: Buffer.from(JSON.stringify(manifest, null, 2)) }, { path: `dist/${platform}/${manifest.bundle}`, data: code });
  }
  return files;
}

/** Tiny zip writer (deflate), enough to exercise the server's reader. */
function zip(files: { path: string; data: Buffer }[]) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.path, "utf8");
    const body = deflateRawSync(file.data);
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(file.data.length, 22); local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(body.length, 20); central.writeUInt32LE(file.data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

describe("ZhaoXi mini app registry", { skip: isLocal ? false : "set TEST_DATABASE_URL to a local Postgres" }, () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const appId = `zhaoxi.registry${runId.replace(/[^a-z0-9]/g, "")}`;
  const trusted = makeKey();
  const stranger = makeKey();
  let sql: import("postgres").Sql;
  let adminToken = "";
  let customerToken = "";
  let partnerToken = "";
  let guestToken = "";
  let customerId = "";
  const releases: Release[] = [];

  const routes = {
    admin: () => import("@/app/api/admin-miniapps/route"),
    adminApp: () => import("@/app/api/admin-miniapps/[id]/route"),
    adminRelease: () => import("@/app/api/admin-miniapps/releases/[id]/route"),
    catalog: () => import("@/app/api/miniapps/route"),
    cdn: () => import("@/app/miniapps/[id]/[platform]/[file]/route"),
  };
  const params = <T extends Json>(value: T) => ({ params: Promise.resolve(value) });
  const read = async <T>(response: Response) => (await response.json()) as Envelope<T>;
  const auth = (token: string): Record<string, string> => (token ? { authorization: `Bearer ${token}` } : {});

  async function upload(token: string, form: FormData) {
    const { POST } = await routes.admin();
    return POST(new Request("http://localhost/api/admin-miniapps", { method: "POST", headers: auth(token), body: form }));
  }
  const zipForm = (files: { path: string; data: Buffer }[], notes = "") => {
    const form = new FormData();
    form.append("archive", new File([new Uint8Array(zip(files))], "dist.zip", { type: "application/zip" }));
    if (notes) form.append("notes", notes);
    return form;
  };
  const filesForm = (files: { path: string; data: Buffer }[]) => {
    const form = new FormData();
    for (const file of files) form.append("files", new File([new Uint8Array(file.data)], file.path));
    return form;
  };
  async function act(releaseId: string, body: Json, token = adminToken) {
    const { PATCH } = await routes.adminRelease();
    return PATCH(new Request(`http://localhost/api/admin-miniapps/releases/${releaseId}`, { method: "PATCH", headers: { ...auth(token), "content-type": "application/json" }, body: JSON.stringify(body) }), params({ id: releaseId }));
  }
  async function patchApp(body: Json) {
    const { PATCH } = await routes.adminApp();
    return PATCH(new Request(`http://localhost/api/admin-miniapps/${appId}`, { method: "PATCH", headers: { ...auth(adminToken), "content-type": "application/json" }, body: JSON.stringify(body) }), params({ id: appId }));
  }
  async function catalog(token: string, platform = "ios") {
    const { GET } = await routes.catalog();
    const body = await read<CatalogItem[]>(await GET(new Request(`http://localhost/api/miniapps?platform=${platform}`, { headers: auth(token) })));
    return body.data.find((item) => item.id === appId) ?? null;
  }
  async function cdn(platform: string, file: string, query = "") {
    const { GET } = await routes.cdn();
    return GET(new Request(`http://localhost/miniapps/${appId}/${platform}/${file}${query}`), params({ id: appId, platform, file }));
  }
  const release = (platform: string, version: string) => releases.find((row) => row.platform === platform && row.version === version)!;

  before(async () => {
    process.env.MINIAPP_ACCEPT_DEV_KEYS = "1";
    const { miniAppTrustedKeys } = await import("@/lib/miniapps/trusted-keys");
    miniAppTrustedKeys.push({ keyId: trusted.keyId, publicKey: trusted.publicKey, env: "dev", note: "registry-test" });

    const postgres = (await import("postgres")).default;
    sql = postgres(testUrl, { max: 1, onnotice: () => undefined });
    const { sessionService } = await import("@/lib/services/session-service");
    await sql`insert into languages (code, name, native_name) values ('zh-CN','Chinese','中文'), ('vi-VN','Vietnamese','Tiếng Việt') on conflict do nothing`;
    const digits = runId.replace(/\D/g, "").padEnd(7, "4").slice(0, 7);
    const [admin] = await sql`insert into users (nickname, phone) values ('Admin mini app', ${"+8481" + digits}) returning id`;
    const [customer] = await sql`insert into users (nickname, phone) values ('Khách', ${"+8482" + digits}) returning id`;
    const [partner] = await sql`insert into users (nickname, phone) values ('Đối tác', ${"+8483" + digits}) returning id`;
    const [guest] = await sql`insert into users (nickname, is_guest) values ('ZhaoXi Guest', true) returning id`;
    await sql`insert into user_roles (user_id, role, is_active) values (${admin.id}, 'admin', true), (${partner.id}, 'partner', true)`;
    customerId = customer.id;
    adminToken = (await sessionService.issue({ userId: admin.id, role: "admin" })).accessToken;
    customerToken = (await sessionService.issue({ userId: customer.id, role: "customer" })).accessToken;
    partnerToken = (await sessionService.issue({ userId: partner.id, role: "customer" })).accessToken;
    guestToken = (await sessionService.issue({ userId: guest.id, role: "customer" })).accessToken;
  });

  afterAll(async () => {
    await sql?.end();
  });

  it("keeps the server's trusted keys identical to the host's keys.ts", async () => {
    const { miniAppTrustedKeys } = await import("@/lib/miniapps/trusted-keys");
    const host = readFileSync(new URL("../../frontend/apps/customer-mobile/src/miniapps/keys.ts", import.meta.url), "utf8");
    const hostKeys = [...host.matchAll(/keyId: "([0-9a-f]{16})", publicKey: "([^"]+)", env: "(dev|prod)"/g)].map((m) => `${m[1]} ${m[2]} ${m[3]}`).sort();
    const serverKeys = miniAppTrustedKeys.filter((key) => key.note !== "registry-test").map((key) => `${key.keyId} ${key.publicKey} ${key.env}`).sort();
    assert.ok(hostKeys.length > 0);
    assert.deepEqual(serverKeys, hostKeys);
  });

  it("lets only admins upload", async () => {
    assert.equal((await upload(customerToken, zipForm(buildDist(appId, "1.0.0", trusted)))).status, 403);
    assert.equal((await upload("", zipForm(buildDist(appId, "1.0.0", trusted)))).status, 403);
  });

  it("rejects builds that fail the server-side verify", async () => {
    const untrusted = await read<never>(await upload(adminToken, zipForm(buildDist(appId, "1.0.0", stranger))));
    assert.equal(untrusted.error?.code, "SIGNING_KEY_UNTRUSTED");

    const tampered = buildDist(appId, "1.0.0", trusted);
    tampered[1].data = Buffer.from("globalThis.evil = true;");
    assert.equal((await read<never>(await upload(adminToken, zipForm(tampered)))).error?.code, "BUNDLE_HASH_MISMATCH");

    const escalated = buildDist(appId, "1.0.0", trusted, { platforms: ["ios"] });
    const manifest = JSON.parse(escalated[0].data.toString()) as Manifest;
    manifest.permissions = [...manifest.permissions, "auth.token"];
    escalated[0].data = Buffer.from(JSON.stringify(manifest));
    assert.equal((await read<never>(await upload(adminToken, zipForm(escalated)))).error?.code, "SIGNATURE_INVALID");

    const unsigned = buildDist(appId, "1.0.0", trusted, { platforms: ["ios"] });
    const bare = JSON.parse(unsigned[0].data.toString()) as Partial<Manifest>;
    delete bare.signature;
    unsigned[0].data = Buffer.from(JSON.stringify(bare));
    assert.equal((await read<never>(await upload(adminToken, zipForm(unsigned)))).error?.code, "MANIFEST_UNSIGNED");

    assert.equal((await read<never>(await upload(adminToken, zipForm([{ path: "README.md", data: Buffer.from("hi") }])))).error?.code, "UPLOAD_EMPTY");

    const [count] = await sql`select count(*)::int as n from miniapps where id = ${appId}`;
    assert.equal(count.n, 0, "a rejected upload must not register the app");
  });

  it("refuses dev-signed builds when the backend runs without MINIAPP_ACCEPT_DEV_KEYS", async () => {
    delete process.env.MINIAPP_ACCEPT_DEV_KEYS;
    try {
      assert.equal((await read<never>(await upload(adminToken, zipForm(buildDist(appId, "1.0.0", trusted))))).error?.code, "SIGNING_KEY_UNTRUSTED");
    } finally {
      process.env.MINIAPP_ACCEPT_DEV_KEYS = "1";
    }
  });

  it("stores a verified zip as draft releases and registers the app", async () => {
    const response = await upload(adminToken, zipForm(buildDist(appId, "1.0.0", trusted), "first build"));
    assert.equal(response.status, 201);
    const body = await read<{ createdApp: boolean; releases: Release[] }>(response);
    assert.equal(body.data.createdApp, true);
    assert.deepEqual(body.data.releases.map((r) => [r.platform, r.version, r.status]), [["android", "1.0.0", "draft"], ["ios", "1.0.0", "draft"]]);
    releases.push(...body.data.releases);

    const again = await read<{ releases: Release[] }>(await upload(adminToken, zipForm(buildDist(appId, "1.0.0", trusted))));
    assert.ok(again.data.releases.every((r) => r.duplicate), "re-uploading the same build is a no-op");
    const clash = await upload(adminToken, zipForm(buildDist(appId, "1.0.0", trusted, { code: "/* other */ (function(){})" })));
    assert.equal(clash.status, 409);
    assert.equal((await read<never>(clash)).error?.code, "RELEASE_VERSION_EXISTS");
    const otherKey = makeKey();
    const { miniAppTrustedKeys } = await import("@/lib/miniapps/trusted-keys");
    miniAppTrustedKeys.push({ keyId: otherKey.keyId, publicKey: otherKey.publicKey, env: "dev", note: "registry-test" });
    const resigned = await upload(adminToken, zipForm(buildDist(appId, "1.0.0", otherKey)));
    assert.equal(resigned.status, 409, "same bytes signed by another key is not a silent duplicate");
  });

  it("hides drafts from the host", async () => {
    assert.equal(await catalog(customerToken), null);
    assert.equal((await cdn("ios", "manifest.json")).status, 404);
    assert.equal((await cdn("ios", `${appId}-1.0.0.ios.js`)).status, 404);
  });

  it("publishes: catalogue → manifest → bundle, hash matches", async () => {
    assert.equal((await act(release("ios", "1.0.0").id, { action: "publish" }, customerToken)).status, 403);
    assert.equal((await act(release("ios", "1.0.0").id, { action: "rollback" })).status, 409);
    const published = await read<{ release: Release; stableVersion: string }>(await act(release("ios", "1.0.0").id, { action: "publish" }));
    assert.equal(published.data.release.status, "published");
    assert.equal(published.data.stableVersion, "1.0.0");

    assert.equal((await catalog(customerToken))?.release.version, "1.0.0");
    assert.equal((await catalog("", "ios"))?.release.version, "1.0.0", "open apps are listed without a session");
    assert.equal(await catalog(customerToken, "android"), null, "android is still a draft");

    const manifestResponse = await cdn("ios", "manifest.json", "?v=1.0.0");
    assert.equal(manifestResponse.status, 200);
    assert.match(manifestResponse.headers.get("cache-control") || "", /s-maxage=30/);
    const manifest = (await manifestResponse.json()) as Manifest;
    assert.equal(manifest.version, "1.0.0");
    const bundleResponse = await cdn("ios", manifest.bundle);
    assert.equal(bundleResponse.status, 200);
    assert.match(bundleResponse.headers.get("cache-control") || "", /immutable/);
    const bytes = Buffer.from(await bundleResponse.arrayBuffer());
    assert.equal(createHash("sha256").update(bytes).digest("hex"), manifest.sha256);
    assert.equal((await cdn("ios", `${appId}-9.9.9.ios.js`)).status, 404);
    assert.equal((await cdn("ios", "../../etc/passwd")).status, 404);
  });

  it("rolls out a new version by percentage, per user and stable", async () => {
    const body = await read<{ releases: Release[] }>(await upload(adminToken, filesForm(buildDist(appId, "1.1.0", trusted, { platforms: ["ios"] }))));
    releases.push(...body.data.releases);
    const next = release("ios", "1.1.0");

    await act(next.id, { action: "publish", rolloutPercent: 0 });
    assert.equal((await catalog(customerToken))?.release.version, "1.0.0", "0 % keeps everyone on 1.0.0");
    assert.equal(((await (await cdn("ios", "manifest.json")).json()) as Manifest).version, "1.0.0");

    const { rolloutBucket } = await import("@/lib/services/miniapp-registry-service");
    const bucket = rolloutBucket(appId, customerId);
    await act(next.id, { action: "rollout", rolloutPercent: bucket + 1 });
    assert.equal((await catalog(customerToken))?.release.version, "1.1.0", "user inside the rollout gets 1.1.0");
    assert.equal((await catalog(""))?.release.version, "1.0.0", "no session: only full releases");
    if (bucket > 0) {
      await act(next.id, { action: "rollout", rolloutPercent: bucket });
      assert.equal((await catalog(customerToken))?.release.version, "1.0.0", "user just outside stays on 1.0.0");
    }
    assert.equal(((await (await cdn("ios", "manifest.json", "?v=1.1.0")).json()) as Manifest).version, "1.1.0", "the catalogue's version is served as asked");

    await act(next.id, { action: "rollout", rolloutPercent: 100 });
    assert.equal((await catalog(""))?.release.version, "1.1.0");
    assert.equal(((await (await cdn("ios", "manifest.json")).json()) as Manifest).version, "1.1.0");
    assert.equal((await act(next.id, { action: "rollout", rolloutPercent: 101 })).status, 422);
  });

  it("rolls back to the previous release, also for hosts holding an old catalogue", async () => {
    const next = release("ios", "1.1.0");
    const result = await read<{ release: Release; stableVersion: string }>(await act(next.id, { action: "rollback", reason: "crash on open" }));
    assert.equal(result.data.release.status, "rolled_back");
    assert.equal(result.data.stableVersion, "1.0.0");
    assert.equal((await catalog(customerToken))?.release.version, "1.0.0");
    assert.equal(((await (await cdn("ios", "manifest.json", "?v=1.1.0")).json()) as Manifest).version, "1.0.0");
    assert.equal((await cdn("ios", `${appId}-1.1.0.ios.js`)).status, 200, "in-flight downloads of the rolled-back bundle still finish");

    await act(next.id, { action: "publish", rolloutPercent: 100 });
    assert.equal((await catalog(customerToken))?.release.version, "1.1.0", "a rolled-back release can be published again");
    await act(next.id, { action: "rollback" });
  });

  it("limits the app to its audience", async () => {
    assert.equal((await patchApp({ audience: "partner", icon: "storefront-outline", tint: "#0b8f55", title: { "vi-VN": "Thử registry", "en-US": "Registry test" } })).status, 200);
    assert.equal(await catalog(customerToken), null);
    assert.equal(await catalog(guestToken), null);
    assert.equal(await catalog(""), null);
    const item = await catalog(partnerToken);
    assert.equal(item?.audience, "partner");
    assert.equal((item as unknown as { tint: string }).tint, "#0B8F55");

    await patchApp({ audience: "members" });
    assert.ok(await catalog(customerToken));
    assert.equal(await catalog(guestToken), null);
    assert.equal((await patchApp({ audience: "everyone" })).status, 422);
    assert.equal((await patchApp({ icon: "<script>" })).status, 422);
    await patchApp({ audience: null });
  });

  it("kill switch: a disabled app disappears and its URLs stop serving", async () => {
    await patchApp({ enabled: false });
    assert.equal(await catalog(customerToken), null);
    assert.equal((await cdn("ios", "manifest.json")).status, 404);
    assert.equal((await cdn("ios", `${appId}-1.0.0.ios.js`)).status, 404);
    await patchApp({ enabled: true });
    assert.equal((await cdn("ios", "manifest.json")).status, 200);
  });

  it("lists everything for the admin page and audits every action", async () => {
    const { GET } = await routes.admin();
    assert.equal((await GET(new Request("http://localhost/api/admin-miniapps", { headers: auth(customerToken) }))).status, 403);
    const list = await read<Array<{ id: string; live: Record<string, { stable: string | null }>; releases: Array<Release & { manifest: Manifest; bundleData?: unknown }> }>>(await GET(new Request("http://localhost/api/admin-miniapps", { headers: auth(adminToken) })));
    const app = list.data.find((row) => row.id === appId)!;
    assert.equal(app.live.ios.stable, "1.0.0");
    assert.equal(app.live.android.stable, null);
    assert.equal(app.releases.length, 3);
    assert.ok(app.releases.every((row) => row.manifest.signature && row.bundleData === undefined), "manifests included, bundle bytes never");

    const releaseIds = releases.map((row) => row.id);
    const rows = await sql`select action from operations_audit_logs where area = 'miniapp_registry' and (target_id = ${appId} or target_id = any(${releaseIds})) order by created_at`;
    const actions = rows.map((row) => row.action as string);
    for (const action of ["upload", "publish", "rollout", "rollback", "update", "disable", "enable"]) assert.ok(actions.includes(action), `audit has ${action}`);
    assert.equal(actions.filter((a) => a === "upload").length, 3);
  });
});
