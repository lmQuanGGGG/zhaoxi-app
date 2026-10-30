import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getThreads } from "../../src/api/endpoints";
import type { ThreadKind } from "../../src/api/types";
import { TAB_BAR_SPACE } from "../../src/constants";
import { relativeTime } from "../../src/format";
import { useSession } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { colors, font, radius, space } from "../../src/theme";
import { Badge, Button, EmptyState, Header, IconButton, Ionicons, PressableScale, Screen, SkeletonList, type IconName } from "../../src/ui";

const kindIcon: Record<ThreadKind, [IconName, string]> = { support: ["headset", colors.brand], housing: ["home", "#4788C7"], travel: ["airplane", "#3885B8"], payment: ["card", "#B88925"] };

export default function MessagesScreen() {
  const { t, locale } = useI18n();
  const { userId } = useSession();
  const threads = useQuery({ queryKey: keys.threads(locale, userId), queryFn: () => getThreads(locale), enabled: Boolean(userId), refetchInterval: 20_000 });
  const kindLabel = (kind: ThreadKind) => (kind === "support" ? t.messages.support : t.messages[kind]);
  return (
    <Screen>
      <Header title={t.messages.title} back={false} right={<IconButton icon="create-outline" label={t.messages.newSupport} onPress={() => router.push("/support")} />} />
      <FlashList
        data={threads.data?.threads || []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={threads.isRefetching} onRefresh={() => void threads.refetch()} tintColor={colors.brand} />}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: space.lg }}>
            {threads.isPending ? <SkeletonList count={5} /> : <EmptyState icon="chatbubbles-outline" title={t.messages.empty} body={t.messages.emptyHint} action={t.messages.newSupport} onAction={() => router.push("/support")} />}
          </View>
        }
        ListFooterComponent={threads.data?.threads.length ? <View style={{ padding: space.lg }}><Button variant="secondary" icon="headset" title={t.messages.newSupport} onPress={() => router.push("/support")} /></View> : null}
        renderItem={({ item, index }) => {
          const [icon, tint] = kindIcon[item.kind] || kindIcon.support;
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 35)} style={{ paddingHorizontal: space.lg, paddingBottom: 10 }}>
              <PressableScale scaleTo={0.98} onPress={() => router.push(`/chat/${encodeURIComponent(item.id)}`)} style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: `${tint}1F` }]}><Ionicons name={icon} size={22} color={tint} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[font.h3, { flex: 1 }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={font.tiny}>{item.lastMessageAt ? relativeTime(item.lastMessageAt, locale) : ""}</Text>
                  </View>
                  <Text style={[font.tiny, { color: tint, fontWeight: "700" }]} numberOfLines={1}>{kindLabel(item.kind)}{item.subtitle ? ` · ${item.subtitle}` : ""}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <Text style={[font.small, { flex: 1 }, item.unreadCount > 0 && { color: colors.text, fontWeight: "700" }]} numberOfLines={1}>{item.lastMessage}</Text>
                    <Badge value={item.unreadCount} />
                  </View>
                </View>
              </PressableScale>
            </Animated.View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder },
  avatar: { width: 50, height: 50, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
