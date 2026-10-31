import { localizeServiceModuleName, localizeServiceName } from "@zhaoxi/i18n";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { cancelAnimation, Easing, Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import type { Recommendation } from "../api/types";
import { imageUri, money } from "../format";
import { useI18n } from "../i18n";
import { routeForWebHref } from "../links";
import { colors } from "../theme";
import { useDishColor } from "../dish-color";
import { AppImage, GlassFill, ServiceArt, ZxIcon, haptic, servicePalettes } from "../ui";

const CARD_W = 210;
const CARD_H = 280;
const STEP = CARD_W * 0.78; // cards overlap so the side ones peek out from behind the centre one
const SHADOW_ROOM = 72; // vertical room so card shadows fade out instead of being cut by the ScrollView

/**
 * "Khám phá thêm" as an immersive coverflow (My Viettel "Giải trí không giới hạn"):
 * white card, highlighted title, glass module tabs, 3D carousel where the
 * centred card is straight and large and the neighbours rotate away in depth.
 */
export function ExploreCoverflow({ items, title, highlight, more, allLabel }: { items: Recommendation[]; title: string; highlight: string; more: string; allLabel: string }) {
  const { locale } = useI18n();
  const { width } = useWindowDimensions();
  const modules = useMemo(() => [...new Set(items.map((item) => item.moduleCode).filter(Boolean))].slice(0, 4), [items]);
  const [tab, setTab] = useState<string>("all");
  const list = useMemo(() => (tab === "all" ? items : items.filter((item) => item.moduleCode === tab)), [items, tab]);
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => { x.value = event.contentOffset.x; });
  const pad = (width - CARD_W) / 2;
  const mascot = tab === "all" ? list[0]?.moduleCode || "food" : tab;
  if (!items.length) return null;
  return (
    <View style={styles.panel}>
      <Mascot code={mascot} />
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {title} <Text style={styles.highlight}>{highlight}</Text>
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {[{ key: "all", label: allLabel }, ...modules.map((code) => ({ key: code, label: localizeServiceModuleName(locale, code) }))].map((item) => {
          const active = tab === item.key;
          return (
            <Pressable key={item.key} onPress={() => { haptic.select(); setTab(item.key); }} style={({ pressed }) => [styles.tab, pressed && { transform: [{ scale: 0.95 }] }]}>
              <GlassFill radius={24} tint={active ? "rgba(226,72,52,0.9)" : "rgba(241,243,246,0.7)"} />
              {item.key !== "all" ? <ServiceArt code={item.key} size={22} /> : <ZxIcon name="services" size={18} color={active ? colors.white : "#475569"} />}
              <Text style={[styles.tabText, active && { color: colors.white }]} numberOfLines={1}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Animated.ScrollView
        key={tab}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={STEP}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={() => haptic.select()}
        contentContainerStyle={{ paddingHorizontal: pad, paddingVertical: SHADOW_ROOM, alignItems: "center" }}
        style={{ height: CARD_H + SHADOW_ROOM * 2, marginTop: -SHADOW_ROOM - 4, marginBottom: -SHADOW_ROOM + 12 }}
      >
        {list.slice(0, 10).map((item, index) => <FlowCard key={`${item.kind}-${item.id}`} item={item} index={index} x={x} last={index === Math.min(list.length, 10) - 1} />)}
      </Animated.ScrollView>
      <Pressable onPress={() => router.push("/explore")} style={({ pressed }) => [styles.more, pressed && { transform: [{ scale: 0.96 }] }]}>
        <GlassFill radius={20} tint="rgba(226,72,52,0.92)" />
        <Text style={styles.moreText}>{more}</Text>
        <ZxIcon name="chevron" size={14} color={colors.white} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

function FlowCard({ item, index, x, last }: { item: Recommendation; index: number; x: SharedValue<number>; last: boolean }) {
  const { locale, t } = useI18n();
  const style = useAnimatedStyle(() => {
    const d = (index * STEP - x.value) / STEP; // <0 left of centre, >0 right
    const a = Math.abs(d);
    return {
      zIndex: Math.round(100 - a * 10),
      opacity: interpolate(a, [0, 2, 2.6], [1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { perspective: 800 },
        { translateX: interpolate(d, [-2, -1, 0, 1, 2], [CARD_W * 0.18, CARD_W * 0.1, 0, -CARD_W * 0.1, -CARD_W * 0.18], Extrapolation.CLAMP) },
        { rotateY: `${interpolate(d, [-1, 0, 1], [38, 0, -38], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(a, [0, 1, 2], [1, 0.82, 0.7], Extrapolation.CLAMP) },
      ],
    };
  });
  const price = Number(item.priceFrom || 0) > 0 ? money(item.priceFrom, item.currency) : "";
  const uri = imageUri(item.imageUrl);
  // Card glows in the dish's own dominant colour (service accent when there is no photo).
  const glow = useDishColor(uri, servicePalettes[item.moduleCode || ""]?.accent || colors.brand);
  return (
    <Animated.View style={[{ width: STEP, height: CARD_H, alignItems: "center", marginRight: last ? CARD_W - STEP : 0 }, style]}>
      <Pressable onPress={() => router.push(routeForWebHref(item.href))} style={[styles.card, { shadowColor: glow }]}>
        <View style={styles.cardClip} />
        {/* Unclipped and without a background so iOS draws the shadow along the dish's own outline */}
        <View style={styles.dishShadow} pointerEvents="none">
          <AppImage uri={uri} fallbackCode={item.moduleCode} contentFit="contain" style={styles.dish} />
        </View>
        <View style={styles.cardContent} pointerEvents="none">

          <View style={styles.badge}>
            <GlassFill radius={14} tint="rgba(255,255,255,0.4)" />
            <ServiceArt code={item.moduleCode} size={22} />
          </View>
          <View style={styles.info}>
            <Text style={styles.cardTitle} numberOfLines={2}>{localizeServiceName(locale, item.title)}</Text>
            {price ? <Text style={styles.cardPrice}>{t.common.from} {price}</Text> : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** 3D service illustration floating over the panel corner (the reference mascot). */
function Mascot({ code }: { code: string }) {
  const y = useSharedValue(0);
  // Bob only while Home is on screen; an endless loop on a hidden tab still costs frames.
  useFocusEffect(useCallback(() => {
    y.value = withRepeat(withSequence(withTiming(-8, { duration: 1600, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })), -1);
    return () => cancelAnimation(y);
  }, [y]));
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: "-8deg" }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.mascot, bob]}>
      <ServiceArt code={code} size={96} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 24, paddingTop: 26, paddingBottom: 22, borderRadius: 30, backgroundColor: colors.white, shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } },
  mascot: { position: "absolute", right: 12, top: -46 },
  title: { paddingHorizontal: 22, paddingRight: 104, fontSize: 21, fontWeight: "800", color: "#17221F", letterSpacing: -0.3 },
  highlight: { color: "#E2482F" },
  tabs: { gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 22 },
  tab: { height: 46, paddingHorizontal: 16, borderRadius: 23, flexDirection: "row", alignItems: "center", gap: 8 },
  tabText: { fontSize: 15, fontWeight: "700", color: "#334155" },
  card: { width: CARD_W, height: CARD_H, borderRadius: 24, backgroundColor: colors.white, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 12 } },
  cardClip: { ...StyleSheet.absoluteFill, borderRadius: 24, backgroundColor: colors.white },
  cardContent: { ...StyleSheet.absoluteFill },
  dishShadow: { position: "absolute", left: 18, right: 18, top: 40, bottom: 78, shadowColor: "#3B2410", shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 14 } },
  dish: { width: "100%", height: "100%", backgroundColor: "transparent" },
  badge: { position: "absolute", left: 12, top: 12, width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  info: { position: "absolute", left: 16, right: 16, bottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#17221F", lineHeight: 20 },
  cardPrice: { marginTop: 3, fontSize: 13, fontWeight: "800", color: colors.priceRose },
  more: { alignSelf: "center", marginTop: 4, height: 40, paddingHorizontal: 20, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 4 },
  moreText: { fontSize: 14, fontWeight: "800", color: colors.white },
});
