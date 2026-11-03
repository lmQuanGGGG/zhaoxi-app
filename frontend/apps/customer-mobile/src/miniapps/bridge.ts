import {
  MINIAPP_RUNTIME_VERSION,
  MiniAppPermissionError,
  type MiniAppBridge,
  type MiniAppCapsule,
  type MiniAppContext,
  type MiniAppHaptic,
  type MiniAppManifest,
  type MiniAppPermission,
  type MiniAppSource,
  type MiniAppTheme,
} from "@zhaoxi/miniapp-sdk";
import { router } from "expo-router";
import { Linking, Platform } from "react-native";
import { getAuth, isGuest, request, type AuthState } from "../api/client";
import { API_URL, APP_VERSION } from "../config";
import type { ZhaoXiLocale } from "../i18n";
import { routeForWebHref } from "../links";
import { colors, radius } from "../theme";
import { haptic as hostHaptic } from "../ui/haptics";
import { toast } from "../ui/toast";

export const miniAppTheme: MiniAppTheme = {
  colors: {
    brand: colors.brand,
    brandDeep: colors.brandDeep,
    brandSoft: colors.brandSoft,
    header: colors.header,
    bg: colors.bg,
    bgSoft: colors.bgSoft,
    surface: colors.surface,
    text: colors.text,
    ink: colors.ink,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
    danger: colors.danger,
  },
  radius: { sm: radius.sm, md: radius.md, lg: radius.xxl, pill: radius.pill },
};

const OPEN_URL_SCHEMES = /^(https?|tel|mailto|sms):/i;

export function buildMiniAppContext(input: { manifest: MiniAppManifest; source: MiniAppSource; locale: ZhaoXiLocale; auth: AuthState | null; capsule: MiniAppCapsule; launch: Record<string, string> }): MiniAppContext {
  const { manifest, auth } = input;
  const canSeeUser = manifest.permissions.includes("user.profile") && Boolean(auth);
  return {
    app: { id: manifest.id, name: manifest.name, version: manifest.version, source: input.source },
    host: { name: "ZhaoXi", appVersion: APP_VERSION, runtime: MINIAPP_RUNTIME_VERSION, platform: Platform.OS === "android" ? "android" : "ios", apiUrl: API_URL },
    locale: input.locale,
    user: canSeeUser && auth ? { id: auth.session.userId, displayName: auth.session.displayName, avatarUrl: auth.session.avatarUrl, isGuest: isGuest(auth) } : null,
    theme: miniAppTheme,
    capsule: input.capsule,
    launch: input.launch,
  };
}

/**
 * Bridge cấp cho một mini app. Quyền lấy từ manifest đã kiểm chữ ký, nên mini app
 * không thể tự nâng quyền lúc chạy.
 */
export function createMiniAppBridge(manifest: MiniAppManifest, close: () => void): MiniAppBridge {
  const granted = new Set<MiniAppPermission>(manifest.permissions);
  const need = (permission: MiniAppPermission) => {
    if (!granted.has(permission)) throw new MiniAppPermissionError(permission);
  };

  return {
    close,
    toast: (message, tone = "info") => toast(String(message).slice(0, 200), tone),
    haptic: (kind: MiniAppHaptic = "light") => {
      if (kind === "success") hostHaptic.success();
      else if (kind === "warning" || kind === "error") hostHaptic.warn();
      else if (kind === "medium") hostHaptic.select();
      else hostHaptic.tap();
    },
    openUrl: async (url) => {
      if (!OPEN_URL_SCHEMES.test(url)) throw new Error(`Không mở được URL "${url}"`);
      await Linking.openURL(url);
    },
    openHostRoute: (href) => {
      need("navigation.host");
      router.push(routeForWebHref(href));
    },
    requestLogin: () => router.push("/login"),
    request: async <T>(path: string, init: Parameters<MiniAppBridge["request"]>[1] = {}) => {
      need("api.zhaoxi");
      // Chỉ cho gọi API của ZhaoXi bằng đường dẫn tương đối: phiên của host không rời khỏi backend.
      if (!path.startsWith("/api/") || path.includes("://") || path.includes("..")) throw new Error(`Đường dẫn API không hợp lệ: ${path}`);
      return request<T>(path, {
        method: init.method || "GET",
        headers: { ...init.headers, "x-zhaoxi-miniapp": `${manifest.id}@${manifest.version}` },
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      });
    },
    getAccessToken: async () => {
      need("auth.token");
      return getAuth()?.accessToken ?? null;
    },
  };
}
