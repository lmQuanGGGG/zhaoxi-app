import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localizeOrganizationName } from "@zhaoxi/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFoodPricing, getOrganizationServices, getRestaurantStatus } from "../../src/api/endpoints";
import type { Service } from "../../src/api/types";
import { MenuItemRow, RestaurantCartBar } from "../../src/components/food";
import { useCart } from "../../src/cart";
import { imageUri, str } from "../../src/format";
import { restaurantStatusLabel } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { colors, font, radius, shadow, space } from "../../src/theme";
import { AppImage, ErrorState, IconButton, Ionicons, Screen, Skeleton, SkeletonList } from "../../src/ui";

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const client = useQueryClient();
  const menu = useQuery({
    queryKey: keys.orgServices(id, locale),
    queryFn: () => getOrganizationServices(id, locale),
    // Render instantly from the restaurant list cache while the full menu loads.
    placeholderData: () => {
      for (const [, list] of client.getQueriesData<Service[]>({ queryKey: ["nearby", "food"] })) {
        const items = list?.filter((item) => item.organizationId === id);
        if (items?.length) return items;
      }
      return undefined;
    },
  });
  const status = useQuery({ queryKey: keys.restaurantStatus(id), queryFn: () => getRestaurantStatus(id), refetchInterval: 20_000 });
  const lines = useMemo(() => (menu.data || []).map((item) => ({ id: item.id, quantity: 1 })), [menu.data]);
  const pricing = useQuery({ queryKey: keys.foodPricing(lines.map((l) => l.id).join(",")), queryFn: () => getFoodPricing(lines), enabled: lines.length > 0 });

  const first = menu.data?.[0];
  const meta = first?.organizationMetadata || {};
  const banners = (Array.isArray(meta.bannerUrls) ? meta.bannerUrls : []) as string[];
  const cover = imageUri(banners[0]) || imageUri(meta.logoUrl);
  const logo = imageUri(meta.logoUrl);
  const open = status.data?.open !== false;
  const name = first ? localizeOrganizationName(locale, first.organizationCode, first.organizationName, first.organizationMetadata) : "";

  const header = (
    <View>
      <View style={styles.cover}>
        {menu.isPending ? <Skeleton height={230} radius={0} /> : <AppImage uri={cover} fallbackCode="food" style={StyleSheet.absoluteFill} />}
        <LinearGradient colors={["rgba(0,0,0,0.35)", "transparent", "rgba(247,250,249,1)"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      </View>
      <View style={[styles.info, shadow(2)]}>
        {logo ? <AppImage uri={logo} style={styles.logo} /> : <View style={[styles.logo, { backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }]}><Text style={{ color: colors.white, fontSize: 22, fontWeight: "900" }}>喜</Text></View>}
        {menu.isPending ? <Skeleton width="60%" height={22} /> : <Text style={[font.h1, { fontSize: 22 }]} numberOfLines={2}>{name}</Text>}
        {first?.organizationAddress ? <Text style={[font.small, { marginTop: 4 }]} numberOfLines={2}>{str(first.organizationAddress)}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <View style={[styles.status, { backgroundColor: open ? colors.brandSoft : colors.dangerSoft }]}>
            <View style={[styles.dot, { backgroundColor: open ? colors.brand : colors.danger }]} />
            <Text style={{ fontSize: 12, fontWeight: "800", color: open ? colors.brandStrong : colors.danger }}>{restaurantStatusLabel(status.data, t)}</Text>
          </View>
          <View style={[styles.status, { backgroundColor: "#EEF4FB" }]}>
            <Ionicons name="restaurant" size={12} color="#4788C7" />
            <Text style={{ fontSize: 12, fontWeight: "800", color: "#4788C7" }}>{menu.data?.length || 0} {t.common.items}</Text>
          </View>
        </View>
      </View>
      <Text style={[font.h2, { paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: 4 }]}>{t.browse.menu}</Text>
    </View>
  );

  return (
    <Screen edges={[]}>
      <FlashList
        data={menu.data || []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={menu.isPending ? <View style={{ padding: space.lg }}><SkeletonList count={5} /></View> : menu.isError ? <View style={{ padding: space.lg }}><ErrorState message={t.common.error} retryLabel={t.common.retry} onRetry={() => void menu.refetch()} /></View> : null}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: space.lg }}>
            <View style={styles.divider} />
            <MenuItemRow item={item} price={pricing.data?.[item.id]} restaurantOpen={open} />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={menu.isRefetching} onRefresh={() => { void menu.refetch(); void status.refetch(); }} tintColor={colors.white} />}
        contentContainerStyle={{ paddingBottom: 140 }}
      />
      <View style={[styles.floating, { top: insets.top + 6 }]}>
        <IconButton icon="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/services/food"))} />
        <IconButton icon="bag-handle-outline" badge={cart.count} onPress={() => router.push("/cart")} />
      </View>
      <RestaurantCartBar organizationId={id} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { height: 230, backgroundColor: "#DDEDE7" },
  info: { marginTop: -70, marginHorizontal: space.lg, padding: space.lg, paddingTop: 38, borderRadius: radius.xl, backgroundColor: colors.white },
  logo: { position: "absolute", top: -30, left: space.lg, width: 60, height: 60, borderRadius: 20, borderWidth: 3, borderColor: colors.white },
  status: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  floating: { position: "absolute", left: space.lg, right: space.lg, flexDirection: "row", justifyContent: "space-between" },
});
