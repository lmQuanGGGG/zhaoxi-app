import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { API_URL } from "../config";
import type { ZhaoXiLocale } from "../i18n";

/**
 * Danh mục mini app host biết (tương đương `containers` trong runtime config của VSP).
 *
 * Nơi đặt bundle: `${MINIAPP_CDN_URL}/<id>/<ios|android>/manifest.json`, manifest
 * trỏ tới file bundle cạnh nó (xem `zhaoxi-miniapp build`). Giai đoạn sau, danh mục
 * này đọc từ backend (`GET /api/miniapps`), danh sách dưới đây là bản dự phòng.
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
};

export type MiniAppAudience = "partner";

/** Id mini app ZhaoXi Partner (quản lý gian hàng), dùng cho lối vào ở tab Cá nhân và push đơn hàng. */
export const PARTNER_MINIAPP_ID = "zhaoxi.partner";

/** Gốc CDN chứa bundle. Dev mặc định là `zhaoxi-miniapp serve` trên máy (cổng 8093). */
export const MINIAPP_CDN_URL = (process.env.EXPO_PUBLIC_MINIAPP_CDN_URL || (__DEV__ ? "http://localhost:8093" : `${API_URL}/miniapps`)).replace(/\/+$/, "");

/**
 * Mini app nào nạp thẳng từ dev server thay vì bundle đã ký (giống `getDebugConfig()` bên VSP):
 * `EXPO_PUBLIC_MINIAPP_DEV=zhaoxi.example,zhaoxi.partner`.
 */
const DEV_IDS = new Set(String(process.env.EXPO_PUBLIC_MINIAPP_DEV || "").split(",").map((id: string) => id.trim()).filter(Boolean));

export const miniAppRegistry: MiniAppEntry[] = [
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

export function findMiniApp(id: string | undefined) {
  return miniAppRegistry.find((entry) => entry.id === id);
}

export function manifestUrlFor(entry: MiniAppEntry) {
  return `${MINIAPP_CDN_URL}/${encodeURIComponent(entry.id)}/${Platform.OS}/manifest.json`;
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
