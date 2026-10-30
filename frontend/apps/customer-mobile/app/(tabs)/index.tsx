import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localizeOrganizationName, localizeServiceName, statusLabels } from "@zhaoxi/i18n";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { getHomeFeed, getModules, getNearbyServices, getOrders, getRecommendations, getUiConfig } from "../../src/api/endpoints";
import type { FeedService, Recommendation } from "../../src/api/types";
import { useCart } from "../../src/cart";
import { TAB_BAR_SPACE } from "../../src/constants";
import { imageUri, money } from "../../src/format";
import { useSession, useUnread } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { routeForWebHref } from "../../src/links";
import { locate, pointKey, useLocationState } from "../../src/location";
import { moduleRoute, resolveModules } from "../../src/modules";
import { keys } from "../../src/query";
import { ACTIVE_STATUSES } from "../../src/status";
import { colors, font, radius, serviceColors, shadow, space } from "../../src/theme";
import { AppImage, GlassCard, IconButton, Ionicons, PressableScale, Screen, SectionTitle, ServiceIcon, Skeleton, StatusPill } from "../../src/ui";

const landmarks = [
  { image: require("../../assets/landmarks/dragon-bridge.webp"), label: { "vi-VN": "Cầu Rồng", "en-US": "Dragon Bridge", "zh-CN": "龙桥", "zh-TW": "龍橋" } },
  { image: require("../../assets/landmarks/ba-na-hills.webp"), label: { "vi-VN": "Bà Nà Hills", "en-US": "Ba Na Hills", "zh-CN": "巴拿山", "zh-TW": "巴拿山" } },
  { image: require("../../assets/landmarks/my-khe-beach.webp"), label: { "vi-VN": "Biển Mỹ Khê", "en-US": "My Khe Beach", "zh-CN": "美溪海滩", "zh-TW": "美溪海灘" } },
  { image: require("../../assets/landmarks/marble-mountains.webp"), label: { "vi-VN": "Ngũ Hành Sơn", "en-US": "Marble Mountains", "zh-CN": "五行山", "zh-TW": "五行山" } },
  { image: require("../../assets/landmarks/linh-ung.webp"), label: { "vi-VN": "Chùa Linh Ứng", "en-US": "Linh Ung Pagoda", "zh-CN": "灵应寺", "zh-TW": "靈應寺" } },
  { image: require("../../assets/landmarks/han-river.webp"), label: { "vi-VN": "Sông Hàn", "en-US": "Han River", "zh-CN": "韩江", "zh-TW": "韓江" } },
] as const;


export default function HomeScreen() {
  const { t, locale } = useI18n();
  const { userId } = useSession();
  const client = useQueryClient();
  const location = useLocationState();
  const cart = useCart();
  const unread = useUnread();
  const { width } = useWindowDimensions();
  const scrollY = useSharedValue(0);

  const uiConfig = useQuery({ queryKey: keys.uiConfig, queryFn: getUiConfig, staleTime: 5 * 60_000 });
  const modules = useQuery({ queryKey: keys.modules(locale), queryFn: () => getModules(locale), staleTime: 5 * 60_000 });
  const recommendations = useQuery({ queryKey: keys.recommendations(locale), queryFn: () => getRecommendations(locale) });
  const feed = useQuery({ queryKey: keys.homeFeed(locale, userId), queryFn: () => getHomeFeed(locale), enabled: Boolean(userId) });
  const orders = useQuery({ queryKey: keys.orders(locale, userId), queryFn: () => getOrders(locale), enabled: Boolean(userId) });
  const activeOrder = orders.data?.find((order) => ACTIVE_STATUSES.has(order.status));

  // Use the last known GPS point silently; only prompt when the user taps the location chip.
  useEffect(() => { if (!location.point) void locate(false); }, [location.point]);

  const tiles = useMemo(() => resolveModules(modules.data, locale).slice(0, 8), [modules.data, locale]);
  const banner = uiConfig.data?.bannerContent?.[locale];
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([modules.refetch(), recommendations.refetch(), feed.refetch(), orders.refetch(), unread.refetch()]);
    setRefreshing(false);
  }, [modules, recommendations, feed, orders, unread]);

  const prefetchModule = (code: string) => {
    if (code === "emergency" || code === "payment") return;
    void client.prefetchQuery({ queryKey: keys.nearby(code, locale, pointKey(location.point)), queryFn: () => getNearbyServices(code, locale, location.point), staleTime: 60_000 });
  };

  const onScroll = useAnimatedScrollHandler((event) => { scrollY.value = event.contentOffset.y; });
  const topBarStyle = useAnimatedStyle(() => ({ shadowOpacity: interpolate(scrollY.value, [0, 40], [0, 0.08], "clamp"), backgroundColor: `rgba(247,250,249,${interpolate(scrollY.value, [0, 40], [0, 0.94], "clamp")})` }));

  return (
    <Screen>
      <Animated.View style={[styles.topBar, topBarStyle]}>
        <PressableScale onPress={() => void locate(true)} style={styles.locationChip} scaleTo={0.97}>
          <View style={styles.locationIcon}><Ionicons name="location" size={16} color={colors.white} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={font.tiny}>{t.home.nearYou}</Text>
            <Text style={styles.locationText} numberOfLines={1}>{location.status === "locating" ? t.home.locating : location.label || (location.status === "denied" ? t.home.locationOff : t.home.city)}</Text>
          </View>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </PressableScale>
        <IconButton icon="notifications-outline" label={t.notifications.title} badge={unread.data?.notifications} onPress={() => router.push("/notifications")} />
        <IconButton icon="bag-handle-outline" label={t.cart.title} badge={cart.count} onPress={() => router.push("/cart")} />
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: TAB_BAR_SPACE }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        showsVerticalScrollIndicator={false}
      >
        <PressableScale onPress={() => router.push("/explore")} style={styles.search} scaleTo={0.98}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchText} numberOfLines={1}>{t.home.search}</Text>
        </PressableScale>

        <WelcomeBanner width={width - space.lg * 2} title={banner?.title || t.home.welcome} subtitle={banner?.subtitle || t.home.subtitle} city={banner?.cityLabel || t.home.city} cta={t.home.explore} />

        {activeOrder ? (
          <Animated.View entering={FadeInDown.duration(350)}>
            <PressableScale onPress={() => router.push(`/order/${activeOrder.id}`)} style={styles.activeOrder} scaleTo={0.98}>
              <View style={styles.activePulse}><Ionicons name="bicycle" size={20} color={colors.white} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={font.tiny}>{t.home.activeOrder} · {activeOrder.requestCode}</Text>
                <Text style={font.h3} numberOfLines={1}>{activeOrder.serviceName || activeOrder.title}</Text>
              </View>
              <StatusPill label={statusLabels[locale][activeOrder.status] || activeOrder.status} />
            </PressableScale>
          </Animated.View>
        ) : null}

        <PressableScale onPress={() => router.push("/support")} style={styles.aiCard} scaleTo={0.98}>
          <LinearGradient colors={["#F3FBF8", "#DDF4EC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.aiIcon}><Ionicons name="sparkles" size={20} color={colors.brandStrong} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[font.tiny, { color: colors.textSecondary }]}>{t.home.ai}</Text>
            <Text style={[font.h3, { marginTop: 2 }]} numberOfLines={1}>{t.home.aiHint}</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={26} color={colors.brand} />
        </PressableScale>

        <SectionTitle title={t.home.module} action={t.common.more} onAction={() => router.push("/services")} />
        <View style={styles.grid}>
          {tiles.map((tile, index) => {
            const palette = serviceColors[tile.code] || { accent: colors.brand, tint: colors.brandSoft };
            return (
              <Animated.View key={tile.code} entering={FadeIn.delay(index * 35)} style={styles.tileWrap}>
                <PressableScale onPressIn={() => prefetchModule(tile.code)} onPress={() => router.push(moduleRoute(tile.code))} style={styles.tile}>
                  <View style={[styles.tileIcon, { backgroundColor: palette.tint }]}><ServiceIcon code={tile.code} size={38} /></View>
                  <Text style={styles.tileLabel} numberOfLines={2}>{tile.name}</Text>
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>

        <PersonalFeed feed={feed.data} />

        <SectionTitle title={t.home.recommend} action={t.common.more} onAction={() => router.push("/explore")} />
        {recommendations.isPending ? (
          <View style={{ flexDirection: "row", gap: 12 }}>{[0, 1].map((i) => <Skeleton key={i} width={168} height={200} radius={20} />)}</View>
        ) : (
          <FlatList
            horizontal
            data={(recommendations.data?.items || []).slice(0, 8)}
            keyExtractor={(item) => `${item.kind}-${item.id}`}
            renderItem={({ item }) => <RecommendationCard item={item} personalized={Boolean(recommendations.data?.personalized)} />}
            showsHorizontalScrollIndicator={false}
            snapToInterval={180}
            decelerationRate="fast"
            contentContainerStyle={{ gap: 12, paddingRight: 24 }}
            style={{ marginHorizontal: -space.lg }}
            ListHeaderComponent={<View style={{ width: space.lg - 12 }} />}
          />
        )}

        <PressableScale onPress={() => router.push("/emergency")} style={styles.emergency} scaleTo={0.98}>
          <View style={[styles.tileIcon, { backgroundColor: serviceColors.emergency?.tint, width: 46, height: 46 }]}><ServiceIcon code="emergency" size={32} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[font.h3, { color: colors.danger }]}>{t.home.emergency}</Text>
            <Text style={font.tiny}>{t.home.emergencyHint}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.danger} />
        </PressableScale>
        <Text style={styles.footer}>{t.home.footer}</Text>
      </Animated.ScrollView>
    </Screen>
  );
}

function WelcomeBanner({ width, title, subtitle, city, cta }: { width: number; title: string; subtitle: string; city: string; cta: string }) {
  const { locale } = useI18n();
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setActive((value) => (value + 1) % landmarks.length), 3500);
    return () => clearInterval(timer);
  }, []);
  const slide = landmarks[active] ?? landmarks[0];
  return (
    <View style={[styles.banner, { width }, shadow(2)]}>
      <Image source={slide.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={700} />
      <LinearGradient colors={["rgba(7,26,24,0.05)", "rgba(7,26,24,0.72)"]} style={StyleSheet.absoluteFill} />
      <View style={styles.bannerCopy}>
        <Text style={styles.bannerEyebrow}>ZHAOXI · {city}</Text>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerSubtitle}>{subtitle}</Text>
        <PressableScale onPress={() => router.push("/services")} style={styles.bannerCta}>
          <Text style={styles.bannerCtaText}>{cta}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.brandStrong} />
        </PressableScale>
      </View>
      <View style={styles.bannerMeta}>
        <Text style={styles.bannerLandmark}>{slide.label[locale]}</Text>
        <View style={{ flexDirection: "row", gap: 5 }}>
          {landmarks.map((item, index) => <View key={index} style={[styles.dot, index === active && styles.dotActive]} />)}
        </View>
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
    <PressableScale onPress={() => router.push(routeForWebHref(item.href))} style={[styles.recCard, shadow(1)]}>
      <View>
        <AppImage uri={imageUri(item.imageUrl)} fallbackCode={item.moduleCode} style={styles.recImage} />
        <View style={styles.recBadge}><ServiceIcon code={item.moduleCode} size={20} /></View>
      </View>
      <View style={{ padding: 10, gap: 3 }}>
        <Text style={font.h3} numberOfLines={1}>{localizeServiceName(locale, item.title)}</Text>
        <Text style={font.tiny} numberOfLines={1}>{meta}</Text>
        {price ? <Text style={styles.price}>{t.common.from} {price}</Text> : null}
      </View>
    </PressableScale>
  );
}

function PersonalFeed({ feed }: { feed?: import("../../src/api/types").HomeFeed | null }) {
  const { t, locale } = useI18n();
  if (!feed) return null;
  const resume = feed.smartResume?.service;
  const partner = feed.recentlyViewedPartners?.[0];
  const card = (item: FeedService, fill = false) => (
    <PressableScale key={item.id} onPress={() => router.push(routeForWebHref(item.publicHref || `/service/${item.id}`))} style={[styles.feedCard, fill && { width: "100%" }, shadow(1)]}>
      <AppImage uri={imageUri(item.imageUrl)} fallbackCode={item.moduleCode} style={styles.feedImage} />
      <Text style={[font.h3, { fontSize: 13, paddingHorizontal: 8, paddingTop: 6 }]} numberOfLines={1}>{localizeServiceName(locale, item.name, item.code)}</Text>
      <Text style={[font.tiny, { paddingHorizontal: 8 }]} numberOfLines={1}>{localizeOrganizationName(locale, item.organizationCode, item.organizationName, item.metadata?.organizationMetadata)}</Text>
      {Number(item.priceFrom) > 0 ? <Text style={[styles.price, { paddingHorizontal: 8 }]}>{money(item.priceFrom, item.currency)}</Text> : null}
    </PressableScale>
  );
  return (
    <View>
      {(resume || partner) && (
        <View style={{ flexDirection: "row", gap: 12, marginTop: space.xl }}>
          {resume ? (
            <PressableScale onPress={() => router.push(routeForWebHref(resume.publicHref || `/service/${resume.id}`))} style={[styles.shortcut, { backgroundColor: "#E6F6F1" }]}>
              <Text style={styles.shortcutTitle}>▶ {t.home.resume}</Text>
              <View style={styles.shortcutBody}>
                <AppImage uri={imageUri(resume.imageUrl)} fallbackCode={resume.moduleCode} style={styles.shortcutThumb} />
                <Text style={[font.h3, { flex: 1, fontSize: 13 }]} numberOfLines={2}>{localizeServiceName(locale, resume.name, resume.code)}</Text>
              </View>
            </PressableScale>
          ) : null}
          {partner ? (
            <PressableScale onPress={() => router.push(routeForWebHref(partner.href))} style={[styles.shortcut, { backgroundColor: "#F8F0DA" }]}>
              <Text style={styles.shortcutTitle}>🏪 {t.home.partners}</Text>
              <View style={styles.shortcutBody}>
                <View style={[styles.shortcutThumb, { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.7)" }]}><Text style={{ fontSize: 22 }}>🏪</Text></View>
                <Text style={[font.h3, { flex: 1, fontSize: 13 }]} numberOfLines={2}>{localizeOrganizationName(locale, partner.code, partner.name)}</Text>
              </View>
            </PressableScale>
          ) : null}
        </View>
      )}
      {feed.favorites?.length ? (
        <>
          <SectionTitle title={`♥ ${t.home.favorites}`} action={t.common.more} onAction={() => router.push("/favorites")} />
          <FlatList horizontal data={feed.favorites.slice(0, 8)} keyExtractor={(item) => item.id} renderItem={({ item }) => card(item)} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: space.lg }} style={{ marginHorizontal: -space.lg }} />
        </>
      ) : null}
      {feed.forYou?.length ? (
        <>
          <SectionTitle title={`✨ ${t.home.forYou}`} />
          <View style={{ flexDirection: "row", gap: 10 }}>{feed.forYou.slice(0, 3).map((item) => <View key={item.id} style={{ flex: 1 }}>{card(item, true)}</View>)}</View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: space.lg, paddingVertical: space.sm, zIndex: 10, shadowColor: "#16342C", shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  locationChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 46, paddingHorizontal: 8, borderRadius: radius.lg, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  locationIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  locationText: { fontSize: 14, fontWeight: "800", color: colors.text },
  search: { flexDirection: "row", alignItems: "center", gap: 10, height: 50, paddingHorizontal: 16, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft, marginTop: 4, marginBottom: space.lg, ...shadow(1) },
  searchText: { flex: 1, color: colors.textMuted, fontSize: 14 },
  banner: { height: 210, borderRadius: radius.xl, overflow: "hidden", backgroundColor: "#0B2420" },
  bannerCopy: { position: "absolute", left: 18, right: 18, bottom: 44 },
  bannerEyebrow: { color: "rgba(255,255,255,0.86)", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  bannerTitle: { color: colors.white, fontSize: 25, fontWeight: "900", letterSpacing: -0.5, marginTop: 4 },
  bannerSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 4 },
  bannerCta: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 12, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  bannerCtaText: { color: colors.brandStrong, fontWeight: "800", fontSize: 13 },
  bannerMeta: { position: "absolute", left: 18, right: 18, bottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bannerLandmark: { color: "rgba(255,255,255,0.92)", fontWeight: "700", fontSize: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.45)" },
  dotActive: { width: 18, backgroundColor: colors.white },
  activeOrder: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: space.lg, padding: 14, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.brandSoft, ...shadow(2) },
  activePulse: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  aiCard: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: space.lg, padding: 14, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.glassBorder },
  aiIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  tileWrap: { width: "25%", padding: 4 },
  tile: { alignItems: "center", gap: 6, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  tileIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tileLabel: { fontSize: 12, fontWeight: "700", color: colors.text, textAlign: "center", paddingHorizontal: 2 },
  recCard: { width: 168, borderRadius: radius.lg, backgroundColor: colors.white, overflow: "hidden" },
  recImage: { width: 168, height: 118 },
  recBadge: { position: "absolute", left: 8, top: 8, width: 30, height: 30, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  price: { color: colors.price, fontWeight: "800", fontSize: 12 },
  feedCard: { width: 132, borderRadius: radius.md, backgroundColor: colors.white, overflow: "hidden", paddingBottom: 8 },
  feedImage: { width: "100%", height: 104 },
  shortcut: { flex: 1, minHeight: 112, padding: 14, borderRadius: radius.lg, ...shadow(1) },
  shortcutTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
  shortcutBody: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  shortcutThumb: { width: 44, height: 44, borderRadius: 14 },
  emergency: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: space.xl, padding: 14, borderRadius: radius.lg, backgroundColor: "#FFF6F5", borderWidth: 1, borderColor: "#F8DCD8" },
  footer: { textAlign: "center", color: colors.textMuted, fontSize: 12, marginTop: space.xl },
});
