import { localizeServiceModuleName, localizeServiceName } from "@zhaoxi/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import type { Recommendation } from "../api/types";
import { imageUri, money } from "../format";
import { useI18n } from "../i18n";
import { routeForWebHref } from "../links";
import { colors } from "../theme";
import { AppImage, GlassFill, ServiceArt, ZxIcon, haptic } from "../ui";

const CARD_W = 210;
const CARD_H = 280;
const STEP = CARD_W * 0.78; // cards overlap so the side ones peek out from behind the centre one

/**
 * "Khám phá thêm" as an immersive coverflow (My Viettel "Giải trí không giới hạn"):
 * dark coral panel, highlighted title, glass module tabs, 3D carousel where the
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
      <LinearGradient colors={["#B3301D", "#4A1710", "#1B1110"]} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 34 }]} />
      <Mascot code={mascot} />
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {title} <Text style={styles.highlight}>{highlight}</Text>
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {[{ key: "all", label: allLabel }, ...modules.map((code) => ({ key: code, label: localizeServiceModuleName(locale, code) }))].map((item) => {
          const active = tab === item.key;
          return (
            <Pressable key={item.key} onPress={() => { haptic.select(); setTab(item.key); }} style={({ pressed }) => [styles.tab, pressed && { transform: [{ scale: 0.95 }] }]}>
              <GlassFill radius={24} clear={!active} tint={active ? "rgba(226,72,52,0.75)" : "rgba(255,255,255,0.08)"} />
              {item.key !== "all" ? <ServiceArt code={item.key} size={22} /> : <ZxIcon name="services" size={18} color={active ? colors.white : "rgba(255,255,255,0.75)"} />}
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
        contentContainerStyle={{ paddingHorizontal: pad, alignItems: "center" }}
        style={{ height: CARD_H + 40 }}
      >
        {list.slice(0, 10).map((item, index) => <FlowCard key={`${item.kind}-${item.id}`} item={item} index={index} x={x} last={index === Math.min(list.length, 10) - 1} />)}
      </Animated.ScrollView>
      <Pressable onPress={() => router.push("/explore")} style={({ pressed }) => [styles.more, pressed && { transform: [{ scale: 0.96 }] }]}>
        <GlassFill radius={26} tint="rgba(226,72,52,0.92)" />
        <Text style={styles.moreText}>{more}</Text>
        <ZxIcon name="chevron" size={18} color={colors.white} strokeWidth={2.6} />
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
  return (
    <Animated.View style={[{ width: STEP, height: CARD_H, alignItems: "center", marginRight: last ? CARD_W - STEP : 0 }, style]}>
      <Pressable onPress={() => router.push(routeForWebHref(item.href))} style={styles.card}>
        <View style={styles.cardClip}>
          <AppImage uri={imageUri(item.imageUrl)} fallbackCode={item.moduleCode} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(40,14,8,0)", "rgba(40,14,8,0.72)"]} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
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
  useEffect(() => {
    y.value = withRepeat(withSequence(withTiming(-8, { duration: 1600, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })), -1);
  }, [y]);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: "-8deg" }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.mascot, bob]}>
      <ServiceArt code={code} size={96} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: -16, marginTop: 28, paddingTop: 26, paddingBottom: 24, borderTopLeftRadius: 34, borderTopRightRadius: 34, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: "visible" },
  mascot: { position: "absolute", right: 12, top: -46 },
  title: { paddingHorizontal: 22, paddingRight: 104, fontSize: 21, fontWeight: "800", color: colors.white, letterSpacing: -0.3 },
  highlight: { color: "#FF7A5C" },
  tabs: { gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  tab: { height: 46, paddingHorizontal: 16, borderRadius: 23, flexDirection: "row", alignItems: "center", gap: 8 },
  tabText: { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.78)" },
  card: { width: CARD_W, height: CARD_H, borderRadius: 24, backgroundColor: "#F7EFE7", shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 14 } },
  cardClip: { flex: 1, borderRadius: 24, overflow: "hidden", backgroundColor: "#F7EFE7" },
  badge: { position: "absolute", left: 12, top: 12, width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  info: { position: "absolute", left: 14, right: 14, bottom: 14 },
  cardTitle: { fontSize: 17, fontWeight: "800", color: colors.white, lineHeight: 21, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 6 },
  cardPrice: { marginTop: 4, fontSize: 13, fontWeight: "800", color: "#FFD7A8" },
  more: { alignSelf: "center", marginTop: 8, height: 52, paddingHorizontal: 28, borderRadius: 26, flexDirection: "row", alignItems: "center", gap: 6 },
  moreText: { fontSize: 18, fontWeight: "800", color: colors.white },
});
