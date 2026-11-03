#!/usr/bin/env node
/**
 * zhaoxi-miniapp: build, ký, chạy dev server và phục vụ thử bundle mini app.
 *
 *   zhaoxi-miniapp start   [--port 8092]            Metro dev server (host __DEV__ nạp không cần chữ ký)
 *   zhaoxi-miniapp build   [--platform ios|android|all] [--dev]
 *   zhaoxi-miniapp serve   [--port 8093]            phục vụ dist/ như CDN cục bộ
 *   zhaoxi-miniapp keygen  [--out miniapp-signing.pem]
 *   zhaoxi-miniapp verify  <dist/<platform>/manifest.json> --public-key <base64>
 *
 * Khoá ký: biến môi trường ZHAOXI_MINIAPP_SIGNING_KEY (đường dẫn PEM) hoặc
 * `miniapp-signing.pem` ở thư mục mini app. Không bao giờ commit file khoá (.gitignore đã chặn *.pem).
 */
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";

const projectRoot = process.cwd();
const require = createRequire(import.meta.url);
const { createMiniAppMetroConfig, readMiniAppJson, shared } = require("./metro.cjs");

const [command, ...rest] = process.argv.slice(2);
const flags = parseFlags(rest);

function parseFlags(args) {
  const out = { _: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) { out._.push(arg); continue; }
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}

/** Bản sao của `manifestSigningPayload` trong src/types.ts; đổi một nơi phải đổi cả nơi kia. */
function manifestSigningPayload(manifest) {
  return ["zhaoxi-miniapp:v1", manifest.id, manifest.version, manifest.platform, String(manifest.runtime), manifest.sha256.toLowerCase(), [...manifest.permissions].sort().join(",")].join("\n");
}

function rawPublicKey(publicKey) {
  return Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url");
}

/** Mã khoá = 16 ký tự hex đầu của SHA-256(public key thô); host tra khoá tin cậy theo mã này. */
function keyIdOf(rawKey) {
  return createHash("sha256").update(rawKey).digest("hex").slice(0, 16);
}

function loadSigningKey() {
  const file = process.env.ZHAOXI_MINIAPP_SIGNING_KEY || path.join(projectRoot, "miniapp-signing.pem");
  if (!fs.existsSync(file)) return null;
  const privateKey = createPrivateKey(fs.readFileSync(file));
  if (privateKey.asymmetricKeyType !== "ed25519") throw new Error(`${file} không phải khoá Ed25519`);
  const raw = rawPublicKey(createPublicKey(privateKey));
  return { privateKey, keyId: keyIdOf(raw), file };
}

async function loadMetro() {
  const metro = require(require.resolve("metro", { paths: [projectRoot] }));
  return metro;
}

async function build() {
  const meta = readMiniAppJson(projectRoot);
  const platforms = flags.platform === "ios" || flags.platform === "android" ? [flags.platform] : ["ios", "android"];
  const dev = Boolean(flags.dev);
  const key = loadSigningKey();
  if (!key) console.warn("⚠️  Không thấy khoá ký: bundle sẽ KHÔNG có chữ ký. Host bản release sẽ từ chối nạp.");
  const Metro = await loadMetro();
  const config = createMiniAppMetroConfig(projectRoot);
  for (const platform of platforms) {
    const started = Date.now();
    const result = await Metro.runBuild(config, { entry: path.join(projectRoot, meta.entry), platform, dev, minify: !dev, sourceMap: false, customTransformOptions: { engine: "hermes" }, unstable_transformProfile: "hermes-stable" });
    const code = Buffer.from(result.code, "utf8");
    const sha256 = createHash("sha256").update(code).digest("hex");
    const bundleName = `${meta.id}-${meta.version}.${platform}.js`;
    const outDir = path.join(projectRoot, "dist", platform);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, bundleName), code);
    const manifest = {
      schema: 1,
      id: meta.id,
      name: meta.name,
      version: meta.version,
      runtime: shared.runtime,
      platform,
      bundle: bundleName,
      sha256,
      size: code.length,
      permissions: meta.permissions,
      ...(meta.minHostVersion ? { minHostVersion: meta.minHostVersion } : {}),
      builtAt: new Date().toISOString(),
    };
    if (key) {
      manifest.keyId = key.keyId;
      manifest.signature = sign(null, Buffer.from(manifestSigningPayload(manifest), "utf8"), key.privateKey).toString("base64");
    }
    fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`✅ ${platform}: dist/${platform}/${bundleName} (${(code.length / 1024).toFixed(1)} KB, sha256 ${sha256.slice(0, 12)}…, ${key ? `ký bởi ${key.keyId}` : "chưa ký"}, ${Date.now() - started} ms)`);
  }
}

async function start() {
  const meta = readMiniAppJson(projectRoot);
  const Metro = await loadMetro();
  const config = createMiniAppMetroConfig(projectRoot);
  const port = Number(flags.port || meta.devPort);
  config.server.port = port;
  await Metro.runServer(config, { host: "0.0.0.0", port });
  console.log(`🚀 ${meta.id} dev server: http://localhost:${port}/miniapp-manifest.json?platform=ios`);
  console.log("   Host (bản __DEV__) đọc manifest này khi registry có devManifestUrl trỏ tới đây.");
}

/** Giả lập CDN: `http://localhost:<port>/<id>/<platform>/manifest.json`, đúng bố cục host đọc. */
function serve() {
  const meta = readMiniAppJson(projectRoot);
  const root = path.join(projectRoot, "dist");
  const port = Number(flags.port || 8093);
  const prefix = `/${meta.id}/`;
  const types = { ".json": "application/json", ".js": "application/javascript" };
  http
    .createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname);
      if (!pathname.startsWith(prefix)) {
        res.writeHead(404).end("not found");
        return;
      }
      const file = path.join(root, path.normalize(pathname.slice(prefix.length - 1)).replace(/^(\.\.[/\\])+/, ""));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404).end("not found");
        return;
      }
      res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
      fs.createReadStream(file).pipe(res);
    })
    .listen(port, () => console.log(`📦 Phục vụ ${root} tại http://localhost:${port}${prefix}<ios|android>/manifest.json`));
}

function keygen() {
  const out = path.resolve(projectRoot, typeof flags.out === "string" ? flags.out : "miniapp-signing.pem");
  if (fs.existsSync(out) && !flags.force) throw new Error(`${out} đã tồn tại (thêm --force để ghi đè)`);
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  fs.writeFileSync(out, privateKey.export({ format: "pem", type: "pkcs8" }), { mode: 0o600 });
  const raw = rawPublicKey(publicKey);
  console.log(`🔑 Đã tạo khoá riêng: ${out} (KHÔNG commit, giữ trong kho bí mật / CI secret)`);
  console.log("   Thêm khoá công khai vào host: frontend/apps/customer-mobile/src/miniapps/keys.ts");
  console.log(`   { keyId: "${keyIdOf(raw)}", publicKey: "${raw.toString("base64")}", env: "dev" | "prod" }`);
}

function verifyCommand() {
  const manifestFile = flags._[0];
  if (!manifestFile || typeof flags["public-key"] !== "string") throw new Error("Dùng: zhaoxi-miniapp verify <manifest.json> --public-key <base64>");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const bundle = fs.readFileSync(path.join(path.dirname(manifestFile), manifest.bundle));
  const sha256 = createHash("sha256").update(bundle).digest("hex");
  if (sha256 !== manifest.sha256) throw new Error(`Hash bundle sai: ${sha256} ≠ ${manifest.sha256}`);
  const raw = Buffer.from(flags["public-key"], "base64");
  const publicKey = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: raw.toString("base64url") }, format: "jwk" });
  if (manifest.keyId !== keyIdOf(raw)) throw new Error(`keyId ${manifest.keyId} không khớp khoá đưa vào (${keyIdOf(raw)})`);
  const ok = verify(null, Buffer.from(manifestSigningPayload(manifest), "utf8"), publicKey, Buffer.from(manifest.signature || "", "base64"));
  if (!ok) throw new Error("Chữ ký không hợp lệ");
  console.log(`✅ ${manifest.id}@${manifest.version} (${manifest.platform}): hash và chữ ký hợp lệ`);
}

const commands = { build, start, serve, keygen, verify: verifyCommand };
const run = commands[command];
if (!run) {
  console.log("Dùng: zhaoxi-miniapp <start|build|serve|keygen|verify>");
  process.exit(command ? 1 : 0);
}
Promise.resolve()
  .then(run)
  .catch((error) => {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
