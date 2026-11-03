import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { GlassView } from "expo-glass-effect";
import { Alert, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logout } from "../api/client";
import { useCart } from "../cart";
import { useSession, useUnread } from "../hooks";
import { useI18n } from "../i18n";
import { unregisterPush } from "../notifications";
import { queryClient } from "../query";
import { colors, shadow } from "../theme";
import { GlassFill, LIQUID_GLASS } from "./glass";
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
    <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
      <LightStatusBar />
      <View style={styles.topbarRow}>
        <Pressable onPress={() => router.navigate("/")} style={styles.brand} hitSlop={6}>
          <Image source={require("../../assets/brand-logo.png")} style={styles.logo} contentFit="cover" />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.brandName}>ZHAOXI</Text>
            <Text style={styles.brandSub} numberOfLines={1}>{roleLabel[locale]} · {name}</Text>
          </View>
        </Pressable>
        <View style={styles.actions}>
          <Pressable onPress={() => router.push("/language")} style={({ pressed }) => [styles.langPill, pressed && { transform: [{ scale: 0.94 }] }]}><GlassFill radius={17} tint={HEADER_GLASS} /><Text style={styles.langText}>{localeShort[locale]}</Text></Pressable>
          <TopIcon label={t.cart.title} badge={cart.count} onPress={() => router.push("/cart")}><CartIcon size={18} color={colors.white} /></TopIcon>
          <TopIcon label={t.notifications.title} badge={unread.data?.notifications || 0} onPress={() => router.push("/notifications")}><ZxIcon name="bell" size={18} color={colors.white} /></TopIcon>
          <TopIcon label={t.profile.signOut} onPress={onSignOut}><ZxIcon name="logout" size={18} color="#FFB4A6" /></TopIcon>
        </View>
      </View>
    </View>
  );
}

/** Light status bar over the petrol header only while this screen is focused (root layout keeps "dark"). */
function LightStatusBar() {
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  return focused ? <StatusBar style="light" /> : null;
}

/**
 * Pushed (non-tab) screens drop the global top bar and dock: only a petrol strip
 * behind the status bar stays fixed, the page's own back button + title follow.
 */
/** Petrol behind the status bar that melts into whatever the pushed screen starts with (photo or page). */
export function StatusStrip() {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.statusStrip, { height: insets.top + STRIP_FADE }]}>
      <LightStatusBar />
      <LinearGradient
        colors={[colors.header, colors.header, "rgba(0,50,58,0.55)", "rgba(0,50,58,0)"]}
        locations={[0, insets.top / (insets.top + STRIP_FADE), (insets.top + STRIP_FADE * 0.4) / (insets.top + STRIP_FADE), 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const STRIP_FADE = 34;

const HEADER_GLASS = "rgba(255,255,255,0.22)";
const OVERSCROLL = 600;
const FADE = 170;

/**
 * Home-style petrol band that scrolls with the page: solid header colour above
 * and behind its parent (covering pull-to-refresh overscroll), then melting into
 * the page colour below. Render it first inside the block it should sit behind.
 */
export function HeaderFade({ soft = false }: { soft?: boolean }) {
  const [height, setHeight] = useState<number | null>(null);
  const total = OVERSCROLL + (height ?? 0) + FADE;
  const solid = (OVERSCROLL + (height ?? 0)) / total;
  const end = soft ? colors.bgSoft : colors.bg;
  return (
    <View pointerEvents="none" style={styles.fadeHost} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
      {height !== null ? (
        <LinearGradient
          colors={[colors.header, colors.header, "#0A4A52", "#5E9C9E", "#BCD9D7", end]}
          locations={[0, solid, solid + 0.12 * (1 - solid), solid + 0.42 * (1 - solid), solid + 0.72 * (1 - solid), 1]}
          style={{ position: "absolute", left: -60, right: -60, top: -OVERSCROLL, height: total }}
        />
      ) : null}
    </View>
  );
}

function TopIcon({ children, onPress, badge = 0, label }: { children: ReactNode; onPress: () => void; badge?: number; label: string }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.topIcon, pressed && { transform: [{ scale: 0.94 }] }]}>
      <GlassFill radius={17} tint={HEADER_GLASS} />
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


export const DOCK_SPACE = 104;

const DOCK_WIDTH = 268;
const DOCK_PAD = 5;
const ITEM_WIDTH = (DOCK_WIDTH - DOCK_PAD * 2) / dockItems.length;

/**
 * Floating tab bar. On iOS 26+ it is real Liquid Glass (refracts and reflects the
 * content scrolling underneath, reacts to touch) with the services button merged
 * into the same glass container; older iOS / Android fall back to a frosted blur.
 */
export function Dock() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const unread = useUnread();
  const index = dockItems.findIndex((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)));
  const slot = useSharedValue(Math.max(index, 0));
  useEffect(() => { if (index >= 0) slot.value = withSpring(index, { damping: 18, stiffness: 210, mass: 0.8 }); }, [index, slot]);
  const lens = useAnimatedStyle(() => ({ transform: [{ translateX: slot.value * ITEM_WIDTH }] }));
  // Tab roots + the services hub only. The dock stays mounted and just slides away on
  // pushed screens: re-creating the Liquid Glass views on every return made it appear late.
  const visible = (index >= 0 && dockItems[index].href === pathname) || pathname === "/services";
  const shown = useSharedValue(visible ? 1 : 0);
  useEffect(() => { shown.value = withTiming(visible ? 1 : 0, { duration: visible ? 220 : 160 }); }, [visible, shown]);
  const slide = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * 110 }] }));
  const labels = { home: t.tabs.home, orders: t.tabs.orders, messages: t.tabs.messages, profile: t.tabs.profile };
  // The glass is a non-touchable backdrop; the buttons sit in plain views above it.
  // Pressables nested inside GlassView let taps fall through to the page on iOS 26+.
  return (
    <Animated.View pointerEvents={visible ? "box-none" : "none"} style={[styles.dockWrap, { bottom: Math.max(insets.bottom - 14, 10) }, slide]}>
      <View style={styles.dockRow}>
        <View style={[styles.dockPill, !LIQUID_GLASS && shadow("dock")]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}><GlassSurface style={[StyleSheet.absoluteFill, { borderRadius: 32 }]} /></View>
          {index >= 0 ? <Animated.View pointerEvents="none" style={[styles.dockLens, lens]} /> : null}
          {dockItems.map((item, i) => (
            <DockButton key={item.key} label={labels[item.key]} icon={item.icon} active={i === index} badge={item.key === "messages" ? unread.data?.messages || 0 : 0} onPress={() => router.navigate(item.href)} />
          ))}
        </View>
        <View style={[styles.gemButton, !LIQUID_GLASS && shadow("dock")]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}><GlassSurface style={[StyleSheet.absoluteFill, { borderRadius: 32 }]} /></View>
          <Pressable accessibilityLabel={t.services.title} onPress={() => router.push("/services")} style={({ pressed }) => [styles.gemPress, pressed && { transform: [{ scale: 0.92 }] }]}>
            <ServicesGem />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

/** Liquid Glass when the OS has it, otherwise the frosted blur fill. */
function GlassSurface({ style, children }: { style: StyleProp<ViewStyle>; children?: ReactNode }) {
  if (LIQUID_GLASS) {
    // Not `isInteractive`: on iOS 27 the interactive glass let taps fall through to the content below the dock.
    return <GlassView glassEffectStyle="regular" colorScheme="light" style={style}>{children}</GlassView>;
  }
  return (
    <View style={style}>
      <FrostFill intensity={45} />
      {children}
    </View>
  );
}

function DockButton({ icon, active, onPress, badge, label }: { icon: ZxIconName; active: boolean; onPress: () => void; badge: number; label: string }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.dockButton, pressed && { transform: [{ scale: 0.92 }] }]}>
      <ZxIcon name={icon} size={22} color={active ? colors.brandDeep : "#3F4A46"} strokeWidth={active ? 2.3 : 1.9} />
      <Text style={[styles.dockLabel, active && styles.dockLabelActive]} numberOfLines={1}>{label}</Text>
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
function FrostFill({ intensity }: { intensity: number }) {
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
      <HeaderFade />
      {back ? (
        <Pressable accessibilityLabel="Back" onPress={() => (onBack ? onBack() : router.canGoBack() ? router.back() : router.navigate("/"))} style={({ pressed }) => [styles.backButton, pressed && { transform: [{ scale: 0.94 }] }]}>
          <GlassFill radius={18} tint={HEADER_GLASS} />
          <Text style={[styles.backGlyph, { color: colors.white }]}>‹</Text>
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

export function BackButton({ onPress, style, light = false }: { onPress?: () => void; style?: object; light?: boolean }) {
  return (
    <Pressable accessibilityLabel="Back" onPress={() => (onPress ? onPress() : router.canGoBack() ? router.back() : router.navigate("/"))} style={({ pressed }) => [styles.backButton, style, pressed && { transform: [{ scale: 0.94 }] }]}>
      <GlassFill radius={18} tint={light ? HEADER_GLASS : undefined} />
      <Text style={[styles.backGlyph, light && { color: colors.white }]}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topbar: { paddingHorizontal: 8, paddingBottom: 8, zIndex: 20, backgroundColor: colors.header },
  topbarRow: { height: 45, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  brand: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  logo: { width: 34, height: 34, borderRadius: 11 },
  brandName: { fontSize: 13, fontWeight: "800", color: colors.white, letterSpacing: 0.6 },
  brandSub: { fontSize: 9.5, fontWeight: "600", color: "rgba(255,255,255,0.72)", marginTop: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  langPill: { minWidth: 38, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", paddingHorizontal: 9 },
  langText: { fontSize: 9.5, fontWeight: "800", color: colors.white },
  topIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  topBadge: { position: "absolute", top: -6, right: -5, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: "#FF4D4F", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.header },
  topBadgeText: { color: colors.white, fontSize: 8, fontWeight: "900" },
  dockWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  dockRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dockPill: { width: DOCK_WIDTH, height: 64, borderRadius: 32, flexDirection: "row", alignItems: "center", padding: DOCK_PAD, overflow: Platform.OS === "android" ? "hidden" : "visible" },
  dockGlass: { borderRadius: 999, backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: "rgba(255,255,255,0.78)" },
  dockButton: { width: ITEM_WIDTH, height: 54, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 27 },
  dockLabel: { fontSize: 10, fontWeight: "600", color: "#3F4A46" },
  dockLabelActive: { color: colors.brandDeep, fontWeight: "800" },
  // Selection "lens": a lighter capsule that slides under the active tab like the iOS 26 tab bar.
  dockLens: { position: "absolute", left: DOCK_PAD, top: DOCK_PAD, width: ITEM_WIDTH, height: 54, borderRadius: 27, backgroundColor: "rgba(15,175,122,0.13)" },
  dockBadge: { position: "absolute", top: 6, right: 8, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.white },
  gemButton: { width: 64, height: 64, borderRadius: 32 },
  gemPress: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 32 },
  gem: { position: "absolute", overflow: "hidden", shadowColor: "#18211E", shadowOpacity: 0.18, shadowRadius: 2.5, shadowOffset: { width: 0, height: 2 } },
  gemShine: { position: "absolute", left: 2, right: 2, top: 1, height: 1, backgroundColor: "rgba(255,255,255,0.65)", borderRadius: 1 },
  statusStrip: { position: "absolute", left: 0, right: 0, top: 0, zIndex: 40 },
  fadeHost: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  backGlyph: { fontSize: 24, lineHeight: 26, color: colors.ink, fontWeight: "500", marginTop: -2 },
  eyebrow: { fontSize: 10, color: "#8FD8C8", letterSpacing: 1.2, fontWeight: "700" },
  pageTitle: { fontSize: 20, fontWeight: "800", color: colors.white, marginTop: 1 },
  pageSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.78)", marginTop: 3 },
});
