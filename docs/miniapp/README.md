# ZhaoXi Mini App: thiết kế host runtime

Tài liệu này mô tả cách app khách native ZhaoXi (`frontend/apps/customer-mobile`) trở thành **host** nạp và mở **mini app**, dựa trên cơ chế của hai dự án VSP (`VSP Host App`, `Pre_Checkin_VSP`), nhưng chỉnh lại cho Expo SDK 57 + Metro.

- Template mini app: [`frontend/apps/miniapp_zhaoxi_example`](../../frontend/apps/miniapp_zhaoxi_example/README.md)
- SDK + công cụ build/ký: [`frontend/packages/miniapp-sdk`](../../frontend/packages/miniapp-sdk)
- Runtime trong host: [`frontend/apps/customer-mobile/src/miniapps`](../../frontend/apps/customer-mobile/src/miniapps), màn chứa [`app/miniapp/[id].tsx`](../../frontend/apps/customer-mobile/app/miniapp/[id].tsx), danh sách [`app/miniapps.tsx`](../../frontend/apps/customer-mobile/app/miniapps.tsx)

## 1. Tóm tắt quyết định

| Câu hỏi | Kết luận |
| --- | --- |
| Đổi host sang Re.Pack/rspack như VSP? | **Chưa.** Re.Pack 5.4.2 (bản public mới nhất) chưa hỗ trợ Expo Router chính thức; gói `@callstack/repack-expo` (merge 09/10/2026, có thử với Expo 57.0.26 / RN 0.86.3) vẫn **private, chưa phát hành**. Đổi bundler bây giờ nghĩa là bỏ Metro + expo-router của host. |
| Dùng `@module-federation/metro`? | **Chưa.** Bản 2.9.3 khai `metro ^0.82.1`, host đang chạy metro **0.84.5**; README còn ghi "experimental". |
| Vậy làm gì? | **ZhaoXi Mini App Runtime v1** trên Metro: mini app build bằng chính Metro + `babel-preset-expo`, shared module lấy từ host lúc chạy, bundle bọc trong module system riêng, manifest ký Ed25519, cache trên đĩa. Không đổi bundler, không thêm package native (chỉ thêm `@noble/curves`, `@noble/hashes`: JS thuần). |
| Giữ đường lui sang Module Federation? | Có. Hợp đồng mini app giống `./App` expose của VSP: **default export một React component nhận props**. Khi `@callstack/repack-expo` phát hành và ổn định, chỉ cần thay tầng build/loader; code mini app không đổi. |

## 2. Cơ chế của VSP (đọc từ mã nguồn, không sửa)

### 2.1 Bundler và Module Federation

| | VSP Host App | Pre_Checkin_VSP (mini app) |
| --- | --- | --- |
| RN / React | RN 0.77, React 18.3.1 | RN 0.84.1, React 19.2.3 |
| Bundler | **Re.Pack 4.4.1 + webpack 5** (`webpack.config.mjs`), không dùng Metro | **Re.Pack 5.2.4 + Rspack 1.7** (`rspack.config.mjs`) |
| Federation | `Repack.plugins.ModuleFederationPlugin({ name: 'host', shared: getSharedDependencies({ eager: true }) })` (MF v1) | `ModuleFederationPluginV2({ name: REMOTE_NAME, filename: '<remote>.container.bundle', exposes: { './App': EXPOSE_ENTRY } })` (MF v2, `@module-federation/enhanced` 2.0.1) |
| Shared | `@super-app/dependencies` → `getSharedDependencies()`: react, react-native, `react-native/`, redux, navigation, i18next, `@super-app/*`… tất cả `singleton: true, requiredVersion: false`; host `eager: true` | cùng danh sách, `eager: STANDALONE`, `import: false` khi federated (không bundle lại, bắt buộc lấy của host); thêm `react/jsx-runtime` |
| Danh sách shared phía host | `src/shared-dependencies/index.ts` import tất cả thư viện mà **chỉ** mini app dùng, nếu không mini app không resolve được | thêm thư viện native ở mini app thì **phải cài vào host** |
| Tách chunk | `chunkFilename: '[name].chunk.bundle'` | `[name].<remote>.chunk.bundle`, `uniqueName: REMOTE_NAME` để 2 mini app không dùng chung `webpackChunk*` |

### 2.2 Resolve URL, registry, cache

- **Registry**: `miniAppService.fetchRuntime()` gọi `GET {superAppUrl}/api/miniapps/config/runtime` → `containers[]` (`name`, `version`, `miniAppId`, `imgUrl`, `fullName*`, `clientId`, `web`, `webURL`…). `MainNavigator` đăng ký một màn cho mỗi container; mở bằng `navigation.navigate('<container name>')`.
- **Resolver** (`index.ts`, `ScriptManager.shared.addResolver`):
  1. `__DEV__` + `caller === 'main'` → dev server của host.
  2. `__DEV__` + cờ `miniAppService.getDebugConfig()[name]` bật → `Federated.createURLResolver({ containers })` với URL `config/config.json` (localhost 8082–8089), `verifyScriptSignature: 'off'`.
  3. Còn lại → `bundleManager.loadEncryptedBundle()` → `{ url: <file đã giải mã>, absolute: true, cache: true, verifyScriptSignature: 'strict' }`.
- **Tải / cache**: `BundleManager` xin **signed URL** (`/api/miniapps/bundles/signed-url?miniappId&version&platform`), tải zip, giải nén, **mã hoá AES-256** từng file (`react-native-aes-crypto`, khoá sinh ngẫu nhiên lưu Storage) vào `.miniapps/` (Library trên iOS), lưu `BundleMetadata` (version) và `shouldRedownloadBundle()` so version. Lúc nạp thì giải mã ra thư mục cache. Bundle lấy từ **MinIO** (`10.14.117.3:9000` ở LAN; `ddc.fis.vn/minio/...` ở dev).
- **Đổi version**: xoá bundle cũ + cache đã giải mã. Module Federation giữ remote trong bộ nhớ, nên phải tắt hẳn host mới chạy bản mới.

### 2.3 Code signing

- `Repack.plugins.CodeSigningPlugin({ enabled: fs.existsSync('code-signing.pem'), privateKeyPath: './code-signing.pem' })` ký **từng chunk**: nối `/* RCSSB */` + JWT (RS256) chứa `hash` = SHA-256 của nội dung chunk.
- Host giữ public key ở `Info.plist` / `strings.xml` (`RepackPublicKey`). `patches/@callstack+repack+4.4.1.patch` sửa `ScriptManager.mm` / `FileSystemScriptLoader.kt` để file **cục bộ** (đã giải mã) cũng được tách + kiểm chữ ký (`verifyScriptSignature: 'strict'`).
- `scripts/check-miniapp-package.py` kiểm gói upload: có container + `__federation_expose_App.<remote>.chunk.bundle`, mọi `.bundle` đều có `/* RCSSB */`, hash trong JWT khớp nội dung, đã minify.
- Khoá riêng **không commit** (README Pre_Checkin ghi rõ, `.gitignore`).

### 2.4 Context host → mini app

- Props chính thức chỉ có `MiniAppProps = { registerReducer }` (gắn reducer vào store host qua `reducerManager`, phát `redux_initialized` trên `eventBusService`).
- Còn lại đi qua **singleton shared**: token từ `UserService.getIdToken()` (`@super-app/service`), ngôn ngữ từ `i18next` của host (`languageChanged`), event bus, Storage.
- Đóng mini app: Pre_Checkin dùng `onClose` prop nếu có, nếu không lấy `NavigationContext` của host và `goBack()` (mini app render **bên trong navigator của host**, không tự có `NavigationContainer` khi federated).
- Theme: `@super-app/ui` `ThemeProvider` dùng chung.

### 2.5 Màn chứa

`src/navigation/MiniApp.tsx`: `React.lazy(() => Federated.importModule(appName, './App'))` trong `MiniAppErrorBoundary` (thông báo "Không thể tải ứng dụng" khi lỗi ScriptManager, nút "Quay lại") + `Suspense` với `LoadingBlockerView`. `App.tsx` còn cài `ErrorUtils` nuốt lỗi ScriptManager.

### 2.6 Build và phát hành

`scripts/pack-miniapp.sh`: `STANDALONE=false … react-native bundle --entry-file index.remote.ts --dev false --minify true` cho iOS và Android → bỏ `index.bundle` standalone → zip `build/outputs/{ios,android}/remotes` → chạy `check-miniapp-package.py` → upload **một** file `<remote>_build_outputs.zip` lên admin-portal → portal đẩy lên MinIO, cập nhật runtime config.

### 2.7 `docs/` của VSP

`VSP Host App/docs` chỉ có `apple-app-site-association.json` và `assetlinks.json` (deep link). `Pre_Checkin_VSP/docs` là tài liệu nghiệp vụ ACTS (route API, đối chiếu handoff, QA), không có phần kiến trúc mini app; phần đó nằm ở README hai repo và `CLAUDE.md` của host.

## 3. Đánh giá chuyển ZhaoXi sang Re.Pack

Bằng chứng (04/11/2026):

1. **Host hiện tại**: Expo SDK 57.0.24, RN 0.86.3, `expo-router` ~57.0.22 (file-based routing, cần `require.context` của Metro), metro 0.84.5, Hermes, prebuilt RN, CNG (`ios/` sinh bởi `expo prebuild`).
2. **Re.Pack**: `npm view @callstack/repack` → latest **5.4.2**, peer `react-native >=0.74`. Hướng dẫn chính thức chỉ có "Expo Modules" (`@callstack/repack-plugin-expo-modules`, tự định nghĩa global cho Expo Modules, README ghi "không đủ cho một setup hoàn chỉnh") và bảo bỏ qua Expo CLI. Không có hướng dẫn Expo Router. Issue [callstack/repack#1413](https://github.com/callstack/repack/issues/1413) (Expo support) đóng bởi PR [#1425](https://github.com/callstack/repack/pull/1425) ngày 09/10/2026: thêm `@callstack/repack-expo` (config plugin, Rspack `ExpoPlugin`, có Expo Router), thử với Expo 57.0.26 / RN 0.86.3, **nhưng package để private**, chưa phát hành; standalone Release build của remote còn lỗi.
3. **Module Federation cho Metro**: `@module-federation/metro` 2.9.3, peer `metro ^0.82.1`, `react-native >=0.79`. Với metro 0.84.5 thì ngoài phạm vi peer; README thượng nguồn là stub, dự án tự ghi "experimental".

Ba phương án đã cân nhắc:

| Phương án | Ưu | Nhược |
| --- | --- | --- |
| A. Re.Pack + Rspack cho host (như VSP) | Đúng giao thức MF của VSP, code splitting, ký chunk sẵn | Thay Metro + Expo CLI; expo-router chỉ chạy qua gói **chưa phát hành**; EAS Update/expo-dev-client không còn dùng như cũ; rủi ro cao cho app đang phát triển nhanh |
| B. `@module-federation/metro` | Giữ Metro, giao thức MF 2.0 | Peer metro lệch (0.82 vs 0.84), experimental, cần vá Metro/RN; khó debug |
| **C. Runtime riêng trên Metro (chọn)** | Không đổi bundler, không package native; dùng đúng toolchain host; mini app nhỏ (mẫu 9 KB); kiểm soát hoàn toàn chữ ký/cache/quyền | Tự bảo trì (SDK + công cụ + runtime host ≈1 400 dòng kể cả UI); chưa có code splitting, asset cục bộ, source map cho bundle mini app (xem §6) |

## 4. Kiến trúc ZhaoXi Mini App Runtime v1

```
 mini app (apps/miniapp_*)                         CDN                         host (customer-mobile)
 ───────────────────────────                 ────────────────            ───────────────────────────────────
 miniapp.json  src/App.tsx                    <id>/ios/manifest.json  ──▶  registry.ts  (danh mục + URL)
      │ zhaoxi-miniapp build                  <id>/ios/<id>-<ver>.ios.js     │
      ▼                                                ▲                      ▼ loader.ts
 Metro + babel-preset-expo                             │ upload               1. fetch manifest (6 s)
   resolver: shared → stub __zxShared("react")         │                      2. kiểm runtime, minHostVersion, id, platform
   serializer: (function (__zx) { __d(...) …           │                      3. kiểm chữ ký Ed25519 (keys.ts)
                return __zx.run(entry) })              │                      4. cache khớp hash? dùng : tải bundle
      │ ký Ed25519 (miniapp-signing.pem)               │                      5. SHA-256 bundle == manifest
      ▼                                                │                      6. lưu Documents/miniapps/<id>/
 dist/<platform>/manifest.json + bundle ───────────────┘                      7. eval → module system riêng → default export
                                                                              ▼
                                                               app/miniapp/[id].tsx: loading → ErrorBoundary
                                                               → <MiniApp context bridge/> + nút kính "••• ×"
```

### 4.1 Định dạng bundle

Metro build bình thường (cùng `getDefaultConfig` của Expo, Hermes transform profile), rồi `tools/metro.cjs` thay:

- **Resolver**: import tới tên trong [`shared-modules.json`](../../frontend/packages/miniapp-sdk/shared-modules.json) → stub `module.exports = __zxShared("<tên>")`. Import `expo`, `expo-router` hoặc đường dẫn con của gói shared chưa khai báo → **lỗi build** có hướng dẫn. Asset cục bộ (`require('./a.png')`) → lỗi build (v1 chưa hỗ trợ).
- **Serializer**: bỏ polyfill, InitializeCore, `__r`; xuất

  ```js
  /* zhaoxi-miniapp zhaoxi.example@1.0.0 runtime=1 */
  (function (__zx) {
  var __d = __zx.define, __zxShared = __zx.shared, $RefreshReg$ = …, $RefreshSig$ = …;
  __d(function (g, r, i, a, m, e, d) { … }, 0, [1, 2, 3, 4, 5]);
  …
  return __zx.run(0);
  })
  ```

  Module ID và `__d` là cục bộ trong hàm, nên không bao giờ va với registry `__d/__r` của host (vấn đề mà VSP giải bằng `uniqueName`).

Host nạp bằng `(0, globalThis.eval)(code)` (Hermes biên dịch source lúc chạy), gọi hàm với `{ define, shared, run }` (`loader.ts`, `createModuleSystem` theo đúng chữ ký factory `__d` của Metro: `require`, `importDefault`, `importAll`, vòng phụ thuộc trả exports dở dang như Metro).

### 4.2 Shared module (singleton)

Một nguồn sự thật: `packages/miniapp-sdk/shared-modules.json` (runtime 1, 33 mục: react, react-native, `react/jsx-runtime`, `@zhaoxi/miniapp-sdk`, safe-area, gesture-handler, reanimated, worklets, svg, screens, webview, async-storage, `@expo/vector-icons`, expo-modules-core và các `expo-*` host đã cài). Host khai **đúng danh sách đó** trong `src/miniapps/shared.ts` bằng `require` tĩnh, nạp lười (chỉ khi mini app cần); bản `__DEV__` cảnh báo nếu hai bên lệch.

Quy tắc như VSP: **thư viện native mini app dùng phải có trong host** (và trong danh sách shared). Thư viện JS thuần không có trong danh sách thì được bundle vào mini app.

Đổi danh sách theo kiểu không tương thích (bỏ mục, đổi major của gói native) → tăng `MINIAPP_RUNTIME_VERSION` (SDK) và `runtime` (JSON); host từ chối bundle khác runtime.

### 4.3 Manifest, chữ ký, quyền

`dist/<platform>/manifest.json`:

```json
{
  "schema": 1, "id": "zhaoxi.example", "name": "ZhaoXi Example", "version": "1.0.0",
  "runtime": 1, "platform": "ios", "bundle": "zhaoxi.example-1.0.0.ios.js",
  "sha256": "<hex>", "size": 9379, "permissions": ["api.zhaoxi", "navigation.host", "user.profile"],
  "builtAt": "…", "keyId": "588b24b78faa74ad", "signature": "<base64 Ed25519>"
}
```

- Chuỗi ký: `zhaoxi-miniapp:v1\n<id>\n<version>\n<platform>\n<runtime>\n<sha256>\n<permissions đã sort>` (`manifestSigningPayload` trong SDK; bản sao trong `tools/cli.mjs`). Quyền nằm trong phần ký nên CDN không nâng quyền được.
- **Ed25519** thay cho RS256/JWT của Re.Pack: chữ ký 64 byte, khoá 32 byte, kiểm bằng `@noble/curves` (JS thuần, đã audit) nên không cần native. Ký một lần trên manifest (bao hash bundle) thay vì từng chunk.
- `keyId` = 16 hex đầu của SHA-256(public key). Host tin các khoá trong `src/miniapps/keys.ts`: `env: "prod"` cho mọi bản; `env: "dev"` chỉ ở `__DEV__`. Bản release **bắt buộc** có chữ ký khoá prod; bản dev chấp nhận bundle chưa ký (cảnh báo).
- Quyền (`miniapp.json` → manifest): `user.profile`, `api.zhaoxi`, `auth.token`, `navigation.host`, `auth.handoff` (§7.2), `notifications.push` (§11). Bridge kiểm từng lời gọi (`MiniAppPermissionError`). Quyền mới phải thêm ở 3 nơi: SDK `types.ts`, `tools/metro.cjs`, backend `lib/miniapps/manifest.ts` (backend từ chối upload bản có quyền lạ).

So với VSP, ZhaoXi **không mã hoá bundle khi lưu**: sandbox iOS + Data Protection đã che file khỏi app khác, và bundle được kiểm lại hash + chữ ký **mỗi lần nạp** (kể cả từ cache), nên sửa file trên máy cũng không chạy được. Mã hoá AES của VSP với khoá lưu cạnh dữ liệu chỉ làm khó việc đọc mã, không thêm toàn vẹn.

### 4.4 Tải, phiên bản, cache

- URL: `${EXPO_PUBLIC_MINIAPP_CDN_URL}/<id>/<ios|android>/manifest.json[?v=<version>]`. Mặc định dev: `http://localhost:8093` (`zhaoxi-miniapp serve`); release: `${API_URL}/miniapps`, do backend registry phát (§10). `?v=` là bản danh mục backend chọn cho người dùng (rollout %); thiếu `?v=` thì nhận bản ổn định.
- Luôn hỏi manifest trước (timeout 6 s). Hash trùng bản cache → dùng cache (không tải lại). Khác → tải, kiểm, ghi `Documents/miniapps/<id>/<version>-<hash8>.js` + `current.json`, xoá bản cũ. Mất mạng → chạy bản cache sau khi kiểm lại chữ ký + hash.
- Bộ nhớ: bundle đã eval giữ theo `id@version#hash`; mở lại không eval lại. Bản mới (hash khác) chạy ngay lần mở kế tiếp, **không cần tắt host** (khác VSP).
- Rollback = bấm "Rollback" ở web admin: manifest quay về bản phát hành trước (bản cũ vẫn còn vì tên file có version), tối đa ~30 s cache CDN (§10.4).

### 4.5 Context, bridge, điều hướng

Host render `default export` của mini app với `MiniAppProps = { context, bridge }` và bọc `MiniAppProvider` (mini app gọi được `useMiniApp()`).

- `context`: `app` (id, name, version, source `dev|network|cache`), `host` (appVersion, runtime, platform, **apiUrl**), `locale` (vi-VN / zh-CN / zh-TW / en-US, đổi ngôn ngữ ở host thì mini app render lại), `user` (chỉ khi có `user.profile`), `theme` (màu, bo góc của host), `capsule` (khung nút kính để mini app chừa chỗ), `launch` (query param của `zhaoxi://miniapp/<id>?…`).
- `bridge`: `close()`, `toast()`, `haptic()`, `openUrl()` (http/https/tel/mailto/sms), `openHostRoute('/coupons')` (`navigation.host`, đi qua `routeForWebHref` của host), `requestLogin()`, `request('/api/…')` (`api.zhaoxi`: gọi backend bằng phiên host, có refresh 401, mini app **không thấy token**; chỉ nhận đường dẫn `/api/…`), `getAccessToken()` (`auth.token`, chỉ cho mini app nội bộ).
- Mini app **không** dùng expo-router (host chỉ có một cây route). Nhiều màn: state nội bộ, hoặc `@react-navigation/native-stack` trong `NavigationIndependentTree` (react-native-screens là shared).

### 4.6 Màn chứa

`app/miniapp/[id].tsx` (đăng ký trong `_layout.tsx`: `presentation: "card"` trượt từ dưới lên, tắt vuốt đóng. Không dùng `fullScreenModal`: native modal che mất `ToastHost` của host và các màn host mở từ mini app):

- **Nút kính "••• | ×"** góc phải trên (`GlassFill`, kiểu capsule WeChat/Zalo), luôn nằm trên mini app. "•••" mở menu: phiên bản, nguồn (dev/vừa tải/bản lưu), Tải lại, Đóng.
- **Chờ tải**: nền petrol `#00323A` tan sang trắng, card không viền bóng mềm, icon app, bước (kiểm phiên bản → tải → xác minh chữ ký → khởi động), thanh chạy.
- **Lỗi**: phân loại offline / chữ ký / chung; nút Thử lại + Đóng; bản `__DEV__` hiện chi tiết.
- **Error boundary** bọc mini app: lỗi render dừng ở mini app, host chạy tiếp.
- Lối vào: Cá nhân → "Mini app" → `app/miniapps.tsx`; deep link `zhaoxi://miniapp/zhaoxi.example`.

### 4.7 Chế độ dev

- `npm run start` trong thư mục mini app: Metro dev server riêng (mặc định cổng 8092) + `/miniapp-manifest.json?platform=ios` (manifest dev, không hash/chữ ký).
- Host bản `__DEV__` nạp từ dev server khi `EXPO_PUBLIC_MINIAPP_DEV=<id,…>` (tương đương `getDebugConfig()` của VSP); sửa code mini app → bấm "••• → Tải lại".
- Thử đúng đường phát hành: `npm run build` + `npm run serve` (cổng 8093, bố cục giống CDN).

## 5. Đối chiếu VSP ↔ ZhaoXi

| VSP | ZhaoXi v1 |
| --- | --- |
| Re.Pack ScriptManager + `Federated.importModule(name, './App')` | `loadMiniApp(entry)` → eval → `default export` |
| `ModuleFederationPlugin.shared` + `src/shared-dependencies/index.ts` | `shared-modules.json` + `src/miniapps/shared.ts` |
| `config/config.json` containers + `getDebugConfig()` | `GET /api/miniapps` (registry.ts dự phòng) + `EXPO_PUBLIC_MINIAPP_DEV` |
| `/api/miniapps/config/runtime` | `GET /api/miniapps?platform=` (lọc quyền, chọn bản rollout theo người dùng) |
| signed URL MinIO | `${API_URL}/miniapps/<id>/<platform>/…` (bundle trong Postgres, CDN Vercel cache `immutable`) |
| `CodeSigningPlugin` (RS256 JWT mỗi chunk) + `RepackPublicKey` | Ed25519 trên manifest (bao SHA-256 bundle) + `keys.ts` nhiều khoá, phân dev/prod |
| AES-256 tại chỗ + giải mã ra cache | Lưu nguyên, kiểm chữ ký + hash mỗi lần nạp |
| `MiniAppProps.registerReducer`, `UserService`, `i18next`, event bus | `MiniAppProps { context, bridge }` có quyền |
| `MiniAppErrorBoundary` + `LoadingBlockerView` | `MiniAppErrorBoundary` + màn chờ/lỗi theo bước + nút kính |
| `pack-miniapp.sh` + `check-miniapp-package.py` → admin-portal → MinIO | `zhaoxi-miniapp build` (tự kiểm hash, ký) → web admin "Mini app" (server kiểm lại như `verify`) → publish / rollout / rollback |

## 6. Hạn chế v1 và việc tiếp theo

1. ~~**Backend registry**~~: đã làm 04/11/2026, xem §10. Còn chờ chủ dự án chạy migration + deploy (§10.7).
2. ~~**Khoá prod**~~: đã tạo 04/11/2026, public key trong `keys.ts`; khoá riêng chưa vào kho bí mật (§10.6).
3. **Asset cục bộ** (ảnh trong bundle): v1 báo lỗi build; dùng URL CDN. Hướng làm: serializer gom asset vào `dist/<platform>/assets/` và host đăng ký `AssetRegistry` với `httpServerLocation` trỏ CDN.
4. **Source map** cho bundle mini app (crash report): v1 trả map rỗng.
5. **Code splitting / `import()`**: chưa hỗ trợ; mỗi mini app là một file bundle (mẫu 9 KB minified).
6. ~~**Kill switch**~~: `miniapps.enabled = false` (nút "Tắt mini app" ở admin) gỡ khỏi danh mục và manifest/bundle trả 404. Chưa có `minVersion` theo từng bản.
7. **Tách lỗi**: error boundary chỉ bắt lỗi render; lỗi trong promise/timer của mini app vẫn lên global handler của host. Có thể bọc `ErrorUtils` khi mini app đang mở.
8. **Android**: code đã tính sẵn (`Platform.OS`, build `--platform android`) nhưng đợt này chỉ chạy thử iOS simulator.
9. **Chuyển sang Module Federation** khi `@callstack/repack-expo` phát hành: giữ hợp đồng `default export (props: MiniAppProps)`, thay `tools/metro.cjs` + `loader.ts` bằng Re.Pack ScriptManager.

## 7. ZhaoXi Partner chạy như mini app `zhaoxi.partner` (đã làm 04/11/2026)

Kế hoạch cũ (giữ app độc lập, dùng chung mã) đã làm xong. Ảnh chụp trên simulator ở [`screenshots/`](screenshots).

| Ảnh | Nội dung |
| --- | --- |
| [partner-01-profile-entry.png](screenshots/partner-01-profile-entry.png) | Tab Cá nhân của host: mục "Quản lý gian hàng" chỉ hiện với tài khoản đối tác |
| [partner-02-order-list.png](screenshots/partner-02-order-list.png) | Danh sách đơn trong host: header petrol, nút kính "••• ×", thanh tab kính nổi |
| [partner-03-order-detail.png](screenshots/partner-03-order-detail.png) | Chi tiết đơn |
| [partner-04-messages.png](screenshots/partner-04-messages.png) | Tab Tin nhắn |

### 7.1 Dùng chung mã với app độc lập

- `partner-mobile/App.tsx` chỉ còn `SafeAreaProvider` + `installNotificationHandler()` + `<PartnerApp/>`. Toàn bộ giao diện nằm ở [`src/PartnerApp.tsx`](../../frontend/apps/partner-mobile/src/PartnerApp.tsx) (git mv từ `App.tsx`).
- Entry mini app: [`partner-mobile/src/miniapp.tsx`](../../frontend/apps/partner-mobile/src/miniapp.tsx), default export nhận `MiniAppProps`, dựng `PartnerHost` (ngôn ngữ, backend, người dùng, `launch`, `close`, `createHandoff`) rồi render `<PartnerApp host={…}/>`. Không có `host` thì Partner chạy như app độc lập.
- Thư mục build/ký: [`frontend/apps/miniapp_zhaoxi_partner`](../../frontend/apps/miniapp_zhaoxi_partner): `miniapp.json` có `entry: "../partner-mobile/src/miniapp.tsx"`, quyền `user.profile` + `auth.handoff`, cổng dev 8094.
- **File `x.miniapp.ts(x)`** (mới trong SDK, `tools/metro.cjs`): Metro của mini app ưu tiên `x.miniapp.ts` hơn `x.ts`; `tsconfig` của mini app dùng `moduleSuffixes: [".miniapp", ""]` để kiểm đúng bản đó. Partner dùng cho 3 chỗ khác nhau giữa hai môi trường:
  - `images.miniapp.ts`: ảnh nhúng base64 thu nhỏ (runtime v1 chưa có asset cục bộ). Bản độc lập vẫn `require("../assets/…")`.
  - `threeLib.miniapp.ts`: three.js r128 tải từ cdnjs có SRI (giống hệt `assets/three.min.js`) thay vì nhúng 600 KB. Bundle Partner còn **~187 KB**.
  - `glass.miniapp.tsx`: Liquid Glass thật (`expo-glass-effect`, `expo-blur` là shared module). App độc lập chưa có hai gói native này nên dùng lớp trắng mờ.
- `chat-photos.ts` import `requireOptionalNativeModule` từ `expo-modules-core` thay vì `expo` (mini app không được import `expo`).

### 7.2 Bridge: phiên, ngôn ngữ, điều hướng, đóng

- **Phiên**: quyền mới `auth.handoff` + `bridge.createRoleHandoff("partner")`. Host gọi `POST /api/auth/role-switch/create { targetRole: "partner" }` bằng phiên khách (API có sẵn, backend không đổi), trả **mã dùng một lần sống 60 s**. Mini app đổi mã ở `POST /api/auth/role-switch/exchange` lấy phiên partner riêng, lưu ở khoá SecureStore `zhaoxi.partner.auth.v1` kèm `hostUserId`. Mini app không bao giờ thấy token của host.
  - Đổi tài khoản ở host thì phiên partner của tài khoản cũ bị bỏ (logout) và xin mã mới. Phiên đăng nhập tay (tài khoản đối tác riêng, không có `hostUserId`) vẫn được giữ.
  - Đổi mã thất bại (ví dụ `PARTNER_NOT_LINKED`): hiện màn đăng nhập Partner có thêm nút "Vào bằng tài khoản ZhaoXi".
  - `bridge.request` nay chặn mọi đường dẫn `/api/auth/…`, để quyền `api.zhaoxi` không tự xin được mã đổi vai trò.
- **API URL**: `configureApi({ apiUrl: context.host.apiUrl })`; một bundle chạy đúng mọi môi trường.
- **Ngôn ngữ**: theo `context.locale` (vi-VN → vi, zh-* → zh, en-US → en), ẩn bộ chọn ngôn ngữ riêng.
- **Điều hướng**: `context.launch` `?screen=orders|messages&order=<id>` mở thẳng đơn hoặc cuộc chat. Host map `/miniapp/:id?…` trong `links.ts`.
- **Đóng**: nút "×" của host; nút "Đăng xuất" ở tab Cài đặt của Partner đăng xuất gian hàng rồi `bridge.close()`.
- **Giao diện trong host**: header chừa `context.capsule`, petrol `#00323A` như header host; nút kính chuyển `chrome: "light"`.

### 7.3 Phân quyền

- Registry thêm `audience: "partner"`. [`src/miniapps/access.ts`](../../frontend/apps/customer-mobile/src/miniapps/access.ts) hỏi `GET /api/account/me` (react-query, 5 phút): thuộc nhóm khi `roles` có `partner` **hoặc** là thành viên một organization `status = active`. Guest không thuộc nhóm nào.
- Áp ở 3 nơi: mục "Quản lý gian hàng" ở tab Cá nhân, danh sách `/miniapps`, và màn chứa `/miniapp/[id]` (deep link / push: không có quyền thì báo lỗi, **không tải bundle**).
- Backend vẫn là lớp chặn cuối: `role-switch/create` chỉ cấp mã cho thành viên gian hàng đang hoạt động.

### 7.4 Thông báo đẩy

- `setNotificationHandler` chỉ còn ở app độc lập (`installNotificationHandler()`); trong host, handler là của host.
- Partner vẫn đăng ký Expo push token **của host** với `/api/partner-push/mobile` khi mở mini app. Push đơn mới / tin nhắn đến app ZhaoXi cả khi đã tắt. Từ 1.0.1 token lấy qua bridge (`notifications.push`) và host tự gỡ khi đăng xuất: xem §11.
- Chạm vào push: payload Partner (`screen: "orders" | "messages"`, `orderId`, không có `url`) được host mở thành `/miniapp/zhaoxi.partner?screen=…&order=…`. Nếu mini app đang mở, host bỏ qua và listener của mini app xử lý (chỉ nhận payload Partner, `remove()` khi đóng).
- Trong host, thông báo cục bộ dùng âm mặc định (bản build host không có `order_alert.wav`).
- Còn thiếu: chuông riêng `order_alert.wav` cho push đơn mới (thêm vào `sounds` của plugin expo-notifications ở host, cần build native). ~~Đăng xuất ở host chưa gỡ token~~: đã làm ở §11.

## 8. Kết quả kiểm thử (04/11/2026)

### 8.1 Mini app Partner

Simulator riêng "Partner MiniApp iPhone 17 Pro" (iOS 26.4, đã xoá sau khi thử), Metro host cổng 8121, CDN giả 8093, backend `next dev` cổng 3099 + Postgres cục bộ (`drizzle-kit push`, `scripts/seed.mjs`, [`scripts/seed-partner-miniapp-dev.mjs`](../../backend/scripts/seed-partner-miniapp-dev.mjs)). Không ghi gì lên production.

| Kiểm tra | Kết quả |
| --- | --- |
| `tsc --noEmit` customer-mobile, partner-mobile, miniapp_zhaoxi_example, miniapp_zhaoxi_partner | sạch |
| App Partner độc lập: `expo export --platform ios` | được (ảnh `assets/`, three.js nhúng) |
| `zhaoxi-miniapp build` Partner iOS + Android, `verify` | ~187 KB mỗi bản, chữ ký hợp lệ |
| Luồng API: đăng nhập khách → `account/me` → `role-switch/create` → `exchange` → hàng đợi đơn | phiên partner đúng gian hàng; mã dùng lại bị từ chối (`HANDOFF_INVALID_OR_EXPIRED`); khách thường bị từ chối (`PARTNER_NOT_LINKED`) |
| Host: tab Cá nhân có "Quản lý gian hàng" → mở mini app | tải manifest → kiểm chữ ký → chạy; tự vào bằng tài khoản ZhaoXi, danh sách 4 đơn, chi tiết đơn, tab Tin nhắn, thông báo cục bộ "Có đơn hàng mới" hiện qua host |

Chưa thử: push thật (cần máy thật), Android, host bản Release, tài khoản `khach.thuong` trên giao diện (chỉ thử qua API), chế độ dev server của mini app (`EXPO_PUBLIC_MINIAPP_DEV=zhaoxi.partner`).

### 8.2 Mini app mẫu

Simulator riêng "ZhaoXi MiniApp iPhone 17 Pro" (iOS 26.4), Metro host cổng 8096, CDN giả 8093. Host chạy bản Debug native có sẵn (runtime không thêm native nên không cần build lại), bundle JS lấy từ worktree này.

| Kiểm tra | Kết quả |
| --- | --- |
| `tsc --noEmit` host + mini app | sạch |
| `zhaoxi-miniapp build` iOS + Android | 9,2 KB mỗi bản, ký Ed25519, `verify` hợp lệ |
| Mở từ Cá nhân → Mini app và deep link `zhaoxi://miniapp/zhaoxi.example` | tải manifest → kiểm chữ ký → tải bundle → kiểm SHA-256 → chạy (Hermes `eval`), nguồn "tải mạng" |
| Mở lần hai | chạy từ cache trên đĩa sau khi kiểm lại, nguồn "bộ nhớ đệm" |
| Bridge | state nội bộ, `request('/api/customer-ui-config')` (GET) bằng phiên host, toast, `openHostRoute('/coupons')` rồi quay lại giữ nguyên state, menu "•••", nút "×" |
| Manifest bị sửa quyền (`+auth.token`) hoặc version | `zhaoxi-miniapp verify` và `@noble/curves` (thư viện host dùng) đều từ chối |

Chưa thử: Android, bản Release host (chỉ nhận khoá `prod`), chế độ dev server của mini app (`EXPO_PUBLIC_MINIAPP_DEV`), mất mạng hoàn toàn (đường cache-khi-offline dùng chung hàm kiểm với đường cache đã thử).

## 9. Vận hành nhanh

```bash
# mini app
cd frontend/apps/miniapp_zhaoxi_example
npm run start                      # dev server :8092
npm run build                      # dist/ios + dist/android (ký nếu có miniapp-signing.pem)
npm run serve                      # CDN giả :8093
npx zhaoxi-miniapp verify dist/ios/manifest.json --public-key <base64>

# mini app Partner (mã nguồn ở partner-mobile)
cd frontend/apps/miniapp_zhaoxi_partner
npm run keygen && npm run build && npm run serve   # thêm dòng keyId in ra vào customer-mobile/src/miniapps/keys.ts (env "dev")

# backend + dữ liệu thử cục bộ cho Partner (Postgres cục bộ, KHÔNG dùng URL production)
cd backend
DATABASE_URL=postgres://<user>@localhost:<port>/<db> npx drizzle-kit push --force
DATABASE_URL=… node scripts/seed.mjs
DATABASE_URL=… npx next dev -p 3099
DATABASE_URL=… API_URL=http://127.0.0.1:3099 node scripts/seed-partner-miniapp-dev.mjs   # tài khoản đối tác + tài khoản đối chứng, xem đầu file

# registry cục bộ (§10): migration lên DB cục bộ rồi chạy test
DATABASE_URL=… npm run db:apply:miniapps          # chỉ DB cục bộ/staging; production: chủ dự án tự chạy
TEST_DATABASE_URL=… npm run test:miniapps         # 12 ca: upload → verify → publish → rollout → rollback → kill switch
DATABASE_URL=… MINIAPP_ACCEPT_DEV_KEYS=1 npx next dev -p 3199   # nhận cả bản ký khoá dev

# web admin cục bộ trỏ vào backend trên
cd frontend/apps/admin && ZHAOXI_BACKEND_URL=http://127.0.0.1:3199 npx next dev -p 3198   # /?view=miniapps

# host (dev build, Metro cổng khác 8081 nếu máy đang chạy app khác)
# thêm EXPO_PUBLIC_API_URL=http://127.0.0.1:3099 khi thử với backend cục bộ
cd frontend/apps/customer-mobile
EXPO_PUBLIC_MINIAPP_DEV=zhaoxi.example npx expo start --dev-client --port 8095
xcrun simctl openurl booted "zhaoxi://miniapp/zhaoxi.example"
```

## 10. Registry: lưu trữ và phát hành mini app (04/11/2026)

Nơi lưu bundle + danh mục + web admin để upload mini app, thay cho việc tự đặt file lên CDN. Ảnh chụp web admin (dữ liệu thật trên Postgres cục bộ):

| Ảnh | Nội dung |
| --- | --- |
| [admin-01-list.jpg](screenshots/admin-01-list.jpg) | Mục "Mini app" (nhóm NỀN TẢNG): upload `dist/`/zip, danh sách mini app, bản đang phát mỗi nền tảng |
| [admin-02-app-detail.jpg](screenshots/admin-02-app-detail.jpg) | Sửa tên 4 ngôn ngữ, icon, màu, nút kính, ai thấy, thứ tự, kill switch; bản iOS đã phát hành 100 % |
| [admin-03-rollout-manifest.jpg](screenshots/admin-03-rollout-manifest.jpg) | Android phát hành 20 %, đặt %, rollback, xem manifest đã ký |

### 10.1 Nơi lưu bundle

| Phương án | Chi phí | Tốc độ ở VN | Độ phức tạp |
| --- | --- | --- | --- |
| **Postgres (Neon) + CDN Vercel** (đang dùng) | ~0 (100 bản × 200 KB ≈ 20 MB) | Edge Vercel SIN/HKG; bundle cache `immutable` nên DB chỉ bị đọc khi cache miss | Không tài khoản/bí mật mới. Upload qua function Vercel nên ≤ 4,5 MB/lần |
| Cloudflare R2 (khi cần) | 10 GB miễn phí, egress 0 đ | PoP Hà Nội, TP.HCM | Cần tài khoản Cloudflare, bucket, API token, domain riêng |
| DigitalOcean Spaces SGP1 | $5/tháng cố định | Singapore + CDN | Tạo Space + key |
| Droplet SGP1 có sẵn | 0 đ thêm | Singapore, không CDN | Một máy duy nhất, tự lo TLS/backup/vá. Không khuyến nghị |

Bundle đi qua `BundleStore` ([`backend/lib/miniapps/bundle-store.ts`](../../backend/lib/miniapps/bundle-store.ts)): driver `postgres` (mặc định) giữ byte trong `miniapp_releases.bundle_data`. Driver object storage (R2/Spaces/MinIO đều S3 API) chỉ cần `put` + `locate` (route bundle trả 302 sang URL public); **URL host không đổi** vì manifest luôn do backend phát (rollout, rollback, kill switch cần logic). Chuyển sang R2 khi có asset ảnh trong bundle, source map, hoặc bundle > 4 MB.

### 10.2 Dữ liệu (migration [`0012_miniapp_registry.sql`](../../backend/migrations/0012_miniapp_registry.sql), chỉ thêm, chạy lại được)

- `miniapps`: `id` (`zhaoxi.partner`), `title`/`subtitle` jsonb 4 ngôn ngữ, `icon` (tên Ionicons), `tint`, `chrome` (`light|dark`), `audience` (`null` mọi người, `members` đã đăng nhập, `partner`, `internal` = có vai trò admin), `enabled` (kill switch), `sort_order`.
- `miniapp_releases`: một dòng cho mỗi (mini app, platform, version): `runtime`, `manifest` jsonb (nguyên bản đã ký), `sha256`, `size_bytes`, `key_id`, `bundle_file`, `storage`/`storage_key`/`bundle_data`, `status` (`draft → published ⇄ rolled_back`), `rollout_percent`, `notes`, ai/lúc nào tạo, phát hành, rollback (+ lý do). Duy nhất theo `(miniapp_id, platform, version)`.
- Mọi thao tác admin ghi `operations_audit_logs` với `area = 'miniapp_registry'`: `upload`, `publish`, `rollout`, `rollback`, `update`, `disable`, `enable` (trước/sau).

### 10.3 API

| Route | Ai | Việc |
| --- | --- | --- |
| `GET /api/miniapps?platform=ios\|android` | host (có hoặc không phiên) | Mini app bật, người này được thấy, có bản đang phát; kèm `release.version` chọn theo rollout. Không phiên: chỉ mục mở cho mọi người, chỉ bản 100 % |
| `GET /miniapps/<id>/<platform>/manifest.json[?v=]` | host | Manifest đã ký. `?v=` bản đó nếu còn published, không thì bản ổn định. `s-maxage=30` |
| `GET /miniapps/<id>/<platform>/<id>-<ver>.<platform>.js` | host | Bundle (cả bản đã rollback, để lượt tải dở vẫn xong). `immutable` |
| `GET /api/admin-miniapps` | admin | Mọi mini app + releases (có manifest, không có byte bundle) |
| `POST /api/admin-miniapps` (multipart `archive` = zip, hoặc nhiều `files`; `notes`) | admin | Kiểm như `zhaoxi-miniapp verify`: schema, id/version/bundle hợp lệ, runtime hỗ trợ, quyền hợp lệ, SHA-256 + size khớp, **khoá nằm trong danh sách tin cậy**, chữ ký Ed25519. Lưu dạng draft; mini app chưa có thì tạo. Gửi lại đúng bản đó = không làm gì; cùng version khác bundle hoặc khác khoá = 409 |
| `PATCH /api/admin-miniapps/<id>` | admin | Sửa thông tin hiển thị, `audience`, `enabled`, `sortOrder` |
| `PATCH /api/admin-miniapps/releases/<id>` `{ action: publish\|rollout\|rollback, rolloutPercent?, reason? }` | admin | Chuyển trạng thái (chặn hai admin bấm cùng lúc bằng điều kiện trạng thái cũ) |

Web admin gọi các route trên qua proxy `frontend/apps/admin/app/api/admin-miniapps/**` (cookie `zx_access_v2`), giống các mục admin khác. Chỉ phiên `role = admin` qua được.

**Khoá tin cậy phía server**: [`backend/lib/miniapps/trusted-keys.ts`](../../backend/lib/miniapps/trusted-keys.ts), phải trùng `keys.ts` của host (test kiểm). Khoá `prod` luôn nhận; khoá `dev` chỉ khi backend có `MINIAPP_ACCEPT_DEV_KEYS=1` (máy cục bộ/staging, **không đặt trên production**), vì host bản release từ chối bản ký khoá dev.

### 10.4 Rollout và rollback

- Bản người dùng nhận = bản **published mới nhất** (theo `published_at`) mà rollout phủ họ; ai nằm ngoài rơi xuống bản trước (bản 100 %). Nhóm của người dùng: `sha256("<id>:<userId>") mod 100 < rollout%`, cố định theo người và mini app nên tăng % không đổi nhóm người đã nhận.
- Ví dụ: 1.0.0 đang 100 %, phát hành 1.1.0 ở 10 % → 10 % người dùng nhận 1.1.0. Đặt 100 % → mọi người. Rollback 1.1.0 → mọi người về 1.0.0 (kể cả máy giữ danh mục cũ trỏ `?v=1.1.0`). Có thể phát hành lại bản đã rollback.
- Thời gian tới máy: danh mục host cache 5 phút (react-query, giữ qua lần mở app), manifest ở CDN tối đa 30 s. Kill switch (`enabled = false`) làm manifest 404: host đang có mạng sẽ không mở bản cache.

### 10.5 Host

- [`src/miniapps/access.ts`](../../frontend/apps/customer-mobile/src/miniapps/access.ts): `useMiniAppAccess()` (hook mà tab Cá nhân, danh sách Mini app và màn chứa đã gọi) hỏi thêm `GET /api/miniapps?platform=`; có danh mục thì `canOpen` theo danh mục (backend đã lọc quyền), chưa có thì về cách cũ (`entry.audience` + `/api/account/me`).
- [`src/miniapps/registry.ts`](../../frontend/apps/customer-mobile/src/miniapps/registry.ts): `fallbackMiniApps` là bản dự phòng; `applyMiniAppCatalog` cập nhật `miniAppRegistry` **tại chỗ** (giữ object entry) nên không phải sửa file UI. Mini app mới thêm ở admin hiện ra trong danh sách mà không cần build host mới (icon phải là tên Ionicons host có, sai thì dùng `apps-outline`). Bản `__DEV__` giữ thêm mục dự phòng backend không có, để thử với `zhaoxi-miniapp serve`.
- `manifestUrlFor` thêm `?v=<version>` từ danh mục. Loader, kiểm chữ ký, cache không đổi.

### 10.6 Khoá ký production

Đã tạo 04/11/2026 trên máy dev của chủ dự án (Mac), **không nằm trong repo**:

- Khoá riêng: `~/.zhaoxi/keys/zhaoxi-miniapp-prod-2026-11.pem` (thư mục `700`, file `600`).
- Khoá công khai: `keyId 5d81cc2da9ad8163`, `3FVJYQfo6kYDwWgqj1/c+qtkVUbApIkkWGUiyvnRpUA=`, đã thêm `env: "prod"` vào `keys.ts` (host) và `trusted-keys.ts` (backend). Đã thử: ký mini app mẫu bằng khoá này → backend ở chế độ production (không nhận khoá dev) và `zhaoxi-miniapp verify` đều nhận.

Quy trình (chủ dự án tự làm):

1. **Sao lưu ngay** nội dung file `.pem` vào trình quản lý mật khẩu (1Password/Bitwarden, mục "ZhaoXi mini app signing prod 2026-11"). Mất khoá thì không ký được bản mới cho các host đã phát hành; phải tạo khoá mới + phát hành host mới.
2. Khi có CI build mini app: đưa nội dung khoá vào secret của CI, ghi ra file tạm và đặt `ZHAOXI_MINIAPP_SIGNING_KEY=<đường dẫn>` lúc `zhaoxi-miniapp build`. **Không** đưa khoá lên Vercel/backend: server chỉ cần khoá công khai.
3. Sau khi đã sao lưu và (nếu có) đưa vào CI, xoá bản trên máy: `rm ~/.zhaoxi/keys/zhaoxi-miniapp-prod-2026-11.pem`. Khi cần ký tay: lấy lại từ trình quản lý mật khẩu vào file `600` ngoài repo, ký xong xoá.
4. Ký bản phát hành: `ZHAOXI_MINIAPP_SIGNING_KEY=… npm run build` trong thư mục mini app → upload `dist/` ở web admin → publish.
5. Xoay khoá: `npx zhaoxi-miniapp keygen --out ~/.zhaoxi/keys/<tên-mới>.pem`, thêm dòng `prod` mới vào `keys.ts` và `trusted-keys.ts` (giữ khoá cũ), phát hành host mới, đợi đa số người dùng cập nhật, rồi mới bỏ khoá cũ. Khoá lộ: bỏ ngay khỏi `trusted-keys.ts` (backend không nhận upload ký bằng nó nữa) + phát hành host mới.

### 10.7 Chủ dự án cần quyết / làm

| Việc | Ghi chú |
| --- | --- |
| Duyệt nơi lưu bundle | Đề xuất: Postgres + CDN Vercel ngay (không tốn tiền, không tài khoản mới); R2 khi cần. Chưa tạo tài nguyên nào |
| Chạy migration production | `cd backend && DATABASE_URL=<Neon unpooled> npm run db:apply:miniapps` (`--check` để xem trước). Chỉ tạo 2 bảng mới |
| Deploy backend rồi web admin | Backend trước (route `/miniapps/**`, `/api/miniapps`, `/api/admin-miniapps/**`); không đặt `MINIAPP_ACCEPT_DEV_KEYS` trên production |
| Sao lưu khoá prod và xoá bản trên máy | §10.6 |
| Upload bản phát hành đầu | Build Partner + mẫu bằng khoá prod, upload ở "Mini app", sửa tên/icon/ai thấy (Partner: `storefront-outline`, `#0B8F55`, `partner`), publish |
| Phát hành host mới | Có `keys.ts` mới (khoá prod) và đọc danh mục backend. Host cũ vẫn dùng `registry.ts` cũ + URL không `?v=` (backend vẫn phục vụ bản ổn định) |

### 10.8 Kiểm thử (04/11/2026, Postgres 18 cục bộ, không ghi production)

| Kiểm tra | Kết quả |
| --- | --- |
| `tsc --noEmit` backend, admin, customer-mobile | sạch |
| Migration 0012 chạy 2 lần trên DB trống | không lỗi; cột, index, check trùng khít `drizzle-kit push` từ `db/schema.ts` |
| `npm run test:miniapps` (gọi thẳng route handler) | 12/12: chỉ admin upload; từ chối khoá lạ, bundle bị sửa, manifest bị nâng quyền, chưa ký, khoá dev ở chế độ production; upload zip + files; trùng/xung đột; draft ẩn; publish → danh mục → manifest → bundle khớp hash; rollout 0 %/theo nhóm/100 %; rollback (cả `?v=` cũ); phát hành lại; audience partner/members/guest; kill switch; audit đủ 7 loại; khoá server = `keys.ts` |
| `next dev` + HTTP thật | Build mini app mẫu bằng CLI → zip → `curl` upload → publish → danh mục → tải manifest/bundle → `zhaoxi-miniapp verify` hợp lệ |
| Web admin cục bộ | Upload zip Partner 187 KB qua giao diện, sửa thông tin, publish iOS 100 %, Android 20 %, xem manifest (ảnh ở trên) |
| Logic host (`applyMiniAppCatalog`, `manifestUrlFor`) chạy bằng Node với backend cục bộ | danh mục lọc quyền, giữ object entry, URL `?v=1.0.0`, hash bundle khớp danh mục |

Chưa thử: host trên simulator/máy thật với backend registry (không bật simulator đợt này để giảm tải máy), Android, CDN Vercel thật (header cache chỉ kiểm ở `next dev`).

## 11. Thông báo đơn hàng cho chủ gian hàng trong app ZhaoXi (04/11/2026)

Mục tiêu: chủ gian hàng chỉ cần cài app ZhaoXi. Push đơn mới, báo chuyển khoản và tin nhắn chat theo đơn (vốn gửi cho app ZhaoXi Partner) hiện như thông báo của ZhaoXi; chạm vào mở mini app "Quản lý gian hàng" ở đúng đơn / cuộc chat.

### 11.1 Luồng

```
mở mini app Partner ──bridge.getPushToken()──▶ host: xin quyền thông báo, lấy Expo token CỦA HOST,
   (quyền notifications.push)                        ghi nhớ {token, userId, ["zhaoxi.partner"]} (AsyncStorage)
        │
        └─ POST /api/partner-push/mobile {organizationId, expoPushToken, platform, deviceId=IDFV}  (phiên partner, API cũ)
backend tạo đơn ─▶ partnerMobilePushTargets(org) ─▶ Expo ─▶ máy: data {orderId, screen, kind, miniappId:"zhaoxi.partner"}
chạm thông báo ─▶ host: không có `url` + có `miniappId` ─▶ /miniapp/zhaoxi.partner?screen=orders|messages&order=<id>
                         (mini app đang mở thì host bỏ qua, listener của mini app tự chuyển màn)
đăng xuất / đổi tài khoản / hết là đối tác ─▶ host: DELETE /api/partner-push/mobile {expoPushToken} (phiên host)
```

### 11.2 Thay đổi

| Phần | Việc |
| --- | --- |
| SDK | Quyền `notifications.push`, `bridge.getPushToken(): { token, platform, reason }` (`reason`: `simulator`, `denied`, `no-project`, `signed-out`, `error`). Không đổi `MINIAPP_RUNTIME_VERSION` (chỉ thêm). |
| Host | [`src/miniapps/push.ts`](../../frontend/apps/customer-mobile/src/miniapps/push.ts): cấp token, ghi nhớ mini app đã nhận, `releaseMiniAppPush()` (gọi trong đăng xuất ở `ui/chrome.tsx`), `useMiniAppPushGuard()` ở `_layout` gỡ khi phiên đổi người / guest hoặc `/api/account/me` không còn là đối tác. Gỡ hỏng (mất mạng) thì giữ bản ghi, thử lại lần sau. Kênh Android `new-orders` (âm mặc định, rung mạnh) cho payload Partner. |
| Host: chạm push | `notifications.ts` đọc `data.miniappId` (backend cũ không có thì nhận diện push Partner theo `screen` như trước). Push khách luôn có `url`, giữ nguyên. |
| Host: tham số mở | **Lỗi có sẵn, đã sửa**: `router.push("/miniapp/x?screen=messages")` làm mất `screen` (khoá dành riêng của React Navigation), nên chạm push chat chỉ mở danh sách đơn. [`src/miniapps/launch.ts`](../../frontend/apps/customer-mobile/src/miniapps/launch.ts) đổi tên khoá dành riêng khi host tự điều hướng (`launch_screen`), màn chứa đổi lại. Deep link ngoài `zhaoxi://miniapp/…?screen=` vốn giữ được, vẫn chạy. |
| Mini app Partner 1.0.1 | `miniapp.json` thêm `notifications.push`. Có `bridge.getPushToken` thì dùng (kênh/quyền do host lo), host cũ thì về cách 1.0.0. Nhận `miniappId`. Mở chat từ push: đóng sheet đơn trước (iOS không trình bày Modal chồng Modal), `load()` và thông báo cục bộ "đơn mới" không kéo sheet đè lên chat đang mở theo push; trong host bỏ đọc lại `getLastNotificationResponseAsync` mỗi lần về foreground (mở lại đơn cũ). Các sửa về chat cũng có tác dụng cho app Partner độc lập. |
| Backend | [`partner-mobile-push-targets.ts`](../../backend/lib/services/partner-mobile-push-targets.ts) dùng chung cho push đơn mới, báo chuyển khoản và chat: chỉ thiết bị của **thành viên đang hoạt động** của gian hàng (nhân viên bị gỡ hết nhận dù máy chưa huỷ đăng ký), một lần mỗi token, một lần mỗi máy (11.3). Payload thêm `miniappId: "zhaoxi.partner"` (app Partner cũ bỏ qua trường lạ). `DELETE /api/partner-push/mobile`: phiên partner như cũ (chỉ xoá dòng của mình); phiên khác (host, kể cả guest) xoá theo token: giữ token là bằng chứng, token Expo ngẫu nhiên và không API nào liệt kê, hậu quả duy nhất là máy đó thôi nhận push gian hàng. `MINIAPP_PERMISSIONS` thêm `notifications.push`. **Không migration.** |

### 11.3 Một máy cài cả app Partner lẫn app ZhaoXi

Hai app có hai token khác nhau, cùng đăng ký cho một gian hàng. Backend gộp theo `device_id`: cả hai app gửi `identifierForVendor` (iOS, giống nhau giữa các app cùng nhà phát triển `vn.zhaoxi.*`), nên **iOS chỉ nhận một thông báo**, ở app chủ gian hàng mở gần nhất (mỗi lần mở app Partner / mini app là đăng ký lại, `updated_at` mới). `device_id` rỗng hoặc dạng chung (`partner-ios`) không bị gộp.

**Android chấp nhận gửi cả hai**: `ANDROID_ID` khác nhau giữa hai app ký bằng hai khoá, không có mã máy chung nào lấy được mà không xin thêm quyền. Máy Android cài cả hai app sẽ kêu hai lần cho mỗi đơn; cách khắc phục là gỡ app Partner (mục tiêu của dự án) hoặc tắt thông báo ở một app.

### 11.4 Kiểm thử (04/11/2026)

| Kiểm tra | Kết quả |
| --- | --- |
| `tsc --noEmit` backend, customer-mobile, partner-mobile, miniapp_zhaoxi_partner, miniapp_zhaoxi_example | sạch |
| `npm run test:partner-push` (Postgres 18 cục bộ tạm, `drizzle-kit push`) | 9/9: gộp theo token/máy, app mở gần nhất thắng, id rỗng/chung không gộp; mini app đăng ký token host bằng phiên partner, đăng ký lại không trùng, phiên khách không đăng ký được; payload đơn mới / chat / báo chuyển khoản có `miniappId` và giữ trường cũ; thành viên bị gỡ thôi nhận; phiên host gỡ token, phiên partner khác không gỡ được của chủ, token sai dạng 422, không phiên 401 |
| `test:partner-orders`, `test:support`, `test:miniapps` | 16/16, 7/7, 12/12 (không vỡ) |
| Simulator iPhone 17 (host Debug sẵn có, Metro worktree này, backend `next dev` + Postgres cục bộ, Partner 1.0.1 ký khoá dev qua CDN giả) | mở mini app → bản 1.0.1, `getPushToken` trả `simulator` ("Push cần chạy trên điện thoại thật."); `simctl push` payload mới: chạm khi app nền → mở đúng đơn; khởi động nguội → đúng đơn / đúng cuộc chat; chạm push chat khi mini app đang mở → host không mở chồng, mini app vào đúng chat; push khách có `url` → màn Ưu đãi như cũ |

**Chưa thử**: push thật qua Expo (simulator không có Expo token, nên `getPushToken` → `simulator`; luồng ghi nhớ token + gỡ khi đăng xuất chưa chạy thật trên máy), Android (kênh `new-orders`, gửi trùng), bản Release host. Simulator có crash native có sẵn (`ExpoFabricView` thiếu view trong bản Debug cũ) khi gõ ở màn đăng nhập, không liên quan thay đổi này.

### 11.5 Phát hành (chủ dự án)

1. **Deploy backend** (không migration). An toàn với app cũ: app Partner cũ bỏ qua `miniappId`; host cũ vẫn nhận diện push Partner theo `screen`.
2. **Build + publish Partner 1.0.1**, ký khoá prod: `cd frontend/apps/miniapp_zhaoxi_partner && ZHAOXI_MINIAPP_SIGNING_KEY=~/.zhaoxi/keys/zhaoxi-miniapp-prod-2026-11.pem npm run build`, rồi `cd backend && DATABASE_URL=<Neon> npx tsx scripts/publish-miniapp.ts ../frontend/apps/miniapp_zhaoxi_partner/dist --admin <adminUserId>`. Script chạy code backend **của nhánh này** (biết quyền `notifications.push`); upload qua web admin thì phải deploy backend trước. Host cũ nhận bản 1.0.1 vẫn chạy (không có `getPushToken` thì Partner tự lấy token như 1.0.0).
3. **Phát hành host mới** (JS: gỡ token khi đăng xuất, đọc `miniappId`, sửa `screen`, kênh `new-orders`). Không thêm gói native nên không cần prebuild lại vì native, nhưng host không có OTA (`expo-updates`) nên vẫn phải build và nộp bản mới lên store. Chuông `order_alert.wav` cho host vẫn là việc riêng (cần build native).

## 12. Chủ nhiều gian hàng: push của mọi gian hàng, chạm vào tự đổi gian hàng (04/11/2026)

Yêu cầu của chủ dự án: chủ gian hàng đang ở gian hàng nào cũng nhận thông báo đơn của mọi gian hàng mình quản lý; chạm vào đơn của gian hàng khác thì tự đổi sang đúng gian hàng đó. Tài khoản chủ thật (+84942411045) sở hữu 12 gian hàng.

### 12.1 Trước đây

`partner_mobile_push_devices.expo_push_token` là duy nhất, mỗi máy chỉ có **một** dòng gắn với **một** `organization_id`: gian hàng đang chọn lúc đăng ký (mở app / đổi gian hàng là đăng ký lại, ghi đè). Backend gửi theo `organization_id` của dòng, nên máy chỉ kêu cho gian hàng đang mở trong app; 11 gian hàng còn lại im lặng.

### 12.2 Bây giờ (không migration)

| Phần | Việc |
| --- | --- |
| Backend | `partnerMobilePushTargets(org)` chọn thiết bị **theo người dùng**: mọi thiết bị của thành viên đang hoạt động của gian hàng có đơn, bất kể máy đăng ký lúc đang ở gian hàng nào. `organization_id` của dòng chỉ còn là gian hàng chọn lúc đăng ký, không dùng để gửi. Giữ nguyên: một lần mỗi token, một lần mỗi máy (§11.3), nhân viên bị gỡ khỏi gian hàng thôi nhận ngay. API đăng ký không đổi. |
| Payload | Thêm `organizationId`, `organizationName` (cho đơn mới, báo chuyển khoản, chat). Tiêu đề có tên gian hàng sau emoji: `🔔 ZhaoXi Car Đà Nẵng · Có đơn dịch vụ mới`, `💬 ZhaoXi Car Đà Nẵng · Khách · ZX-…`, `💳 … · Khách đã báo chuyển khoản`. App cũ bỏ qua trường lạ. |
| Partner 1.0.2 (mini app + app độc lập, cùng mã) | Mọi đường chạm push (đang chạy, chạy nền, khởi động nguội, `launch` từ host) đi qua `openPushTarget`: đơn thuộc gian hàng khác thì gọi `POST /api/auth/session/organization` (API đổi gian hàng có sẵn), rồi mới mở đơn / cuộc chat. Host báo "Bạn đã chuyển qua gian hàng …". Đổi thất bại (không còn là thành viên) thì ở lại gian hàng hiện tại. Push của gian hàng khác đến khi app đang mở: chỉ hiện banner, không tự đổi. Mỗi lần chạm chỉ xử lý một lần (trước đây app độc lập mở lại đơn cũ mỗi lần về foreground; nay đổi gian hàng tay sau đó không bị kéo về). |
| Partner: lỗi tìm ra khi thử | (1) `load()` của gian hàng cũ trả về sau khi đã đổi gian hàng, bật sheet đơn cũ: nay bỏ kết quả của gian hàng cũ. (2) Đơn đồ ăn và đơn dịch vụ dùng hai Modal khác nhau: đổi thẳng từ loại này sang loại kia thì iOS bỏ Modal mới: nay đóng sheet cũ, đợi 500 ms rồi mở. (3) Chuông cục bộ "đơn mới" của gian hàng cũ đến muộn kéo sang đơn khác: nay mang `organizationId`, và không điều hướng khi đang có push chờ đổi gian hàng. |
| Host (customer-mobile) | `notifications.ts`: thêm `org=<organizationId>` vào tham số mở mini app. **Không bắt buộc**: host đã phát hành (không có `org`) thì Partner 1.0.2 đọc `organizationId` từ push vừa chạm (`getLastNotificationResponseAsync`, đối chiếu `orderId`). Không thêm gói native. |

### 12.3 Kiểm thử (04/11/2026)

| Kiểm tra | Kết quả |
| --- | --- |
| `tsc --noEmit` backend, customer-mobile, partner-mobile, miniapp_zhaoxi_partner, miniapp_zhaoxi_example | sạch |
| `npm run test:partner-push` (Postgres 18 cục bộ tạm) | 11/11, thêm: chủ 2 gian hàng nhận đơn của gian hàng thứ hai trên máy đăng ký ở gian hàng thứ nhất, nhân viên không thuộc gian hàng đó không nhận, một dòng/token không nhân bản; tiêu đề có tên gian hàng; payload có `organizationId`/`organizationName` |
| `test:partner-orders`, `test:support`, `test:miniapps` | 16/16 (đã cập nhật tiêu đề có tên gian hàng), 7/7, 12/12 |
| Simulator iPhone 17, `partner.demo` chủ 2 gian hàng (川渝老火锅 + "ZhaoXi Car Đà Nẵng", dữ liệu cục bộ) | mini app đang mở ở 川渝老火锅, chạm push ZhaoXi Car → đổi gian hàng + mở đúng yêu cầu thuê nhà; khởi động nguội: push đơn → đổi + đúng sheet đơn (cả hai chiều, đơn đồ ăn ↔ đơn dịch vụ); push chat → đổi + đúng cuộc chat |

Chưa thử: push thật, Android, app Partner độc lập trên máy (cùng mã với mini app, chỉ thử qua mini app), tài khoản 12 gian hàng thật.

### 12.4 Phát hành

1. Deploy backend (không migration). Từ lúc này máy của chủ kêu cho mọi gian hàng, kể cả với Partner 1.0.1 / app Partner cũ; chỉ có điều chạm vào đơn của gian hàng khác thì bản cũ mở danh sách gian hàng đang chọn (không tìm thấy đơn).
2. Publish Partner 1.0.2 (ký khoá prod, `dist/` của worktree `miniapp-push-31d622` đã build và `verify`).
3. Host: sửa nhỏ ở `notifications.ts` (truyền `org`), đi cùng lần phát hành host kế tiếp; không gấp.
4. App Partner độc lập (`partner-mobile`): cùng mã, cần build + nộp bản mới nếu muốn app riêng cũng tự đổi gian hàng.

