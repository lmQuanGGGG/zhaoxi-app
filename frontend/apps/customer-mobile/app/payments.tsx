import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { getPayments } from "../src/api/endpoints";
import { money, shortDate, str } from "../src/format";
import { useSession } from "../src/hooks";
import { useI18n } from "../src/i18n";
import { paymentMethodLabels, paymentStatusLabels } from "../src/order-copy";
import { keys } from "../src/query";
import { colors, font, radius, space } from "../src/theme";
import { EmptyState, Header, Ionicons, PressableScale, Screen, SkeletonList, StatusPill } from "../src/ui";

export default function PaymentsScreen() {
  const { t, locale } = useI18n();
  const { userId } = useSession();
  const payments = useQuery({ queryKey: keys.payments(userId), queryFn: () => getPayments(), enabled: Boolean(userId) });
  return (
    <Screen>
      <Header title={t.payments.title} />
      <FlashList
        data={payments.data || []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={payments.isRefetching} onRefresh={() => void payments.refetch()} tintColor={colors.brand} />}
        contentContainerStyle={{ paddingBottom: 48 }}
        ListEmptyComponent={<View style={{ paddingHorizontal: space.lg }}>{payments.isPending ? <SkeletonList count={4} image={false} /> : <EmptyState icon="card-outline" title={t.payments.empty} body={t.payments.hint} />}</View>}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: space.lg, paddingBottom: 10 }}>
            <PressableScale disabled={!item.requestId} onPress={() => item.requestId && router.push(`/order/${item.requestId}`)} style={styles.row} scaleTo={0.98}>
              <View style={styles.icon}><Ionicons name={item.method === "bank_transfer" ? "qr-code" : "cash"} size={20} color={colors.brandStrong} /></View>
              <View style={{ flex: 1 }}>
                <Text style={font.h3}>{paymentMethodLabels[locale][str(item.method)] || str(item.method)}</Text>
                <Text style={font.tiny}>{item.requestCode || ""} {shortDate(item.createdAt, locale)}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={{ fontWeight: "900", color: colors.text }}>{money(item.amount, item.currency)}</Text>
                <StatusPill tone={item.status === "paid" ? "brand" : item.status === "failed" ? "danger" : "warning"} label={paymentStatusLabels[locale][item.status] || item.status} />
              </View>
            </PressableScale>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder },
  icon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
});
