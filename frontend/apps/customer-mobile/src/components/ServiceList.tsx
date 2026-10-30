import { FlashList } from "@shopify/flash-list";
import { localizeServiceName } from "@zhaoxi/i18n";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import type { FavoriteItem } from "../api/types";
import { imageUri, money } from "../format";
import { useI18n } from "../i18n";
import { colors, font, radius, space } from "../theme";
import { AppImage, EmptyState, Ionicons, PressableScale, SkeletonList, type IconName } from "../ui";

/** Shared list for favorites / history. */
export function ServiceList({ items, loading, refreshing, onRefresh, emptyTitle, emptyIcon, renderAction }: { items: FavoriteItem[]; loading: boolean; refreshing: boolean; onRefresh: () => void; emptyTitle: string; emptyIcon: IconName; renderAction?: (item: FavoriteItem) => ReactNode }) {
  const { t, locale } = useI18n();
  return (
    <FlashList
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      contentContainerStyle={{ paddingBottom: 48 }}
      ListEmptyComponent={<View style={{ paddingHorizontal: space.lg }}>{loading ? <SkeletonList count={5} /> : <EmptyState icon={emptyIcon} title={emptyTitle} action={t.orders.explore} onAction={() => router.push("/services")} />}</View>}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 35)} exiting={FadeOut} layout={LinearTransition} style={{ paddingHorizontal: space.lg, paddingBottom: 10 }}>
          <PressableScale onPress={() => router.push(`/service/${item.id}`)} scaleTo={0.98} style={styles.row}>
            <AppImage uri={imageUri(item.metadata?.imageUrl)} fallbackCode={item.moduleCode} style={styles.image} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={font.h3} numberOfLines={2}>{localizeServiceName(locale, item.name || item.code)}</Text>
              {item.summary ? <Text style={font.tiny} numberOfLines={1}>{item.summary}</Text> : null}
              {Number(item.priceFrom || 0) > 0 ? <Text style={styles.price}>{money(item.priceFrom, item.currency)}</Text> : null}
            </View>
            {renderAction ? renderAction(item) : <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
          </PressableScale>
        </Animated.View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder },
  image: { width: 62, height: 62, borderRadius: 14 },
  price: { color: colors.price, fontWeight: "800", fontSize: 13, marginTop: 2 },
});
