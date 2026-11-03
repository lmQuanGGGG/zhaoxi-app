import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import type { MiniAppCatalogItem } from "../api/types";
import { API_URL } from "../config";
import type { ZhaoXiLocale } from "../i18n";

/**
 * Danh mục mini app host biết (tương đương `containers` trong runtime config của VSP).
 *
 * Nguồn chính là backend `GET /api/miniapps` (registry, quản lý ở web admin → "Mini app"):
 * `access.ts` hỏi danh mục rồi `applyMiniAppCatalog` cập nhật `miniAppRegistry` tại chỗ.
 * `fallbackMiniApps` bên dưới chỉ là bản dự phòng khi chưa hỏi được backend (mất mạng lần đầu,
 * backend chưa chạy migration registry).
 *
 * Nơi đặt bundle: `${MINIAPP_CDN_URL}/<id>/<ios|android>/manifest.json[?v=<version>]`, manifest
 * trỏ tới file bundle cạnh nó (xem `zhaoxi-miniapp build`).
 */
export type MiniAppEntry = {
  id: string;
  title: Record<ZhaoXiLocale, string>;
  subtitle: Record<ZhaoXiLocale, string>;
  icon: ComponentProps<typeof Ionicons>["name"];
  tint: string;
  /** Màu biểu tượng trên nút kính "••• ×": `light` khi đầu mini app tối. */
  chrome: "light" | "dark";
  /** Metro dev server của mini app (`npm run start` trong thư mục mini app); chỉ dùng ở `__DEV__`. */
  devManifestUrl?: string;
  /**
   * Chỉ một nhóm người dùng thấy và mở được (xem `access.ts`). `partner`: tài khoản có vai trò
   * partner hoặc là thành viên một gian hàng đang hoạt động. Bỏ trống: mọi người.
   */
  audience?: MiniAppAudience;
  /** Bản backend chọn cho người dùng này (rollout %); không có thì CDN trả bản ổn định. */
  release?: { version: string };
};

/** `members`: đã đăng nhập (không phải guest); `partner`: xem `access.ts`; `internal`: tài khoản có vai trò admin. */
export type MiniAppAudience = "members" | "partner" | "internal";

/** Id mini app ZhaoXi Partner (quản lý gian hàng), dùng cho lối vào ở tab Cá nhân và push đơn hàng. */
export const PARTNER_MINIAPP_ID = "zhaoxi.partner";

/** Gốc CDN chứa bundle. Dev mặc định là `zhaoxi-miniapp serve` trên máy (cổng 8093). */
export const MINIAPP_CDN_URL = (process.env.EXPO_PUBLIC_MINIAPP_CDN_URL || (__DEV__ ? "http://localhost:8093" : `${API_URL}/miniapps`)).replace(/\/+$/, "");

/**
 * Mini app nào nạp thẳng từ dev server thay vì bundle đã ký (giống `getDebugConfig()` bên VSP):
 * `EXPO_PUBLIC_MINIAPP_DEV=zhaoxi.example,zhaoxi.partner`.
 */
const DEV_IDS = new Set(String(process.env.EXPO_PUBLIC_MINIAPP_DEV || "").split(",").map((id: string) => id.trim()).filter(Boolean));

/** Bản dự phòng đi kèm bản build host. */
export const fallbackMiniApps: readonly MiniAppEntry[] = [
  {
    id: "zhaoxi.example",
    title: { "vi-VN": "Mini app mẫu", "en-US": "Sample mini app", "zh-CN": "示例小程序", "zh-TW": "範例小程式" },
    subtitle: {
      "vi-VN": "Template để dựng mini app mới cho ZhaoXi",
      "en-US": "Template for building new ZhaoXi mini apps",
      "zh-CN": "创建赵喜新小程序的模板",
      "zh-TW": "建立趙喜新小程式的範本",
    },
    icon: "cube-outline",
    tint: "#0FAF7A",
    chrome: "light",
    devManifestUrl: `http://localhost:8092/miniapp-manifest.json?platform=${Platform.OS}`,
  },
  {
    id: PARTNER_MINIAPP_ID,
    title: { "vi-VN": "Quản lý gian hàng", "en-US": "Store manager", "zh-CN": "店铺管理", "zh-TW": "店鋪管理" },
    subtitle: {
      "vi-VN": "ZhaoXi Partner: nhận đơn, nhắn khách, xem doanh thu",
      "en-US": "ZhaoXi Partner: take orders, chat with customers, see revenue",
      "zh-CN": "赵喜商家版：接单、与顾客沟通、查看营业额",
      "zh-TW": "趙喜商家版：接單、與顧客溝通、查看營業額",
    },
    icon: "storefront-outline",
    tint: "#0B8F55",
    chrome: "light",
    audience: "partner",
    devManifestUrl: `http://localhost:8094/miniapp-manifest.json?platform=${Platform.OS}`,
  },
];

/**
 * Danh mục đang dùng. Mảng và các object entry được giữ nguyên danh tính (cập nhật tại chỗ),
 * để màn hình đang giữ tham chiếu (tab Cá nhân, màn chứa) thấy dữ liệu mới khi render lại.
 */
export const miniAppRegistry: MiniAppEntry[] = [...fallbackMiniApps];

const LOCALES: ZhaoXiLocale[] = ["vi-VN", "en-US", "zh-CN", "zh-TW"];
const TINT = /^#[0-9A-Fa-f]{6}$/;
let appliedCatalog: readonly MiniAppCatalogItem[] | null = null;
let catalogIds: ReadonlySet<string> = new Set();

function localized(texts: MiniAppCatalogItem["title"], fallback: Record<ZhaoXiLocale, string> | undefined, last: string) {
  return Object.fromEntries(LOCALES.map((locale) => [locale, texts[locale] || fallback?.[locale] || texts["vi-VN"] || texts["en-US"] || last])) as Record<ZhaoXiLocale, string>;
}

/**
 * Áp danh mục backend vào `miniAppRegistry` (gọi lại với cùng mảng thì không làm gì) và trả tập id
 * người dùng này được mở. Backend đã lọc theo quyền và chỉ trả mini app có bản phát hành cho nền tảng này.
 * Bản `__DEV__` giữ thêm các mục dự phòng backend không có, để thử với `zhaoxi-miniapp serve` cục bộ.
 */
export function applyMiniAppCatalog(items: readonly MiniAppCatalogItem[]): ReadonlySet<string> {
  if (items === appliedCatalog) return catalogIds;
  const current = new Map(miniAppRegistry.map((entry) => [entry.id, entry]));
  const next: MiniAppEntry[] = [];
  for (const item of items) {
    if (next.some((entry) => entry.id === item.id)) continue;
    const fallback = fallbackMiniApps.find((entry) => entry.id === item.id);
    const entry = current.get(item.id) ?? fallback ?? ({ id: item.id } as MiniAppEntry);
    Object.assign(entry, {
      title: localized(item.title, fallback?.title, item.id),
      subtitle: localized(item.subtitle, fallback?.subtitle, ""),
      icon: item.icon in Ionicons.glyphMap ? (item.icon as MiniAppEntry["icon"]) : fallback?.icon ?? "apps-outline",
      tint: TINT.test(item.tint) ? item.tint : fallback?.tint ?? "#0FAF7A",
      chrome: item.chrome === "dark" ? "dark" : "light",
      audience: item.audience ?? undefined,
      devManifestUrl: fallback?.devManifestUrl,
      release: { version: item.release.version },
    } satisfies Omit<MiniAppEntry, "id">);
    next.push(entry);
  }
  if (__DEV__) for (const entry of fallbackMiniApps) if (!next.includes(entry)) next.push(entry);
  miniAppRegistry.splice(0, miniAppRegistry.length, ...next);
  appliedCatalog = items;
  catalogIds = new Set(items.map((item) => item.id));
  return catalogIds;
}

export function findMiniApp(id: string | undefined) {
  return miniAppRegistry.find((entry) => entry.id === id);
}

export function manifestUrlFor(entry: MiniAppEntry) {
  const url = `${MINIAPP_CDN_URL}/${encodeURIComponent(entry.id)}/${Platform.OS}/manifest.json`;
  // `?v=` giữ đúng bản rollout backend chọn; bản đó bị rollback thì backend trả bản ổn định.
  return entry.release ? `${url}?v=${encodeURIComponent(entry.release.version)}` : url;
}

// Mini app đang mở (màn `/miniapp/[id]` còn trong stack). Push của mini app đang mở do chính nó xử lý,
// host không mở thêm một bản nữa.
const openCounts = new Map<string, number>();

export function markMiniAppOpen(id: string) {
  openCounts.set(id, (openCounts.get(id) ?? 0) + 1);
  return () => {
    const next = (openCounts.get(id) ?? 1) - 1;
    if (next > 0) openCounts.set(id, next);
    else openCounts.delete(id);
  };
}

export function isMiniAppOpen(id: string) {
  return openCounts.has(id);
}

export function usesDevServer(entry: MiniAppEntry) {
  return __DEV__ && Boolean(entry.devManifestUrl) && DEV_IDS.has(entry.id);
}
