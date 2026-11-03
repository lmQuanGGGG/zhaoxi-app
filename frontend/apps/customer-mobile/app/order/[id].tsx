import { useQuery } from "@tanstack/react-query";
import { statusLabels } from "@zhaoxi/i18n";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { getDeliveryTracking, getOrder, getSupportConfig } from "../../src/api/endpoints";
import { LiveDelivery } from "../../src/components/LiveDelivery";
import { money, num, shortDate, str } from "../../src/format";
import { useNow, usePullRefresh } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { foodMilestones, fulfillmentCopy, milestoneLabels, paymentMethodLabels, paymentStatusLabels, type FoodMilestone } from "../../src/order-copy";
import { keys } from "../../src/query";
import { ACTIVE_STATUSES, statusTone } from "../../src/status";
import { colors, font, radius, shadow, space } from "../../src/theme";
import { AppImage, Button, GlassCard, Header, Ionicons, Row, Screen, ServiceIcon, SkeletonList, StatusPill, haptic } from "../../src/ui";
import { toast } from "../../src/ui/toast";

type Item = { serviceId?: string; name?: string; imageUrl?: string; quantity?: number; unitPrice?: number; subtotal?: number };

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const now = useNow(15_000);
  const order = useQuery({
    queryKey: keys.order(id, locale),
    queryFn: () => getOrder(id, locale),
    // Every status change already arrives as a push that invalidates this query;
    // polling is only a slow fallback for devices without push permission.
    refetchInterval: (query) => (query.state.data && ACTIVE_STATUSES.has(query.state.data.status) ? 20_000 : false),
  });
  const moving = Boolean(order.data && ACTIVE_STATUSES.has(order.data.status));
  // Poll GPS only once a delivery job exists (the courier is moving); before that the
  // endpoint answers 404 and the "driver assigned" push refreshes it.
  const tracking = useQuery({
    queryKey: keys.tracking(id),
    queryFn: () => getDeliveryTracking(id),
    enabled: Boolean(order.data),
    refetchInterval: (query) => (moving && query.state.data?.job && !["delivered", "cancelled"].includes(query.state.data.job.status) ? 8_000 : false),
  });
  const pull = usePullRefresh(order.refetch, tracking.refetch);
  const support = useQuery({ queryKey: ["support-config"], queryFn: getSupportConfig, staleTime: 60 * 60_000 });

  const data = order.data;
  const details = (data?.details || {}) as Record<string, unknown>;
  const stage = str(details.fulfillmentStage);
  const external = details.deliveryFulfillmentMode === "external_manual";
  const lastStage = useRef<string | null>(null);
  useEffect(() => {
    if (!data) return;
    const key = `${data.status}:${stage}`;
    if (lastStage.current && lastStage.current !== key) haptic.success();
    lastStage.current = key;
  }, [data, stage]);

  if (!data) {
    return <Screen><Header title={t.order.title} /><View style={{ padding: space.lg }}><SkeletonList count={4} /></View></Screen>;
  }

  const items = (Array.isArray(details.items) ? details.items : []) as Item[];
  const total = num(details.totalAmount);
  const currency = str(details.currency, "VND");
  const readyAt = typeof details.estimatedReadyAt === "string" ? new Date(details.estimatedReadyAt).getTime() : typeof details.estimatedCompletionAt === "string" ? new Date(details.estimatedCompletionAt).getTime() : 0;
  const minutesLeft = readyAt ? Math.max(0, Math.ceil((readyAt - now) / 60000)) : 0;
  const active = ACTIVE_STATUSES.has(data.status);
  const reached = milestoneIndex(stage, data.status);
  const courierName = str(details.courierName);
  const courierPhone = str(details.courierPhone);
  // zalo:// / weixin:// throw when the app isn't installed; the order text is already on the clipboard either way.
  const openChat = async (url: string) => {
    await Clipboard.setStringAsync(copyText);
    try {
      await Linking.openURL(url);
    } catch {
      toast(t.common.copied, "info");
    }
  };
  const copyText = `${t.success.code}: ${data.requestCode}\n${items.map((item) => `${item.quantity || 1} × ${item.name || ""}`).join("\n") || data.serviceName || data.title}`;

  return (
    <Screen>
      <Header title={t.order.title} subtitle={data.requestCode} right={<StatusPill tone={statusTone(data.status)} label={statusLabels[locale][data.status] || data.status} />} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 4, gap: space.lg, paddingBottom: 60 }} refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={colors.brand} />}>
        <Animated.View entering={FadeInDown.duration(200)}>
          <GlassCard style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <LivePulse active={active} />
              <View style={{ flex: 1 }}>
                <Text style={font.h2}>{(stage && fulfillmentCopy[locale][noteForStage(stage)]?.title) || statusLabels[locale][data.status] || data.status}</Text>
                <Text style={font.small}>{(stage && fulfillmentCopy[locale][noteForStage(stage)]?.detail) || data.serviceName || data.title}</Text>
              </View>
            </View>
            {external || data.moduleCode === "food" ? <ProgressTrack reached={reached} cancelled={data.status === "cancelled" || data.status === "rejected"} /> : null}
            {active && minutesLeft > 0 ? (
              <View style={styles.eta}>
                <Ionicons name="time-outline" size={18} color={colors.brandStrong} />
                <Text style={[font.small, { color: colors.brandStrong, fontWeight: "700" }]}>{t.order.eta}: {t.order.left} {minutesLeft} {t.common.minutes}</Text>
              </View>
            ) : null}
            {courierName || courierPhone ? (
              <View style={styles.courier}>
                <Ionicons name="bicycle" size={20} color={colors.brandStrong} />
                <View style={{ flex: 1 }}>
                  <Text style={font.tiny}>{t.order.courier} · {str(details.deliveryProviderLabel)}</Text>
                  <Text style={font.h3}>{courierName || courierPhone}</Text>
                </View>
                {courierPhone ? <Button small icon="call" title={t.common.call} onPress={() => void Linking.openURL(`tel:${courierPhone}`)} /> : null}
              </View>
            ) : null}
          </GlassCard>
        </Animated.View>

        {data.organizationName ? (
          <Animated.View entering={FadeInDown.delay(21).duration(200)}>
            <GlassCard style={styles.store}>
              <ServiceIcon code={data.moduleCode} size={40} />
              <Text style={[font.h3, { flex: 1 }]} numberOfLines={1}>{data.organizationName}</Text>
              <Button small icon="chatbubbles" title={t.messages.storeChat} onPress={() => router.push(`/chat/${encodeURIComponent(`order:${data.id}`)}`)} />
            </GlassCard>
          </Animated.View>
        ) : null}

        {tracking.data?.job && !external ? <LiveDelivery tracking={tracking.data} /> : null}

        {items.length ? (
          <GlassCard style={{ gap: 4 }}>
            <Text style={[font.h2, { marginBottom: 6 }]}>{t.order.items}</Text>
            {items.map((item, index) => (
              <View key={`${item.serviceId}-${index}`} style={styles.item}>
                <AppImage uri={item.imageUrl} fallbackCode="food" style={styles.itemImage} />
                <Text style={[font.body, { flex: 1 }]} numberOfLines={2}>{item.quantity || 1} × {item.name}</Text>
                <Text style={font.small}>{money(item.subtotal ?? num(item.unitPrice) * num(item.quantity, 1), currency)}</Text>
              </View>
            ))}
          </GlassCard>
        ) : null}

        <GlassCard style={{ gap: 2 }}>
          {data.addressText ? <Row label={t.order.address} value={data.addressText.length > 34 ? `${data.addressText.slice(0, 34)}…` : data.addressText} /> : null}
          <Row label={t.order.placed} value={shortDate(data.createdAt, locale)} />
          {details.paymentMethod ? <Row label={t.order.payment} value={paymentMethodLabels[locale][str(details.paymentMethod)] || str(details.paymentMethod)} /> : null}
          {details.paymentStatus ? <Row label="" value={paymentStatusLabels[locale][str(details.paymentStatus)] || str(details.paymentStatus)} color={details.paymentStatus === "paid" ? colors.brandStrong : colors.warning} /> : null}
          {num(details.deliveryCustomerFee) > 0 ? <Row label={t.checkout.delivery} value={money(details.deliveryCustomerFee as number, currency)} /> : null}
          {num(details.couponDiscount) > 0 ? <Row label={t.checkout.couponDiscount} value={`-${money(details.couponDiscount as number, currency)}`} color={colors.brandStrong} /> : null}
          {total > 0 ? <Row label={t.order.total} value={money(total, currency)} strong color={colors.price} /> : null}
        </GlassCard>

        {data.history?.length ? (
          <GlassCard>
            <Text style={[font.h2, { marginBottom: 10 }]}>{t.order.progress}</Text>
            {data.history.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((entry, index, all) => {
              const copy = entry.note ? fulfillmentCopy[locale][entry.note] : undefined;
              return (
                <View key={entry.id} style={styles.timelineRow}>
                  <View style={{ alignItems: "center" }}>
                    <View style={[styles.timelineDot, index === 0 && { backgroundColor: colors.brand, borderColor: colors.brandSoft }]} />
                    {index < all.length - 1 ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 14 }}>
                    <Text style={[font.h3, index > 0 && { color: colors.textSecondary }]}>{copy?.title || statusLabels[locale][entry.toStatus] || entry.toStatus}</Text>
                    <Text style={font.tiny}>{shortDate(entry.createdAt, locale)}</Text>
                  </View>
                </View>
              );
            })}
          </GlassCard>
        ) : null}

        <GlassCard style={{ gap: 10 }}>
          <Text style={font.h2}>{t.order.support}</Text>
          <Text style={font.small}>{t.order.supportHint}</Text>
          <Button variant="secondary" icon="copy-outline" title={t.order.copyOrder} onPress={async () => { await Clipboard.setStringAsync(copyText); haptic.success(); toast(t.common.copied); }} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            {support.data?.zaloChatUrl ? <Button small variant="secondary" title={t.order.zalo} style={{ flex: 1 }} onPress={() => void openChat(String(support.data?.zaloChatUrl))} /> : null}
            {support.data?.wechatChatUrl ? <Button small variant="secondary" title={t.order.wechat} style={{ flex: 1 }} onPress={() => void openChat(String(support.data?.wechatChatUrl))} /> : null}
          </View>
          <Button small icon="chatbubbles" title={t.order.chat} onPress={() => router.push({ pathname: "/support", params: { subject: `${t.success.code} ${data.requestCode}` } })} />
        </GlassCard>
      </ScrollView>
    </Screen>
  );
}

function noteForStage(stage: string) {
  return ({ preparing: "FOOD_PREPARING", ready_for_pickup: "FOOD_READY_FOR_PICKUP", courier_booked: "EXTERNAL_COURIER_BOOKED", handed_off: "FOOD_HANDED_TO_COURIER", delivered: "EXTERNAL_DELIVERY_DELIVERED", cancelled: "FOOD_ORDER_CANCELLED" } as Record<string, string>)[stage] || "";
}

function milestoneIndex(stage: string, status: string) {
  if (stage === "delivered" || status === "completed") return foodMilestones.length - 1;
  const index = foodMilestones.indexOf(stage as FoodMilestone);
  return index >= 0 ? index : 0;
}

function ProgressTrack({ reached, cancelled }: { reached: number; cancelled: boolean }) {
  const { locale } = useI18n();
  return (
    <View>
      <View style={styles.trackBg}>
        <Animated.View style={[styles.trackFill, { width: `${(reached / (foodMilestones.length - 1)) * 100}%`, backgroundColor: cancelled ? colors.danger : colors.brand }]} />
      </View>
      <View style={styles.trackLabels}>
        {foodMilestones.map((milestone, index) => (
          <View key={milestone} style={{ alignItems: "center", flex: 1 }}>
            <View style={[styles.trackDot, index <= reached && { backgroundColor: cancelled ? colors.danger : colors.brand, borderColor: colors.white }]} />
            <Text style={[styles.trackText, index <= reached && { color: colors.text, fontWeight: "800" }]} numberOfLines={1}>{milestoneLabels[locale][milestone]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LivePulse({ active }: { active: boolean }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (active) pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }), -1, false);
  }, [active, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 1 - pulse.value, transform: [{ scale: 1 + pulse.value * 0.8 }] }));
  return (
    <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
      {active ? <Animated.View style={[styles.pulse, ring]} /> : null}
      <View style={[styles.pulseCore, !active && { backgroundColor: colors.textMuted }]}><Ionicons name={active ? "flash" : "checkmark-done"} size={20} color={colors.white} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  eta: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: radius.md, backgroundColor: colors.brandSoft },
  store: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  courier: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.white, ...shadow("card") },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemImage: { width: 40, height: 40, borderRadius: 10 },
  timelineRow: { flexDirection: "row", gap: 12 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.border },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  trackBg: { height: 6, borderRadius: 3, backgroundColor: "#E4ECE9", marginHorizontal: "8%", marginTop: 6, overflow: "hidden" },
  trackFill: { height: 6, borderRadius: 3 },
  trackLabels: { flexDirection: "row", marginTop: -10 },
  trackDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#E4ECE9", borderWidth: 2, borderColor: colors.white, ...shadow(1) },
  trackText: { fontSize: 10, color: colors.textMuted, marginTop: 6, fontWeight: "600" },
  pulse: { position: "absolute", width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandGlow },
  pulseCore: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
});
