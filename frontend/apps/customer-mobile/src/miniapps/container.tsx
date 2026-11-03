import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, FadeIn } from "react-native-reanimated";
import type { ZhaoXiLocale } from "../i18n";
import { colors, shadow } from "../theme";
import { GlassFill } from "../ui/glass";
import type { LoadStep } from "./loader";
import type { MiniAppEntry } from "./registry";

export const CAPSULE = { width: 88, height: 34, right: 12, gap: 6 } as const;

export const containerCopy = {
  "vi-VN": {
    steps: { manifest: "Đang kiểm tra phiên bản…", download: "Đang tải mini app…", verify: "Đang xác minh chữ ký…", start: "Đang khởi động…" },
    failTitle: "Không mở được mini app",
    crashTitle: "Mini app gặp lỗi",
    offline: "Không có kết nối mạng và chưa có bản lưu trên máy.",
    integrity: "Bản tải về không qua được kiểm tra chữ ký. ZhaoXi đã chặn để bảo vệ bạn.",
    generic: "Đã có lỗi khi tải. Vui lòng thử lại.",
    retry: "Thử lại",
    close: "Đóng",
    about: "Phiên bản",
    reload: "Tải lại",
    cancel: "Huỷ",
    source: { dev: "dev server", network: "vừa tải", cache: "bản lưu trên máy" },
    unsigned: "chưa ký (chỉ bản dev)",
    unknown: "Mini app này không có trong ZhaoXi.",
  },
  "en-US": {
    steps: { manifest: "Checking for updates…", download: "Downloading mini app…", verify: "Verifying signature…", start: "Starting…" },
    failTitle: "Could not open the mini app",
    crashTitle: "The mini app crashed",
    offline: "You are offline and there is no saved copy on this device.",
    integrity: "The download failed its signature check. ZhaoXi blocked it to keep you safe.",
    generic: "Something went wrong while loading. Please try again.",
    retry: "Retry",
    close: "Close",
    about: "Version",
    reload: "Reload",
    cancel: "Cancel",
    source: { dev: "dev server", network: "just downloaded", cache: "saved copy" },
    unsigned: "unsigned (dev only)",
    unknown: "This mini app is not available in ZhaoXi.",
  },
  "zh-CN": {
    steps: { manifest: "正在检查版本…", download: "正在下载小程序…", verify: "正在校验签名…", start: "正在启动…" },
    failTitle: "无法打开小程序",
    crashTitle: "小程序出错了",
    offline: "当前无网络，且本机没有已保存的版本。",
    integrity: "下载内容未通过签名校验，赵喜已拦截以保护你的安全。",
    generic: "加载时出错，请重试。",
    retry: "重试",
    close: "关闭",
    about: "版本",
    reload: "重新加载",
    cancel: "取消",
    source: { dev: "开发服务器", network: "刚下载", cache: "本机缓存" },
    unsigned: "未签名（仅开发版）",
    unknown: "赵喜中没有这个小程序。",
  },
  "zh-TW": {
    steps: { manifest: "正在檢查版本…", download: "正在下載小程式…", verify: "正在驗證簽章…", start: "正在啟動…" },
    failTitle: "無法開啟小程式",
    crashTitle: "小程式發生錯誤",
    offline: "目前沒有網路，且本機沒有已儲存的版本。",
    integrity: "下載內容未通過簽章驗證，趙喜已攔截以保護你的安全。",
    generic: "載入時發生錯誤，請重試。",
    retry: "重試",
    close: "關閉",
    about: "版本",
    reload: "重新載入",
    cancel: "取消",
    source: { dev: "開發伺服器", network: "剛下載", cache: "本機快取" },
    unsigned: "未簽章（僅開發版）",
    unknown: "趙喜中沒有這個小程式。",
  },
} as const;

/** Nút kính "••• | ×" của host, luôn nằm trên mini app (kiểu capsule của WeChat / Zalo). */
export function MiniAppCapsuleButton({ top, chrome, onMore, onClose }: { top: number; chrome: MiniAppEntry["chrome"]; onMore: () => void; onClose: () => void }) {
  const ink = chrome === "light" ? colors.white : colors.ink;
  const tint = chrome === "light" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.78)";
  return (
    <View style={[styles.capsule, { top }]}>
      <GlassFill radius={CAPSULE.height / 2} tint={tint} />
      <Pressable accessibilityLabel="More" hitSlop={6} onPress={onMore} style={({ pressed }) => [styles.capsuleHit, pressed && styles.pressed]}>
        <Ionicons name="ellipsis-horizontal" size={18} color={ink} />
      </Pressable>
      <View style={[styles.capsuleDivider, { backgroundColor: chrome === "light" ? "rgba(255,255,255,0.35)" : "rgba(30,41,59,0.16)" }]} />
      <Pressable accessibilityLabel="Close" hitSlop={6} onPress={onClose} style={({ pressed }) => [styles.capsuleHit, pressed && styles.pressed]}>
        <Ionicons name="close" size={20} color={ink} />
      </Pressable>
    </View>
  );
}

/** Nền chung của màn chờ / lỗi: đầu petrol tan dần sang trắng như các header của host. */
function Backdrop({ children }: { children: ReactNode }) {
  return (
    <View style={styles.backdrop}>
      <LinearGradient colors={[colors.header, colors.header, colors.bgSoft]} locations={[0, 0.3, 0.62]} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

function AppTile({ entry, size = 64 }: { entry: MiniAppEntry; size?: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: `${entry.tint}1A` }]}>
      <Ionicons name={entry.icon} size={size * 0.48} color={entry.tint} />
    </View>
  );
}

function IndeterminateBar({ tint }: { tint: string }) {
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }), -1, false);
  }, [x]);
  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: -80 + x.value * 240 }] }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.bar, { backgroundColor: tint }, bar]} />
    </View>
  );
}

export function MiniAppLoading({ entry, locale, step }: { entry: MiniAppEntry; locale: ZhaoXiLocale; step: LoadStep }) {
  const c = containerCopy[locale];
  return (
    <Backdrop>
      <Animated.View entering={FadeIn.duration(220)} style={[styles.card, shadow("card")]}>
        <AppTile entry={entry} />
        <Text style={styles.cardTitle}>{entry.title[locale]}</Text>
        <Text style={styles.cardBody}>{c.steps[step]}</Text>
        <IndeterminateBar tint={entry.tint} />
      </Animated.View>
    </Backdrop>
  );
}

export function MiniAppFailure({ entry, locale, title, message, detail, onRetry, onClose }: { entry?: MiniAppEntry; locale: ZhaoXiLocale; title: string; message: string; detail?: string; onRetry?: () => void; onClose: () => void }) {
  const c = containerCopy[locale];
  return (
    <Backdrop>
      <Animated.View entering={FadeIn.duration(220)} style={[styles.card, shadow("card")]}>
        <View style={[styles.tile, { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.dangerSoft }]}>
          <Ionicons name="warning-outline" size={30} color={colors.dangerText} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBody}>{message}</Text>
        {entry ? <Text style={styles.cardMeta}>{entry.id}</Text> : null}
        {__DEV__ && detail ? <Text style={styles.detail} numberOfLines={8}>{detail}</Text> : null}
        <View style={styles.actions}>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>{c.close}</Text>
          </Pressable>
          {onRetry ? (
            <Pressable onPress={onRetry} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>{c.retry}</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </Backdrop>
  );
}

type BoundaryProps = { children: ReactNode; fallback: (error: Error, reset: () => void) => ReactNode; onError?: (error: Error, info: ErrorInfo) => void };

/** Lỗi render của mini app dừng ở đây, host vẫn chạy bình thường. */
export class MiniAppErrorBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) return this.props.fallback(this.state.error, this.reset);
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  capsule: { position: "absolute", right: CAPSULE.right, width: CAPSULE.width, height: CAPSULE.height, borderRadius: CAPSULE.height / 2, flexDirection: "row", alignItems: "center", zIndex: 50 },
  capsuleHit: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center" },
  capsuleDivider: { width: StyleSheet.hairlineWidth * 2, height: 16 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, backgroundColor: colors.bgSoft },
  card: { width: "100%", maxWidth: 360, alignItems: "center", backgroundColor: colors.surface, borderRadius: 28, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, gap: 10 },
  tile: { alignItems: "center", justifyContent: "center", marginBottom: 4 },
  cardTitle: { fontSize: 19, fontWeight: "800", color: colors.ink, textAlign: "center" },
  cardBody: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: "center" },
  cardMeta: { fontSize: 12, color: colors.textMuted },
  detail: { alignSelf: "stretch", fontSize: 11, color: colors.slate, backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 10, fontFamily: "Menlo" },
  track: { width: 160, height: 4, borderRadius: 2, backgroundColor: colors.borderSoft, overflow: "hidden", marginTop: 8 },
  bar: { width: 80, height: 4, borderRadius: 2 },
  actions: { flexDirection: "row", gap: 10, marginTop: 10, alignSelf: "stretch" },
  primary: { flex: 1, height: 46, borderRadius: 23, backgroundColor: colors.wechat, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  secondary: { flex: 1, height: 46, borderRadius: 23, backgroundColor: colors.bgSoft, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
});
