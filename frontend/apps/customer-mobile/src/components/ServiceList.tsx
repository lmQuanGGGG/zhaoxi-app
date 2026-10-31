import { FlashList } from "@shopify/flash-list";
import { useQueryClient } from "@tanstack/react-query";
import { localizeServiceName } from "@zhaoxi/i18n";
import { router } from "expo-router";
import { useMemo, type ReactNode } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import type { FavoriteItem, ServiceDetail } from "../api/types";
import { imageUri, money } from "../format";
import { useI18n } from "../i18n";
import { keys } from "../query";
import { colors, shadow } from "../theme";
import { AppImage, EmptyState, PressableScale, SkeletonList, type ZxIconName } from "../ui";

/** Shared list for favorites / history, styled like the PWA `genericServiceCard`. */
export function ServiceList({ items, loading, refreshing, onRefresh, emptyTitle, emptyIcon, renderAction }: { items: FavoriteItem[]; loading: boolean; refreshing: boolean; onRefresh: () => void; emptyTitle: string; emptyIcon: ZxIconName; renderAction?: (item: FavoriteItem) => ReactNode }) {
  const { t, locale } = useI18n();
  const client = useQueryClient();
  // The history API only returns `moduleId`; the detail the customer opened is usually cached and knows the module.
  const moduleOf = (item: FavoriteItem) => item.moduleCode || client.getQueryData<ServiceDetail>(keys.service(item.id, locale))?.moduleCode;
  // History can list the same service several times (one row per view); keep the latest.
  const unique = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)));
  }, [items]);
  return (
    <FlashList
      data={unique}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      contentContainerStyle={{ paddingBottom: 120 }}
      ListEmptyComponent={<View style={{ paddingHorizontal: 14 }}>{loading ? <SkeletonList count={5} /> : <EmptyState zx={emptyIcon} title={emptyTitle} action={t.orders.explore} onAction={() => router.push("/services")} />}</View>}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 35)} exiting={FadeOut} layout={LinearTransition} style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          <PressableScale onPress={() => router.push(`/service/${item.id}`)} scaleTo={0.985} style={[styles.row, shadow("card")]}>
            <AppImage uri={imageUri(item.metadata?.imageUrl)} fallbackCode={moduleOf(item)} style={styles.image} />
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={styles.title} numberOfLines={2}>{localizeServiceName(locale, item.name || item.code)}</Text>
              {item.summary ? <Text style={styles.summary} numberOfLines={1}>{item.summary}</Text> : null}
              {Number(item.priceFrom || 0) > 0 ? <Text style={styles.price}>{money(item.priceFrom, item.currency)}</Text> : null}
            </View>
            {renderAction ? renderAction(item) : <Text style={styles.chevron}>›</Text>}
          </PressableScale>
        </Animated.View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft },
  image: { width: 64, height: 64, borderRadius: 16 },
  title: { fontSize: 15, fontWeight: "700", color: colors.ink },
  summary: { fontSize: 12, color: colors.slate },
  price: { fontSize: 14, fontWeight: "700", color: colors.priceRose },
  chevron: { fontSize: 20, color: "#94A3B8" },
});
