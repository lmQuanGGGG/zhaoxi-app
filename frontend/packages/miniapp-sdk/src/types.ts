/**
 * Hợp đồng giữa host ZhaoXi (customer-mobile) và mini app.
 *
 * Tăng `MINIAPP_RUNTIME_VERSION` khi đổi danh sách shared module hoặc chữ ký
 * `MiniAppProps` theo kiểu không tương thích ngược: host từ chối bundle build
 * cho runtime khác.
 */
export const MINIAPP_RUNTIME_VERSION = 1;

export type MiniAppPlatform = "ios" | "android";
export type MiniAppLocale = "vi-VN" | "zh-CN" | "zh-TW" | "en-US";

/**
 * Quyền mini app khai trong `miniapp.json`. Quyền nằm trong phần được ký của
 * manifest, nên CDN không tự nâng quyền được.
 * - `user.profile`: nhận id / tên / avatar của người dùng trong `context.user`.
 * - `api.zhaoxi`: gọi backend ZhaoXi qua `bridge.request` bằng phiên của host (không thấy token).
 * - `auth.token`: lấy access token thô qua `bridge.getAccessToken` (chỉ cấp cho mini app nội bộ).
 * - `navigation.host`: mở màn hình của host bằng `bridge.openHostRoute`.
 * - `auth.handoff`: xin mã đổi vai trò một lần (`bridge.createRoleHandoff`) để mini app tự lấy phiên
 *   riêng (ví dụ phiên partner) của cùng tài khoản, không cần đăng nhập lại và không thấy token của host.
 * - `notifications.push`: lấy Expo push token **của host** (`bridge.getPushToken`) để đăng ký với backend của
 *   mini app (ví dụ `/api/partner-push/mobile`). Host nhớ mini app đã nhận token và gỡ đăng ký khi người dùng
 *   đăng xuất / đổi tài khoản / mất quyền. Push gửi tới token này nên có `data.miniappId` để host mở đúng mini app.
 */
export type MiniAppPermission = "user.profile" | "api.zhaoxi" | "auth.token" | "navigation.host" | "auth.handoff" | "notifications.push";
export const MINIAPP_PERMISSIONS: readonly MiniAppPermission[] = ["user.profile", "api.zhaoxi", "auth.token", "navigation.host", "auth.handoff", "notifications.push"];

export type MiniAppSource = "dev" | "network" | "cache";

export interface MiniAppUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isGuest: boolean;
}

export interface MiniAppTheme {
  colors: {
    brand: string;
    brandDeep: string;
    brandSoft: string;
    header: string;
    bg: string;
    bgSoft: string;
    surface: string;
    text: string;
    ink: string;
    textSecondary: string;
    textMuted: string;
    danger: string;
  };
  radius: { sm: number; md: number; lg: number; pill: number };
}

/** Khung nút kính "••• | ×" host vẽ ở góc phải trên; header của mini app chừa chỗ này. */
export interface MiniAppCapsule {
  top: number;
  right: number;
  width: number;
  height: number;
}

export interface MiniAppContext {
  app: { id: string; name: string; version: string; source: MiniAppSource };
  /** `apiUrl`: gốc backend ZhaoXi host đang dùng (mỗi môi trường một URL, không nhúng cứng vào bundle). */
  host: { name: "ZhaoXi"; appVersion: string; runtime: number; platform: MiniAppPlatform; apiUrl: string };
  locale: MiniAppLocale;
  /** `null` khi mini app không có quyền `user.profile` hoặc chưa có phiên. */
  user: MiniAppUser | null;
  theme: MiniAppTheme;
  capsule: MiniAppCapsule;
  /** Tham số mở mini app (`zhaoxi://miniapp/<id>?screen=orders&id=42` → `{ screen: "orders", id: "42" }`), từ deep link hoặc push. */
  launch: Record<string, string>;
}

export interface MiniAppRequestInit {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Gửi dạng JSON. */
  body?: unknown;
  headers?: Record<string, string>;
}

/** Vai trò mini app được xin phiên qua `bridge.createRoleHandoff`. */
export type MiniAppHandoffRole = "partner";

/**
 * Mã đổi vai trò một lần (backend `POST /api/auth/role-switch/create`, sống 60 s).
 * Mini app đổi mã lấy phiên bằng `POST ${context.host.apiUrl}/api/auth/role-switch/exchange { code, deviceId }`.
 */
export interface MiniAppRoleHandoff {
  code: string;
  role: MiniAppHandoffRole;
  expiresAt: string;
}

/**
 * Kết quả `bridge.getPushToken`. `token` null kèm lý do: `simulator` (máy ảo không có Expo token),
 * `denied` (người dùng tắt thông báo), `no-project` (bản host thiếu EAS projectId), `signed-out` (khách chưa
 * đăng nhập hoặc là guest), `error`.
 */
export interface MiniAppPushToken {
  token: string | null;
  platform: MiniAppPlatform;
  reason: "" | "simulator" | "denied" | "no-project" | "signed-out" | "error";
}

export type MiniAppToastTone = "success" | "error" | "info";
export type MiniAppHaptic = "light" | "medium" | "success" | "warning" | "error";

export interface MiniAppBridge {
  /** Đóng mini app, quay về màn host trước đó. */
  close(): void;
  toast(message: string, tone?: MiniAppToastTone): void;
  haptic(kind?: MiniAppHaptic): void;
  /** Mở URL ngoài (http/https/tel/mailto) bằng hệ điều hành. */
  openUrl(url: string): Promise<void>;
  /** Cần `navigation.host`. Nhận đường dẫn kiểu PWA (`/coupons`, `/order/123`). */
  openHostRoute(href: string): void;
  /** Mở màn đăng nhập của host (khách đang là guest). */
  requestLogin(): void;
  /** Cần `api.zhaoxi`. Gọi `${API_URL}${path}` với phiên của host, trả `data` của envelope `{ ok, data }`. */
  request<T>(path: string, init?: MiniAppRequestInit): Promise<T>;
  /** Cần `auth.token`. */
  getAccessToken(): Promise<string | null>;
  /**
   * Cần `auth.handoff`. Host dùng phiên của nó xin mã đổi sang `role` cho chính người dùng đang đăng nhập;
   * backend chỉ cấp khi tài khoản có quyền vai trò đó (partner: là thành viên một gian hàng đang hoạt động).
   * Lỗi khi khách là guest hoặc không có quyền.
   */
  createRoleHandoff(role: MiniAppHandoffRole): Promise<MiniAppRoleHandoff>;
  /**
   * Cần `notifications.push`. Expo push token của host (xin quyền thông báo nếu chưa có). Mini app tự đăng ký
   * token với backend bằng phiên của nó; push tới token này hiện như thông báo của app ZhaoXi, chạm vào thì host
   * mở `zhaoxi://miniapp/<data.miniappId>?screen=…&order=…`. Host bản cũ không có hàm này (kiểm `typeof`).
   */
  getPushToken(): Promise<MiniAppPushToken>;
}

/** Props host truyền cho component default export của mini app. */
export interface MiniAppProps {
  context: MiniAppContext;
  bridge: MiniAppBridge;
}

export class MiniAppPermissionError extends Error {
  constructor(readonly permission: MiniAppPermission) {
    super(`Mini app chưa khai quyền "${permission}" trong miniapp.json`);
    this.name = "MiniAppPermissionError";
  }
}

/**
 * Manifest phát hành của một bản build cho một nền tảng
 * (`dist/<platform>/manifest.json`). Host tải file này trước, rồi bundle.
 */
export interface MiniAppManifest {
  schema: 1;
  id: string;
  name: string;
  version: string;
  runtime: number;
  platform: MiniAppPlatform;
  /** Tên file bundle cạnh manifest, hoặc URL tuyệt đối. */
  bundle: string;
  /** SHA-256 (hex) của bundle. */
  sha256: string;
  size: number;
  permissions: MiniAppPermission[];
  minHostVersion?: string;
  builtAt: string;
  /** Có khi bản build đã ký. */
  keyId?: string;
  /** Ed25519, base64, trên `manifestSigningPayload(manifest)`. */
  signature?: string;
}

/**
 * Chuỗi được ký: ràng buộc id, phiên bản, nền tảng, runtime, hash bundle và quyền.
 * `tools/cli.mjs` có bản sao y hệt; đổi một nơi phải đổi cả nơi kia.
 */
export function manifestSigningPayload(manifest: Pick<MiniAppManifest, "id" | "version" | "platform" | "runtime" | "sha256" | "permissions">): string {
  return ["zhaoxi-miniapp:v1", manifest.id, manifest.version, manifest.platform, String(manifest.runtime), manifest.sha256.toLowerCase(), [...manifest.permissions].sort().join(",")].join("\n");
}
