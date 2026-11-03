import { MINIAPP_RUNTIME_VERSION, type MiniAppManifest, type MiniAppProps, type MiniAppSource } from "@zhaoxi/miniapp-sdk";
import { Directory, File, Paths } from "expo-file-system";
import type { ComponentType } from "react";
import { Platform } from "react-native";
import { APP_VERSION } from "../config";
import { manifestUrlFor, usesDevServer, type MiniAppEntry } from "./registry";
import { requireShared, SHARED_RUNTIME } from "./shared";
import { MiniAppIntegrityError, verifyBundleHash, verifyManifestSignature } from "./verify";

export type LoadStep = "manifest" | "download" | "verify" | "start";

export type LoadedMiniApp = {
  manifest: MiniAppManifest;
  source: MiniAppSource;
  signed: boolean;
  Component: ComponentType<MiniAppProps>;
};

export class MiniAppLoadError extends Error {
  constructor(message: string, readonly kind: "offline" | "invalid" | "integrity" | "runtime") {
    super(message);
    this.name = "MiniAppLoadError";
  }
}

const MANIFEST_TIMEOUT_MS = 6000;
const BUNDLE_TIMEOUT_MS = 30000;

// Mini app đã chạy giữ trong bộ nhớ theo id@version#hash, giống remote đã nạp của
// Module Federation: mở lại không phải eval lần nữa. Bản mới có khoá khác.
const evaluated = new Map<string, LoadedMiniApp>();

// ---------------------------------------------------------------------------
// Module system của bundle mini app (khớp chữ ký factory của Metro `__d`)
// ---------------------------------------------------------------------------
type Exports = Record<string, unknown> & { __esModule?: boolean; default?: unknown };
type Module = { id: number; exports: Exports };
type Require = ((id: number) => Exports) & { importDefault: (id: number) => unknown; importAll: (id: number) => Exports };
type Factory = (global: object, require: Require, importDefault: (id: number) => unknown, importAll: (id: number) => Exports, module: Module, exports: Exports, dependencyMap: number[]) => void;
type BundleRuntime = { define: (factory: Factory, id: number, dependencyMap: number[]) => void; shared: (name: string) => unknown; run: (id: number) => Exports };

function createModuleSystem(appId: string): BundleRuntime {
  const factories = new Map<number, { factory: Factory; deps: number[] }>();
  const modules = new Map<number, Module>();

  const require = ((id: number) => {
    const existing = modules.get(id);
    // Đang khởi tạo (vòng phụ thuộc) hoặc đã xong: trả exports hiện có như Metro.
    if (existing) return existing.exports;
    const definition = factories.get(id);
    if (!definition) throw new MiniAppLoadError(`[${appId}] thiếu module ${id} trong bundle`, "runtime");
    const module: Module = { id, exports: {} };
    modules.set(id, module);
    try {
      definition.factory(globalThis, require, importDefault, importAll, module, module.exports, definition.deps);
    } catch (error) {
      modules.delete(id);
      throw error;
    }
    return module.exports;
  }) as Require;

  function importDefault(id: number) {
    const exports = require(id);
    return exports && exports.__esModule ? exports.default : exports;
  }

  function importAll(id: number): Exports {
    const exports = require(id);
    if (exports && exports.__esModule) return exports;
    const all: Exports = {};
    if (exports) for (const key of Object.keys(exports)) all[key] = exports[key];
    all.default = exports;
    return all;
  }

  require.importDefault = importDefault;
  require.importAll = importAll;

  return {
    define: (factory, id, dependencyMap) => {
      factories.set(id, { factory, deps: dependencyMap });
    },
    shared: requireShared,
    run: require,
  };
}

function evaluateBundle(manifest: MiniAppManifest, code: string): ComponentType<MiniAppProps> {
  let factory: unknown;
  try {
    // Eval gián tiếp: bundle chạy ở global scope, không thấy biến cục bộ của host.
    factory = (0, globalThis.eval)(code);
  } catch (error) {
    throw new MiniAppLoadError(`Không biên dịch được ${manifest.id}: ${error instanceof Error ? error.message : String(error)}`, "runtime");
  }
  if (typeof factory !== "function") throw new MiniAppLoadError(`${manifest.id} không phải bundle mini app ZhaoXi`, "invalid");
  const exports = (factory as (runtime: BundleRuntime) => Exports)(createModuleSystem(manifest.id));
  const Component = (exports && exports.__esModule ? exports.default : exports) as unknown;
  if (typeof Component !== "function" && !(Component && typeof Component === "object")) {
    throw new MiniAppLoadError(`${manifest.id} chưa export default một React component`, "invalid");
  }
  return Component as ComponentType<MiniAppProps>;
}

// ---------------------------------------------------------------------------
// Tải manifest / bundle
// ---------------------------------------------------------------------------
async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "cache-control": "no-cache" } });
    if (!response.ok) throw new MiniAppLoadError(`HTTP ${response.status} khi tải ${url}`, response.status === 404 ? "invalid" : "offline");
    return response;
  } catch (error) {
    if (error instanceof MiniAppLoadError) throw error;
    throw new MiniAppLoadError(`Không kết nối được ${url}`, "offline");
  } finally {
    clearTimeout(timer);
  }
}

function compareVersions(a: string, b: string) {
  const pa = a.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const pb = b.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < 3; i += 1) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

function validateManifest(entry: MiniAppEntry, value: unknown, requireHash: boolean): MiniAppManifest {
  const manifest = value as MiniAppManifest | null;
  if (!manifest || typeof manifest !== "object") throw new MiniAppLoadError("Manifest rỗng", "invalid");
  if (manifest.schema !== 1) throw new MiniAppLoadError(`Manifest schema ${String(manifest.schema)} không hỗ trợ`, "invalid");
  if (manifest.id !== entry.id) throw new MiniAppLoadError(`Manifest của ${manifest.id}, không phải ${entry.id}`, "integrity");
  if (manifest.platform !== Platform.OS) throw new MiniAppLoadError(`Bundle build cho ${manifest.platform}`, "invalid");
  if (manifest.runtime !== MINIAPP_RUNTIME_VERSION || manifest.runtime !== SHARED_RUNTIME) {
    throw new MiniAppLoadError(`Mini app cần runtime ${manifest.runtime}, host đang có runtime ${MINIAPP_RUNTIME_VERSION}`, "invalid");
  }
  if (manifest.minHostVersion && compareVersions(APP_VERSION, manifest.minHostVersion) < 0) {
    throw new MiniAppLoadError(`Cần ZhaoXi ${manifest.minHostVersion} trở lên`, "invalid");
  }
  if (!Array.isArray(manifest.permissions) || typeof manifest.bundle !== "string" || (requireHash && !/^[0-9a-f]{64}$/i.test(manifest.sha256))) {
    throw new MiniAppLoadError("Manifest thiếu trường bắt buộc", "invalid");
  }
  return manifest;
}

// ---------------------------------------------------------------------------
// Bộ nhớ đệm trên đĩa: Documents/miniapps/<id>/{current.json, <version>-<hash8>.js}
// ---------------------------------------------------------------------------
function cacheDir(id: string) {
  return new Directory(Paths.document, "miniapps", id);
}

function bundleFileName(manifest: MiniAppManifest) {
  return `${manifest.version}-${manifest.sha256.slice(0, 8)}.js`;
}

async function readCached(entry: MiniAppEntry): Promise<{ manifest: MiniAppManifest; code: string } | null> {
  const dir = cacheDir(entry.id);
  const current = new File(dir, "current.json");
  if (!current.exists) return null;
  const manifest = validateManifest(entry, JSON.parse(await current.text()), true);
  const bundle = new File(dir, bundleFileName(manifest));
  if (!bundle.exists) return null;
  return { manifest, code: await bundle.text() };
}

function writeCache(manifest: MiniAppManifest, code: string) {
  try {
    const dir = cacheDir(manifest.id);
    dir.create({ intermediates: true, idempotent: true });
    const keep = bundleFileName(manifest);
    new File(dir, keep).write(code);
    new File(dir, "current.json").write(JSON.stringify(manifest));
    // Chỉ giữ bản đang dùng.
    for (const item of dir.list()) if (item instanceof File && item.name !== keep && item.name !== "current.json") item.delete();
  } catch (error) {
    console.warn("[miniapp] không ghi được cache", error);
  }
}

function start(manifest: MiniAppManifest, code: string, source: MiniAppSource, signed: boolean): LoadedMiniApp {
  const key = `${manifest.id}@${manifest.version}#${manifest.sha256 || source}`;
  const known = evaluated.get(key);
  if (known && source !== "dev") return { ...known, source };
  const loaded = { manifest, source, signed, Component: evaluateBundle(manifest, code) };
  if (source !== "dev") evaluated.set(key, loaded);
  return loaded;
}

async function loadFromDevServer(entry: MiniAppEntry, onStep: (step: LoadStep) => void): Promise<LoadedMiniApp> {
  const url = entry.devManifestUrl as string;
  onStep("manifest");
  const manifest = validateManifest(entry, await (await fetchWithTimeout(url, MANIFEST_TIMEOUT_MS)).json(), false);
  onStep("download");
  const code = await (await fetchWithTimeout(new URL(manifest.bundle, url).toString(), BUNDLE_TIMEOUT_MS * 4)).text();
  onStep("start");
  return start(manifest, code, "dev", false);
}

/**
 * Mạng trước (manifest nhỏ, có timeout), bộ nhớ đệm khi mất mạng. Mọi bundle, kể cả
 * bản trong cache, đều được kiểm lại chữ ký + hash ngay trước khi chạy.
 */
export async function loadMiniApp(entry: MiniAppEntry, onStep: (step: LoadStep) => void = () => undefined): Promise<LoadedMiniApp> {
  if (usesDevServer(entry)) return loadFromDevServer(entry, onStep);

  onStep("manifest");
  const manifestUrl = manifestUrlFor(entry);
  let remote: MiniAppManifest | null = null;
  let offline: unknown = null;
  try {
    remote = validateManifest(entry, await (await fetchWithTimeout(manifestUrl, MANIFEST_TIMEOUT_MS)).json(), true);
  } catch (error) {
    if (!(error instanceof MiniAppLoadError) || error.kind !== "offline") throw error;
    offline = error;
  }

  const cached = await readCached(entry).catch(() => null);
  if (!remote) {
    if (!cached) throw offline instanceof Error ? offline : new MiniAppLoadError("Không tải được mini app", "offline");
    onStep("verify");
    const { signed } = verifyManifestSignature(cached.manifest);
    verifyBundleHash(cached.manifest, cached.code);
    onStep("start");
    return start(cached.manifest, cached.code, "cache", signed);
  }

  // Kiểm chữ ký manifest trước khi tải bundle: không tốn băng thông cho bản giả.
  const { signed } = verifyManifestSignature(remote);
  if (cached && cached.manifest.sha256 === remote.sha256) {
    onStep("verify");
    verifyBundleHash(remote, cached.code);
    onStep("start");
    return start(remote, cached.code, "cache", signed);
  }

  onStep("download");
  const code = await (await fetchWithTimeout(new URL(remote.bundle, manifestUrl).toString(), BUNDLE_TIMEOUT_MS)).text();
  onStep("verify");
  verifyBundleHash(remote, code);
  writeCache(remote, code);
  onStep("start");
  return start(remote, code, "network", signed);
}

export { MiniAppIntegrityError };
