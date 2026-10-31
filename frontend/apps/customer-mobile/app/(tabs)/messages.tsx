import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getThreads } from "../../src/api/endpoints";
import type { ThreadKind } from "../../src/api/types";
import { CenterChip, CenterEmpty, SoftButton, TextLink } from "../../src/components/center";
import { TAB_BAR_SPACE } from "../../src/constants";
import { relativeTime } from "../../src/format";
import { usePullRefresh, useSession } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { colors, shadow } from "../../src/theme";
import { Art3D, Badge, Header, PressableScale, Screen, SkeletonList } from "../../src/ui";

const copy = {
  "vi-VN": { title: "Trung tâm tin nhắn", search: "Trung tâm tin nhắn…", assistant: "Trợ lý ZhaoXi", assistantHint: "Tư vấn dịch vụ và hỗ trợ tức thời", empty: "Chưa có hội thoại", help: "Trung tâm trợ giúp", create: "Tạo hội thoại hỗ trợ", notify: "Trung tâm thông báo", payment: "Hỗ trợ thanh toán", support: "Hỗ trợ ZhaoXi" },
  "en-US": { title: "Message Center", search: "Message Center…", assistant: "ZhaoXi Assistant", assistantHint: "Service advice and instant support", empty: "No conversations yet", help: "Help center", create: "Start a support chat", notify: "Notification Center", payment: "Payment support", support: "ZhaoXi Support" },
  "zh-CN": { title: "消息中心", search: "消息中心…", assistant: "赵喜助手", assistantHint: "服务咨询与即时支持", empty: "暂无会话", help: "帮助中心", create: "创建客服会话", notify: "通知中心", payment: "支付支持", support: "赵喜客服" },
  "zh-TW": { title: "消息中心", search: "消息中心…", assistant: "趙喜助手", assistantHint: "服務諮詢與即時支援", empty: "暫無對話", help: "幫助中心", create: "建立客服對話", notify: "通知中心", payment: "支付支援", support: "趙喜客服" },
} as const;

const tabs: Array<"all" | ThreadKind> = ["all", "housing", "travel", "payment", "support"];

export default function MessagesScreen() {
  const { t, locale } = useI18n();
  const c = copy[locale];
  const { userId } = useSession();
  const [filter, setFilter] = useState<"all" | ThreadKind>("all");
  const [query, setQuery] = useState("");
  const threads = useQuery({ queryKey: keys.threads(locale, userId), queryFn: () => getThreads(locale), enabled: Boolean(userId), refetchInterval: 20_000 });
  const pull = usePullRefresh(threads.refetch);
  const label = (kind: "all" | ThreadKind) => (kind === "all" ? t.notifications.all : kind === "payment" ? c.payment : kind === "support" ? c.support : t.messages[kind]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (threads.data?.threads || []).filter((x) => (filter === "all" || x.kind === filter) && (!needle || `${x.title} ${x.lastMessage}`.toLowerCase().includes(needle)));
  }, [threads.data, filter, query]);

  return (
    <Screen tab>
      <FlashList
        data={visible}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={colors.brand} />}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
        ListHeaderComponent={
          <View>
            <Header back={false} title={c.title} subtitle={`${threads.data?.summary.unread || 0} ${t.notifications.unread}`} right={<TextLink label={c.notify} onPress={() => router.push("/notifications")} />} />
            <View style={{ paddingHorizontal: 14, gap: 10, paddingTop: 4 }}>
              <PressableScale onPress={() => router.push("/support")} style={[styles.assistant, shadow("card")]}>
                <LinearGradient colors={["#FFFFFF", colors.brandSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
                <View style={styles.assistantIcon}><Text style={styles.assistantGlyph}>喜</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assistantTitle}>{c.assistant}</Text>
                  <Text style={styles.assistantHint}>{c.assistantHint}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </PressableScale>
              <View style={styles.search}>
                <Art3D kind="search" size={16} />
                <TextInput value={query} onChangeText={setQuery} placeholder={c.search} placeholderTextColor="#94A3B8" style={styles.searchInput} />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingVertical: 10 }}>
              {tabs.map((key) => <CenterChip key={key} label={label(key)} active={filter === key} onPress={() => setFilter(key)} />)}
            </ScrollView>
            <View style={styles.toolbar}>
              <TextLink label={c.help} onPress={() => router.push("/help")} />
              <SoftButton dark label={c.create} onPress={() => router.push("/support")} />
            </View>
          </View>
        }
        ListEmptyComponent={<View style={{ paddingHorizontal: 14 }}>{threads.isPending ? <SkeletonList count={4} image={false} /> : <CenterEmpty title={c.empty} />}</View>}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 30)} style={{ paddingHorizontal: 14, paddingBottom: 7 }}>
            <PressableScale scaleTo={0.985} onPress={() => router.push(`/chat/${encodeURIComponent(item.id)}`)} style={[styles.thread, shadow("card")]}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={styles.meta}>{label(item.kind)}{item.subtitle ? ` · ${item.subtitle}` : ""} · {item.lastMessageAt ? relativeTime(item.lastMessageAt, locale) : ""}</Text>
                <Text style={styles.threadTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.meta, item.unreadCount > 0 && { color: colors.text, fontWeight: "700" }]} numberOfLines={1}>{item.lastMessage}</Text>
              </View>
              <Badge value={item.unreadCount} />
            </PressableScale>
          </Animated.View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  assistant: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  assistantIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#DDEFE6", alignItems: "center", justifyContent: "center" },
  assistantGlyph: { fontSize: 17, fontWeight: "800", color: colors.brandDeep },
  assistantTitle: { fontSize: 14, color: colors.text },
  assistantHint: { fontSize: 10.5, color: colors.textSecondary, marginTop: 1 },
  chevron: { fontSize: 20, color: colors.text },
  search: { flexDirection: "row", alignItems: "center", gap: 8, height: 46, paddingHorizontal: 12, borderRadius: 14, backgroundColor: "#F1F4F2" },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, backgroundColor: "#F8FAF9", borderRadius: 6, paddingHorizontal: 6, height: 32 },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 12 },
  thread: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.white, ...shadow("card") },
  meta: { fontSize: 11, color: colors.textSecondary },
  threadTitle: { fontSize: 13.5, fontWeight: "700", color: colors.text },
});
