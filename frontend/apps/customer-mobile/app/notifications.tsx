import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { statusLabels } from "@zhaoxi/i18n";
import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { getNotifications, markAllNotificationsRead, markNotification, updateNotificationPreferences } from "../src/api/endpoints";
import type { NotificationInbox, NotificationItem, NotificationPreferences } from "../src/api/types";
import { CenterChip, CenterEmpty, SoftButton, TextLink } from "../src/components/center";
import { TAB_BAR_SPACE } from "../src/constants";
import { shortDate } from "../src/format";
import { usePullRefresh, useSession } from "../src/hooks";
import { useI18n } from "../src/i18n";
import { routeForWebHref } from "../src/links";
import { keys } from "../src/query";
import { colors, shadow } from "../src/theme";
import { Header, PressableScale, Screen, SkeletonList } from "../src/ui";

const filters = ["all", "order", "housing", "travel", "payment", "saved_search"] as const;
const centerTitle = { "vi-VN": "Trung tâm thông báo", "en-US": "Notification Center", "zh-CN": "通知中心", "zh-TW": "通知中心" } as const;
const viewLabel = { "vi-VN": "Xem", "en-US": "View", "zh-CN": "查看", "zh-TW": "查看" } as const;
const discover = { "vi-VN": "Khám phá dịch vụ", "en-US": "Discover services", "zh-CN": "发现服务", "zh-TW": "探索服務" } as const;

export default function NotificationsScreen() {
  const { t, locale } = useI18n();
  const { userId } = useSession();
  const client = useQueryClient();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [showPrefs, setShowPrefs] = useState(false);
  const queryKey = keys.notifications(locale, filter, userId);
  const inbox = useQuery({ queryKey, queryFn: () => getNotifications(locale, filter), enabled: Boolean(userId) });
  const pull = usePullRefresh(inbox.refetch);

  const label = (c: string) => (c === "order" ? t.notifications.order : c === "housing" ? t.notifications.housing : c === "travel" ? t.notifications.travel : c === "payment" ? t.notifications.payment : c === "saved_search" ? t.notifications.saved : t.notifications.all);

  // Optimistic receipts: the row updates instantly, server sync follows.
  const receipt = useMutation({
    mutationFn: ({ item, patch }: { item: NotificationItem; patch: { read?: boolean; dismissed?: boolean } }) => markNotification(item.sourceType, item.sourceId, patch),
    onMutate: ({ item, patch }) => {
      client.setQueryData<NotificationInbox>(queryKey, (current) => current ? {
        ...current,
        items: patch.dismissed ? current.items.filter((x) => x.id !== item.id) : current.items.map((x) => (x.id === item.id ? { ...x, readAt: x.readAt || new Date().toISOString() } : x)),
        summary: { ...current.summary, unread: Math.max(0, current.summary.unread - (item.readAt ? 0 : 1)) },
      } : current);
    },
    onSettled: () => { void client.invalidateQueries({ queryKey: ["unread"] }); },
  });
  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(locale),
    onMutate: () => client.setQueryData<NotificationInbox>(queryKey, (current) => current ? { ...current, items: current.items.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })), summary: { ...current.summary, unread: 0 } } : current),
    onSettled: () => { void client.invalidateQueries({ queryKey: ["notifications"] }); void client.invalidateQueries({ queryKey: ["unread"] }); },
  });
  const prefs = useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) => updateNotificationPreferences(patch),
    onMutate: (patch) => client.setQueryData<NotificationInbox>(queryKey, (current) => current ? { ...current, preferences: { ...current.preferences, ...patch } } : current),
    onSettled: () => { void client.invalidateQueries({ queryKey: ["notifications"] }); },
  });

  const describe = (item: NotificationItem) => {
    const code = item.eventCode || "";
    if (item.category === "saved_search") return code === "availability_changed" ? t.notifications.availability : t.notifications.matched;
    if (code.includes("_MESSAGE")) return t.notifications.newMessage;
    if (code.startsWith("PAYMENT_")) return t.notifications.paymentUpdate;
    return statusLabels[locale][item.status || ""] || code.replace(/_/g, " ").toLowerCase();
  };

  const data = inbox.data;
  return (
    <Screen>
      <FlashList
        data={data?.items || []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={colors.brand} />}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
        ListHeaderComponent={
          <View>
            <Header title={centerTitle[locale]} subtitle={`${data?.summary.unread || 0} ${t.notifications.unread}`} right={<SoftButton label={t.notifications.preferences} onPress={() => setShowPrefs((v) => !v)} />} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8 }}>
              {filters.map((key) => <CenterChip key={key} label={label(key)} count={key === "all" ? undefined : data?.summary.byCategory?.[key]} active={filter === key} onPress={() => setFilter(key)} />)}
            </ScrollView>
            <View style={styles.toolbar}>
              <SoftButton label={t.notifications.readAll} onPress={() => readAll.mutate()} />
              <TextLink label={discover[locale]} onPress={() => router.push("/services")} />
            </View>
            {showPrefs && data?.preferences ? (
              <Animated.View entering={FadeInDown} style={[styles.prefs, shadow("card")]}>
                <Text style={styles.prefsTitle}>{t.notifications.preferences}</Text>
                {(["orderEnabled", "housingEnabled", "travelEnabled", "paymentEnabled", "savedSearchEnabled"] as const).map((key) => (
                  <View key={key} style={styles.prefRow}>
                    <Text style={{ flex: 1, fontSize: 13, color: colors.ink }}>{label(key.replace("Enabled", "").replace("savedSearch", "saved_search"))}</Text>
                    <Switch value={data.preferences[key] !== false} onValueChange={(value) => prefs.mutate({ [key]: value })} trackColor={{ true: colors.wechat }} />
                  </View>
                ))}
              </Animated.View>
            ) : null}
          </View>
        }
        ListEmptyComponent={<View style={{ paddingHorizontal: 14 }}>{inbox.isPending ? <SkeletonList count={4} image={false} /> : <CenterEmpty title={t.notifications.empty} />}</View>}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 30)} exiting={FadeOut} layout={LinearTransition} style={{ paddingHorizontal: 14, paddingBottom: 7 }}>
            <View style={[styles.notice, shadow("card"), item.readAt ? { opacity: 0.78 } : null]}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={styles.meta}>{label(item.category)} · {shortDate(item.createdAt, locale)}</Text>
                  <Text style={styles.noticeTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.meta} numberOfLines={2}>{describe(item)}</Text>
                  {item.subtitle ? <Text style={styles.meta}>{item.subtitle}</Text> : null}
                </View>
                {!item.readAt ? <View style={styles.dot} /> : null}
              </View>
              <View style={styles.actions}>
                <PressableScale onPress={() => { receipt.mutate({ item, patch: { read: true } }); router.push(routeForWebHref(item.href)); }}><Text style={styles.view}>{viewLabel[locale]} ›</Text></PressableScale>
                <SoftButton label={t.notifications.hide} onPress={() => receipt.mutate({ item, patch: { read: true, dismissed: true } })} />
              </View>
            </View>
          </Animated.View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 12 },
  prefs: { marginHorizontal: 14, marginBottom: 10, padding: 12, borderRadius: 16, backgroundColor: colors.white, ...shadow("card") },
  prefsTitle: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 4 },
  prefRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5 },
  notice: { padding: 10, borderRadius: 12, backgroundColor: colors.white, ...shadow("card") },
  meta: { fontSize: 11, color: colors.textSecondary },
  noticeTitle: { fontSize: 13.5, fontWeight: "700", color: colors.text },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 4 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 9 },
  view: { fontSize: 12, fontWeight: "700", color: colors.brand },
});
