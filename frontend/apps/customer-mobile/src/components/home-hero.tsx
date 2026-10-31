import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import { useCart } from "../cart";
import { useSession, useUnread } from "../hooks";
import { useI18n } from "../i18n";
import { colors } from "../theme";
import { PressableScale, ServiceArt, ZxIcon, haptic, type ZxIconName } from "../ui";
import { CartIcon } from "../ui/icons";

const LIQUID_GLASS = Platform.OS === "ios" && isLiquidGlassAvailable();

/** Brand gradient behind the home header (My Viettel–style immersive top). */
export const HOME_GRADIENT = ["#10302A", "#183F35", "#24564A"] as const;
/** Champagne gold accents that pair with the deep emerald (logo colours). */
const GOLD = "#B98A3A";
const CREAM = "#F4E7C4";
const EMERALD = "#1F6B57";

/** Real Liquid Glass where the OS has it, frosted blur otherwise. */
export function Glass({ style, children, tint, clear = false }: { style?: StyleProp<ViewStyle>; children?: ReactNode; tint?: string; clear?: boolean }) {
  if (LIQUID_GLASS) {
    return <GlassView glassEffectStyle={clear ? "clear" : "regular"} tintColor={tint} isInteractive colorScheme="light" style={style}>{children}</GlassView>;
  }
  return (
    <View style={[style, { overflow: "hidden" }]}>
      {Platform.OS === "ios" ? <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint || "rgba(255,255,255,0.32)" }]} />
      {children}
    </View>
  );
}

/** Soft light blobs on the gradient so the glass has something to refract. */
export function HomeBackdrop({ height }: { height: number }) {
  const { width } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height }]}>
      <View style={{ position: "absolute", top: -800, left: 0, right: 0, height: 800, backgroundColor: HOME_GRADIENT[0] }} />
      <LinearGradient colors={HOME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.blob, { width: width * 0.9, height: width * 0.9, borderRadius: width, top: -width * 0.35, right: -width * 0.35, backgroundColor: "rgba(244,214,150,0.16)" }]} />
      <View style={[styles.blob, { width: width * 0.7, height: width * 0.7, borderRadius: width, top: height * 0.38, left: -width * 0.3, backgroundColor: "rgba(120,200,170,0.12)" }]} />
      <View style={[styles.blob, { width: 140, height: 140, borderRadius: 70, top: height * 0.2, left: width * 0.45, backgroundColor: "rgba(255,236,190,0.14)" }]} />
    </View>
  );
}

const searchCopy = { "vi-VN": "Tìm dịch vụ, món ăn, nhà…", "en-US": "Search services, food, homes…", "zh-CN": "搜索服务、美食、房源…", "zh-TW": "搜尋服務、美食、房源…" } as const;

/** Avatar · glowing search pill · cart · bell, all glass over the gradient. */
export function HomeHeader() {
  const insets = useSafeAreaInsets();
  const { locale, t } = useI18n();
  const { session } = useSession();
  const unread = useUnread();
  const cart = useCart();
  const name = session?.displayName || "ZhaoXi";
  const initials = name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "ZX";
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.navigate("/profile")} style={({ pressed }) => pressed && { transform: [{ scale: 0.94 }] }}>
        <Glass style={styles.round} tint="rgba(255,255,255,0.22)"><Text style={styles.initials}>{initials}</Text></Glass>
      </Pressable>
      <Pressable onPress={() => router.push("/explore")} style={({ pressed }) => [{ flex: 1 }, pressed && { transform: [{ scale: 0.985 }] }]}>
        {/* Gradient hairline ring like the reference search pill */}
        <LinearGradient colors={["#F4E7C4", "#D9B46A", "#9ED9C3"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.searchRing}>
          <View style={styles.searchPill}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Defs>
                <SvgGradient id="spark" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#D9A441" />
                  <Stop offset="1" stopColor="#1F6B57" />
                </SvgGradient>
              </Defs>
              <Path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5Z" fill="url(#spark)" />
              <Path d="M19 15.5c.25 1.9 1.1 2.8 3 3-1.9.25-2.75 1.1-3 3-.25-1.9-1.1-2.75-3-3 1.9-.2 2.75-1.1 3-3Z" fill="#F5B53F" />
            </Svg>
            <Text style={styles.searchText} numberOfLines={1}>{searchCopy[locale]}</Text>
          </View>
        </LinearGradient>
      </Pressable>
      {cart.count > 0 ? (
        <Pressable accessibilityLabel={t.cart.title} onPress={() => router.push("/cart")} style={({ pressed }) => pressed && { transform: [{ scale: 0.94 }] }}>
          <Glass style={styles.round} tint="rgba(255,255,255,0.22)"><CartIcon size={20} color={colors.white} /></Glass>
          <Badge value={cart.count} />
        </Pressable>
      ) : null}
      <Pressable accessibilityLabel={t.notifications.title} onPress={() => router.push("/notifications")} style={({ pressed }) => pressed && { transform: [{ scale: 0.94 }] }}>
        <Glass style={styles.round} tint="rgba(255,255,255,0.22)"><ZxIcon name="bell" size={21} color={colors.white} strokeWidth={2.1} /></Glass>
        <Badge value={unread.data?.notifications || 0} />
      </Pressable>
    </View>
  );
}

function Badge({ value }: { value: number }) {
  if (!value) return null;
  return <View style={styles.badge}><Text style={styles.badgeText}>{value > 99 ? "99+" : value}</Text></View>;
}

export type HeroSlide = { image: number; label: string };

/**
 * Hero card: Da Nang landmark photos cross-fading underneath, with Liquid Glass
 * controls (location pill, chips, pager) floating on the photo so the glass
 * actually refracts real imagery.
 */
export function HeroCard({ eyebrow, title, slides, locationLabel, onLocate, chips }: { eyebrow: string; title: string; slides: HeroSlide[]; locationLabel: string; onLocate: () => void; chips: Array<{ key: string; label: string; onPress: () => void }> }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setActive((value) => (value + 1) % slides.length), 3500);
    return () => clearInterval(timer);
  }, [slides.length]);
  const slide = slides[active] ?? slides[0];
  return (
    <View style={styles.heroWrap}>
      <View style={styles.heroBack} />
      <View style={styles.hero}>
        {slide ? <Image source={slide.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={900} /> : null}
        <LinearGradient colors={["rgba(10,32,27,0.55)", "rgba(10,32,27,0.05)", "rgba(10,32,27,0.62)"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <Pressable onPress={onLocate} style={({ pressed }) => [styles.locWrap, pressed && { transform: [{ scale: 0.96 }] }]}>
          <Glass style={styles.locPill} clear tint="rgba(255,255,255,0.12)">
            <ZxIcon name="location" size={14} color={colors.white} strokeWidth={2.2} />
            <Text style={styles.locText} numberOfLines={1}>{locationLabel}</Text>
          </Glass>
        </Pressable>
        <Glass style={styles.pager} clear tint="rgba(255,255,255,0.1)">
          {slides.map((item, index) => <Pressable key={item.label} hitSlop={5} onPress={() => setActive(index)} style={[styles.dot, index === active && styles.dotActive]} />)}
        </Glass>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>{eyebrow}</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
          {slide ? <Text style={styles.heroHighlight} numberOfLines={1}>{slide.label}</Text> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
          {chips.map((chip, index) => (
            <Pressable key={chip.key} onPress={chip.onPress} style={({ pressed }) => pressed && { transform: [{ scale: 0.94 }] }}>
              {index === 0 ? (
                <View style={[styles.chip, styles.chipPrimary]}><Text style={[styles.chipText, { color: "#183F35" }]}>{chip.label}</Text></View>
              ) : (
                <Glass style={styles.chip} clear tint="rgba(255,255,255,0.14)"><Text style={styles.chipText}>{chip.label}</Text></Glass>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const ITEM = 96;

/** White dome with a snapping service carousel: the centred item is enlarged and raised, the rest follow the arc. */
export function ServiceArc({ tiles, onOpen, onPressIn, more }: { tiles: Array<{ code: string; name: string }>; onOpen: (code: string) => void; onPressIn?: (code: string) => void; more: string }) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(ITEM);
  const onScroll = useAnimatedScrollHandler((event) => { x.value = event.contentOffset.x; });
  const pad = (width - ITEM) / 2;
  const list = useAnimatedRef<Animated.ScrollView>();
  // Open on the second service so both sides of the arc are filled.
  const centre = () => list.current?.scrollTo({ x: ITEM, animated: false });
  return (
    <View style={styles.arcSection}>
      <View style={[styles.dome, { width: width * 2.2, height: width * 2.2, borderRadius: width * 1.1, left: -width * 0.6 }]} />
      <LinearGradient colors={["#F6EEDB", "rgba(255,255,255,0)"]} style={[styles.arcGlow, { left: width / 2 - 78 }]} pointerEvents="none" />
      <Animated.ScrollView
        ref={list}
        onLayout={centre}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: pad }}
        style={{ height: 176 }}
        onMomentumScrollEnd={() => haptic.select()}
      >
        {tiles.map((tile, index) => <ArcItem key={tile.code} index={index} x={x} tile={tile} onOpen={onOpen} onPressIn={onPressIn} />)}
      </Animated.ScrollView>
      <Pressable onPress={() => router.push("/services")} style={styles.moreLink} hitSlop={8}>
        <Text style={styles.moreText}>{more}</Text>
        <ZxIcon name="chevron" size={18} color={EMERALD} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

function ArcItem({ index, x, tile, onOpen, onPressIn }: { index: number; x: SharedValue<number>; tile: { code: string; name: string }; onOpen: (code: string) => void; onPressIn?: (code: string) => void }) {
  const motion = useAnimatedStyle(() => {
    const d = Math.abs(x.value - index * ITEM) / ITEM;
    return {
      transform: [
        { translateY: interpolate(d, [0, 1, 2, 3], [0, 34, 74, 120], Extrapolation.CLAMP) },
        { scale: interpolate(d, [0, 1, 2], [1, 0.7, 0.6], Extrapolation.CLAMP) },
      ],
    };
  });
  return (
    <Pressable onPressIn={() => onPressIn?.(tile.code)} onPress={() => onOpen(tile.code)} style={{ width: ITEM, alignItems: "center" }}>
      <Animated.View style={[{ alignItems: "center", width: ITEM + 30 }, motion]}>
        <ServiceArt code={tile.code} size={86} />
        <Text style={styles.arcLabel} numberOfLines={2}>{tile.name}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Line-icon shortcut strip on a soft card (reference "Di chuyển / SIM du lịch…" row). */
export function QuickActions({ items }: { items: Array<{ key: string; icon: ZxIconName; label: string; onPress: () => void; accent?: string }> }) {
  return (
    <View style={styles.quick}>
      <LinearGradient colors={["#F8F1E1", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.8 }} style={[StyleSheet.absoluteFill, { borderRadius: 26 }]} pointerEvents="none" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
        {items.map((item) => (
          <PressableScale key={item.key} onPress={item.onPress} scaleTo={0.93} style={styles.quickItem}>
            <View style={styles.quickIcon}>
              <ZxIcon name={item.icon} size={28} color="#1F2A27" strokeWidth={1.9} />
              <View style={[styles.quickDot, { backgroundColor: item.accent || colors.brand }]} />
            </View>
            <Text style={styles.quickLabel} numberOfLines={1}>{item.label}</Text>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: "absolute" },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 14 },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  initials: { color: colors.white, fontSize: 17, fontWeight: "800", letterSpacing: 0.5 },
  searchRing: { borderRadius: 999, padding: 1.6 },
  searchPill: { height: 46, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.94)" },
  searchText: { flex: 1, fontSize: 14.5, fontWeight: "600", color: "#7C8B86" },
  badge: { position: "absolute", top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: "#FF4D4F", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.9)" },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "900" },
  heroWrap: { marginHorizontal: 16, marginTop: 4 },
  heroBack: { position: "absolute", left: -8, right: 8, top: 18, bottom: -6, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.14)" },
  hero: { height: 280, borderRadius: 30, overflow: "hidden", backgroundColor: "#183F35" },
  locWrap: { position: "absolute", left: 16, top: 16, maxWidth: "62%" },
  locPill: { flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16 },
  locText: { flexShrink: 1, fontSize: 12, fontWeight: "700", color: colors.white },
  pager: { position: "absolute", right: 16, top: 20, flexDirection: "row", gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { width: 16, backgroundColor: CREAM },
  heroCopy: { position: "absolute", left: 20, right: 20, top: 74 },
  heroEyebrow: { fontSize: 11.5, fontWeight: "800", letterSpacing: 2, color: "rgba(255,255,255,0.9)" },
  heroTitle: { fontSize: 26, fontWeight: "800", color: colors.white, lineHeight: 31, letterSpacing: -0.4, marginTop: 6, textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 8 },
  heroHighlight: { fontSize: 17, fontWeight: "800", color: "#F6D892", marginTop: 6 },
  chipScroll: { position: "absolute", left: 0, right: 0, bottom: 16 },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: { height: 42, paddingHorizontal: 18, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  chipPrimary: { backgroundColor: CREAM, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  chipText: { fontSize: 15, fontWeight: "700", color: colors.white },
  arcSection: { marginTop: -64, paddingTop: 18 },
  dome: { position: "absolute", top: 0, backgroundColor: colors.white },
  arcGlow: { position: "absolute", top: -26, width: 156, height: 156, borderRadius: 78 },
  arcLabel: { marginTop: 6, fontSize: 15, fontWeight: "700", color: "#17221F", textAlign: "center", lineHeight: 19 },
  moreLink: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, marginTop: 2 },
  moreText: { fontSize: 17, fontWeight: "800", color: EMERALD },
  quick: { marginHorizontal: 16, marginTop: 18, paddingVertical: 18, borderRadius: 26, backgroundColor: colors.white, shadowColor: "#0F172A", shadowOpacity: 0.075, shadowRadius: 17, shadowOffset: { width: 0, height: 10 } },
  quickItem: { width: 92, alignItems: "center", gap: 10 },
  quickIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  quickDot: { position: "absolute", right: 2, top: 4, width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: colors.white },
  quickLabel: { fontSize: 13.5, fontWeight: "600", color: "#1F2A27" },
});
