import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localizeOrganizationName, localizeServiceModuleName, localizeServiceName, statusLabels } from "@zhaoxi/i18n";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { getHomeFeed, getModules, getNearbyServices, getOrders, getRecommendations, getUiConfig } from "../../src/api/endpoints";
import type { FeedService, HomeFeed, Recommendation } from "../../src/api/types";
import { TAB_BAR_SPACE } from "../../src/constants";
import { imageUri, money } from "../../src/format";
import { useSession } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { routeForWebHref } from "../../src/links";
import { locate, pointKey, useLocationState } from "../../src/location";
import { moduleRoute, resolveModules } from "../../src/modules";
import { keys } from "../../src/query";
import { ACTIVE_STATUSES } from "../../src/status";
import { colors, serviceColors, shadow } from "../../src/theme";
import { AppImage, PressableScale, Screen, SectionTitle, ServiceIcon, Skeleton, StatusPill, ZxIcon } from "../../src/ui";

const landmarks = [
  { image: require("../../assets/landmarks/dragon-bridge.webp"), label: { "vi-VN": "Cầu Rồng", "en-US": "Dragon Bridge", "zh-CN": "龙桥", "zh-TW": "龍橋" } },
  { image: require("../../assets/landmarks/ba-na-hills.webp"), label: { "vi-VN": "Bà Nà Hills", "en-US": "Ba Na Hills", "zh-CN": "巴拿山", "zh-TW": "巴拿山" } },
  { image: require("../../assets/landmarks/my-khe-beach.webp"), label: { "vi-VN": "Biển Mỹ Khê", "en-US": "My Khe Beach", "zh-CN": "美溪海滩", "zh-TW": "美溪海灘" } },
  { image: require("../../assets/landmarks/marble-mountains.webp"), label: { "vi-VN": "Ngũ Hành Sơn", "en-US": "Marble Mountains", "zh-CN": "五行山", "zh-TW": "五行山" } },
  { image: require("../../assets/landmarks/linh-ung.webp"), label: { "vi-VN": "Chùa Linh Ứng", "en-US": "Linh Ung Pagoda", "zh-CN": "灵应寺", "zh-TW": "靈應寺" } },
  { image: require("../../assets/landmarks/han-river.webp"), label: { "vi-VN": "Sông Hàn", "en-US": "Han River", "zh-CN": "韩江", "zh-TW": "韓江" } },
] as const;

const locationCopy = {
  "vi-VN": { title: "Vị trí hiện tại", hint: "ZhaoXi sẽ ưu tiên dịch vụ gần bạn", choose: "Chọn vị trí" },
  "en-US": { title: "Current location", hint: "ZhaoXi will prioritise services near you", choose: "Choose location" },
  "zh-CN": { title: "当前位置", hint: "赵喜将优先推荐您附近的服务", choose: "选择位置" },
  "zh-TW": { title: "目前位置", hint: "趙喜將優先推薦您附近的服務", choose: "選擇位置" },
} as const;

export default function HomeScreen() {
  const { t, locale } = useI18n();
  const { userId } = useSession();
  const client = useQueryClient();
  const location = useLocationState();

  const uiConfig = useQuery({ queryKey: keys.uiConfig, queryFn: getUiConfig, staleTime: 5 * 60_000 });
  const modules = useQuery({ queryKey: keys.modules(locale), queryFn: () => getModules(locale), staleTime: 5 * 60_000 });
  const recommendations = useQuery({ queryKey: keys.recommendations(locale), queryFn: () => getRecommendations(locale) });
  const feed = useQuery({ queryKey: keys.homeFeed(locale, userId), queryFn: () => getHomeFeed(locale), enabled: Boolean(userId) });
  const orders = useQuery({ queryKey: keys.orders(locale, userId), queryFn: () => getOrders(locale), enabled: Boolean(userId) });
  const activeOrder = orders.data?.find((order) => ACTIVE_STATUSES.has(order.status));

  // Use the last known GPS point silently; only prompt when the user taps "Chọn vị trí".
  useEffect(() => { if (!location.point) void locate(false); }, [location.point]);

  const tiles = useMemo(() => resolveModules(modules.data, locale).filter((m) => m.code !== "emergency").slice(0, 8), [modules.data, locale]);
  const banner = uiConfig.data?.bannerContent?.[locale];
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([modules.refetch(), recommendations.refetch(), feed.refetch(), orders.refetch()]);
    setRefreshing(false);
  }, [modules, recommendations, feed, orders]);

  const prefetchModule = (code: string) => {
    if (code === "emergency" || code === "payment") return;
    void client.prefetchQuery({ queryKey: keys.nearby(code, locale, pointKey(location.point)), queryFn: () => getNearbyServices(code, locale, location.point), staleTime: 60_000 });
  };
  const lc = locationCopy[locale];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: TAB_BAR_SPACE }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        showsVerticalScrollIndicator={false}
      >
        <PressableScale onPress={() => router.push("/explore")} style={[styles.search, shadow("search")]} scaleTo={0.985}>
          <ZxIcon name="search" size={18} color={colors.brand} />
          <Text style={styles.searchText} numberOfLines={1}>{t.home.search}</Text>
        </PressableScale>

        <WelcomeBanner title={banner?.title || t.home.welcome} subtitle={banner?.subtitle || t.home.subtitle} city={banner?.cityLabel || t.home.city} cta={t.home.explore} />

        {activeOrder ? (
          <Animated.View entering={FadeInDown.duration(320)}>
            <PressableScale onPress={() => router.push(`/order/${activeOrder.id}`)} style={[styles.activeOrder, shadow("soft")]} scaleTo={0.985}>
              <View style={styles.activeIcon}><ZxIcon name="orders" size={20} color={colors.white} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{t.home.activeOrder} · {activeOrder.requestCode}</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }} numberOfLines={1}>{activeOrder.serviceName || activeOrder.title}</Text>
              </View>
              <StatusPill label={statusLabels[locale][activeOrder.status] || activeOrder.status} />
            </PressableScale>
          </Animated.View>
        ) : null}

        <View style={styles.contextRow}>
          <View style={[styles.contextCard, shadow("soft")]}>
            <LinearGradient colors={["#F7FBFA", "#DDF4F0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
            <Text style={styles.locTitle}>{lc.title}</Text>
            <Text style={styles.locBody} numberOfLines={3}>{location.status === "locating" ? t.home.locating : location.label || lc.hint}</Text>
            <View style={styles.locActions}>
              <PressableScale onPress={() => void locate(true)} style={styles.chooseButton}><Text style={styles.chooseText} numberOfLines={1}>{lc.choose}</Text></PressableScale>
              <PressableScale onPress={() => router.push("/services/food")} style={styles.mapButton}><ZxIcon name="map" size={20} color={colors.ink} /></PressableScale>
            </View>
          </View>
          <PressableScale onPress={() => router.push("/support")} scaleTo={0.98} style={[styles.contextCard, shadow("soft")]}>
            <LinearGradient colors={["#FFFDF8", "#F5EBCD"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
            <Text style={styles.aiTitle} numberOfLines={3}>{t.home.ai}</Text>
            <Text style={styles.aiBody} numberOfLines={3}>{t.home.aiHint}</Text>
            <View style={styles.aiIcon}><ZxIcon name="assistant" size={20} color="#D97706" strokeWidth={2} /></View>
          </PressableScale>
        </View>

        <SectionTitle title={t.home.module} action={t.common.more} onAction={() => router.push("/services")} />
        <View style={styles.grid}>
          {tiles.map((tile, index) => {
            const palette = serviceColors[tile.code] || { accent: colors.brand, tint: colors.brandSoft };
            return (
              <Animated.View key={tile.code} entering={FadeIn.delay(index * 30)} style={styles.tileWrap}>
                <Pressable onPressIn={() => prefetchModule(tile.code)} onPress={() => router.push(moduleRoute(tile.code))} style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.94 }] }]}>
                  <View style={[styles.tileIcon, { backgroundColor: palette.tint }, shadow("card")]}><View style={styles.tileImage}><ServiceIcon code={tile.code} size={50} /></View></View>
                  <Text style={styles.tileLabel} numberOfLines={2}>{tile.name}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <PersonalFeed feed={feed.data} />

        <SectionTitle title={t.home.recommend} action={t.common.more} onAction={() => router.push("/explore")} />
        {recommendations.isPending ? (
          <View style={{ flexDirection: "row", gap: 9 }}>{[0, 1].map((i) => <Skeleton key={i} width={150} height={200} radius={12} />)}</View>
        ) : (
          <FlatList
            horizontal
            data={(recommendations.data?.items || []).slice(0, 8)}
            keyExtractor={(item) => `${item.kind}-${item.id}`}
            renderItem={({ item }) => <RecommendationCard item={item} personalized={Boolean(recommendations.data?.personalized)} />}
            showsHorizontalScrollIndicator={false}
            snapToInterval={159}
            decelerationRate="fast"
            contentContainerStyle={{ gap: 9, paddingHorizontal: 16, paddingBottom: 8 }}
            style={{ marginHorizontal: -16 }}
          />
        )}

        <PressableScale onPress={() => router.push("/emergency")} style={[styles.emergency, { shadowColor: "#A6472B", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 10 } }]} scaleTo={0.985}>
          <View style={styles.emIcon}><ServiceIcon code="emergency" size={34} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emTitle}>{t.home.emergency}</Text>
            <Text style={styles.emBody}>{t.home.emergencyHint}</Text>
          </View>
          <ZxIcon name="chevron" size={18} color="#A6472B" />
        </PressableScale>
        <Text style={styles.footer}>{t.home.footer}</Text>
      </ScrollView>
    </Screen>
  );
}

function WelcomeBanner({ title, subtitle, city, cta }: { title: string; subtitle: string; city: string; cta: string }) {
  const { locale } = useI18n();
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setActive((value) => (value + 1) % landmarks.length), 3000);
    return () => clearInterval(timer);
  }, []);
  const slide = landmarks[active] ?? landmarks[0];
  return (
    <View style={[styles.banner, shadow("banner")]}>
      <Image source={slide.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={800} />
      <LinearGradient colors={["rgba(24,63,53,0.78)", "rgba(24,63,53,0.38)", "rgba(24,63,53,0.12)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["transparent", "rgba(10,28,24,0.45)"]} style={StyleSheet.absoluteFill} />
      <View style={styles.bannerCopy}>
        <Text style={styles.bannerEyebrow}>ZHAOXI · {city}</Text>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerSubtitle} numberOfLines={1}>{subtitle}</Text>
        <PressableScale onPress={() => router.push("/explore")} style={styles.bannerCta}>
          <Text style={styles.bannerCtaText}>{cta} ›</Text>
        </PressableScale>
      </View>
      <Text style={styles.bannerLandmark}>{slide.label[locale]}</Text>
      <View style={styles.dots}>
        {landmarks.map((_, index) => <Pressable key={index} hitSlop={4} onPress={() => setActive(index)} style={[styles.dot, index === active && styles.dotActive]} />)}
      </View>
    </View>
  );
}

function RecommendationCard({ item, personalized }: { item: Recommendation; personalized: boolean }) {
  const { t, locale } = useI18n();
  const reason = item.reasonCode === "favorite" ? t.home.becauseFavorite : item.reasonCode === "recent_view" ? t.home.becauseViewed : item.reasonCode === "ordered" ? t.home.becauseOrdered : item.reasonCode === "popular" ? t.home.becausePopular : item.reasonCode === "new" ? t.home.becauseNew : t.home.becauseExplore;
  const meta = personalized ? reason : item.kind === "module_fallback" ? t.home.available : item.isNew ? t.home.newPartner : item.usageCount > 0 ? t.home.popular : localizeOrganizationName(locale, null, item.organizationName) || t.home.available;
  const price = Number(item.priceFrom || 0) > 0 ? money(item.priceFrom, item.currency) : "";
  return (
    <PressableScale onPress={() => router.push(routeForWebHref(item.href))} style={[styles.feedCard, { width: 150 }, shadow("card")]}>
      <View>
        <AppImage uri={imageUri(item.imageUrl)} fallbackCode={item.moduleCode} style={styles.feedThumb} />
        <View style={styles.feedBadge}><ServiceIcon code={item.moduleCode} size={20} /></View>
      </View>
      <Text style={styles.feedTitle} numberOfLines={1}>{localizeServiceName(locale, item.title)}</Text>
      <Text style={styles.feedSub} numberOfLines={1}>{meta}</Text>
      {price ? <Text style={styles.feedPrice}>{t.common.from} {price}</Text> : null}
    </PressableScale>
  );
}

/** `PersonalizedHomeFeed` from the PWA. */
function PersonalFeed({ feed }: { feed?: HomeFeed | null }) {
  const { t, locale } = useI18n();
  if (!feed) return null;
  const resume = feed.smartResume?.service;
  const partner = feed.recentlyViewedPartners?.[0];
  const card = (item: FeedService, fill = false) => (
    <PressableScale key={item.id} onPress={() => router.push(routeForWebHref(item.publicHref || `/service/${item.id}`))} style={[styles.feedCard, fill ? { flex: 1 } : { width: 128 }, shadow("card")]}>
      <View>
        <AppImage uri={imageUri(item.imageUrl)} fallbackCode={item.moduleCode} style={styles.feedThumb} />
        <View style={styles.feedBadge}><ServiceIcon code={item.moduleCode} size={20} /></View>
      </View>
      <Text style={styles.feedTitle} numberOfLines={1}>{localizeServiceName(locale, item.name, item.code)}</Text>
      <Text style={styles.feedSub} numberOfLines={2}>{localizeOrganizationName(locale, item.organizationCode, item.organizationName, item.metadata?.organizationMetadata)}</Text>
      {Number(item.priceFrom) > 0 ? <Text style={styles.feedPrice}>{money(item.priceFrom, item.currency)}</Text> : null}
    </PressableScale>
  );
  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      {resume || partner ? (
        <View style={{ flexDirection: "row", gap: 12 }}>
          {resume ? (
            <PressableScale onPress={() => router.push(routeForWebHref(resume.publicHref || `/service/${resume.id}`))} style={[styles.shortcut, shadow("soft"), !partner && { flex: 0, width: "48.5%" }]}>
              <LinearGradient colors={["#F7FBFA", "#DDF4F0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
              <Text style={styles.shortcutTitle}>▶ {t.home.resume}</Text>
              <View style={styles.shortcutBody}>
                <AppImage uri={imageUri(resume.imageUrl)} fallbackCode={resume.moduleCode} style={styles.shortcutThumb} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.feedSub} numberOfLines={1}>{localizeServiceModuleName(locale, resume.moduleCode, resume.moduleName)}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }} numberOfLines={1}>{localizeServiceName(locale, resume.name, resume.code)}</Text>
                  <Text style={styles.feedSub} numberOfLines={2}>{localizeOrganizationName(locale, resume.organizationCode, resume.organizationName, resume.metadata?.organizationMetadata)}</Text>
                </View>
              </View>
            </PressableScale>
          ) : null}
          {partner ? (
            <PressableScale onPress={() => router.push(routeForWebHref(partner.href))} style={[styles.shortcut, shadow("soft")]}>
              <LinearGradient colors={["#FFFDF8", "#F5EBCD"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
              <Text style={styles.shortcutTitle}>🏪 {t.home.partners}</Text>
              <View style={styles.shortcutBody}>
                <View style={[styles.shortcutThumb, { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.66)" }]}><Text style={{ fontSize: 23 }}>🏪</Text></View>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: colors.ink }} numberOfLines={2}>{localizeOrganizationName(locale, partner.code, partner.name)}</Text>
              </View>
            </PressableScale>
          ) : null}
        </View>
      ) : null}
      {feed.favorites?.length ? (
        <View style={[styles.feedBox, shadow("card")]}>
          <Text style={styles.feedBoxTitle}>♥ {t.home.favorites}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8, paddingBottom: 4, paddingRight: 18 }}>{feed.favorites.slice(0, 8).map((item) => card(item))}</ScrollView>
        </View>
      ) : null}
      {feed.forYou?.length ? (
        <View style={[styles.feedBox, shadow("card")]}>
          <Text style={styles.feedBoxTitle}>✨ {t.home.forYou}</Text>
          <View style={{ flexDirection: "row", gap: 9, paddingTop: 8 }}>{feed.forYou.slice(0, 3).map((item) => card(item, true))}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { height: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 13, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.74)" },
  searchText: { flex: 1, color: colors.textSecondary, fontSize: 14 },
  banner: { height: 180, borderRadius: 22, overflow: "hidden", backgroundColor: colors.brandDeep, marginTop: 14 },
  bannerCopy: { position: "absolute", left: 18, top: 16, bottom: 16, width: "68%" },
  bannerEyebrow: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "700", letterSpacing: 1.6 },
  bannerTitle: { color: colors.white, fontSize: 23, fontWeight: "800", lineHeight: 26.5, marginTop: 6 },
  bannerSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 6 },
  bannerCta: { position: "absolute", bottom: 0, left: 0, height: 32, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#F4E7C4", borderWidth: 1, borderColor: "rgba(255,255,255,0.42)", alignItems: "center", justifyContent: "center" },
  bannerCtaText: { color: colors.brandDeep, fontSize: 11.5, fontWeight: "800" },
  bannerLandmark: { position: "absolute", top: 16, right: 16, color: colors.white, fontSize: 11, fontWeight: "700" },
  dots: { position: "absolute", right: 16, bottom: 16, flexDirection: "row", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.42)" },
  dotActive: { width: 18, backgroundColor: "#F4E7C4" },
  activeOrder: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, padding: 12, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft },
  activeIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.wechat, alignItems: "center", justifyContent: "center" },
  contextRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  contextCard: { flex: 1, minHeight: 141, borderRadius: 20, padding: 14 },
  locTitle: { fontSize: 13, fontWeight: "700", color: "#067647" },
  locBody: { fontSize: 12.5, fontWeight: "600", color: colors.ink, marginTop: 6, lineHeight: 17 },
  locActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 8 },
  chooseButton: { flex: 1, height: 40, borderRadius: 999, backgroundColor: "rgba(236,253,245,0.9)", alignItems: "center", justifyContent: "center", paddingHorizontal: 10, shadowColor: "#047857", shadowOpacity: 0.13, shadowRadius: 7, shadowOffset: { width: 0, height: 5 } },
  chooseText: { color: "#047857", fontSize: 14 },
  mapButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", ...shadow("card") },
  aiTitle: { fontSize: 13, fontWeight: "700", color: "#B45309", lineHeight: 16.5, paddingRight: 4 },
  aiBody: { fontSize: 12.5, fontWeight: "500", color: colors.slate, marginTop: 6, lineHeight: 17, paddingRight: 46 },
  aiIcon: { position: "absolute", right: 12, bottom: 12, width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.72)", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 16, columnGap: 8 },
  tileWrap: { width: "22.8%" },
  tile: { alignItems: "center", gap: 8 },
  tileIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  tileImage: { position: "absolute", top: -2, left: -2 },
  tileLabel: { fontSize: 11, fontWeight: "800", color: "#26312D", textAlign: "center", lineHeight: 13 },
  shortcut: { flex: 1, minHeight: 116, padding: 14, borderRadius: 20, overflow: "hidden" },
  shortcutTitle: { fontSize: 13, fontWeight: "700", color: colors.text, letterSpacing: -0.2 },
  shortcutBody: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  shortcutThumb: { width: 44, height: 44, borderRadius: 14 },
  feedBox: { padding: 11, borderRadius: 12, backgroundColor: colors.white },
  feedBoxTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  feedCard: { borderRadius: 12, backgroundColor: colors.white, overflow: "hidden", paddingBottom: 7 },
  feedThumb: { width: "100%", aspectRatio: 1 },
  feedBadge: { position: "absolute", left: 5, top: 5, width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.86)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(70,105,95,0.1)" },
  feedTitle: { fontSize: 12, fontWeight: "700", color: colors.text, paddingHorizontal: 7, paddingTop: 6 },
  feedSub: { fontSize: 10, color: colors.textSecondary, paddingHorizontal: 7, paddingTop: 2, lineHeight: 13 },
  feedPrice: { fontSize: 10, fontWeight: "700", color: colors.danger, paddingHorizontal: 7, paddingTop: 2 },
  emergency: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 18, backgroundColor: "#FBE8E1" },
  emIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#F4CFC1", alignItems: "center", justifyContent: "center" },
  emTitle: { fontSize: 14, fontWeight: "700", color: "#A6472B" },
  emBody: { fontSize: 10, color: "#7C665E", marginTop: 2 },
  footer: { textAlign: "center", color: colors.textMuted, fontSize: 10, paddingTop: 18, paddingBottom: 3 },
});
