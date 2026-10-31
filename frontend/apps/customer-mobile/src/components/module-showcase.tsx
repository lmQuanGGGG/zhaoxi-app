import { localizeServiceName } from "@zhaoxi/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { Service } from "../api/types";
import { imageUri, money } from "../format";
import { useI18n } from "../i18n";
import { colors } from "../theme";
import { AppImage, GlassFill, ServiceArt, ZxIcon, haptic, servicePalettes } from "../ui";

export const monthUnit = { "vi-VN": "tháng", "en-US": "month", "zh-CN": "月", "zh-TW": "月" } as const;
const cardUnits = {
  "vi-VN": { bed: "PN", person: "người" },
  "en-US": { bed: "BR", person: "person" },
  "zh-CN": { bed: "室", person: "人" },
  "zh-TW": { bed: "房", person: "人" },
} as const;
type Locale = keyof typeof monthUnit;
const copy = {
  "vi-VN": { featured: "Nổi bật", best: "Giá tốt nhất", all: "Tất cả" },
  "en-US": { featured: "Featured", best: "Best value", all: "All" },
  "zh-CN": { featured: "精选推荐", best: "超值之选", all: "全部" },
  "zh-TW": { featured: "精選推薦", best: "超值之選", all: "全部" },
} as const;

/** One short line of the facts that matter for the module (beds · m² · area, tour length) plus distance. */
export function cardMeta(item: Service, module: string, locale: Locale) {
  const m = item.metadata || {};
  const parts: string[] = [];
  if (module === "housing") {
    if (Number(m.bedrooms) > 0) parts.push(`${m.bedrooms} ${cardUnits[locale].bed}`);
    if (Number(m.areaSqm) > 0) parts.push(`${m.areaSqm} m²`);
    if (m.district) parts.push(String(m.district));
  }
  if (module === "travel" && m.duration) parts.push(String(m.duration));
  if (item.distanceKm != null) parts.push(`${item.distanceKm.toFixed(1)} km`);
  return parts.join(" · ");
}

export function priceUnit(module: string, locale: Locale) {
  return module === "housing" ? monthUnit[locale] : module === "travel" ? cardUnits[locale].person : "";
}

export const sectionCopy = (locale: Locale) => copy[locale];

function Photo({ item, module, style }: { item: Service; module: string; style: object }) {
  const image = imageUri(item.metadata?.imageUrl);
  if (image) return <AppImage uri={image} style={style} />;
  const palette = servicePalettes[module] || { tint: "#ECFDF5", accent: "#0FAF7A" };
  return <View style={[style, { backgroundColor: palette.tint, alignItems: "center", justifyContent: "center" }]}><ServiceArt code={module} size={96} /></View>;
}

const open = (item: Service) => router.push(`/service/${item.id}`);

/* ------------------------------------------------------------------ */
/* Featured: 3D ring carousel that turns by itself, drag to spin       */
/* ------------------------------------------------------------------ */

const AUTOPLAY_MS = 3200;

/** Runs `tick` every `ms` while the screen is focused and the user is not touching. */
function useAutoplay(tick: () => void, ms: number) {
  const paused = useRef(false);
  const resumeAt = useRef(0);
  const saved = useRef(tick);
  saved.current = tick;
  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => { if (!paused.current && Date.now() > resumeAt.current) saved.current(); }, ms);
    return () => clearInterval(timer);
  }, [ms]));
  return {
    hold: () => { paused.current = true; },
    release: () => { paused.current = false; resumeAt.current = Date.now() + ms * 1.5; },
  };
}

export function FeaturedCarousel({ items, module }: { items: Service[]; module: string }) {
  const { locale } = useI18n();
  const { width } = useWindowDimensions();
  const count = items.length;
  const cardW = Math.round(width * 0.6);
  const cardH = Math.round(cardW * 0.7);
  const angle = useSharedValue(0); // ring rotation in "card steps"
  const start = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const wrap = (n: number) => ((n % count) + count) % count;

  const goTo = (step: number) => {
    angle.value = withTiming(step, { duration: 700, easing: Easing.out(Easing.cubic) });
    setIndex(wrap(Math.round(step)));
  };
  const auto = useAutoplay(() => goTo(Math.round(angle.value) + 1), AUTOPLAY_MS);
  const settle = (step: number) => { setIndex(wrap(step)); auto.release(); };

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onBegin(() => { start.value = angle.value; scheduleOnRN(auto.hold); })
    .onUpdate((event) => { angle.value = start.value - event.translationX / (cardW * 0.7); })
    .onEnd((event) => {
      const target = Math.round(angle.value - event.velocityX / 2500);
      angle.value = withSpring(target, { damping: 18, stiffness: 140 });
      scheduleOnRN(settle, target);
    })
    .onFinalize(() => { scheduleOnRN(auto.release); });

  const current = items[index];
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <View style={{ marginTop: 6 }}>
      <View style={styles.ringHead}>
        <Text style={styles.rowTitleFlat}>{copy[locale].featured}</Text>
        <View style={styles.pager}>
          <Text style={styles.counter}>{pad(index + 1)}<Text style={styles.counterTotal}> / {pad(count)}</Text></Text>
          <Arrow dir="left" onPress={() => { auto.release(); goTo(Math.round(angle.value) - 1); }} />
          <Arrow dir="right" onPress={() => { auto.release(); goTo(Math.round(angle.value) + 1); }} />
        </View>
      </View>
      <GestureDetector gesture={pan}>
        <View style={{ height: cardH + 36, marginTop: 8 }}>
          {/* Paint order = depth: the card nearest the front is rendered last (animated zIndex is unreliable on iOS). */}
          {items.map((item, i) => ({ item, i, gap: Math.min(wrap(i - index), wrap(index - i)) })).sort((a, b) => b.gap - a.gap).map(({ item, i }) => (
            <RingCard key={item.id} item={item} module={module} index={i} count={count} angle={angle} cardW={cardW} cardH={cardH} left={(width - cardW) / 2} />
          ))}
        </View>
      </GestureDetector>
      {current ? (
        <Pressable onPress={() => open(current)} style={styles.ringCopy}>
          <Text style={styles.ringName} numberOfLines={1}>{localizeServiceName(locale, current.name || current.code)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Arrow({ dir, onPress, disabled }: { dir: "left" | "right"; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={() => { haptic.select(); onPress(); }} hitSlop={6} style={({ pressed }) => [styles.arrow, disabled && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.92 }] }]}>
      <GlassFill radius={18} />
      <View style={dir === "left" ? { transform: [{ rotate: "180deg" }] } : undefined}><ZxIcon name="chevron" size={15} color={colors.ink} strokeWidth={2.6} /></View>
    </Pressable>
  );
}

function RingCard({ item, module, index, count, angle, cardW, cardH, left }: { item: Service; module: string; index: number; count: number; angle: SharedValue<number>; cardW: number; cardH: number; left: number }) {
  const style = useAnimatedStyle(() => {
    // Shortest signed distance on the loop, so cards wrap round endlessly out of sight.
    let d = (index - angle.value) % count;
    if (d > count / 2) d -= count;
    if (d < -count / 2) d += count;
    const a = Math.abs(d);
    return {
      opacity: interpolate(a, [0, 1, 2, 2.6], [1, 0.9, 0.55, 0], Extrapolation.CLAMP),
      transform: [
        { perspective: 900 },
        { translateX: Math.sign(d) * interpolate(a, [0, 1, 2], [0, cardW * 0.6, cardW * 0.98], Extrapolation.CLAMP) },
        { rotateY: `${interpolate(d, [-2, -1, 0, 1, 2], [48, 36, 0, -36, -48], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(a, [0, 1, 2], [1, 0.8, 0.66], Extrapolation.CLAMP) },
      ],
    };
  });
  // Own flat container per card: sibling 3D layers would otherwise intersect and poke through the front card.
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <Animated.View style={[styles.ringSlot, { left, width: cardW, height: cardH }, style]}>
      <Pressable onPress={() => open(item)} style={styles.ringCard}>
        <Photo item={item} module={module} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]} locations={[0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        {Number(item.priceFrom || 0) > 0 ? <View style={styles.featuredPrice}><Text style={styles.featuredPriceText}>{money(item.priceFrom, item.currency)}</Text></View> : null}
      </Pressable>
    </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Best value: leaning 3D posters with big gold rank numbers           */
/* ------------------------------------------------------------------ */

const WIDE_W = 214;
const WIDE_H = 228; // close to square
const RANK_STEP = WIDE_W + 14;

/** Best value: landscape cards that lean in 3D by their place in the row, with an inset photo and a price tag. */
export function RankedRow({ items, module }: { items: Service[]; module: string }) {
  const { locale } = useI18n();
  const ranked = useMemo(() => [...items].filter((x) => Number(x.priceFrom || 0) > 0).sort((a, b) => Number(a.priceFrom) - Number(b.priceFrom)).slice(0, 6), [items]);
  const row = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => { x.value = event.contentOffset.x; });
  const at = useRef(0);
  const auto = useAutoplay(() => {
    if (ranked.length < 2) return;
    at.current = (at.current + 1) % ranked.length;
    row.current?.scrollTo({ x: at.current * RANK_STEP, animated: true });
  }, AUTOPLAY_MS + 600);
  if (ranked.length < 2) return null;
  return (
    <View style={{ marginTop: 26 }}>
      <Text style={styles.rowTitle}>{copy[locale].best}</Text>
      <Animated.ScrollView
        ref={row}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={RANK_STEP}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={auto.hold}
        onMomentumScrollEnd={(event) => { at.current = Math.round(event.nativeEvent.contentOffset.x / RANK_STEP); auto.release(); }}
        contentContainerStyle={{ paddingLeft: 18, paddingRight: 18, paddingTop: 18, paddingBottom: 8, gap: 14 }}
      >
        {ranked.map((item, i) => <WideCard key={item.id} item={item} module={module} index={i} x={x} />)}
      </Animated.ScrollView>
    </View>
  );
}

function WideCard({ item, module, index, x }: { item: Service; module: string; index: number; x: SharedValue<number> }) {
  const { locale } = useI18n();
  const meta = cardMeta(item, module, locale);
  const unit = priceUnit(module, locale);
  // Posters lean towards each other in pairs (1 faces right, 2 faces left, 3 right…),
  // like a row of standing cards; the one at the start of the row lifts slightly.
  const facing = index % 2 === 0 ? -1 : 1; // -1 faces right, +1 faces left
  const lean = useAnimatedStyle(() => {
    const a = Math.abs((index * RANK_STEP - x.value) / RANK_STEP);
    return {
      transform: [
        { perspective: 600 },
        { rotateY: `${facing * 18}deg` },
        { scale: interpolate(a, [0, 1], [1, 0.95], Extrapolation.CLAMP) },
      ],
    };
  });
  return (
    <Pressable onPress={() => open(item)} style={{ width: WIDE_W }}>
      {/* Own container: the leaning card must not intersect its neighbours in 3D */}
      <View>
        <Animated.View style={[styles.wideShadow, lean]}>
          <View style={styles.wide}>
            <Photo item={item} module={module} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.5 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={styles.tag}><Text style={styles.tagText}>{money(item.priceFrom, item.currency)}{unit ? ` / ${unit}` : ""}</Text></View>
          </View>
        </Animated.View>
      </View>
      <View style={styles.rankRow}>
        <Text style={styles.rank}>{index + 1}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.wideName} numberOfLines={1}>{localizeServiceName(locale, item.name || item.code)}</Text>
          {meta ? <Text style={styles.wideMeta} numberOfLines={1}>{meta}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function SectionTitle({ title }: { title: string }) {
  return <Text style={[styles.rowTitle, { marginTop: 26, marginBottom: 12 }]}>{title}</Text>;
}

const styles = StyleSheet.create({
  ringHead: { marginHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowTitleFlat: { fontSize: 20, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  ringSlot: { position: "absolute", top: 18 },
  ringCard: { flex: 1, borderRadius: 24, overflow: "hidden", backgroundColor: "#E6F1F1", borderWidth: 2, borderColor: "rgba(255,255,255,0.95)" },
  ringCopy: { marginHorizontal: 22, marginTop: 4, gap: 3, alignItems: "center" },
  ringName: { fontSize: 17, fontWeight: "800", color: colors.ink, textAlign: "center" },
  ringSummary: { fontSize: 12.5, color: colors.slate, textAlign: "center" },
  panel: { marginHorizontal: 14, marginTop: 6, paddingTop: 18, paddingBottom: 18, borderRadius: 28, overflow: "hidden" },
  panelHead: { paddingHorizontal: 18, gap: 12 },
  panelTitle: { fontSize: 21, fontWeight: "800", color: colors.white, letterSpacing: -0.3 },
  pager: { flexDirection: "row", alignItems: "center", gap: 10 },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  counter: { marginRight: 4, fontSize: 18, fontWeight: "800", color: colors.ink, fontVariant: ["tabular-nums"] },
  counterTotal: { fontSize: 13, fontWeight: "700", color: colors.slate },
  featuredCard: { borderRadius: 22, overflow: "hidden", backgroundColor: "#0A3A40", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.22)" },
  featuredPrice: { position: "absolute", right: 12, top: 12, paddingHorizontal: 10, height: 28, borderRadius: 14, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  featuredPriceText: { fontSize: 12.5, fontWeight: "800", color: "#FFD36B" },
  featuredMeta: { position: "absolute", left: 14, right: 14, bottom: 12, fontSize: 12, fontWeight: "700", color: colors.white },
  panelCopy: { paddingHorizontal: 22, gap: 4 },
  panelName: { fontSize: 18, fontWeight: "800", color: colors.white },
  panelSummary: { fontSize: 13, color: "rgba(255,255,255,0.68)" },
  rowTitle: { marginHorizontal: 18, fontSize: 20, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  wideShadow: { borderRadius: 20, shadowColor: "#0F172A", shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 8, height: 12 } },
  wide: { height: WIDE_H, borderRadius: 20, overflow: "hidden", backgroundColor: "#E6F1F1", borderWidth: 2, borderColor: "rgba(255,255,255,0.95)" },
  tag: { position: "absolute", left: 10, bottom: 10, paddingHorizontal: 9, height: 24, borderRadius: 7, justifyContent: "center", backgroundColor: "rgba(17,24,64,0.82)" },
  tagText: { fontSize: 11.5, fontWeight: "800", color: colors.white },
  rankRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 10, paddingLeft: 4 },
  rank: { fontSize: 52, lineHeight: 54, fontWeight: "900", fontStyle: "italic", color: "#F2B53A", marginBottom: -6 },
  wideName: { fontSize: 14.5, fontWeight: "800", color: colors.ink },
  wideMeta: { marginTop: 3, fontSize: 12, color: colors.slate },
});
