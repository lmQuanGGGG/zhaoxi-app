import { useQueries, useQuery } from "@tanstack/react-query";
import { localizeOrganizationName } from "@zhaoxi/i18n";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getCoupons, getNearbyServices } from "../src/api/endpoints";
import { money } from "../src/format";
import { usePullRefresh } from "../src/hooks";
import { useI18n } from "../src/i18n";
import { pointKey, useLocationState } from "../src/location";
import { keys } from "../src/query";
import { colors, font, radius, shadow, space } from "../src/theme";
import { Button, EmptyState, Header, Screen, SkeletonList, haptic } from "../src/ui";
import { toast } from "../src/ui/toast";

export default function CouponsScreen() {
  const { t, locale } = useI18n();
  const location = useLocationState();
  const nearby = useQuery({ queryKey: keys.nearby("food", locale, pointKey(location.point)), queryFn: () => getNearbyServices("food", locale, location.point) });
  const restaurants = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of nearby.data || []) if (item.organizationId && !map.has(item.organizationId)) map.set(item.organizationId, localizeOrganizationName(locale, item.organizationCode, item.organizationName, item.organizationMetadata));
    return [...map.entries()].slice(0, 10);
  }, [nearby.data, locale]);
  const couponQueries = useQueries({ queries: restaurants.map(([id]) => ({ queryKey: keys.coupons(id, 0), queryFn: () => getCoupons(id, 0), staleTime: 5 * 60_000 })) });
  const coupons = restaurants.flatMap(([id, name], index) => (couponQueries[index]?.data || []).map((coupon) => ({ ...coupon, organizationId: id, organizationName: name })));
  const loading = nearby.isPending || couponQueries.some((q) => q.isPending);
  const pull = usePullRefresh(nearby.refetch, ...couponQueries.map((q) => q.refetch));

  return (
    <Screen>
      <Header title={t.profile.coupons} subtitle={t.personal.couponsHint} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 4, gap: 12, paddingBottom: 48 }} refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={colors.brand} />}>
        {loading && !coupons.length ? <SkeletonList count={4} image={false} /> : !coupons.length ? <EmptyState zx="ticket" title={t.personal.couponsEmpty} action={t.cart.continue} onAction={() => router.push("/services/food")} /> : coupons.map((coupon, index) => (
          <Animated.View key={`${coupon.organizationId}-${coupon.id}`} entering={FadeInDown.delay(Math.min(index, 8) * 40)}>
            <View style={[styles.ticket, shadow(1)]}>
              <View style={styles.stub}>
                <Text style={styles.discount}>{coupon.discountType === "percent" ? `-${coupon.discountValue}%` : `-${money(coupon.discountValue)}`}</Text>
              </View>
              <View style={styles.notchTop} /><View style={styles.notchBottom} />
              <View style={{ flex: 1, padding: 14, gap: 4 }}>
                <Text style={font.h3} numberOfLines={1}>{coupon.title || coupon.code}</Text>
                <Text style={font.tiny} numberOfLines={1}>{coupon.organizationName}</Text>
                <Text style={font.tiny}>{t.personal.minOrder}: {money(coupon.minOrderAmount)}{coupon.maxDiscountAmount ? ` · ${t.personal.maxDiscount}: ${money(coupon.maxDiscountAmount)}` : ""}</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                  <Button small variant="secondary" icon="copy-outline" title={coupon.code} onPress={async () => { await Clipboard.setStringAsync(coupon.code); haptic.success(); toast(t.common.copied); }} />
                  <Button small icon="restaurant" title={t.browse.viewMenu} onPress={() => router.push(`/restaurant/${coupon.organizationId}`)} />
                </View>
              </View>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ticket: { flexDirection: "row", borderRadius: radius.lg, backgroundColor: colors.white, overflow: "hidden" },
  stub: { width: 96, alignItems: "center", justifyContent: "center", backgroundColor: colors.brand, borderRightWidth: 2, borderRightColor: colors.white, borderStyle: "dashed" },
  discount: { color: colors.white, fontSize: 20, fontWeight: "900" },
  notchTop: { position: "absolute", left: 86, top: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bg },
  notchBottom: { position: "absolute", left: 86, bottom: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bg },
});
