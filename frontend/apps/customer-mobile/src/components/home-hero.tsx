import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, Extrapolation, FadeInDown, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgGradient, Path, RadialGradient, Stop } from "react-native-svg";
import { useCart } from "../cart";
import { useSession, useUnread } from "../hooks";
import { useI18n } from "../i18n";
import { colors } from "../theme";
import { PressableScale, ServiceArt, ZxIcon, haptic, servicePalettes, type ZxIconName } from "../ui";
import { CartIcon } from "../ui/icons";

const LIQUID_GLASS = Platform.OS === "ios" && isLiquidGlassAvailable();

/** Brand gradient behind the home header (My Viettel–style immersive top). */
/** Pearl base of the home header (also used for the status-bar scrim / overscroll). */
export const HOME_BASE = "#F7F2EC";
/** Champagne gold accents that pair with the deep emerald (logo colours). */
const GOLD = "#B98A3A";
const CREAM = "#F4E7C4";
const EMERALD = "#1F6B57";
const INK = "#1D2522";

/** Real Liquid Glass where the OS has it, frosted blur otherwise. */
export function Glass({ style, children, tint, clear = false, interactive = true }: { style?: StyleProp<ViewStyle>; children?: ReactNode; tint?: string; clear?: boolean; interactive?: boolean }) {
  if (LIQUID_GLASS) {
    return <GlassView glassEffectStyle={clear ? "clear" : "regular"} tintColor={tint} isInteractive={interactive} colorScheme="light" style={style}>{children}</GlassView>;
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
/**
 * "Pearl aurora" backdrop: a warm pearl base with large pastel colour fields
 * (peach, lilac, mint, sky, butter) melted together by a blur, so the Liquid
 * Glass above has soft colour to refract.
 */
export function HomeBackdrop({ height }: { height: number }) {
  const { width } = useWindowDimensions();
  const blob = (size: number, color: string, pos: ViewStyle) => <View style={[styles.blob, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, pos]} />;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height, overflow: "hidden" }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: HOME_BASE }]} />
      {blob(width * 1.05, "#FFD3BF", { top: -width * 0.45, left: -width * 0.35 })}
      {blob(width * 0.95, "#DCCBFF", { top: -width * 0.3, right: -width * 0.45 })}
      {blob(width * 0.8, "#C6F1DF", { top: height * 0.36, left: -width * 0.3 })}
      {blob(width * 0.85, "#CBE3FF", { top: height * 0.42, right: -width * 0.35 })}
      {blob(width * 0.5, "#FFE9B0", { top: height * 0.2, left: width * 0.3 })}
      <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(255,255,255,0.15)", "rgba(255,255,255,0)", "rgba(255,255,255,0.35)"]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
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
        <Glass style={styles.round} tint="rgba(255,255,255,0.4)"><Text style={styles.initials}>{initials}</Text></Glass>
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
          <Glass style={styles.round} tint="rgba(255,255,255,0.4)"><CartIcon size={20} color={INK} /></Glass>
          <Badge value={cart.count} />
        </Pressable>
      ) : null}
      <Pressable accessibilityLabel={t.notifications.title} onPress={() => router.push("/notifications")} style={({ pressed }) => pressed && { transform: [{ scale: 0.94 }] }}>
        <Glass style={styles.round} tint="rgba(255,255,255,0.4)"><ZxIcon name="bell" size={21} color={INK} strokeWidth={2.1} /></Glass>
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

const HERO_H = 190;
const DECK_DEPTH = 3; // cards visible in the stack (front + 2 peeking behind)

/**
 * Hero as a layered deck of Da Nang landmark cards: the front card carries the
 * copy and Liquid Glass controls, the next landmarks peek out behind it (smaller,
 * lower, shifted left, frosted). Auto-advances; swipe left/right to shuffle.
 */
export function HeroCard({ eyebrow, title, slides, locationLabel, onLocate }: { eyebrow: string; title: string; slides: HeroSlide[]; locationLabel: string; onLocate: () => void }) {
  const [active, setActive] = useState(0);
  const count = slides.length;
  const next = () => setActive((value) => (value + 1) % Math.max(count, 1));
  const prev = () => setActive((value) => (value - 1 + count) % Math.max(count, 1));
  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(next, 4200);
    return () => clearInterval(timer);
  }, [count, active]);
  const swipe = Gesture.Pan().activeOffsetX([-18, 18]).failOffsetY([-12, 12]).runOnJS(true).onEnd((event) => {
    if (event.translationX < -40) { haptic.select(); next(); }
    else if (event.translationX > 40) { haptic.select(); prev(); }
  });
  const slide = slides[active];
  return (
    <GestureDetector gesture={swipe}>
      <View style={styles.heroWrap}>
        {slides.map((item, index) => {
          const depth = (index - active + count) % count;
          return <DeckCard key={item.label} image={item.image} depth={depth} count={count} />;
        })}
        <View style={styles.heroFront} pointerEvents="box-none">
          <Pressable onPress={onLocate} style={({ pressed }) => [styles.locWrap, pressed && { transform: [{ scale: 0.96 }] }]}>
            <Glass style={styles.locPill} clear tint="rgba(255,255,255,0.12)">
              <ZxIcon name="location" size={14} color={colors.white} strokeWidth={2.2} />
              <Text style={styles.locText} numberOfLines={1}>{locationLabel}</Text>
            </Glass>
          </Pressable>
          <Glass style={styles.pager} clear tint="rgba(255,255,255,0.1)">
            {slides.map((item, index) => <Pressable key={item.label} hitSlop={5} onPress={() => setActive(index)} style={[styles.dot, index === active && styles.dotActive]} />)}
          </Glass>
          <View style={styles.heroCopy} pointerEvents="none">
            <Text style={styles.heroEyebrow}>{eyebrow}</Text>
            <Text style={styles.heroTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{title}</Text>
            {slide ? <Animated.Text key={slide.label} entering={FadeInDown.duration(380)} style={styles.heroHighlight} numberOfLines={1}>{slide.label}</Animated.Text> : null}
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

/** One card of the deck; springs to its depth (front card shuffles to the back). */
function DeckCard({ image, depth, count }: { image: number; depth: number; count: number }) {
  const d = useSharedValue(depth);
  useEffect(() => { d.value = withSpring(depth, { damping: 20, stiffness: 160, mass: 0.9 }); }, [depth, d]);
  const style = useAnimatedStyle(() => {
    const v = d.value;
    return {
      opacity: interpolate(v, [0, DECK_DEPTH - 1, DECK_DEPTH, count], [1, 1, 0, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(v, [0, 1, 2], [0, -30, -54], Extrapolation.CLAMP) },
        { translateY: interpolate(v, [0, 1, 2], [0, 16, 30], Extrapolation.CLAMP) },
        { scale: interpolate(v, [0, 1, 2], [1, 0.93, 0.86], Extrapolation.CLAMP) },
      ],
    };
  });
  const veil = useAnimatedStyle(() => ({ opacity: interpolate(d.value, [0, 1], [0, 1], Extrapolation.CLAMP) }));
  return (
    <Animated.View pointerEvents="none" style={[styles.deckCard, { zIndex: count - depth }, depth === 0 ? styles.deckFront : null, style]}>
      <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
      <LinearGradient colors={["rgba(10,32,27,0.55)", "rgba(10,32,27,0.05)", "rgba(10,32,27,0.62)"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      {/* Cards behind the front one read as frosted layers */}
      <Animated.View style={[StyleSheet.absoluteFill, veil]}>
        <Glass style={StyleSheet.absoluteFill} clear interactive={false} tint="rgba(255,255,255,0.22)" />
      </Animated.View>
    </Animated.View>
  );
}

const ITEM = 96;
const LENS = 178;

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
      {/* Liquid Glass lens bulging over the dome edge, refracting the emerald header behind it */}
      <View pointerEvents="none" style={[styles.lensWrap, { left: width / 2 - LENS / 2 }]}>
        <Glass style={styles.lens} clear interactive={false} tint="rgba(255,255,255,0.42)" />
        <LinearGradient colors={["rgba(255,255,255,0.75)", "rgba(255,255,255,0)"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.5, y: 0.7 }} style={styles.lensSheen} />
      </View>
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
  const accent = servicePalettes[tile.code]?.accent || colors.brand;
  const motion = useAnimatedStyle(() => {
    const d = Math.abs(x.value - index * ITEM) / ITEM;
    return {
      transform: [
        { translateY: interpolate(d, [0, 1, 2, 3], [0, 34, 74, 120], Extrapolation.CLAMP) },
        { scale: interpolate(d, [0, 1, 2], [1, 0.7, 0.6], Extrapolation.CLAMP) },
      ],
    };
  });
  // Halo + coloured contact shadow + sparkles only light up on the centred item.
  const lit = useAnimatedStyle(() => ({ opacity: interpolate(Math.abs(x.value - index * ITEM) / ITEM, [0, 0.7], [1, 0], Extrapolation.CLAMP) }));
  const twinkle = useSharedValue(0);
  useEffect(() => {
    twinkle.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0.25, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1);
  }, [twinkle]);
  const sparkle = useAnimatedStyle(() => ({ opacity: twinkle.value, transform: [{ scale: 0.7 + twinkle.value * 0.4 }, { rotate: `${twinkle.value * 45}deg` }] }));
  return (
    <Pressable onPressIn={() => onPressIn?.(tile.code)} onPress={() => onOpen(tile.code)} style={{ width: ITEM, alignItems: "center" }}>
      <Animated.View style={[{ alignItems: "center", width: ITEM + 30 }, motion]}>
        <Animated.View pointerEvents="none" style={[styles.halo, lit]}>
          <Svg width={150} height={150} viewBox="0 0 150 150">
            <Defs>
              <RadialGradient id={`halo-${tile.code}`} cx="0.5" cy="0.5" r="0.5">
                <Stop offset="0" stopColor={accent} stopOpacity={0.32} />
                <Stop offset="0.55" stopColor={accent} stopOpacity={0.1} />
                <Stop offset="1" stopColor={accent} stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id={`drop-${tile.code}`} cx="0.5" cy="0.5" r="0.5">
                <Stop offset="0" stopColor={accent} stopOpacity={0.55} />
                <Stop offset="1" stopColor={accent} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={75} cy={66} r={70} fill={`url(#halo-${tile.code})`} />
            <Ellipse cx={75} cy={118} rx={44} ry={9} fill={`url(#drop-${tile.code})`} />
          </Svg>
        </Animated.View>
        <ServiceArt code={tile.code} size={86} />
        <Animated.View pointerEvents="none" style={[styles.sparkleA, lit]}><Animated.View style={sparkle}><Sparkle size={16} color="#F6C453" /></Animated.View></Animated.View>
        <Animated.View pointerEvents="none" style={[styles.sparkleB, lit]}><Animated.View style={sparkle}><Sparkle size={10} color="#FFFFFF" /></Animated.View></Animated.View>
        <Text style={styles.arcLabel} numberOfLines={2}>{tile.name}</Text>
      </Animated.View>
    </Pressable>
  );
}

function Sparkle({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12C6.4 11.2 11.2 6.4 12 0Z" fill={color} />
    </Svg>
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
  initials: { color: INK, fontSize: 17, fontWeight: "800", letterSpacing: 0.5 },
  searchRing: { borderRadius: 999, padding: 1.6 },
  searchPill: { height: 46, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.94)" },
  searchText: { flex: 1, fontSize: 14.5, fontWeight: "600", color: "#7C8B86" },
  badge: { position: "absolute", top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: "#FF4D4F", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.9)" },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "900" },
  heroWrap: { marginLeft: 30, marginRight: 16, marginTop: 4, marginBottom: 30 },
  deckCard: { position: "absolute", left: 0, right: 0, top: 0, height: HERO_H, borderRadius: 30, overflow: "hidden", backgroundColor: "#183F35" },
  deckFront: { shadowColor: "#06140F", shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 14 } },
  heroFront: { height: HERO_H, zIndex: 100 },
  locWrap: { position: "absolute", left: 14, top: 14, maxWidth: "62%" },
  locPill: { flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 11, borderRadius: 15 },
  locText: { flexShrink: 1, fontSize: 12, fontWeight: "700", color: colors.white },
  pager: { position: "absolute", right: 14, top: 18, flexDirection: "row", gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { width: 16, backgroundColor: CREAM },
  heroCopy: { position: "absolute", left: 18, right: 18, bottom: 18 },
  heroEyebrow: { fontSize: 10.5, fontWeight: "800", letterSpacing: 2, color: "rgba(255,255,255,0.9)" },
  heroTitle: { fontSize: 22, fontWeight: "800", color: colors.white, lineHeight: 27, letterSpacing: -0.4, marginTop: 4, textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 8 },
  heroHighlight: { fontSize: 15, fontWeight: "800", color: "#F6D892", marginTop: 3 },
  arcSection: { marginTop: -64, paddingTop: 18 },
  dome: { position: "absolute", top: 0, backgroundColor: colors.white },
  lensWrap: { position: "absolute", top: -54, width: LENS, height: LENS },
  lens: { width: LENS, height: LENS, borderRadius: LENS / 2 },
  lensSheen: { position: "absolute", left: 18, top: 10, width: LENS * 0.56, height: LENS * 0.4, borderRadius: LENS },
  halo: { position: "absolute", top: -32, width: 150, height: 150 },
  sparkleA: { position: "absolute", top: -2, right: 14 },
  sparkleB: { position: "absolute", top: 22, left: 16 },
  arcLabel: { marginTop: 6, fontSize: 15, fontWeight: "700", color: "#17221F", textAlign: "center", lineHeight: 19 },
  moreLink: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, marginTop: 2 },
  moreText: { fontSize: 17, fontWeight: "800", color: EMERALD },
  quick: { marginHorizontal: 16, marginTop: 18, paddingVertical: 18, borderRadius: 26, backgroundColor: colors.white, shadowColor: "#0F172A", shadowOpacity: 0.075, shadowRadius: 17, shadowOffset: { width: 0, height: 10 } },
  quickItem: { width: 92, alignItems: "center", gap: 10 },
  quickIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  quickDot: { position: "absolute", right: 2, top: 4, width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: colors.white },
  quickLabel: { fontSize: 13.5, fontWeight: "600", color: "#1F2A27" },
});
