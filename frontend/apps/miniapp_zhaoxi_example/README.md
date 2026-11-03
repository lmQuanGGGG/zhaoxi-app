# miniapp_zhaoxi_example: mini app mẫu cho ZhaoXi

Mini app tối giản chạy bên trong app khách ZhaoXi (`customer-mobile`). Copy thư mục này để tạo mini app mới. Thiết kế tổng thể: [docs/miniapp/README.md](../../../docs/miniapp/README.md).

Mini app là **một React component** (default export của `entry`) nhận `{ context, bridge }` từ host. Nó được build bằng Metro của host, đóng thành **một file bundle + `manifest.json` đã ký**, đặt trên CDN; host tải, kiểm chữ ký rồi chạy.

```
miniapp_zhaoxi_example/
├── miniapp.json        id, tên, version, entry, quyền, cổng dev
├── metro.config.js     dùng config mini app của @zhaoxi/miniapp-sdk (không sửa)
├── package.json        script start / build / serve / keygen / typecheck
├── tsconfig.json
└── src/App.tsx         default export: (props: MiniAppProps) => JSX
```

## 1. Tạo mini app mới

1. Copy thư mục, đổi tên theo dạng `miniapp_zhaoxi_<tên>`:

   ```bash
   cd frontend/apps
   cp -R miniapp_zhaoxi_example miniapp_zhaoxi_booking
   rm -rf miniapp_zhaoxi_booking/{dist,.zhaoxi,miniapp-signing.pem}
   ```

2. Sửa `package.json`: `"name": "miniapp_zhaoxi_booking"`.
3. Sửa `miniapp.json`:

   | Trường | Ý nghĩa |
   | --- | --- |
   | `id` | Định danh duy nhất, chữ thường: `zhaoxi.booking`. Dùng trong URL CDN và deep link `zhaoxi://miniapp/zhaoxi.booking`. Không đổi sau khi phát hành. |
   | `name` | Tên hiển thị trong context. |
   | `version` | Semver. **Tăng mỗi lần phát hành** (tên file bundle có version). |
   | `entry` | File có default export component. |
   | `permissions` | Chỉ khai thứ cần: `user.profile` (tên/avatar người dùng), `api.zhaoxi` (gọi backend bằng phiên host), `auth.token` (token thô, chỉ mini app nội bộ), `navigation.host` (mở màn của host). |
   | `minHostVersion` | (tuỳ chọn) bản ZhaoXi tối thiểu. |
   | `devPort` | Cổng dev server, mỗi mini app một cổng (8092, 8094, …). |

4. Từ thư mục `frontend`: `npm install` (để workspace mới được link).

## 2. Viết code

```tsx
import type { MiniAppProps } from "@zhaoxi/miniapp-sdk";

export default function BookingMiniApp({ context, bridge }: MiniAppProps) {
  // context.locale, context.user, context.theme, context.capsule, context.launch, context.host.apiUrl
  // bridge.close(), bridge.toast(), bridge.haptic(), bridge.request("/api/…"), bridge.openHostRoute("/coupons")
}
```

Quy tắc:

- **Chừa chỗ nút kính "••• ×"** của host ở góc phải trên: `paddingTop: context.capsule.top + context.capsule.height + …` hoặc đặt header ngang hàng và chừa `context.capsule.width + context.capsule.right` bên phải.
- **Thư viện**: chỉ import gói trong [`shared-modules.json`](../../packages/miniapp-sdk/shared-modules.json) (react, react-native, expo-*, reanimated, svg, safe-area, vector-icons…) hoặc thư viện **JS thuần**. Gói native khác phải được cài vào host trước (host phát hành bản mới) rồi thêm vào danh sách shared ở cả `shared-modules.json` và `customer-mobile/src/miniapps/shared.ts`.
- **Không** import `expo` hay `expo-router` (build sẽ báo lỗi). Nhiều màn: dùng state, hoặc `@react-navigation/native-stack` bọc trong `NavigationIndependentTree`.
- **Không** import đường dẫn con của gói shared (`react-native/Libraries/...`): build báo lỗi.
- **Ảnh**: runtime v1 chưa hỗ trợ `require("./a.png")`; dùng URL CDN (`expo-image`) hoặc base64.
- **API**: dùng `bridge.request("/api/…")` (cần `api.zhaoxi`): host tự gắn phiên và refresh, mini app không cầm token.
- **Ngôn ngữ / theme**: lấy từ `context.locale` (vi-VN, zh-CN, zh-TW, en-US) và `context.theme`; đừng tự lưu lựa chọn ngôn ngữ riêng.
- **Dọn dẹp**: mọi `setInterval`, listener (AppState, notifications) phải huỷ trong cleanup của `useEffect`; mini app được đóng/mở nhiều lần trong một phiên host.
- Kiểm kiểu: `npm run typecheck`.

## 3. Chạy thử trong host (dev)

```bash
# Cửa sổ 1: dev server của mini app (cổng trong miniapp.json)
cd frontend/apps/miniapp_zhaoxi_booking && npm run start

# Cửa sổ 2: Metro của host, bật nạp từ dev server cho id này
cd frontend/apps/customer-mobile
EXPO_PUBLIC_MINIAPP_DEV=zhaoxi.booking npx expo start --dev-client --port 8095
```

Host cần có mục trong registry với `devManifestUrl` (bước 5). Mở: Cá nhân → Mini app, hoặc `xcrun simctl openurl booted "zhaoxi://miniapp/zhaoxi.booking"`. Sửa code xong bấm **••• → Tải lại**.

## 4. Build, ký, thử bản phát hành

```bash
npm run keygen         # lần đầu, chỉ cho máy dev: tạo miniapp-signing.pem (đã .gitignore) và in public key
npm run build          # dist/ios + dist/android: bundle minify + manifest.json (+ chữ ký nếu có khoá)
npm run serve          # CDN giả http://localhost:8093/<id>/<ios|android>/manifest.json
```

- Khoá dev in ra dòng `{ keyId, publicKey }`: thêm vào `customer-mobile/src/miniapps/keys.ts` với `env: "dev"` (chỉ bản `__DEV__` tin khoá dev).
- Host `__DEV__` mặc định đọc CDN `http://localhost:8093`, nên `npm run serve` + mở mini app là thử đúng luồng thật: tải manifest → kiểm chữ ký → tải bundle → kiểm SHA-256 → cache → chạy. Tắt `serve` rồi mở lại: host chạy bản cache (nguồn "bản lưu trên máy").
- Kiểm gói trước khi upload: `npx zhaoxi-miniapp verify dist/ios/manifest.json --public-key <base64>`.

## 5. Đăng ký vào host

Thêm một mục vào `frontend/apps/customer-mobile/src/miniapps/registry.ts`:

```ts
{
  id: "zhaoxi.booking",
  title: { "vi-VN": "Đặt lịch", "en-US": "Booking", "zh-CN": "预约", "zh-TW": "預約" },
  subtitle: { "vi-VN": "…", "en-US": "…", "zh-CN": "…", "zh-TW": "…" },
  icon: "calendar-outline",          // tên Ionicons
  tint: "#0FAF7A",
  chrome: "light",                   // icon nút kính màu trắng khi đầu mini app tối, "dark" khi đầu sáng
  devManifestUrl: `http://localhost:8094/miniapp-manifest.json?platform=${Platform.OS}`,
},
```

(Khi backend có `GET /api/miniapps`, danh mục sẽ lấy từ đó và không cần phát hành host để thêm mini app.)

## 6. Phát hành

1. Tăng `version` trong `miniapp.json`.
2. CI build với **khoá prod**: `ZHAOXI_MINIAPP_SIGNING_KEY=/secrets/miniapp-prod.pem npm run build`. Khoá prod tạo một lần bằng `npx zhaoxi-miniapp keygen --out /secure/path/miniapp-prod.pem`, public key thêm vào `keys.ts` với `env: "prod"`. **Không bao giờ commit file `.pem`.**
3. `zhaoxi-miniapp verify` cho từng nền tảng.
4. Upload nguyên thư mục `dist/<platform>/` lên `${EXPO_PUBLIC_MINIAPP_CDN_URL}/<id>/<platform>/` (giữ file bundle cũ để rollback; `manifest.json` để `cache-control: no-cache`, bundle để cache lâu vì tên có version).
5. Rollback: upload lại `manifest.json` của bản trước.

Host bản release chỉ nạp manifest **có chữ ký khoá prod**, đúng `runtime`, đúng nền tảng, và bundle khớp SHA-256.

## 7. Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách sửa |
| --- | --- |
| Build: `là đường dẫn con của shared module` | Import từ gốc gói, hoặc thêm đường dẫn đó vào danh sách shared (cả hai phía). |
| Build: `chưa hỗ trợ asset cục bộ` | Đổi ảnh sang URL / base64. |
| Host: `Host ZhaoXi không chia sẻ "x"` | Gói có trong `shared-modules.json` nhưng host chưa khai ở `shared.ts` (hoặc host cũ hơn): thêm vào host. |
| Host: `cần runtime N` | SDK của mini app khác runtime host; build lại bằng SDK cùng runtime. |
| Host: "không qua được kiểm tra chữ ký" | Chưa ký / ký bằng khoá dev trên bản release / `keyId` không có trong `keys.ts` / file bị sửa sau khi build. |
| Sửa code nhưng host vẫn chạy bản cũ | Chế độ dev: kiểm `EXPO_PUBLIC_MINIAPP_DEV` có id; chế độ CDN: build lại (hash mới) và `serve`. |
