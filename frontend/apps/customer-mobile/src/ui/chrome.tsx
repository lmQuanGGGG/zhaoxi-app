import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, usePathname } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logout } from "../api/client";
import { useCart } from "../cart";
import { useSession, useUnread } from "../hooks";
import { useI18n } from "../i18n";
import { unregisterPush } from "../notifications";
import { queryClient } from "../query";
import { colors, shadow } from "../theme";
import { CartIcon, ZxIcon, type ZxIconName } from "./icons";

const roleLabel: Record<string, string> = { "vi-VN": "Khách hàng", "en-US": "Customer", "zh-CN": "客户", "zh-TW": "客戶" };
const localeShort: Record<string, string> = { "vi-VN": "VI", "en-US": "EN", "zh-CN": "ZH", "zh-TW": "ZH-TW" };

/** Height of the global top bar below the status bar. */
export const TOPBAR_HEIGHT = 60;

/** `zx-global-topbar` from the PWA: glass bar with brand, language, cart, bell and sign-out. */
export function TopBar() {
  const insets = useSafeAreaInsets();
  const { locale, t } = useI18n();
  const { session, guest } = useSession();
  const cart = useCart();
  const unread = useUnread();
  const name = session?.displayName || "ZhaoXi Guest";

  const onSignOut = () => {
    if (guest) return router.push("/login");
    Alert.alert(t.profile.signOut, "", [
      { text: t.common.cancel, style: "cancel" },
      { text: t.profile.signOut, style: "destructive", onPress: async () => { await logout(locale, unregisterPush); queryClient.clear(); } },
    ]);
  };

  return (
    <View style={[styles.topbar, { paddingTop: insets.top + 8 }, shadow("soft")]}>
      <View style={[StyleSheet.absoluteFill, styles.topbarRadius]}>
        {Platform.OS === "ios" ? <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.topbar }]} />
      </View>
      <View style={styles.topbarRow}>
        <Pressable onPress={() => router.navigate("/")} style={styles.brand} hitSlop={6}>
          <Image source={require("../../assets/brand-logo.png")} style={styles.logo} contentFit="cover" />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.brandName}>ZHAOXI</Text>
            <Text style={styles.brandSub} numberOfLines={1}>{roleLabel[locale]} · {name}</Text>
          </View>
        </Pressable>
        <View style={styles.actions}>
          <Pressable onPress={() => router.push("/language")} style={styles.langPill}><Text style={styles.langText}>{localeShort[locale]}</Text></Pressable>
          <TopIcon label={t.cart.title} badge={cart.count} onPress={() => router.push("/cart")}><CartIcon size={18} color="#374151" /></TopIcon>
          <TopIcon label={t.notifications.title} badge={unread.data?.notifications || 0} onPress={() => router.push("/notifications")}><ZxIcon name="bell" size={18} color="#374151" /></TopIcon>
          <TopIcon label={t.profile.signOut} onPress={onSignOut}><ZxIcon name="logout" size={18} color={colors.danger} /></TopIcon>
        </View>
      </View>
    </View>
  );
}

function TopIcon({ children, onPress, badge = 0, label }: { children: ReactNode; onPress: () => void; badge?: number; label: string }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.topIcon, shadow("card"), pressed && { transform: [{ scale: 0.94 }] }]}>
      {children}
      {badge > 0 ? <View style={styles.topBadge}><Text style={styles.topBadgeText}>{badge > 99 ? "99+" : badge}</Text></View> : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Floating dock (`zx-customer-dock`): 4 glass tabs + the services "gem" button
// ---------------------------------------------------------------------------
const dockItems: Array<{ href: "/" | "/orders" | "/messages" | "/profile"; icon: ZxIconName; key: "home" | "orders" | "messages" | "profile" }> = [
  { href: "/", icon: "home", key: "home" },
  { href: "/orders", icon: "orders", key: "orders" },
  { href: "/messages", icon: "messages", key: "messages" },
  { href: "/profile", icon: "profile", key: "profile" },
];

const HIDDEN_DOCK = [/^\/onboarding/, /^\/login/, /^\/request\//, /^\/request-success/, /^\/chat\//, /^\/language/];

export const DOCK_SPACE = 104;

export function Dock() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const unread = useUnread();
  if (HIDDEN_DOCK.some((pattern) => pattern.test(pathname))) return null;
  const labels = { home: t.tabs.home, orders: t.tabs.orders, messages: t.tabs.messages, profile: t.tabs.profile };
  return (
    <View pointerEvents="box-none" style={[styles.dockWrap, { bottom: Math.max(insets.bottom - 12, 10) }]}>
      <View style={[styles.dockPill, shadow("dock")]}>
        <GlassFill intensity={45} />
        {dockItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return <DockButton key={item.key} label={labels[item.key]} icon={item.icon} active={active} badge={item.key === "messages" ? unread.data?.messages || 0 : 0} onPress={() => router.navigate(item.href)} />;
        })}
      </View>
      <Pressable accessibilityLabel={t.services.title} onPress={() => router.push("/services")} style={({ pressed }) => [styles.gemButton, shadow("dock"), pressed && { transform: [{ scale: 0.94 }] }]}>
        <GlassFill intensity={50} />
        <ServicesGem />
      </Pressable>
    </View>
  );
}

function DockButton({ icon, active, onPress, badge, label }: { icon: ZxIconName; active: boolean; onPress: () => void; badge: number; label: string }) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => { progress.value = withSpring(active ? 1 : 0, { damping: 16, stiffness: 220 }); }, [active, progress]);
  const glow = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: 0.7 + progress.value * 0.3 }] }));
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} style={styles.dockButton}>
      <Animated.View style={[styles.dockGlow, glow]} />
      <ZxIcon name={icon} size={active ? 23 : 21} color={active ? colors.brandDeep : colors.textMuted} strokeWidth={active ? 2.25 : 1.85} />
      {badge ? <View style={styles.dockBadge}><Text style={styles.topBadgeText}>{badge > 99 ? "99+" : badge}</Text></View> : null}
    </Pressable>
  );
}

const gems: Array<{ colors: [string, string]; left: number; top: number; rotate: string }> = [
  { colors: ["#73E3C5", "#2EAA86"], left: 0, top: 4, rotate: "-8deg" },
  { colors: ["#FFE07B", "#EDA928"], left: 17, top: 0, rotate: "10deg" },
  { colors: ["#66D8EF", "#3987E5"], left: 4, top: 20, rotate: "-12deg" },
  { colors: ["#BDEB72", "#53AE52"], left: 20, top: 17, rotate: "8deg" },
];

/** Frosted fill clipped to a pill/circle (BlurView ignores borderRadius on its own). */
function GlassFill({ intensity }: { intensity: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: 999, overflow: "hidden" }]}>
      {Platform.OS === "ios" ? <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, styles.dockGlass]} />
    </View>
  );
}

export function ServicesGem({ size = 38 }: { size?: number }) {
  const scale = size / 38;
  return (
    <View style={{ width: size, height: size }}>
      {gems.map((gem, index) => (
        <View key={index} style={[styles.gem, { left: gem.left * scale, top: gem.top * scale, width: 18 * scale, height: 18 * scale, borderRadius: 6 * scale, transform: [{ rotate: gem.rotate }] }]}>
          <LinearGradient colors={gem.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 6 * scale }]} />
          <View style={styles.gemShine} />
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Page header (`CustomerPageHeader`)
// ---------------------------------------------------------------------------
export function PageHeader({ title, subtitle, back = true, eyebrow = "ZHAOXI", right, onBack }: { title: string; subtitle?: string; back?: boolean; eyebrow?: string | null; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.pageHeader}>
      {back ? (
        <Pressable accessibilityLabel="Back" onPress={() => (onBack ? onBack() : router.canGoBack() ? router.back() : router.navigate("/"))} style={({ pressed }) => [styles.backButton, pressed && { transform: [{ scale: 0.94 }] }]}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.pageTitle} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle} numberOfLines={4}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>{right}</View> : null}
    </View>
  );
}

export function BackButton({ onPress, style }: { onPress?: () => void; style?: object }) {
  return (
    <Pressable accessibilityLabel="Back" onPress={() => (onPress ? onPress() : router.canGoBack() ? router.back() : router.navigate("/"))} style={({ pressed }) => [styles.backButton, { backgroundColor: "#F8FAFC" }, style, pressed && { transform: [{ scale: 0.94 }] }]}>
      <Text style={styles.backGlyph}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topbar: { paddingHorizontal: 8, paddingBottom: 7, zIndex: 20 },
  topbarRadius: { borderBottomLeftRadius: 17, borderBottomRightRadius: 17, overflow: "hidden" },
  topbarRow: { height: 45, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  brand: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  logo: { width: 34, height: 34, borderRadius: 11 },
  brandName: { fontSize: 13, fontWeight: "700", color: colors.navy, letterSpacing: 0.4 },
  brandSub: { fontSize: 9.5, fontWeight: "600", color: "#6B7890", marginTop: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  langPill: { minWidth: 37, height: 32, borderRadius: 12, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, borderWidth: 1, borderColor: "#E5E7EB", ...shadow("card") },
  langText: { fontSize: 9, fontWeight: "700", color: colors.navy },
  topIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.86)", alignItems: "center", justifyContent: "center" },
  topBadge: { position: "absolute", top: -6, right: -5, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.white },
  topBadgeText: { color: colors.white, fontSize: 8, fontWeight: "900" },
  dockWrap: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4 },
  dockPill: { width: 244, height: 64, borderRadius: 999, flexDirection: "row", alignItems: "center", padding: 5, overflow: Platform.OS === "android" ? "hidden" : "visible" },
  dockGlass: { borderRadius: 999, backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: "rgba(255,255,255,0.78)" },
  dockButton: { flex: 1, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  dockGlow: { position: "absolute", width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(15,175,122,0.09)", shadowColor: "#0FAF7A", shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  dockBadge: { position: "absolute", top: 6, right: 8, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.white },
  gemButton: { width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center" },
  gem: { position: "absolute", overflow: "hidden", shadowColor: "#18211E", shadowOpacity: 0.18, shadowRadius: 2.5, shadowOffset: { width: 0, height: 2 } },
  gemShine: { position: "absolute", left: 2, right: 2, top: 1, height: 1, backgroundColor: "rgba(255,255,255,0.65)", borderRadius: 1 },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  backButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  backGlyph: { fontSize: 24, lineHeight: 26, color: colors.ink, fontWeight: "500", marginTop: -2 },
  eyebrow: { fontSize: 10, color: colors.brand, letterSpacing: 1, fontWeight: "500" },
  pageTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 1 },
  pageSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
});
