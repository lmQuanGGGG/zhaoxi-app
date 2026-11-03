import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { statusLabels } from "@zhaoxi/i18n";
import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { getNotifications, markAllNotificationsRead, markNotification, updateNotificationPreferences } from "../src/api/endpoints";
import type { NotificationInbox, NotificationItem, NotificationPreferences } from "../src/api/types";
import { CenterChip, CenterEmpty, HeaderPill, SoftButton } from "../src/components/center";
import { TAB_BAR_SPACE } from "../src/constants";
import { shortDate } from "../src/format";
import { usePullRefresh, useSession } from "../src/hooks";
import { useI18n } from "../src/i18n";
import { routeForWebHref } from "../src/links";
import { keys } from "../src/query";
import { colors, shadow } from "../src/theme";
import { GlassFill, Header, MenuArt, PressableScale, Screen, ServiceTile, SkeletonList, ZxIcon } from "../src/ui";
import { Art3D } from "../src/ui/service-icons";
import type { NotificationCategory } from "../src/api/types";

const filters = ["all", "order", "housing", "travel", "payment", "saved_search"] as const;
const centerTitle = { "vi-VN": "Trung tâm thông báo", "en-US": "Notification Center", "zh-CN": "通知中心", "zh-TW": "通知中心" } as const;
const viewLabel = { "vi-VN": "Xem", "en-US": "View", "zh-CN": "查看", "zh-TW": "查看" } as const;
/** 3D art per category, on the same soft halo as the rest of the app (no flat dots). */
function NoticeArt({ category }: { category: NotificationCategory }) {
  if (category === "housing" || category === "travel" || category === "payment") return <ServiceTile code={category} size={44} />;
  if (category === "saved_search") return <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Art3D kind="bookmark" size={34} /></View>;
  return <MenuArt kind="orders" size={44} />;
}

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
            <Header title={centerTitle[locale]} subtitle={`${data?.summary.unread || 0} ${t.notifications.unread}`} right={<HeaderPill icon="sliders" onPress={() => setShowPrefs((v) => !v)} />} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingTop: 2, paddingBottom: 10 }}>
              {filters.map((key) => <CenterChip key={key} label={label(key)} count={key === "all" ? undefined : data?.summary.byCategory?.[key]} active={filter === key} onPress={() => setFilter(key)} />)}
            </ScrollView>
            {data?.summary.unread ? (
              <View style={styles.toolbar}>
                <SoftButton icon="check" label={t.notifications.readAll} onPress={() => readAll.mutate()} />
              </View>
            ) : null}
            {showPrefs && data?.preferences ? (
              <Animated.View entering={FadeInDown.duration(200)} style={styles.prefs}>
                <Text style={styles.prefsTitle}>{t.notifications.preferences}</Text>
                {(["orderEnabled", "housingEnabled", "travelEnabled", "paymentEnabled", "savedSearchEnabled"] as const).map((key) => (
                  <View key={key} style={styles.prefRow}>
                    <Text style={styles.prefLabel}>{label(key.replace("Enabled", "").replace("savedSearch", "saved_search"))}</Text>
                    <Switch value={data.preferences[key] !== false} onValueChange={(value) => prefs.mutate({ [key]: value })} trackColor={{ true: colors.header }} />
                  </View>
                ))}
              </Animated.View>
            ) : null}
          </View>
        }
        ListEmptyComponent={<View style={{ paddingHorizontal: 14 }}>{inbox.isPending ? <SkeletonList count={4} image={false} /> : <CenterEmpty title={t.notifications.empty} />}</View>}
        renderItem={({ item, index }) => {
          const unread = !item.readAt;
          const open = () => { receipt.mutate({ item, patch: { read: true } }); router.push(routeForWebHref(item.href)); };
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 20).duration(200)} exiting={FadeOut} layout={LinearTransition.duration(180)} style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
              <PressableScale scaleTo={0.985} onPress={open} style={[styles.notice, !unread && styles.noticeRead]}>
                <NoticeArt category={item.category} />
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text style={[styles.meta, unread && styles.metaUnread]}>{label(item.category)} · {shortDate(item.createdAt, locale)}</Text>
                  <Text style={[styles.noticeTitle, !unread && { fontWeight: "600" }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.body} numberOfLines={2}>{describe(item)}{item.subtitle ? ` · ${item.subtitle}` : ""}</Text>
                </View>
                {/* Hide: small glass close, separate from opening the card */}
                <PressableScale accessibilityLabel={t.notifications.hide} hitSlop={8} onPress={() => receipt.mutate({ item, patch: { read: true, dismissed: true } })} style={styles.hide}>
                  <GlassFill radius={14} />
                  <ZxIcon name="close" size={12} color={colors.slate} strokeWidth={2.4} />
                </PressableScale>
              </PressableScale>
            </Animated.View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 12 },
  prefs: { marginHorizontal: 14, marginBottom: 12, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.white, ...shadow("card") },
  prefsTitle: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: 4 },
  prefRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  prefLabel: { flex: 1, fontSize: 14, color: colors.ink },
  notice: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingLeft: 12, paddingRight: 14, borderRadius: 22, backgroundColor: colors.white, ...shadow("card") },
  noticeRead: { backgroundColor: "rgba(255,255,255,0.72)" },
  meta: { fontSize: 11.5, color: colors.textMuted, fontWeight: "600" },
  metaUnread: { color: colors.header },
  noticeTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  body: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 17 },
  hide: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
});
