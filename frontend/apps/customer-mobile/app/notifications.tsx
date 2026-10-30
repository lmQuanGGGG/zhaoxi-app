import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { statusLabels } from "@zhaoxi/i18n";
import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { getNotifications, markAllNotificationsRead, markNotification, updateNotificationPreferences } from "../src/api/endpoints";
import type { NotificationCategory, NotificationInbox, NotificationItem, NotificationPreferences } from "../src/api/types";
import { relativeTime } from "../src/format";
import { useSession } from "../src/hooks";
import { useI18n } from "../src/i18n";
import { routeForWebHref } from "../src/links";
import { keys } from "../src/query";
import { colors, font, radius, space } from "../src/theme";
import { Chip, EmptyState, GlassCard, Header, IconButton, Ionicons, PressableScale, Screen, SkeletonList, type IconName } from "../src/ui";

const filters = ["all", "order", "housing", "travel", "payment", "saved_search"] as const;
const icons: Record<NotificationCategory, IconName> = { order: "receipt", housing: "home", travel: "airplane", payment: "card", saved_search: "bookmark" };

export default function NotificationsScreen() {
  const { t, locale } = useI18n();
  const { userId } = useSession();
  const client = useQueryClient();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [showPrefs, setShowPrefs] = useState(false);
  const queryKey = keys.notifications(locale, filter, userId);
  const inbox = useQuery({ queryKey, queryFn: () => getNotifications(locale, filter), enabled: Boolean(userId) });

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
    if (code.startsWith("STATUS:") || !code.includes("_")) return statusLabels[locale][item.status || ""] || item.status || "";
    return statusLabels[locale][item.status || ""] || code.replace(/_/g, " ").toLowerCase();
  };

  const data = inbox.data;
  return (
    <Screen>
      <Header title={t.notifications.title} subtitle={`${data?.summary.unread || 0} ${t.notifications.unread}`} right={<>
        <IconButton icon="checkmark-done" label={t.notifications.readAll} onPress={() => readAll.mutate()} />
        <IconButton icon="options-outline" label={t.notifications.preferences} onPress={() => setShowPrefs((v) => !v)} />
      </>} />
      <FlashList
        data={data?.items || []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={inbox.isRefetching} onRefresh={() => void inbox.refetch()} tintColor={colors.brand} />}
        contentContainerStyle={{ paddingBottom: 48 }}
        ListHeaderComponent={
          <View style={{ gap: 12, paddingBottom: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.lg }}>
              {filters.map((key) => <Chip key={key} label={label(key)} count={key === "all" ? undefined : data?.summary.byCategory?.[key]} active={filter === key} onPress={() => setFilter(key)} />)}
            </ScrollView>
            {showPrefs && data?.preferences ? (
              <Animated.View entering={FadeInDown} style={{ paddingHorizontal: space.lg }}>
                <GlassCard style={{ gap: 4 }}>
                  <Text style={[font.h3, { marginBottom: 6 }]}>{t.notifications.preferences}</Text>
                  {(["orderEnabled", "housingEnabled", "travelEnabled", "paymentEnabled", "savedSearchEnabled"] as const).map((key) => (
                    <View key={key} style={styles.prefRow}>
                      <Text style={[font.body, { flex: 1 }]}>{label(key.replace("Enabled", "").replace("savedSearch", "saved_search"))}</Text>
                      <Switch value={data.preferences[key] !== false} onValueChange={(value) => prefs.mutate({ [key]: value })} trackColor={{ true: colors.brand }} />
                    </View>
                  ))}
                </GlassCard>
              </Animated.View>
            ) : null}
          </View>
        }
        ListEmptyComponent={<View style={{ paddingHorizontal: space.lg }}>{inbox.isPending ? <SkeletonList count={5} /> : <EmptyState icon="notifications-off-outline" title={t.notifications.empty} action={t.orders.explore} onAction={() => router.push("/services")} />}</View>}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 35)} exiting={FadeOut} layout={LinearTransition} style={{ paddingHorizontal: space.lg, paddingBottom: 10 }}>
            <PressableScale scaleTo={0.98} onPress={() => { receipt.mutate({ item, patch: { read: true } }); router.push(routeForWebHref(item.href)); }} onLongPress={() => receipt.mutate({ item, patch: { read: true, dismissed: true } })} style={[styles.card, !item.readAt && styles.unread]}>
              <View style={[styles.icon, !item.readAt && { backgroundColor: colors.brand }]}><Ionicons name={icons[item.category] || "notifications"} size={18} color={item.readAt ? colors.textSecondary : colors.white} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={font.tiny}>{label(item.category)} · {relativeTime(item.createdAt, locale)}</Text>
                <Text style={[font.h3, { marginTop: 2 }]} numberOfLines={1}>{item.title}</Text>
                <Text style={font.small} numberOfLines={2}>{describe(item)}{item.subtitle ? ` · ${item.subtitle}` : ""}</Text>
              </View>
              <PressableScale hitSlop={10} onPress={() => receipt.mutate({ item, patch: { read: true, dismissed: true } })} style={{ padding: 4 }}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </PressableScale>
            </PressableScale>
          </Animated.View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  prefRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder },
  unread: { backgroundColor: colors.white, borderColor: colors.brandSoft },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#EEF2F1", alignItems: "center", justifyContent: "center" },
});
