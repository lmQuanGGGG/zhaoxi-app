import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localizeOrganizationName, localizeServiceModuleName, localizeServiceName, statusLabels } from "@zhaoxi/i18n";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { colors, shadow } from "../../src/theme";
import { HOME_GRADIENT, HeroCard, HomeBackdrop, HomeHeader, QuickActions, ServiceArc } from "../../src/components/home-hero";
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

  // Light status bar over the green header only while Home is focused: the
  // <StatusBar> entry unmounts on blur so the root "dark" style applies again.
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

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

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => { scrollY.value = event.contentOffset.y; });
  const quickCopy = {
    "vi-VN": { locate: "Vị trí", ai: "Trợ lý AI", coupons: "Ưu đãi", favorites: "Yêu thích", payments: "Thanh toán", emergency: "Khẩn cấp", support: "Hỗ trợ", landmarks: "Khám phá Đà Nẵng" },
    "en-US": { locate: "Location", ai: "AI assistant", coupons: "Offers", favorites: "Favorites", payments: "Payments", emergency: "Emergency", support: "Support", landmarks: "Explore Da Nang" },
    "zh-CN": { locate: "位置", ai: "AI 助手", coupons: "优惠", favorites: "收藏", payments: "支付", emergency: "紧急", support: "客服", landmarks: "探索岘港" },
    "zh-TW": { locate: "位置", ai: "AI 助手", coupons: "優惠", favorites: "收藏", payments: "支付", emergency: "緊急", support: "客服", landmarks: "探索峴港" },
  }[locale];
  const chips = [
    { key: "support", label: quickCopy.support, onPress: () => router.push("/support") },
    ...tiles.slice(0, 4).map((tile) => ({ key: tile.code, label: tile.name, onPress: () => router.push(moduleRoute(tile.code)) })),
  ];
  const arcTiles = resolveModules(modules.data, locale);

  return (
    <Screen topbar={false}>
      {focused ? <StatusBar style="light" /> : null}
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View>
          <HomeBackdrop height={560} />
          <HomeHeader />
          <HeroCard
            eyebrow={`ZHAOXI · ${banner?.cityLabel || t.home.city}`}
            title={banner?.title || t.home.welcome}
            slides={landmarks.map((item) => ({ image: item.image, label: item.label[locale] }))}
            locationLabel={location.status === "locating" ? t.home.locating : location.label || lc.choose}
            onLocate={() => void locate(true)}
            chips={chips}
          />
          <View style={{ height: 96 }} />
        </View>

        <ServiceArc tiles={arcTiles} onOpen={(code) => router.push(moduleRoute(code))} onPressIn={prefetchModule} more={`${t.common.more}`} />

        <QuickActions
          items={[
            { key: "locate", icon: "location", label: quickCopy.locate, onPress: () => void locate(true) },
            { key: "ai", icon: "assistant", label: quickCopy.ai, onPress: () => router.push("/support"), accent: "#F5A524" },
            { key: "coupons", icon: "ticket", label: quickCopy.coupons, onPress: () => router.push("/coupons"), accent: "#EC5B2C" },
            { key: "favorites", icon: "heart", label: quickCopy.favorites, onPress: () => router.push("/favorites"), accent: "#E2564A" },
            { key: "payments", icon: "payment", label: quickCopy.payments, onPress: () => router.push("/payments"), accent: "#2F72D2" },
            { key: "emergency", icon: "emergency", label: quickCopy.emergency, onPress: () => router.push("/emergency"), accent: "#D83A3A" },
          ]}
        />

        <View style={{ paddingHorizontal: 16 }}>
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
        </View>
      </Animated.ScrollView>
      <StatusBarScrim scrollY={scrollY} />
    </Screen>
  );
}

/** Green glass strip behind the status bar once the header has scrolled away (keeps the light status bar readable). */
function StatusBarScrim({ scrollY }: { scrollY: SharedValue<number> }) {
  const insets = useSafeAreaInsets();
  const fade = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [140, 260], [0, 1], "clamp") }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 6 }, fade]}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: HOME_GRADIENT[0], opacity: 0.9 }]} />
    </Animated.View>
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
  activeOrder: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, padding: 12, borderRadius: 18, backgroundColor: colors.white, ...shadow("card") },
  activeIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.wechat, alignItems: "center", justifyContent: "center" },
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
