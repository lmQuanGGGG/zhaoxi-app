import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localizeOrganizationName, localizeServiceModuleName, localizeServiceName } from "@zhaoxi/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getFoodPricing, getNearbyServices, getOrganizationServices, getRestaurantStatuses, getService } from "../../src/api/endpoints";
import type { Service } from "../../src/api/types";
import { RestaurantCard } from "../../src/components/food";
import { LocationBanner } from "../../src/components/LocationBanner";
import { useCart } from "../../src/cart";
import { TAB_BAR_SPACE } from "../../src/constants";
import { imageUri, money } from "../../src/format";
import { useDebounced, usePullRefresh } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { locate, pointKey, useLocationState } from "../../src/location";
import { keys } from "../../src/query";
import { colors, shadow } from "../../src/theme";
import { AppImage, BackButton, EmptyState, ErrorState, PressableScale, Screen, ServiceBadge, ServiceIcon, SkeletonList, ZxIcon } from "../../src/ui";

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

  const title = isFood ? t.browse.restaurants : localizeServiceModuleName(locale, module);
  const count = isFood ? filtered.length : filtered.length;
  const prefetchRestaurant = (id: string) => void client.prefetchQuery({ queryKey: keys.orgServices(id, locale), queryFn: () => getOrganizationServices(id, locale), staleTime: 60_000 });
  const prefetchService = (id: string) => void client.prefetchQuery({ queryKey: keys.service(id, locale), queryFn: () => getService(id, locale), staleTime: 60_000 });

  const header = (
    <View style={{ paddingHorizontal: 14, gap: 12, paddingTop: 14, paddingBottom: 14 }}>
      <LocationBanner />
      <View style={[styles.search, shadow("card")]}>
        <ZxIcon name="search" size={17} color="#64748B" />
        <TextInput value={query} onChangeText={setQuery} placeholder={isFood ? t.browse.searchFood : t.browse.searchService} placeholderTextColor="#94A3B8" style={styles.searchInput} returnKeyType="search" clearButtonMode="while-editing" />
      </View>
    </View>
  );

  const empty = services.isPending ? <View style={{ paddingHorizontal: 14 }}><SkeletonList count={4} /></View>
    : services.isError && !services.data ? <View style={{ paddingHorizontal: 14 }}><ErrorState message={t.common.error} retryLabel={t.common.retry} onRetry={() => void services.refetch()} /></View>
    : <View style={{ paddingHorizontal: 14 }}><EmptyState zx="search" title={t.browse.empty} body={t.browse.askHint} action={t.browse.ask} onAction={() => router.push("/support")} /></View>;

  return (
    <Screen>
      <View style={styles.moduleHeader}>
        <BackButton />
        <View style={styles.moduleTitle}>
          <ServiceBadge code={module} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.moduleName} numberOfLines={1}>{title}</Text>
            <Text style={styles.moduleCount}>{count} {t.common.items}</Text>
          </View>
        </View>
        {isFood && cart.count > 0 ? (
          <PressableScale onPress={() => router.push("/cart")} style={styles.cartPill}><Text style={styles.cartPillText}>{t.cart.title} ({cart.count})</Text></PressableScale>
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
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={colors.brand} />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
          renderItem={({ item, index }) => <GenericServiceCard item={item} module={module} index={index} onPressIn={() => prefetchService(item.id)} />}
        />
      )}
    </Screen>
  );
}

/** PWA `genericServiceCard`. */
function GenericServiceCard({ item, module, index, onPressIn }: { item: Service; module: string; index: number; onPressIn: () => void }) {
  const { locale } = useI18n();
  const image = imageUri(item.metadata?.imageUrl);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(280)} style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
      <PressableScale onPressIn={onPressIn} onPress={() => router.push(`/service/${item.id}`)} scaleTo={0.985} style={[styles.serviceCard, shadow("card")]}>
        {image ? <AppImage uri={image} style={styles.serviceImage} /> : (
          <View style={styles.serviceIconBox}>
            <LinearGradient colors={["#E7FFF2", "#D8F8E8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
            <ServiceIcon code={module} size={44} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={styles.serviceTitle} numberOfLines={2}>{localizeServiceName(locale, item.name || item.code)}</Text>
          {item.summary ? <Text style={styles.serviceSummary} numberOfLines={2}>{item.summary}</Text> : null}
          <Text style={styles.serviceOrg} numberOfLines={1}>{localizeOrganizationName(locale, item.organizationCode, item.organizationName, item.organizationMetadata)}</Text>
          {item.distanceKm != null ? <View style={styles.distance}><Text style={styles.distanceText}>⌖ {item.distanceKm.toFixed(1)} km</Text></View> : null}
          {Number(item.priceFrom || 0) > 0 ? <Text style={styles.servicePrice}>{money(item.priceFrom, item.currency)}</Text> : null}
        </View>
        <Text style={styles.chevron}>›</Text>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  moduleHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 22, paddingVertical: 16, backgroundColor: "rgba(255,255,255,0.88)", borderBottomWidth: 1, borderBottomColor: "rgba(226,232,240,0.8)" },
  moduleTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  moduleName: { fontSize: 16, fontWeight: "800", color: colors.ink },
  moduleCount: { fontSize: 11, color: colors.slate, marginTop: 1 },
  cartPill: { paddingHorizontal: 12, height: 32, borderRadius: 999, backgroundColor: colors.wechat, alignItems: "center", justifyContent: "center" },
  cartPillText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  search: { height: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  serviceCard: { flexDirection: "row", alignItems: "center", gap: 18, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft },
  serviceImage: { width: 72, height: 72, borderRadius: 16 },
  serviceIconBox: { width: 72, height: 72, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(7,193,96,0.12)" },
  serviceTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  serviceSummary: { fontSize: 12, color: colors.slate },
  serviceOrg: { fontSize: 11, fontWeight: "600", color: "#059669" },
  distance: { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.brandSoft },
  distanceText: { fontSize: 8, fontWeight: "800", color: colors.brandStrong },
  servicePrice: { fontSize: 14, fontWeight: "700", color: colors.priceRose },
  chevron: { fontSize: 20, color: "#94A3B8" },
});
