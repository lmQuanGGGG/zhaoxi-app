import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localizeOrganizationName } from "@zhaoxi/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { getFoodPricing, getOrganizationServices, getRestaurantStatus } from "../../src/api/endpoints";
import type { Service } from "../../src/api/types";
import { MenuCard, statusText } from "../../src/components/food";
import { TAB_BAR_SPACE } from "../../src/constants";
import { imageUri, str } from "../../src/format";
import { usePullRefresh } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { colors } from "../../src/theme";
import { AppImage, BackButton, ErrorState, PhotoCounter, Screen, Skeleton, SkeletonList } from "../../src/ui";

const copy = { "vi-VN": "Toàn bộ thực đơn", "en-US": "Full menu", "zh-CN": "全部菜单", "zh-TW": "全部菜單" } as const;

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
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
  const pull = usePullRefresh(menu.refetch, status.refetch);
  const lines = useMemo(() => (menu.data || []).map((item) => ({ id: item.id, quantity: 1 })), [menu.data]);
  const pricing = useQuery({ queryKey: keys.foodPricing(lines.map((l) => l.id).join(",")), queryFn: () => getFoodPricing(lines), enabled: lines.length > 0 });

  const first = menu.data?.[0];
  const meta = first?.organizationMetadata || {};
  const banners = ((Array.isArray(meta.draftBannerUrls) && meta.draftBannerUrls.length ? meta.draftBannerUrls : Array.isArray(meta.bannerUrls) ? meta.bannerUrls : []) as string[]).map(imageUri).filter(Boolean) as string[];
  const logo = imageUri(meta.draftLogoUrl || meta.logoUrl);
  const open = status.data?.open !== false;
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => setSlide((value) => (value + 1) % banners.length), 4200);
    return () => clearInterval(timer);
  }, [banners.length]);

  const header = (
    <View>
      <View style={styles.hero}>
        <LinearGradient colors={["#07C160", "#0AA6CF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {banners.length ? <AppImage key={banners[slide]} uri={banners[slide]} style={StyleSheet.absoluteFill} transition={600} /> : null}
        <LinearGradient colors={["rgba(0,0,0,0.58)", "rgba(0,0,0,0.1)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <BackButton style={styles.back} />
        <View style={styles.heroBody}>
          {logo ? <AppImage uri={logo} style={styles.logo} contentFit="contain" /> : <View style={[styles.logo, { backgroundColor: colors.wechat, alignItems: "center", justifyContent: "center" }]}><Text style={{ color: colors.white, fontSize: 22, fontWeight: "900" }}>喜</Text></View>}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={[styles.status, !open && { backgroundColor: "#FFF1F2" }]}><Text style={[styles.statusText, !open && { color: "#B42318" }]}>{statusText(status.data, t)}</Text></View>
            {first ? <Text style={styles.name} numberOfLines={1}>{localizeOrganizationName(locale, first.organizationCode, first.organizationName, first.organizationMetadata)}</Text> : <Skeleton width="60%" height={20} style={{ marginTop: 6 }} />}
            {first?.organizationAddress ? <Text style={styles.address} numberOfLines={1}>{str(first.organizationAddress)}</Text> : null}
          </View>
        </View>
        <PhotoCounter index={slide} total={banners.length} style={{ top: 14, bottom: undefined }} />
      </View>
      <Text style={styles.section}>{copy[locale]}</Text>
    </View>
  );

  return (
    <Screen>
      <FlashList
        data={menu.data || []}
        numColumns={2}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={menu.isPending ? <View style={{ padding: 14 }}><SkeletonList count={4} /></View> : menu.isError ? <View style={{ padding: 14 }}><ErrorState message={t.common.error} retryLabel={t.common.retry} onRetry={() => void menu.refetch()} /></View> : null}
        renderItem={({ item, index }) => (
          <View style={{ paddingLeft: index % 2 === 0 ? 26 : 5, paddingRight: index % 2 === 0 ? 5 : 26, paddingBottom: 10 }}>
            <MenuCard item={item} price={pricing.data?.[item.id]} restaurantOpen={open} />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={colors.brand} />}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 200, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  back: { position: "absolute", top: 16, left: 14 },
  heroBody: { position: "absolute", left: 14, right: 14, bottom: 34, flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.white, borderWidth: 2, borderColor: "rgba(255,255,255,0.95)" },
  status: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: "#D1FAE5" },
  statusText: { fontSize: 11, fontWeight: "700", color: "#065F46" },
  name: { fontSize: 18, fontWeight: "800", color: colors.white, marginTop: 4 },
  address: { fontSize: 11, color: "rgba(255,255,255,0.88)", marginTop: 2 },
  section: { fontSize: 16, fontWeight: "700", color: colors.ink, paddingHorizontal: 14, paddingTop: 22, paddingBottom: 14 },
});
