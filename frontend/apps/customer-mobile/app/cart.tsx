import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeOut, LinearTransition, SlideInRight } from "react-native-reanimated";
import { cart, useCart } from "../src/cart";
import { TAB_BAR_SPACE } from "../src/constants";
import { money } from "../src/format";
import { useI18n } from "../src/i18n";
import { colors, shadow } from "../src/theme";
import { AppImage, BackButton, EmptyState, PressableScale, Screen, haptic } from "../src/ui";

export default function CartScreen() {
  const { t } = useI18n();
  const { groups, count, total } = useCart();
  return (
    <Screen soft>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: TAB_BAR_SPACE }}>
        <View style={styles.header}>
          <BackButton style={{ backgroundColor: colors.white }} onPress={() => (router.canGoBack() ? router.back() : router.navigate("/services/food"))} />
          <View>
            <Text style={styles.eyebrow}>ZHAOXI</Text>
            <Text style={styles.title}>{t.cart.title}</Text>
          </View>
        </View>
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
                <Animated.View key={group.organizationId} layout={LinearTransition.springify().damping(18)} exiting={FadeOut}>
                  <View style={[styles.group, shadow("card")]}>
                    <View style={styles.groupHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.small}>{t.cart.restaurant}</Text>
                        <Text style={styles.groupName} numberOfLines={1}>{group.organizationName || t.cart.restaurant}</Text>
                        <View style={styles.locked}><Text style={styles.lockedText}>{t.cart.locked}</Text></View>
                      </View>
                      <PressableScale onPress={() => { haptic.warn(); cart.clearOrganization(group.organizationId); }} style={styles.clear}><Text style={styles.clearText}>{t.cart.clear}</Text></PressableScale>
                    </View>
                    {group.items.map((item) => (
                      <Animated.View key={item.serviceId} entering={SlideInRight.springify().damping(18)} exiting={FadeOut.duration(160)} layout={LinearTransition} style={styles.item}>
                        <AppImage uri={item.imageUrl} fallbackCode="food" style={styles.image} contentFit="contain" />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                            <Pressable hitSlop={8} onPress={() => cart.remove(item.serviceId, item.organizationId)} style={styles.removeChip}><Text style={styles.remove}>{t.cart.remove}</Text></Pressable>
                          </View>
                          <Text style={styles.unit}>{money(item.unitPrice, item.currency)}</Text>
                          <View style={styles.itemFooter}>
                            <View style={styles.stepper}>
                              <PressableScale onPress={() => { haptic.select(); cart.setQuantity(item.serviceId, item.quantity - 1, item.organizationId); }} hapticOnPress={false} style={styles.qty}><Text style={styles.qtyText}>−</Text></PressableScale>
                              <Text style={styles.qtyValue}>{item.quantity}</Text>
                              <PressableScale onPress={() => { haptic.select(); cart.setQuantity(item.serviceId, item.quantity + 1, item.organizationId); }} hapticOnPress={false} style={styles.qty}><Text style={styles.qtyText}>+</Text></PressableScale>
                            </View>
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
                      <PressableScale onPress={() => router.push({ pathname: "/request/[serviceId]", params: { serviceId: group.items[0]!.serviceId, cartOrg: group.organizationId } })} style={styles.checkout}>
                        <Text style={styles.checkoutText}>{t.cart.checkout}</Text>
                      </PressableScale>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const pressShadow = { shadowColor: "#71371B", shadowOpacity: 0.16, shadowRadius: 0, shadowOffset: { width: 0, height: 4 } } as const;

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, marginTop: 6 },
  eyebrow: { fontSize: 10, fontWeight: "900", color: "#07A856" },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, marginTop: 2 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  summaryCard: { flex: 1, gap: 4, paddingVertical: 12, paddingHorizontal: 13, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.8)", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  summaryLabel: { fontSize: 12, color: colors.ink },
  summaryValue: { fontSize: 14, fontWeight: "800", color: colors.ink },
  group: { padding: 12, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(255,255,255,0.94)" },
  groupHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 8, paddingBottom: 10 },
  small: { fontSize: 10, color: colors.slate },
  groupName: { fontSize: 16, fontWeight: "700", color: colors.text, marginVertical: 3 },
  locked: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.brandSoft },
  lockedText: { fontSize: 11, fontWeight: "600", color: "#059669" },
  clear: { paddingHorizontal: 8, paddingVertical: 7, borderRadius: 10, backgroundColor: "#FFF1F2", ...pressShadow },
  clearText: { fontSize: 9, fontWeight: "800", color: colors.dangerText },
  item: { flexDirection: "row", gap: 9, paddingVertical: 8, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#EDF2EF" },
  image: { width: 52, height: 52, borderRadius: 12 },
  itemName: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.ink },
  removeChip: { paddingHorizontal: 4, ...pressShadow, backgroundColor: colors.white },
  remove: { fontSize: 9, fontWeight: "800", color: colors.dangerText },
  unit: { fontSize: 11, color: colors.slate, marginTop: 3 },
  itemFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  qty: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: "#CFE8DA", backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", ...pressShadow },
  qtyText: { fontSize: 17, fontWeight: "900", color: "#078646", marginTop: -2 },
  qtyValue: { minWidth: 20, textAlign: "center", fontWeight: "700", color: colors.ink },
  lineTotal: { fontSize: 12, fontWeight: "800", color: "#EF5A3C" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4, paddingTop: 10, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#EDF2EF" },
  groupTotal: { fontSize: 17, fontWeight: "800", color: "#5B6B66", marginTop: 2 },
  checkout: { paddingHorizontal: 14, height: 38, borderRadius: 13, backgroundColor: colors.wechat, alignItems: "center", justifyContent: "center", ...pressShadow },
  checkoutText: { color: colors.white, fontSize: 12, fontWeight: "800" },
});
