import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localizeOrganizationName, localizeServiceModuleName, localizeServiceName } from "@zhaoxi/i18n";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getFoodPricing, getNearbyServices, getOrganizationServices, getRestaurantStatuses, getService } from "../../src/api/endpoints";
import type { Service } from "../../src/api/types";
import { MenuItemRow, RestaurantCartBar, RestaurantHeroCard } from "../../src/components/food";
import { useCart } from "../../src/cart";
import { imageUri, money } from "../../src/format";
import { restaurantStatusLabel, useDebounced } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { locate, pointKey, useLocationState } from "../../src/location";
import { keys } from "../../src/query";
import { colors, font, radius, shadow, space } from "../../src/theme";
import { AppImage, EmptyState, ErrorState, Header, IconButton, Ionicons, PressableScale, Screen, ServiceBadge, SkeletonList } from "../../src/ui";

export default function ModuleBrowser() {
  const { module = "food" } = useLocalSearchParams<{ module: string }>();
  const { t, locale } = useI18n();
  const client = useQueryClient();
  const location = useLocationState();
  const cart = useCart();
  const [query, setQuery] = useState("");
  const search = useDebounced(query, 150);
  const isFood = module === "food";

  useEffect(() => { if (!location.point) void locate(isFood); }, [isFood, location.point]);

  const services = useQuery({ queryKey: keys.nearby(module, locale, pointKey(location.point)), queryFn: () => getNearbyServices(module, locale, location.point) });
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
  const pricingSignature = previewLines.map((line) => line.id).join(",");
  const pricing = useQuery({ queryKey: keys.foodPricing(pricingSignature), queryFn: () => getFoodPricing(previewLines), enabled: isFood && previewLines.length > 0 });

  const title = isFood ? t.browse.restaurants : localizeServiceModuleName(locale, module);
  const prefetchRestaurant = (id: string) => void client.prefetchQuery({ queryKey: keys.orgServices(id, locale), queryFn: () => getOrganizationServices(id, locale), staleTime: 60_000 });
  const prefetchService = (id: string) => void client.prefetchQuery({ queryKey: keys.service(id, locale), queryFn: () => getService(id, locale), staleTime: 60_000 });

  const header = (
    <View style={{ paddingHorizontal: space.lg, gap: 12, paddingBottom: 12 }}>
      <PressableScale onPress={() => void locate(true)} scaleTo={0.98} style={styles.location}>
        <Ionicons name="navigate-circle" size={20} color={colors.brand} />
        <Text style={[font.small, { flex: 1, color: colors.text, fontWeight: "600" }]} numberOfLines={1}>{location.status === "locating" ? t.home.locating : location.label || t.home.locationOff}</Text>
        <Ionicons name="refresh" size={16} color={colors.textMuted} />
      </PressableScale>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder={isFood ? t.browse.searchFood : t.browse.searchService} placeholderTextColor={colors.textMuted} style={styles.searchInput} returnKeyType="search" clearButtonMode="while-editing" />
      </View>
    </View>
  );

  const empty = services.isPending ? <View style={{ paddingHorizontal: space.lg }}><SkeletonList count={4} /></View>
    : services.isError && !services.data ? <View style={{ paddingHorizontal: space.lg }}><ErrorState message={t.common.error} retryLabel={t.common.retry} onRetry={() => void services.refetch()} /></View>
    : <View style={{ paddingHorizontal: space.lg }}><EmptyState icon="search-outline" title={t.browse.empty} body={t.browse.askHint} action={t.browse.ask} onAction={() => router.push("/support")} /></View>;

  return (
    <Screen>
      <Header
        title={title}
        subtitle={`${isFood ? restaurants.length : filtered.length} ${t.browse.results}`}
        right={isFood ? <IconButton icon="bag-handle-outline" badge={cart.count} onPress={() => router.push("/cart")} /> : <ServiceBadge code={module} size={42} />}
      />
      {isFood ? (
        <FlashList
          data={restaurants}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          refreshControl={<RefreshControl refreshing={services.isRefetching} onRefresh={() => void services.refetch()} tintColor={colors.brand} />}
          contentContainerStyle={{ paddingBottom: 140 }}
          renderItem={({ item, index }) => {
            const first = item.menu[0]!;
            const status = statuses.data?.[item.id];
            const open = status?.open !== false;
            return (
              <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}>
                <RestaurantHeroCard index={index} item={first} open={open} statusLabel={restaurantStatusLabel(status, t)} onPress={() => { prefetchRestaurant(item.id); router.push(`/restaurant/${item.id}`); }} />
                <View style={styles.menuPreview}>
                  {item.menu.slice(0, 2).map((dish) => <MenuItemRow key={dish.id} item={dish} price={pricing.data?.[dish.id]} restaurantOpen={open} compact />)}
                  <PressableScale onPressIn={() => prefetchRestaurant(item.id)} onPress={() => router.push(`/restaurant/${item.id}`)} style={styles.viewMenu}>
                    <Text style={styles.viewMenuText}>{t.browse.viewMenu}{item.menu.length > 2 ? ` (+${item.menu.length - 2})` : ""}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.brandStrong} />
                  </PressableScale>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          refreshControl={<RefreshControl refreshing={services.isRefetching} onRefresh={() => void services.refetch()} tintColor={colors.brand} />}
          contentContainerStyle={{ paddingBottom: 48 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(300)} style={{ paddingHorizontal: space.lg, paddingBottom: 12 }}>
              <PressableScale onPressIn={() => prefetchService(item.id)} onPress={() => router.push(`/service/${item.id}`)} scaleTo={0.98} style={[styles.serviceCard, shadow(1)]}>
                <AppImage uri={imageUri(item.metadata?.imageUrl)} fallbackCode={module} style={styles.serviceImage} />
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text style={font.h3} numberOfLines={2}>{localizeServiceName(locale, item.name || item.code)}</Text>
                  {item.summary ? <Text style={font.tiny} numberOfLines={2}>{item.summary}</Text> : null}
                  <Text style={[font.tiny, { color: colors.textSecondary }]} numberOfLines={1}>{localizeOrganizationName(locale, item.organizationCode, item.organizationName, item.organizationMetadata)}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {Number(item.priceFrom || 0) > 0 ? <Text style={styles.price}>{t.common.from} {money(item.priceFrom, item.currency)}</Text> : null}
                    {item.distanceKm != null ? <Text style={styles.distance}>⌖ {item.distanceKm.toFixed(1)} km</Text> : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </PressableScale>
            </Animated.View>
          )}
        />
      )}
      {isFood ? <RestaurantCartBar /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  location: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  search: { flexDirection: "row", alignItems: "center", gap: 8, height: 48, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  menuPreview: { marginTop: -10, paddingTop: 10, paddingHorizontal: 14, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderTopWidth: 0, borderColor: colors.glassBorder, zIndex: -1 },
  viewMenu: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  viewMenuText: { color: colors.brandStrong, fontWeight: "800", fontSize: 13 },
  serviceCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder },
  serviceImage: { width: 82, height: 82, borderRadius: radius.md },
  price: { color: colors.price, fontWeight: "800", fontSize: 13 },
  distance: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
});
