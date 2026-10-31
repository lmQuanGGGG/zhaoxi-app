import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { statusLabels } from "@zhaoxi/i18n";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getHousingInquiries, getOrder, getOrders, getTravelBookings } from "../../src/api/endpoints";
import type { Order } from "../../src/api/types";
import { TAB_BAR_SPACE } from "../../src/constants";
import { money, num, shortDate, str } from "../../src/format";
import { usePullRefresh, useSession } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { ACTIVE_STATUSES, CANCELLED_STATUSES } from "../../src/status";
import { colors, shadow } from "../../src/theme";
import { Chip, EmptyState, ErrorState, Header, PressableScale, Screen, ServiceBadge, SkeletonList } from "../../src/ui";

type Filter = "all" | "active" | "completed" | "cancelled";

export default function OrdersScreen() {
  const { t, locale } = useI18n();
  const { userId } = useSession();
  const client = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const orders = useQuery({ queryKey: keys.orders(locale, userId), queryFn: () => getOrders(locale), enabled: Boolean(userId), refetchInterval: 30_000 });
  const pull = usePullRefresh(orders.refetch);
  const list = orders.data || [];
  const visible = useMemo(() => list.filter((o) => filter === "all" || (filter === "active" ? ACTIVE_STATUSES.has(o.status) : filter === "completed" ? o.status === "completed" : CANCELLED_STATUSES.has(o.status))), [list, filter]);
  const counts = { all: list.length, active: list.filter((o) => ACTIVE_STATUSES.has(o.status)).length, completed: list.filter((o) => o.status === "completed").length, cancelled: list.filter((o) => CANCELLED_STATUSES.has(o.status)).length };
  const sum = visible.reduce((n, o) => n + num(o.details?.totalAmount), 0);
  const housing = useQuery({ queryKey: keys.housingInquiries(userId), queryFn: getHousingInquiries, enabled: Boolean(userId) });
  const travel = useQuery({ queryKey: keys.travelBookings(userId), queryFn: getTravelBookings, enabled: Boolean(userId) });
  const prefetch = (id: string) => void client.prefetchQuery({ queryKey: keys.order(id, locale), queryFn: () => getOrder(id, locale), staleTime: 15_000 });

  const header = (
    <View>
      <Header back={false} title={t.orders.title} />
      <View style={{ paddingHorizontal: 14, gap: 8 }}>
        <View style={styles.summary}>
          <View style={[styles.sumCard, shadow("card")]}><Text style={styles.sumLabel}>{t.orders.count}</Text><Text style={styles.sumValue}>{visible.length}</Text></View>
          <View style={[styles.sumCard, shadow("card")]}><Text style={styles.sumLabel}>{t.orders.value}</Text><Text style={styles.sumValue}>{sum > 0 ? money(sum) : "—"}</Text></View>
        </View>
        <View style={styles.summary}>
          <InquiryTile kind="housing" count={housing.data?.length} />
          <InquiryTile kind="travel" count={travel.data?.length} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 2, paddingBottom: 6, paddingRight: 14 }} style={{ marginRight: -14 }}>
          {(["all", "active", "completed", "cancelled"] as const).map((key) => <Chip key={key} tone="dark" label={t.orders[key]} count={counts[key]} active={filter === key} onPress={() => setFilter(key)} />)}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <Screen tab>
      <FlashList
        data={visible}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={colors.brand} />}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 14, paddingTop: 2 }}>
            {orders.isPending ? <SkeletonList count={3} /> : orders.isError ? <ErrorState message={t.common.error} retryLabel={t.common.retry} onRetry={() => void orders.refetch()} /> : (
              <EmptyState zx="orders" title={t.orders.empty} body={t.orders.emptyHint} action={t.orders.explore} onAction={() => router.push("/services")} />
            )}
          </View>
        }
        renderItem={({ item, index }) => <OrderCard order={item} index={index} onPressIn={() => prefetch(item.id)} />}
      />
    </Screen>
  );
}

const tileCopy = {
  "vi-VN": { housing: "Yêu cầu thuê nhà", travel: "Booking du lịch" },
  "en-US": { housing: "Rental inquiries", travel: "Travel bookings" },
  "zh-CN": { housing: "租房意向", travel: "旅游预约" },
  "zh-TW": { housing: "租房意向", travel: "旅遊預約" },
} as const;

/** Entry to the housing / travel trackers (PWA /housing/requests, /travel/requests). */
function InquiryTile({ kind, count }: { kind: "housing" | "travel"; count?: number }) {
  const { locale } = useI18n();
  return (
    <PressableScale onPress={() => router.push(`/inquiries/${kind}`)} scaleTo={0.97} style={[styles.tile, shadow("card")]}>
      <ServiceBadge code={kind} size={34} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.tileTitle} numberOfLines={1}>{tileCopy[locale][kind]}</Text>
        <Text style={styles.tileCount}>{count ?? "—"}</Text>
      </View>
      <Text style={{ fontSize: 18, color: "#94A3B8" }}>›</Text>
    </PressableScale>
  );
}

/** PWA `orders.module.css .card`. */
function OrderCard({ order, index, onPressIn }: { order: Order; index: number; onPressIn: () => void }) {
  const { t, locale } = useI18n();
  const total = num(order.details?.totalAmount);
  const tone = order.status === "completed" ? styles.badgeDone : CANCELLED_STATUSES.has(order.status) ? styles.badgeCancelled : styles.badgeActive;
  const toneText = order.status === "completed" ? { color: colors.brand } : CANCELLED_STATUSES.has(order.status) ? { color: "#D86E60" } : { color: "#C58B22" };
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(260)} style={{ paddingHorizontal: 14, paddingTop: 10 }}>
      <PressableScale onPressIn={onPressIn} onPress={() => router.push(order.moduleCode === "housing" || order.moduleCode === "travel" ? `/inquiries/${order.moduleCode}` : `/order/${order.id}`)} scaleTo={0.985} style={[styles.card, shadow("soft")]}>
        <View style={styles.row}>
          <Text style={styles.code} numberOfLines={1}>{order.requestCode}</Text>
          <View style={[styles.badge, tone]}><Text style={[styles.badgeText, toneText]}>{statusLabels[locale][order.status] || order.status}</Text></View>
        </View>
        <Text style={styles.org} numberOfLines={1}>{order.organizationName || order.moduleName || "ZhaoXi"}</Text>
        <Text style={styles.title} numberOfLines={2}>{order.serviceName || order.title}</Text>
        {order.description ? <Text style={styles.desc} numberOfLines={2}>{order.description}</Text> : null}
        {total > 0 ? <Text style={styles.amount}>{money(total, str(order.details?.currency, "VND"))}</Text> : null}
        <View style={styles.footer}>
          <Text style={styles.time}>{shortDate(order.createdAt, locale)}</Text>
          <Text style={styles.link}>{t.orders.detail} ›</Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", gap: 7 },
  sumCard: { flex: 1, gap: 4, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 16, backgroundColor: colors.white, ...shadow("card") },
  tile: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 16, backgroundColor: colors.white, ...shadow("card") },
  tileTitle: { fontSize: 11, fontWeight: "700", color: colors.ink },
  tileCount: { fontSize: 15, fontWeight: "800", color: colors.brandStrong, marginTop: 1 },
  sumLabel: { fontSize: 10, color: colors.textMuted },
  sumValue: { fontSize: 16, fontWeight: "700", color: colors.text },
  card: { padding: 14, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.92)", ...shadow("card") },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  code: { flex: 1, fontSize: 11, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  badgeActive: { backgroundColor: "rgba(210,154,52,0.15)" },
  badgeDone: { backgroundColor: colors.brandSoft },
  badgeCancelled: { backgroundColor: "rgba(205,77,60,0.14)" },
  badgeText: { fontSize: 10, fontWeight: "800" },
  org: { fontSize: 10, color: colors.brand, marginTop: 12 },
  title: { fontSize: 16, fontWeight: "700", color: colors.text, marginVertical: 5 },
  desc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  amount: { fontSize: 14, fontWeight: "800", color: colors.price, marginTop: 4 },
  footer: { flexDirection: "row", justifyContent: "space-between", gap: 10, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 10, marginTop: 11 },
  time: { fontSize: 10, color: colors.textMuted },
  link: { fontSize: 11, fontWeight: "700", color: colors.brandStrong },
});
