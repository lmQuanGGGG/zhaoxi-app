import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { statusLabels } from "@zhaoxi/i18n";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getOrder, getOrders } from "../../src/api/endpoints";
import type { Order } from "../../src/api/types";
import { TAB_BAR_SPACE } from "../../src/constants";
import { money, num, shortDate, str } from "../../src/format";
import { useSession } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { ACTIVE_STATUSES, CANCELLED_STATUSES, statusTone } from "../../src/status";
import { keys } from "../../src/query";
import { colors, font, radius, shadow, space } from "../../src/theme";
import { Chip, EmptyState, ErrorState, Header, Ionicons, PressableScale, Screen, ServiceBadge, SkeletonList, StatusPill } from "../../src/ui";

type Filter = "all" | "active" | "completed" | "cancelled";
const ACTIVE = ACTIVE_STATUSES;
const CANCELLED = CANCELLED_STATUSES;

export default function OrdersScreen() {
  const { t, locale } = useI18n();
  const { userId } = useSession();
  const client = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const orders = useQuery({ queryKey: keys.orders(locale, userId), queryFn: () => getOrders(locale), enabled: Boolean(userId), refetchInterval: 30_000 });
  const list = orders.data || [];
  const visible = useMemo(() => list.filter((o) => filter === "all" || (filter === "active" ? ACTIVE.has(o.status) : filter === "completed" ? o.status === "completed" : CANCELLED.has(o.status))), [list, filter]);
  const counts = { all: list.length, active: list.filter((o) => ACTIVE.has(o.status)).length, completed: list.filter((o) => o.status === "completed").length, cancelled: list.filter((o) => CANCELLED.has(o.status)).length };
  const sum = visible.reduce((n, o) => n + num(o.details?.totalAmount), 0);
  const prefetch = (id: string) => void client.prefetchQuery({ queryKey: keys.order(id, locale), queryFn: () => getOrder(id, locale), staleTime: 15_000 });

  const header = (
    <View style={{ gap: 12, paddingHorizontal: space.lg, paddingBottom: space.md }}>
      <View style={styles.summary}>
        <View style={{ flex: 1 }}><Text style={font.tiny}>{t.orders.count}</Text><Text style={styles.summaryValue}>{visible.length}</Text></View>
        <View style={styles.summaryDivider} />
        <View style={{ flex: 1.4 }}><Text style={font.tiny}>{t.orders.value}</Text><Text style={styles.summaryValue}>{sum > 0 ? money(sum) : "—"}</Text></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {(["all", "active", "completed", "cancelled"] as const).map((key) => <Chip key={key} label={t.orders[key]} count={counts[key]} active={filter === key} onPress={() => setFilter(key)} />)}
      </ScrollView>
    </View>
  );

  return (
    <Screen>
      <Header title={t.orders.title} back={false} />
      <FlashList
        data={visible}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()} tintColor={colors.brand} />}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: space.lg }}>
            {orders.isPending ? <SkeletonList count={4} /> : orders.isError ? <ErrorState message={t.common.error} retryLabel={t.common.retry} onRetry={() => void orders.refetch()} /> : (
              <EmptyState icon="receipt-outline" title={t.orders.empty} body={t.orders.emptyHint} action={t.orders.explore} onAction={() => router.push("/services")} />
            )}
          </View>
        }
        renderItem={({ item, index }) => <OrderCard order={item} index={index} onPressIn={() => prefetch(item.id)} />}
      />
    </Screen>
  );
}

function OrderCard({ order, index, onPressIn }: { order: Order; index: number; onPressIn: () => void }) {
  const { locale } = useI18n();
  const total = num(order.details?.totalAmount);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 45).duration(280)} style={{ paddingHorizontal: space.lg, paddingBottom: 12 }}>
      <PressableScale onPressIn={onPressIn} onPress={() => router.push(`/order/${order.id}`)} scaleTo={0.98} style={[styles.card, shadow(1)]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <ServiceBadge code={order.moduleCode} size={46} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={font.tiny} numberOfLines={1}>{order.organizationName || order.moduleName || "ZhaoXi"}</Text>
            <Text style={font.h3} numberOfLines={2}>{order.serviceName || order.title}</Text>
          </View>
          <StatusPill tone={statusTone(order.status)} label={statusLabels[locale][order.status] || order.status} />
        </View>
        <View style={styles.footer}>
          <Text style={styles.code}>{order.requestCode}</Text>
          <Text style={font.tiny}>{shortDate(order.createdAt, locale)}</Text>
          <View style={{ flex: 1 }} />
          {total > 0 ? <Text style={styles.amount}>{money(total, str(order.details?.currency, "VND"))}</Text> : null}
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: radius.lg, backgroundColor: colors.brandStrong },
  summaryValue: { fontSize: 22, fontWeight: "900", color: colors.white, marginTop: 2 },
  summaryDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.25)", marginHorizontal: 16 },
  card: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, gap: 12 },
  footer: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  code: { fontSize: 12, fontWeight: "800", color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  amount: { color: colors.price, fontWeight: "900", fontSize: 14 },
});
