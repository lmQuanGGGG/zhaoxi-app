/**
 * Metro config cho mini app ZhaoXi.
 *
 * Mini app build bằng chính Metro + babel-preset-expo của host, nhưng:
 *  1. Mọi import tới shared module (`shared-modules.json`) được thay bằng stub
 *     `module.exports = __zxShared("<tên>")`: lúc chạy, host đưa instance của nó
 *     vào (react, react-native, expo-*… là singleton, không bundle lại).
 *  2. File `x.miniapp.ts(x)` được ưu tiên hơn `x.ts(x)` khi build mini app: một mã nguồn
 *     dùng chung với app độc lập (như cờ `STANDALONE` bên VSP) chỉ thay đúng phần khác nhau
 *     (ảnh nhúng, thư viện nặng tải từ CDN…).
 *  3. Serializer riêng: bỏ polyfill/InitializeCore, bọc toàn bộ module vào
 *     `(function (__zx) { ... return __zx.run(entryId); })` để module ID của mini app
 *     không đụng registry `__d/__r` của host.
 */
const fs = require("node:fs");
const path = require("node:path");
const shared = require("../shared-modules.json");

const ID_PATTERN = /^[a-z][a-z0-9_.-]{2,63}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const PERMISSIONS = ["user.profile", "api.zhaoxi", "auth.token", "navigation.host", "auth.handoff"];
const DEFAULT_DEV_PORT = 8092;

function readMiniAppJson(projectRoot) {
  const file = path.join(projectRoot, "miniapp.json");
  if (!fs.existsSync(file)) throw new Error(`Thiếu ${file}`);
  const meta = JSON.parse(fs.readFileSync(file, "utf8"));
  const problems = [];
  if (!ID_PATTERN.test(meta.id || "")) problems.push(`id "${meta.id}" phải khớp ${ID_PATTERN}`);
  if (!meta.name || typeof meta.name !== "string") problems.push("thiếu name");
  if (!VERSION_PATTERN.test(meta.version || "")) problems.push(`version "${meta.version}" phải dạng semver (1.2.3)`);
  if (!meta.entry || !fs.existsSync(path.join(projectRoot, meta.entry))) problems.push(`entry "${meta.entry}" không tồn tại`);
  const permissions = meta.permissions || [];
  for (const permission of permissions) if (!PERMISSIONS.includes(permission)) problems.push(`quyền không hợp lệ: ${permission}`);
  if (problems.length) throw new Error(`miniapp.json không hợp lệ:\n- ${problems.join("\n- ")}`);
  return { ...meta, permissions: [...new Set(permissions)].sort(), devPort: meta.devPort || DEFAULT_DEV_PORT };
}

function packageRoot(moduleName) {
  const parts = moduleName.split("/");
  return moduleName.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function stubFileName(moduleName) {
  return `${moduleName.replace(/^@/, "").replace(/[^a-zA-Z0-9.-]+/g, "__")}.js`;
}

/** Ghi stub cho từng shared module (chỉ ghi khi nội dung đổi, để Metro không rebuild vô ích). */
function writeSharedStubs(stubDir) {
  fs.mkdirSync(stubDir, { recursive: true });
  const files = new Map();
  for (const name of shared.modules) {
    const file = path.join(stubDir, stubFileName(name));
    const body = `// Sinh tự động bởi @zhaoxi/miniapp-sdk: lấy "${name}" từ host lúc chạy.\nmodule.exports = __zxShared(${JSON.stringify(name)});\n`;
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== body) fs.writeFileSync(file, body);
    files.set(name, file);
  }
  return files;
}

function createMiniAppSerializer(projectRoot, meta) {
  const baseJSBundle = require(require.resolve("metro/private/DeltaBundler/Serializers/baseJSBundle", { paths: [projectRoot] })).default;
  return async (entryPoint, _preModules, graph, options) => {
    // Không chạy polyfill / InitializeCore: host đã có môi trường RN đầy đủ.
    const bundle = baseJSBundle(entryPoint, [], graph, { ...options, runModule: false, runBeforeMainModule: [], inlineSourceMap: false, sourceMapUrl: undefined });
    const entryId = options.createModuleId(entryPoint);
    const modules = bundle.modules.map(([, code]) => code).join("\n");
    const code = [
      `/* zhaoxi-miniapp ${meta.id}@${meta.version} runtime=${shared.runtime} */`,
      "(function (__zx) {",
      // Biến cục bộ: module code gọi `__d(...)`, `__zxShared(...)` và (bản dev) `$RefreshReg$` sẽ trỏ vào đây.
      "var __d = __zx.define, __zxShared = __zx.shared, $RefreshReg$ = function () {}, $RefreshSig$ = function () { return function (type) { return type; }; };",
      modules,
      `return __zx.run(${entryId});`,
      "})",
    ].join("\n");
    // Chưa phát hành source map (v1): trả map rỗng để Metro không tự dựng map từ polyfill đã bỏ.
    return { code, map: JSON.stringify({ version: 3, sources: [], names: [], mappings: "" }) };
  };
}

function devManifestMiddleware(meta) {
  return (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname !== "/miniapp-manifest.json") return next();
    const platform = url.searchParams.get("platform") === "android" ? "android" : "ios";
    const entry = meta.entry.replace(/^\.\//, "").replace(/\.[jt]sx?$/, "");
    const relativeEntry = path.relative(meta.serverRoot, path.join(meta.projectRoot, entry)).split(path.sep).join("/");
    const body = {
      schema: 1,
      id: meta.id,
      name: meta.name,
      version: meta.version,
      runtime: shared.runtime,
      platform,
      bundle: `/${relativeEntry}.bundle?platform=${platform}&dev=true&minify=false&transform.engine=hermes&unstable_transformProfile=hermes-stable`,
      sha256: "",
      size: 0,
      permissions: meta.permissions,
      builtAt: new Date().toISOString(),
    };
    res.setHeader("content-type", "application/json");
    res.setHeader("cache-control", "no-store");
    res.end(JSON.stringify(body));
  };
}

/**
 * Dùng trong `metro.config.js` của mini app:
 *   module.exports = require("@zhaoxi/miniapp-sdk/metro").createMiniAppMetroConfig(__dirname);
 */
function createMiniAppMetroConfig(projectRoot) {
  const meta = readMiniAppJson(projectRoot);
  const { getDefaultConfig } = require(require.resolve("expo/metro-config", { paths: [projectRoot] }));
  const config = getDefaultConfig(projectRoot);
  const serverRoot = config.server.unstable_serverRoot || projectRoot;
  const stubs = writeSharedStubs(path.join(projectRoot, ".zhaoxi", "shared"));
  const sharedRoots = new Set(shared.modules.map(packageRoot));
  const upstream = config.resolver.resolveRequest;
  // Metro thử lần lượt từng đuôi: `a.miniapp.tsx` đứng trước `a.tsx` nên thắng khi cả hai cùng có.
  const overridable = ["tsx", "ts", "jsx", "js"].filter((ext) => config.resolver.sourceExts.includes(ext));
  config.resolver.sourceExts = [...overridable.map((ext) => `miniapp.${ext}`), ...config.resolver.sourceExts];

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const stub = stubs.get(moduleName);
    if (stub) return { type: "sourceFile", filePath: stub };
    const root = packageRoot(moduleName);
    if (shared.forbidden[moduleName] || (root === "expo-router")) throw new Error(`[miniapp] ${shared.forbidden[moduleName] || shared.forbidden["expo-router"]} (import "${moduleName}" trong ${context.originModulePath})`);
    if (sharedRoots.has(root) && !moduleName.startsWith(".")) {
      throw new Error(`[miniapp] "${moduleName}" là đường dẫn con của shared module "${root}" nhưng chưa có trong shared-modules.json (import trong ${context.originModulePath}). Import từ "${root}" hoặc thêm vào danh sách shared của host.`);
    }
    const resolved = upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
    if (resolved.type === "assetFiles") {
      throw new Error(`[miniapp] Runtime v${shared.runtime} chưa hỗ trợ asset cục bộ (${moduleName}). Dùng ảnh qua URL CDN hoặc base64.`);
    }
    return resolved;
  };
  config.serializer.customSerializer = createMiniAppSerializer(projectRoot, meta);
  config.serializer.getModulesRunBeforeMainModule = () => [];
  config.serializer.getPolyfills = () => [];
  config.server.port = meta.devPort;
  const enhance = config.server.enhanceMiddleware;
  const manifest = devManifestMiddleware({ ...meta, projectRoot, serverRoot });
  config.server.enhanceMiddleware = (middleware, server) => {
    const inner = enhance ? enhance(middleware, server) : middleware;
    return (req, res, next) => manifest(req, res, () => inner(req, res, next));
  };
  return config;
}

module.exports = { createMiniAppMetroConfig, readMiniAppJson, shared };
