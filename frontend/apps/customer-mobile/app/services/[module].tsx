import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localizeServiceModuleName, localizeServiceName } from "@zhaoxi/i18n";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Extrapolation, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { getFoodPricing, getNearbyServices, getOrganizationServices, getRestaurantStatuses, getService } from "../../src/api/endpoints";
import type { Service } from "../../src/api/types";
import { RestaurantCard } from "../../src/components/food";
import { RequestsLink, useHousingFilters } from "../../src/components/HousingFilters";
import { LocationBanner } from "../../src/components/LocationBanner";
import { FeaturedCarousel, RankedRow, SectionTitle, cardMeta, priceUnit, sectionCopy } from "../../src/components/module-showcase";
import { useCart } from "../../src/cart";
import { TAB_BAR_SPACE } from "../../src/constants";
import { imageUri, money } from "../../src/format";
import { useDebounced, usePullRefresh } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { locate, pointKey, useLocationState } from "../../src/location";
import { keys } from "../../src/query";
import { colors, shadow } from "../../src/theme";
import { AppImage, BackButton, EmptyState, ErrorState, GlassFill, HeaderFade, PressableScale, Screen, ServiceArt, ServiceBadge, SkeletonList, ZxIcon, servicePalettes } from "../../src/ui";

const resultUnit = { "vi-VN": "kết quả", "en-US": "results", "zh-CN": "个结果", "zh-TW": "個結果" } as const;

export default function ModuleBrowser() {
  const { module = "food" } = useLocalSearchParams<{ module: string }>();
  const { t, locale } = useI18n();
  const client = useQueryClient();
  const location = useLocationState();
  const cart = useCart();
  const [query, setQuery] = useState("");
  const search = useDebounced(query, 150);
  const isFood = module === "food";

  useEffect(() => { if (!location.point) void locate(false); }, [location.point]);

  const services = useQuery({ queryKey: keys.nearby(module, locale, pointKey(location.point)), queryFn: () => getNearbyServices(module, locale, location.point) });
  const pull = usePullRefresh(services.refetch);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (services.data || []).filter((item) => !needle || `${item.name || ""} ${item.summary || ""} ${item.organizationName || ""}`.toLowerCase().includes(needle));
  }, [services.data, search]);

  const housing = useHousingFilters(module === "housing" ? filtered : []);
  const listed = module === "housing" ? housing.shown : filtered;

  const restaurants = useMemo(() => {
    if (!isFood) return [];
    const map = new Map<string, Service[]>();
    for (const item of filtered) {
      const key = item.organizationId || item.organizationCode || "unknown";
      map.set(key, [...(map.get(key) || []), item]);
    }
    return [...map.entries()].map(([id, menu]) => ({ id, menu }));
  }, [filtered, isFood]);

  const orgIds = restaurants.map((r) => r.id).filter((id) => id !== "unknown").sort().join(",");
  const statuses = useQuery({ queryKey: keys.restaurantStatuses(orgIds), queryFn: () => getRestaurantStatuses(orgIds.split(",")), enabled: isFood && Boolean(orgIds), refetchInterval: 30_000 });
  const previewLines = restaurants.flatMap((r) => r.menu.slice(0, 2)).map((item) => ({ id: item.id, quantity: 1 }));
  const pricing = useQuery({ queryKey: keys.foodPricing(previewLines.map((line) => line.id).join(",")), queryFn: () => getFoodPricing(previewLines), enabled: isFood && previewLines.length > 0 });

  // Scroll position, header height and viewport height drive the 3D card stack on the UI thread.
  const scrollY = useSharedValue(0);
  const headerH = useSharedValue(0);
  const viewportH = useSharedValue(800);
  const onScroll = useAnimatedScrollHandler((event) => { scrollY.value = event.contentOffset.y; });
  const title = isFood ? t.browse.restaurants : localizeServiceModuleName(locale, module);
  const count = listed.length;
  const prefetchRestaurant = (id: string) => void client.prefetchQuery({ queryKey: keys.orgServices(id, locale), queryFn: () => getOrganizationServices(id, locale), staleTime: 60_000 });
  const prefetchService = (id: string) => void client.prefetchQuery({ queryKey: keys.service(id, locale), queryFn: () => getService(id, locale), staleTime: 60_000 });

  const header = (
    <View onLayout={(event) => { headerH.value = event.nativeEvent.layout.height; }} style={{ paddingHorizontal: 14, gap: 12, paddingTop: 14, paddingBottom: 14 }}>
      {/* Petrol header melting into the list as it scrolls */}
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 0 }}><HeaderFade /></View>
      <LocationBanner />
      <View style={[styles.search, shadow("card")]}>
        <ZxIcon name="search" size={17} color="#64748B" />
        <TextInput value={query} onChangeText={setQuery} placeholder={isFood ? t.browse.searchFood : t.browse.searchService} placeholderTextColor="#94A3B8" style={styles.searchInput} returnKeyType="search" clearButtonMode="while-editing" />
      </View>
      {module === "housing" || module === "travel" ? <RequestsLink kind={module} /> : null}
      {module === "housing" ? housing.ui : null}
      {!isFood && listed.length >= 3 && !search.trim() ? (
        <View style={{ marginHorizontal: -14 }}>
          <FeaturedCarousel items={listed.slice(0, 7)} module={module} />
          <RankedRow items={listed} module={module} />
          <SectionTitle title={sectionCopy(locale).all} />
        </View>
      ) : null}
    </View>
  );

  const empty = services.isPending ? <View style={{ paddingHorizontal: 14 }}><SkeletonList count={4} /></View>
    : services.isError && !services.data ? <View style={{ paddingHorizontal: 14 }}><ErrorState message={t.common.error} retryLabel={t.common.retry} onRetry={() => void services.refetch()} /></View>
    : <View style={{ paddingHorizontal: 14 }}><EmptyState zx="search" title={t.browse.empty} body={t.browse.askHint} action={t.browse.ask} onAction={() => router.push("/support")} /></View>;

  return (
    <Screen>
      <View style={styles.moduleHeader}>
        <BackButton light />
        <View style={styles.moduleTitle}>
          <ServiceBadge code={module} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.moduleName} numberOfLines={1}>{title}</Text>
            <Text style={styles.moduleCount}>{count} {isFood ? t.common.items : resultUnit[locale]}</Text>
          </View>
        </View>
        {isFood && cart.count > 0 ? (
          <PressableScale onPress={() => router.push("/cart")} style={styles.cartPill}><GlassFill radius={999} tint="rgba(7,193,96,0.92)" /><Text style={styles.cartPillText}>{t.cart.title} ({cart.count})</Text></PressableScale>
        ) : null}
      </View>
      {isFood ? (
        <FlashList
          data={restaurants}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={colors.brand} />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
          renderItem={({ item, index }) => (
            <View style={{ paddingHorizontal: 14, paddingBottom: 16 }}>
              <RestaurantCard id={item.id} menu={item.menu} index={index} status={statuses.data?.[item.id]} pricing={pricing.data} onOpen={() => { prefetchRestaurant(item.id); router.push(`/restaurant/${item.id}`); }} />
            </View>
          )}
        />
      ) : (
        <Animated.FlatList
          data={listed}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onLayout={(event) => { viewportH.value = event.nativeEvent.layout.height; }}
          getItemLayout={(_, index) => ({ length: CARD_STEP, offset: CARD_STEP * index, index })}
          initialNumToRender={5}
          windowSize={7}
          refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={colors.brand} />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
          renderItem={({ item, index }) => <StackCard item={item} module={module} index={index} scrollY={scrollY} headerH={headerH} viewportH={viewportH} onPressIn={() => prefetchService(item.id)} />}
        />
      )}
    </Screen>
  );
}

const CARD_H = 236;
const CARD_STEP = CARD_H + 18;
const PARALLAX = 36;

/**
 * Immersive 3D card (Home "Khám phá" style): the photo fills the card, copy sits
 * on a dark fade. While scrolling, a card leaving the top tilts back and shrinks
 * into the distance, cards rising from the bottom grow into place, and the photo
 * drifts with a parallax offset. Pure transforms, computed on the UI thread.
 */
function StackCard({ item, module, index, scrollY, headerH, viewportH, onPressIn }: { item: Service; module: string; index: number; scrollY: SharedValue<number>; headerH: SharedValue<number>; viewportH: SharedValue<number>; onPressIn: () => void }) {
  const { locale } = useI18n();
  const image = imageUri(item.metadata?.imageUrl);
  const meta = cardMeta(item, module, locale);
  const unit = priceUnit(module, locale);
  const palette = servicePalettes[module] || { tint: "#ECFDF5", accent: "#0FAF7A" };

  const card = useAnimatedStyle(() => {
    const top = headerH.value + index * CARD_STEP - scrollY.value; // card top inside the viewport
    const leaving = interpolate(top, [-CARD_STEP, 0], [1, 0], Extrapolation.CLAMP);
    const entering = interpolate(top, [viewportH.value - CARD_STEP * 0.4, viewportH.value], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: 1 - leaving * 0.55,
      transform: [
        { perspective: 900 },
        { translateY: leaving * CARD_STEP * 0.35 },
        { rotateX: `${leaving * 24 - entering * 10}deg` },
        { scale: 1 - leaving * 0.12 - entering * 0.06 },
      ],
    };
  });
  const photo = useAnimatedStyle(() => {
    const top = headerH.value + index * CARD_STEP - scrollY.value;
    return { transform: [{ translateY: interpolate(top, [-CARD_STEP, viewportH.value], [PARALLAX, -PARALLAX], Extrapolation.CLAMP) }] };
  });

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 20).duration(200)} style={styles.stackSlot}>
      <Animated.View style={[styles.stackCard, card]}>
        <PressableScale onPressIn={onPressIn} onPress={() => router.push(`/service/${item.id}`)} scaleTo={0.97} style={styles.stackPress}>
          {image ? (
            <Animated.View style={[styles.stackPhoto, photo]}>
              <AppImage uri={image} style={StyleSheet.absoluteFill} />
            </Animated.View>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.tint, alignItems: "center", justifyContent: "center", paddingBottom: 60 }]}>
              <ServiceArt code={module} size={120} />
            </View>
          )}
          <LinearGradient colors={["rgba(0,20,24,0)", "rgba(0,20,24,0.25)", "rgba(0,20,24,0.82)"]} locations={[0.35, 0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          {meta ? <View style={styles.stackMeta}><Text style={styles.stackMetaText} numberOfLines={1}>{meta}</Text></View> : null}
          <View style={styles.stackCopy}>
            <Text style={styles.stackTitle} numberOfLines={2}>{localizeServiceName(locale, item.name || item.code)}</Text>
            {Number(item.priceFrom || 0) > 0 ? (
              <View style={styles.stackPrice}>
                <Text style={styles.stackPriceText}>{money(item.priceFrom, item.currency)}{unit ? <Text style={styles.stackUnit}> / {unit}</Text> : null}</Text>
              </View>
            ) : null}
          </View>
        </PressableScale>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  moduleHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 14, backgroundColor: colors.header, zIndex: 2 },
  moduleTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  moduleName: { fontSize: 17, fontWeight: "800", color: colors.white },
  moduleCount: { fontSize: 11, color: "rgba(255,255,255,0.72)", marginTop: 1 },
  cartPill: { paddingHorizontal: 13, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  cartPillText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  search: { height: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  stackSlot: { height: CARD_STEP, paddingHorizontal: 16 },
  stackCard: { height: CARD_H, borderRadius: 28, backgroundColor: "#0A3A40" },
  stackPress: { flex: 1, borderRadius: 28, overflow: "hidden" },
  stackPhoto: { position: "absolute", left: 0, right: 0, top: -PARALLAX, bottom: -PARALLAX },
  stackMeta: { position: "absolute", left: 14, top: 14, maxWidth: "80%", paddingHorizontal: 11, height: 28, borderRadius: 14, justifyContent: "center", backgroundColor: "rgba(0,30,34,0.42)" },
  stackMetaText: { fontSize: 12, fontWeight: "700", color: colors.white },
  stackCopy: { position: "absolute", left: 18, right: 18, bottom: 16, gap: 8 },
  stackTitle: { fontSize: 19, fontWeight: "800", color: colors.white, lineHeight: 24, letterSpacing: -0.2, textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 6 },
  stackPrice: { alignSelf: "flex-start", paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: "center", backgroundColor: colors.white },
  stackPriceText: { fontSize: 14, fontWeight: "800", color: colors.priceRose },
  stackUnit: { fontSize: 12, fontWeight: "600", color: colors.slate },
});
