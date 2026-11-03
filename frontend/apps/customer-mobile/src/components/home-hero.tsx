import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, ClipPath, Defs, Ellipse, Image as SvgImage, LinearGradient as SvgGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { useCart } from "../cart";
import { useSession, useUnread } from "../hooks";
import { useI18n } from "../i18n";
import { colors, shadow } from "../theme";
import { Glass } from "../ui/glass";
import { PressableScale, ServiceArt, ZxIcon, haptic, servicePalettes, type ZxIconName } from "../ui";
import { CartIcon } from "../ui/icons";


/** Brand gradient behind the home header (My Viettel–style immersive top). */
/** Deep coral at the top of the home header (status-bar scrim / overscroll). */
export { Glass };
export const HOME_TOP = "#00323A";
/** Champagne gold accents that pair with the deep emerald (logo colours). */
const GOLD = "#B98A3A";
const CREAM = "#F4E7C4";
const EMERALD = "#1F6B57";
const CORAL = "#D9472B";
const INK = "#FFFFFF";


/** Soft light blobs on the gradient so the glass has something to refract. */
/**
 * Sunset-coral backdrop drawn in SVG (brand orange of the 喜 mark): a deep
 * coral→orange sweep, a soft pearl bloom behind the hero card, a peach glow
 * top-right and faint Dragon Bridge arches running through it.
 */
export function HomeBackdrop({ height }: { height: number }) {
  const { width } = useWindowDimensions();
  // Deep petrol teal that melts into the white page right under the hero, so the
  // service arc floats on the fade (no hard dome edge).
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height }]}>
      <View style={{ position: "absolute", top: -800, left: 0, right: 0, height: 800, backgroundColor: HOME_TOP }} />
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={HOME_TOP} />
            <Stop offset="0.3" stopColor="#033F47" />
            <Stop offset="0.52" stopColor="#3F8285" />
            <Stop offset="0.66" stopColor="#8EBDBC" />
            <Stop offset="0.8" stopColor="#D5E8E6" />
            <Stop offset="0.92" stopColor="#F4F9F8" />
            <Stop offset="1" stopColor={colors.bg} />
          </SvgGradient>
          <RadialGradient id="sheen" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#5FA7A6" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#5FA7A6" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#bg)" />
        <Ellipse cx={width * 0.85} cy={height * 0.12} rx={width * 0.55} ry={height * 0.22} fill="url(#sheen)" />
      </Svg>
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
        <Glass style={styles.round} tint="rgba(255,255,255,0.2)"><Text style={styles.initials}>{initials}</Text></Glass>
      </Pressable>
      <Pressable onPress={() => router.push("/explore")} style={({ pressed }) => [{ flex: 1 }, pressed && { transform: [{ scale: 0.985 }] }]}>
        {/* Gradient hairline ring like the reference search pill */}
        <LinearGradient colors={["#B9A4FF", "#7FD3FF", "#FFD38A"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.searchRing}>
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
          <Glass style={styles.round} tint="rgba(255,255,255,0.2)"><CartIcon size={20} color={INK} /></Glass>
          <Badge value={cart.count} />
        </Pressable>
      ) : null}
      <Pressable accessibilityLabel={t.notifications.title} onPress={() => router.push("/notifications")} style={({ pressed }) => pressed && { transform: [{ scale: 0.94 }] }}>
        <Glass style={styles.round} tint="rgba(255,255,255,0.2)"><ZxIcon name="bell" size={21} color={INK} strokeWidth={2.1} /></Glass>
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
const SHEET_OUT = 18; // top edge of the back card sticks out this far on each side
const SHEET_FOOT = 7; // bottom corners still stick out a little ("long legs")
const SHEET_TOP = 14; // back card starts a bit lower than the front card
const SHEET_DROP = 8; // and ends a bit below it

/**
 * Hero: the current landmark photo card over the NEXT landmark photo, which
 * peeks out behind as a rounded isosceles trapezoid. Swipe horizontally (or
 * wait) and the front card tilts away in 3D while the back card comes forward.
 */
export function HeroCard({ eyebrow, title, slides, locationLabel, onLocate }: { eyebrow: string; title: string; slides: HeroSlide[]; locationLabel: string; onLocate: () => void }) {
  const { width } = useWindowDimensions();
  const count = Math.max(slides.length, 1);
  const [active, setActive] = useState(0);
  const tx = useSharedValue(0); // horizontal drag of the front card
  const enter = useSharedValue(1); // 0 → 1 as a new front card arrives from the back
  const commit = (dir: number) => setActive((value) => (value + dir + count) % count);
  // Each new front card rises out of the back sheet.
  useEffect(() => {
    tx.value = 0;
    enter.value = 0;
    enter.value = withSpring(1, { damping: 15, stiffness: 150, mass: 0.9 });
  }, [active, enter, tx]);
  const fling = (dir: number) => {
    "worklet";
    tx.value = withTiming(-dir * width * 1.15, { duration: 330, easing: Easing.in(Easing.quad) }, (done) => {
      if (done) scheduleOnRN(commit, dir);
    });
  };
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setTimeout(() => fling(1), 4200);
    return () => clearTimeout(timer);
  }, [active, slides.length]);
  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onUpdate((event) => { tx.value = event.translationX; })
    .onEnd((event) => {
      if (event.translationX < -70 || event.velocityX < -650) { fling(1); scheduleOnRN(haptic.select); }
      else if (event.translationX > 70 || event.velocityX > 650) { fling(-1); scheduleOnRN(haptic.select); }
      else tx.value = withSpring(0, { damping: 16, stiffness: 180 });
    });
  const front = useAnimatedStyle(() => {
    const p = Math.max(-1, Math.min(1, tx.value / width));
    const arrive = enter.value;
    return {
      opacity: interpolate(Math.abs(p), [0.6, 1], [1, 0], Extrapolation.CLAMP) * interpolate(arrive, [0, 0.35], [0.55, 1], Extrapolation.CLAMP),
      transform: [
        { perspective: 900 },
        { translateX: tx.value },
        { translateY: (1 - arrive) * 16 },
        { rotateY: `${p * -32}deg` },
        { rotateZ: `${p * -5}deg` },
        { scale: (1 - Math.abs(p) * 0.1) * (0.9 + arrive * 0.1) },
      ],
    };
  });
  const slide = slides[active];
  const upcoming = slides[(active + 1) % count];
  return (
    <GestureDetector gesture={pan}>
      <View style={styles.heroWrap}>
        {upcoming ? <BackCard image={upcoming.image} drag={tx} /> : null}
        {/* Own flat container on top, so the 3D-tilted front card never intersects the back card */}
        <View style={styles.frontLayer} pointerEvents="box-none">
        <Animated.View style={[styles.heroCard, shadow("soft"), front]}>
          <View style={styles.heroClip}>
            {slide ? <Image source={slide.image} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            <LinearGradient colors={["rgba(20,12,8,0.4)", "rgba(20,12,8,0)", "rgba(20,12,8,0.5)"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
          </View>
          <Pressable onPress={onLocate} style={({ pressed }) => [styles.locWrap, pressed && { transform: [{ scale: 0.96 }] }]}>
            <Glass style={styles.locPill} clear tint="rgba(255,255,255,0.12)">
              <ZxIcon name="location" size={14} color={colors.white} strokeWidth={2.2} />
              <Text style={styles.locText} numberOfLines={1}>{locationLabel}</Text>
            </Glass>
          </Pressable>
          <Glass style={styles.pager} clear tint="rgba(255,255,255,0.1)">
            {slides.map((item, index) => <View key={item.label} style={[styles.dot, index === active && styles.dotActive]} />)}
          </Glass>
          <View style={styles.heroCopy} pointerEvents="none">
            <Text style={styles.heroEyebrow}>{eyebrow}</Text>
            <Text style={styles.heroTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{title}</Text>
            {slide ? <Text style={styles.heroHighlight} numberOfLines={1}>{slide.label}</Text> : null}
          </View>
        </Animated.View>
        </View>
      </View>
    </GestureDetector>
  );
}

/** Next landmark photo clipped to a rounded isosceles trapezoid (wide top, slightly narrower foot). */
function BackCard({ image, drag }: { image: number; drag: SharedValue<number> }) {
  const { width } = useWindowDimensions();
  // Comes forward and loses its frost while the front card is dragged away.
  const style = useAnimatedStyle(() => {
    const p = Math.min(1, Math.abs(drag.value) / width);
    return { transform: [{ scale: 1 + p * 0.04 }, { translateY: -p * 6 }] };
  });
  const veil = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, Math.abs(drag.value) / width) * 0.8 }));
  const card = width - 36; // heroWrap horizontal margins
  const w = card + SHEET_OUT * 2;
  const h = HERO_H - SHEET_TOP + SHEET_DROP;
  const r = 24;
  const inset = SHEET_OUT - SHEET_FOOT;
  const len = Math.hypot(inset, h);
  const ux = inset / len;
  const uy = h / len;
  const d = [
    `M ${r} 0`, `L ${w - r} 0`, `Q ${w} 0 ${w - ux * r} ${uy * r}`,
    `L ${w - inset + ux * r} ${h - uy * r}`, `Q ${w - inset} ${h} ${w - inset - r} ${h}`,
    `L ${inset + r} ${h}`, `Q ${inset} ${h} ${inset - ux * r} ${h - uy * r}`,
    `L ${ux * r} ${uy * r}`, `Q 0 0 ${r} 0`, "Z",
  ].join(" ");
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -SHEET_OUT, top: SHEET_TOP, width: w, height: h, zIndex: 1 }, style]}>
      <Svg width={w} height={h}>
        <Defs>
          <ClipPath id="trap"><Path d={d} /></ClipPath>
        </Defs>
        <SvgImage href={image} x={0} y={0} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath="url(#trap)" />
      </Svg>
      {/* Frost so the back card reads as behind; clears as it comes forward */}
      <Animated.View style={[StyleSheet.absoluteFill, veil]}>
        <Svg width={w} height={h}>
          <Defs>
            <SvgGradient id="frost" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFF1E8" stopOpacity={0.5} />
              <Stop offset="1" stopColor="#FFE0CF" stopOpacity={0.3} />
            </SvgGradient>
          </Defs>
          <Path d={d} fill="url(#frost)" />
          <Path d={d} fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.2} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const ITEM = 96;
const LENS = 168;
const ARC_HEADROOM = 48; // room above the items so the halo is not clipped by the ScrollView
const ARC_TOP = 18; // arcSection paddingTop
const ARC_ICON_CENTER = ARC_TOP + 43; // + half the 86pt centre icon

/** Snapping service carousel on the header fade: the centred item is enlarged and raised, the rest follow the arc. */
export function ServiceArc({ tiles, onOpen, onPressIn, more }: { tiles: Array<{ code: string; name: string }>; onOpen: (code: string) => void; onPressIn?: (code: string) => void; more: string }) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(ITEM);
  const onScroll = useAnimatedScrollHandler((event) => { x.value = event.contentOffset.x; });
  const pad = (width - ITEM) / 2;
  const list = useAnimatedRef<Animated.ScrollView>();
  // Index resting in the sphere: the haptic only ticks when it actually changes.
  const rested = useRef(1);
  // True while our own corrective scroll runs, so its end event is not treated as a new swipe.
  const correcting = useRef(false);
  // Snap guard: never rest between two items (the centred icon must sit inside the glass sphere).
  // iOS already snaps via snapToInterval; this only nudges the rare sub-item remainder, once.
  const settle = (offset: number) => {
    const index = Math.round(offset / ITEM);
    if (!correcting.current && Math.abs(index * ITEM - offset) > 1) {
      correcting.current = true;
      list.current?.scrollTo({ x: index * ITEM, animated: true });
    } else correcting.current = false;
    if (index !== rested.current) { rested.current = index; haptic.select(); }
  };
  // Stable callbacks so Home re-renders (status-bar flips, data refreshes) skip the SVG-heavy items.
  const handlers = useRef({ onOpen, onPressIn });
  handlers.current = { onOpen, onPressIn };
  const open = useCallback((code: string) => handlers.current.onOpen(code), []);
  const pressIn = useCallback((code: string) => handlers.current.onPressIn?.(code), []);
  return (
    <View style={styles.arcSection}>
      {/* Liquid Glass lens floating where the teal header fades into the page */}
      <View pointerEvents="none" style={[styles.lensWrap, { left: width / 2 - LENS / 2 }]}>
        <View style={styles.lensShadow} />
        <Glass style={styles.lens} clear interactive={false} tint="rgba(255,226,210,0.28)" />
        {/* Peach body so the lower half, over the near-white fade, still reads as a glass sphere */}
        <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,196,170,0.22)", "rgba(255,170,140,0.32)"]} locations={[0, 0.55, 1]} style={styles.lensBody} />
        {/* Sheen clipped to the sphere so its soft ellipse never pokes past the rim */}
        <View style={styles.lensClip}>
          {/* Radial highlight: fades to nothing on every side, so no edge shows */}
          <Svg width={LENS} height={LENS}>
            <Defs>
              <RadialGradient id="lensSheen" cx="0.5" cy="0.5" r="0.5">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.75} />
                <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.28} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx={LENS * 0.4} cy={LENS * 0.27} rx={LENS * 0.3} ry={LENS * 0.19} fill="url(#lensSheen)" />
          </Svg>
        </View>
        <View style={styles.lensRim} />
      </View>
      <Animated.ScrollView
        ref={list}
        horizontal
        // Open on the second service so both sides of the arc are filled. A static initial
        // offset (not scrollTo in onLayout, which re-fires on every layout pass and yanked the
        // arc back mid-swipe).
        contentOffset={{ x: ITEM, y: 0 }}
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: pad, paddingTop: ARC_HEADROOM }}
        style={{ height: 176 + ARC_HEADROOM, marginTop: -ARC_HEADROOM }}
        onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.x)}
      >
        {tiles.map((tile, index) => <ArcItem key={tile.code} index={index} x={x} code={tile.code} name={tile.name} onOpen={open} onPressIn={pressIn} />)}
      </Animated.ScrollView>
      <Pressable onPress={() => router.push("/services")} style={styles.moreLink} hitSlop={8}>
        <Text style={styles.moreText}>{more}</Text>
        <ZxIcon name="chevron" size={18} color={CORAL} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const ArcItem = memo(function ArcItem({ index, x, code, name, onOpen, onPressIn }: { index: number; x: SharedValue<number>; code: string; name: string; onOpen: (code: string) => void; onPressIn: (code: string) => void }) {
  const accent = servicePalettes[code]?.accent || colors.brand;
  const motion = useAnimatedStyle(() => {
    const d = Math.abs(x.value - index * ITEM) / ITEM;
    return {
      transform: [
        { translateY: interpolate(d, [0, 1, 2, 3], [0, 34, 74, 120], Extrapolation.CLAMP) },
        { scale: interpolate(d, [0, 1, 2], [1, 0.7, 0.6], Extrapolation.CLAMP) },
      ],
    };
  });
  // Halo + coloured contact shadow only light up on the centred item.
  const lit = useAnimatedStyle(() => ({ opacity: interpolate(Math.abs(x.value - index * ITEM) / ITEM, [0, 0.7], [1, 0], Extrapolation.CLAMP) }));
  return (
    <Pressable onPressIn={() => onPressIn(code)} onPress={() => onOpen(code)} style={{ width: ITEM, alignItems: "center" }}>
      <Animated.View style={[{ alignItems: "center", width: ITEM + 30 }, motion]}>
        <Animated.View pointerEvents="none" style={[styles.halo, lit]}>
          <Svg width={150} height={150} viewBox="0 0 150 150">
            <Defs>
              <RadialGradient id={`halo-${code}`} cx="0.5" cy="0.5" r="0.5">
                <Stop offset="0" stopColor={accent} stopOpacity={0.32} />
                <Stop offset="0.55" stopColor={accent} stopOpacity={0.1} />
                <Stop offset="1" stopColor={accent} stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id={`drop-${code}`} cx="0.5" cy="0.5" r="0.5">
                <Stop offset="0" stopColor={accent} stopOpacity={0.55} />
                <Stop offset="1" stopColor={accent} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={75} cy={66} r={70} fill={`url(#halo-${code})`} />
            <Ellipse cx={75} cy={118} rx={44} ry={9} fill={`url(#drop-${code})`} />
          </Svg>
        </Animated.View>
        <ServiceArt code={code} size={86} />
        <Text style={styles.arcLabel} numberOfLines={2}>{name}</Text>
      </Animated.View>
    </Pressable>
  );
});

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
  heroWrap: { marginHorizontal: 18, marginTop: 4, marginBottom: 30 },
  frontLayer: { zIndex: 2 },
  heroCard: { height: HERO_H, borderRadius: 28, backgroundColor: "#7A2A1C" },
  heroClip: { flex: 1, borderRadius: 28, overflow: "hidden" },
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
  arcSection: { marginTop: -64, paddingTop: ARC_TOP },
  lensWrap: { position: "absolute", top: ARC_ICON_CENTER - LENS / 2, width: LENS, height: LENS },
  lens: { width: LENS, height: LENS, borderRadius: LENS / 2 },
  lensShadow: { position: "absolute", left: 6, right: 6, top: 6, bottom: 6, borderRadius: LENS / 2, backgroundColor: "#FFFFFF", shadowColor: "#C2410C", shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  lensBody: { position: "absolute", left: 0, top: 0, width: LENS, height: LENS, borderRadius: LENS / 2 },
  lensRim: { position: "absolute", left: 0, top: 0, width: LENS, height: LENS, borderRadius: LENS / 2, borderWidth: 0.75, borderColor: "rgba(255,255,255,0.35)" },
  lensClip: { position: "absolute", left: 0, top: 0, width: LENS, height: LENS, borderRadius: LENS / 2, overflow: "hidden" },
  halo: { position: "absolute", top: -32, width: 150, height: 150 },
  arcLabel: { marginTop: 6, fontSize: 15, fontWeight: "700", color: "#17221F", textAlign: "center", lineHeight: 19 },
  moreLink: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, marginTop: 2 },
  moreText: { fontSize: 17, fontWeight: "800", color: CORAL },
  quick: { marginHorizontal: 16, marginTop: 18, paddingVertical: 18, borderRadius: 26, backgroundColor: colors.white, shadowColor: "#0F172A", shadowOpacity: 0.075, shadowRadius: 17, shadowOffset: { width: 0, height: 10 } },
  quickItem: { width: 92, alignItems: "center", gap: 10 },
  quickIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 13.5, fontWeight: "600", color: "#1F2A27" },
});
