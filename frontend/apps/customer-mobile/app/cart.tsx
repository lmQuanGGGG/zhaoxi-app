import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeOut, LinearTransition, SlideInRight } from "react-native-reanimated";
import { cart, useCart } from "../src/cart";
import { money } from "../src/format";
import { useI18n } from "../src/i18n";
import { colors, font, radius, space } from "../src/theme";
import { AppImage, Button, EmptyState, GlassCard, Header, PressableScale, QuantityStepper, Screen } from "../src/ui";

export default function CartScreen() {
  const { t } = useI18n();
  const { groups, count, total } = useCart();
  return (
    <Screen>
      <Header title={t.cart.title} subtitle={count ? `${count} ${t.common.items} · ${money(total)}` : undefined} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 4, gap: space.lg, paddingBottom: 60 }}>
        {!groups.length ? (
          <EmptyState icon="bag-handle-outline" title={t.cart.empty} body={t.cart.emptyHint} action={t.cart.continue} onAction={() => router.replace("/services/food")} />
        ) : groups.map((group) => (
          <Animated.View key={group.organizationId} layout={LinearTransition.springify().damping(18)} exiting={FadeOut}>
            <GlassCard style={{ gap: 4 }}>
              <View style={styles.groupHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={font.tiny}>{t.cart.restaurant}</Text>
                  <Text style={font.h2} numberOfLines={1}>{group.organizationName || t.cart.restaurant}</Text>
                  <Text style={styles.locked}>{t.cart.locked}</Text>
                </View>
                <PressableScale onPress={() => cart.clearOrganization(group.organizationId)} style={styles.clear}>
                  <Text style={styles.clearText}>{t.cart.clear}</Text>
                </PressableScale>
              </View>
              {group.items.map((item) => (
                <Animated.View key={item.serviceId} entering={SlideInRight.springify().damping(18)} exiting={FadeOut.duration(160)} layout={LinearTransition} style={styles.item}>
                  <AppImage uri={item.imageUrl} fallbackCode="food" style={styles.image} />
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <Text style={font.h3} numberOfLines={2}>{item.name}</Text>
                    <Text style={font.tiny}>{money(item.unitPrice, item.currency)}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <QuantityStepper compact value={item.quantity} onChange={(next) => cart.setQuantity(item.serviceId, next, item.organizationId)} />
                      <Text style={styles.lineTotal}>{money(item.unitPrice * item.quantity, item.currency)}</Text>
                    </View>
                  </View>
                </Animated.View>
              ))}
              <View style={styles.footer}>
                <View>
                  <Text style={font.tiny}>{t.cart.total}</Text>
                  <Text style={[font.h2, { fontSize: 19 }]}>{money(group.total)}</Text>
                </View>
                <Button title={t.cart.checkout} icon="arrow-forward" onPress={() => router.push({ pathname: "/request/[serviceId]", params: { serviceId: group.items[0]!.serviceId, cartOrg: group.organizationId } })} />
              </View>
            </GlassCard>
          </Animated.View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  locked: { alignSelf: "flex-start", marginTop: 6, fontSize: 11, fontWeight: "700", color: colors.brandStrong, backgroundColor: colors.brandSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: "hidden" },
  clear: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.sm, backgroundColor: colors.dangerSoft },
  clearText: { color: colors.danger, fontSize: 11, fontWeight: "800" },
  item: { flexDirection: "row", gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  image: { width: 64, height: 64, borderRadius: 14 },
  lineTotal: { color: colors.price, fontWeight: "900", fontSize: 14 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
