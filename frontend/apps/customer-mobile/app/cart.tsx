import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeOut, LinearTransition, SlideInRight } from "react-native-reanimated";
import { cart, useCart } from "../src/cart";
import { TAB_BAR_SPACE } from "../src/constants";
import { money } from "../src/format";
import { useI18n } from "../src/i18n";
import { colors, shadow } from "../src/theme";
import { AppImage, Button, EmptyState, GlassFill, Header, PressableScale, QuantityStepper, Screen, ZxIcon, haptic } from "../src/ui";

export default function CartScreen() {
  const { t } = useI18n();
  const { groups, count, total } = useCart();
  return (
    <Screen soft>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}>
        <Header title={t.cart.title} onBack={() => (router.canGoBack() ? router.back() : router.navigate("/services/food"))} />
        <View style={{ paddingHorizontal: 14 }}>
        {!groups.length ? (
          <EmptyState zx="orders" title={t.cart.empty} body={t.cart.emptyHint} action={t.cart.continue} onAction={() => router.replace("/services/food")} />
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}><Text style={styles.summaryLabel}>{t.cart.summary}</Text><Text style={styles.summaryValue}>{count} {t.common.items}</Text></View>
              <View style={styles.summaryCard}><Text style={styles.summaryLabel}>{t.cart.total}</Text><Text style={styles.summaryValue}>{money(total)}</Text></View>
            </View>
            <View style={{ gap: 10 }}>
              {groups.map((group) => (
                <Animated.View key={group.organizationId} layout={LinearTransition.duration(180)} exiting={FadeOut}>
                  <View style={[styles.group, shadow("card")]}>
                    <View style={styles.groupHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.small}>{t.cart.restaurant}</Text>
                        <Text style={styles.groupName} numberOfLines={1}>{group.organizationName || t.cart.restaurant}</Text>
                        <View style={styles.locked}><Text style={styles.lockedText}>{t.cart.locked}</Text></View>
                      </View>
                      <PressableScale onPress={() => { haptic.warn(); cart.clearOrganization(group.organizationId); }} style={styles.clear}>
                        <GlassFill radius={999} tint="rgba(239,68,68,0.12)" />
                        <ZxIcon name="trash" size={13} color={colors.dangerText} strokeWidth={2.2} />
                        <Text style={styles.clearText}>{t.cart.clear}</Text>
                      </PressableScale>
                    </View>
                    {group.items.map((item) => (
                      <Animated.View key={item.serviceId} entering={SlideInRight.duration(200)} exiting={FadeOut.duration(160)} layout={LinearTransition.duration(180)} style={styles.item}>
                        <AppImage uri={item.imageUrl} fallbackCode="food" style={styles.image} contentFit="contain" />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                            <PressableScale accessibilityLabel={t.cart.remove} hitSlop={8} onPress={() => cart.remove(item.serviceId, item.organizationId)} style={styles.removeChip}>
                              <GlassFill radius={13} />
                              <ZxIcon name="close" size={12} color={colors.slate} strokeWidth={2.4} />
                            </PressableScale>
                          </View>
                          <Text style={styles.unit}>{money(item.unitPrice, item.currency)}</Text>
                          <View style={styles.itemFooter}>
                            <QuantityStepper glass min={0} value={item.quantity} onChange={(next) => cart.setQuantity(item.serviceId, next, item.organizationId)} />
                            <Text style={styles.lineTotal}>{money(item.unitPrice * item.quantity, item.currency)}</Text>
                          </View>
                        </View>
                      </Animated.View>
                    ))}
                    <View style={styles.footer}>
                      <View>
                        <Text style={styles.small}>{t.cart.total}</Text>
                        <Text style={styles.groupTotal}>{money(group.total)}</Text>
                      </View>
                      <Button small title={t.cart.checkout} onPress={() => router.push({ pathname: "/request/[serviceId]", params: { serviceId: group.items[0]!.serviceId, cartOrg: group.organizationId } })} />
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          </>
        )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  summaryCard: { flex: 1, gap: 4, paddingVertical: 12, paddingHorizontal: 13, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.8)", ...shadow("card") },
  summaryLabel: { fontSize: 12, color: colors.ink },
  summaryValue: { fontSize: 14, fontWeight: "800", color: colors.ink },
  group: { padding: 12, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.9)", ...shadow("card") },
  groupHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 8, paddingBottom: 10 },
  small: { fontSize: 10, color: colors.slate },
  groupName: { fontSize: 16, fontWeight: "700", color: colors.text, marginVertical: 3 },
  locked: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.brandSoft },
  lockedText: { fontSize: 11, fontWeight: "600", color: "#059669" },
  clear: { flexDirection: "row", alignItems: "center", gap: 5, height: 30, paddingHorizontal: 11, borderRadius: 999 },
  clearText: { fontSize: 11.5, fontWeight: "700", color: colors.dangerText },
  item: { flexDirection: "row", gap: 9, paddingVertical: 8, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#EDF2EF" },
  image: { width: 52, height: 52, borderRadius: 12 },
  itemName: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.ink },
  removeChip: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  unit: { fontSize: 11, color: colors.slate, marginTop: 3 },
  itemFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7 },
  lineTotal: { fontSize: 12, fontWeight: "800", color: "#EF5A3C" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4, paddingTop: 10, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#EDF2EF" },
  groupTotal: { fontSize: 17, fontWeight: "800", color: "#5B6B66", marginTop: 2 },
});
