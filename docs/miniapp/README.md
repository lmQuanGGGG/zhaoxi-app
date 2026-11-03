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
- Quyền (`miniapp.json` → manifest): `user.profile`, `api.zhaoxi`, `auth.token`, `navigation.host`. Bridge kiểm từng lời gọi (`MiniAppPermissionError`).

So với VSP, ZhaoXi **không mã hoá bundle khi lưu**: sandbox iOS + Data Protection đã che file khỏi app khác, và bundle được kiểm lại hash + chữ ký **mỗi lần nạp** (kể cả từ cache), nên sửa file trên máy cũng không chạy được. Mã hoá AES của VSP với khoá lưu cạnh dữ liệu chỉ làm khó việc đọc mã, không thêm toàn vẹn.

### 4.4 Tải, phiên bản, cache

- URL: `${EXPO_PUBLIC_MINIAPP_CDN_URL}/<id>/<ios|android>/manifest.json`. Mặc định dev: `http://localhost:8093` (`zhaoxi-miniapp serve`); release: `${API_URL}/miniapps` (đặt `EXPO_PUBLIC_MINIAPP_CDN_URL` khi có CDN thật, ví dụ R2/S3 + Cloudflare).
- Luôn hỏi manifest trước (timeout 6 s). Hash trùng bản cache → dùng cache (không tải lại). Khác → tải, kiểm, ghi `Documents/miniapps/<id>/<version>-<hash8>.js` + `current.json`, xoá bản cũ. Mất mạng → chạy bản cache sau khi kiểm lại chữ ký + hash.
- Bộ nhớ: bundle đã eval giữ theo `id@version#hash`; mở lại không eval lại. Bản mới (hash khác) chạy ngay lần mở kế tiếp, **không cần tắt host** (khác VSP).
- Rollback = phát hành lại manifest trỏ về bản cũ (bản cũ vẫn còn trên CDN vì tên file có version).

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
| `config/config.json` containers + `getDebugConfig()` | `registry.ts` + `EXPO_PUBLIC_MINIAPP_DEV` |
| `/api/miniapps/config/runtime` | (giai đoạn sau) `GET /api/miniapps` |
| `CodeSigningPlugin` (RS256 JWT mỗi chunk) + `RepackPublicKey` | Ed25519 trên manifest (bao SHA-256 bundle) + `keys.ts` nhiều khoá, phân dev/prod |
| AES-256 tại chỗ + giải mã ra cache | Lưu nguyên, kiểm chữ ký + hash mỗi lần nạp |
| `MiniAppProps.registerReducer`, `UserService`, `i18next`, event bus | `MiniAppProps { context, bridge }` có quyền |
| `MiniAppErrorBoundary` + `LoadingBlockerView` | `MiniAppErrorBoundary` + màn chờ/lỗi theo bước + nút kính |
| `pack-miniapp.sh` + `check-miniapp-package.py` → admin-portal → MinIO | `zhaoxi-miniapp build` (tự kiểm hash, ký) → CDN; `zhaoxi-miniapp verify` cho CI |

## 6. Hạn chế v1 và việc tiếp theo

1. **Backend registry** (chưa làm, không ghi production trong đợt này): bảng `miniapps` (id, tên đa ngữ, icon, tint, chrome, audience) + `miniapp_releases` (id, platform, version, manifest JSON, trạng thái, rollout %), `GET /api/miniapps` cho host, trang admin upload `dist/` (kiểm chữ ký phía server bằng `zhaoxi-miniapp verify`), lưu bundle lên Blob/R2. Host: đọc danh mục từ API, `registry.ts` thành bản dự phòng.
2. **Khoá prod**: tạo bằng `zhaoxi-miniapp keygen` trên máy an toàn, đưa vào CI secret (`ZHAOXI_MINIAPP_SIGNING_KEY`), thêm public key `env: "prod"` vào `keys.ts`. Thu hồi: xoá khoá, phát hành host mới.
3. **Asset cục bộ** (ảnh trong bundle): v1 báo lỗi build; dùng URL CDN. Hướng làm: serializer gom asset vào `dist/<platform>/assets/` và host đăng ký `AssetRegistry` với `httpServerLocation` trỏ CDN.
4. **Source map** cho bundle mini app (crash report): v1 trả map rỗng.
5. **Code splitting / `import()`**: chưa hỗ trợ; mỗi mini app là một file bundle (mẫu 9 KB minified).
6. **Kill switch**: thêm `blocked: true` / `minVersion` vào danh mục backend để chặn bản lỗi.
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
- Partner vẫn đăng ký Expo push token **của host** với `/api/partner-push/mobile` khi mở mini app. Push đơn mới / tin nhắn đến app ZhaoXi cả khi đã tắt.
- Chạm vào push: payload Partner (`screen: "orders" | "messages"`, `orderId`, không có `url`) được host mở thành `/miniapp/zhaoxi.partner?screen=…&order=…`. Nếu mini app đang mở, host bỏ qua và listener của mini app xử lý (chỉ nhận payload Partner, `remove()` khi đóng).
- Trong host, thông báo cục bộ dùng âm mặc định (bản build host không có `order_alert.wav`).
- Còn thiếu: chuông riêng `order_alert.wav` cho push đơn mới (thêm vào `sounds` của plugin expo-notifications ở host, cần build native); đăng xuất ở host chưa gỡ token khỏi `/api/partner-push/mobile` (máy vẫn nhận push Partner của tài khoản cũ cho tới khi mở lại mini app hoặc gỡ app).

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

# host (dev build, Metro cổng khác 8081 nếu máy đang chạy app khác)
# thêm EXPO_PUBLIC_API_URL=http://127.0.0.1:3099 khi thử với backend cục bộ
cd frontend/apps/customer-mobile
EXPO_PUBLIC_MINIAPP_DEV=zhaoxi.example npx expo start --dev-client --port 8095
xcrun simctl openurl booted "zhaoxi://miniapp/zhaoxi.example"
```
