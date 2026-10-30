import { localizeOrganizationName, localizeServiceName } from "@zhaoxi/i18n";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { FoodPrice, Service } from "../api/types";
import { cart, useCart } from "../cart";
import { imageUri, money, num, str } from "../format";
import { useI18n } from "../i18n";
import { colors, font, radius, shadow } from "../theme";
import { AppImage, haptic, Ionicons, PressableScale, QuantityStepper } from "../ui";
import { toast } from "../ui/toast";

export function itemImage(item: Service) {
  return imageUri(item.metadata?.imageUrl);
}

/** One dish row with Grab-style quick add / inline stepper bound to the cart. */
export function MenuItemRow({ item, price, restaurantOpen, compact }: { item: Service; price?: FoodPrice; restaurantOpen: boolean; compact?: boolean }) {
  const { t, locale } = useI18n();
  const { quantityOf } = useCart();
  const quantity = quantityOf(item.id);
  const unitPrice = num(price?.effectiveUnitPrice ?? item.priceFrom);
  const basePrice = num(price?.baseUnitPrice ?? item.priceFrom);
  const available = item.metadata?.isAvailable !== false && restaurantOpen && price?.scheduledAvailable !== false;
  const name = localizeServiceName(locale, item.name || item.code);
  const organizationName = localizeOrganizationName(locale, item.organizationCode, item.organizationName, item.organizationMetadata);

  const add = () => {
    cart.add({ serviceId: item.id, organizationId: item.organizationId, organizationName, name, imageUrl: itemImage(item), unitPrice, currency: item.currency || "VND", quantity: 1 });
    haptic.success();
    if (!quantity) toast(`${t.browse.added} · ${name}`);
  };

  return (
    <PressableScale disabled={!available} onPress={() => router.push(`/service/${item.id}`)} scaleTo={0.985} style={[styles.row, !available && { opacity: 0.55 }]}>
      <AppImage uri={itemImage(item)} fallbackCode="food" style={compact ? styles.imageCompact : styles.image} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={font.h3} numberOfLines={2}>{name}</Text>
        {item.summary ? <Text style={font.tiny} numberOfLines={2}>{item.summary}</Text> : null}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{unitPrice ? money(unitPrice, item.currency) : ""}</Text>
          {price?.promoActive ? <Text style={styles.strike}>{money(basePrice, item.currency)}</Text> : null}
        </View>
        {price?.promoActive ? <View style={styles.promo}><Text style={styles.promoText}>{price.promotionLabel || t.browse.promo}</Text></View> : null}
        {!available ? <Text style={styles.soldOut}>{!restaurantOpen ? t.browse.closed : price?.scheduledAvailable === false ? t.browse.scheduledOff : t.browse.soldOut}</Text> : null}
      </View>
      {available ? (
        quantity > 0 ? (
          <QuantityStepper compact value={quantity} onChange={(next) => cart.setQuantity(item.id, next, item.organizationId)} />
        ) : (
          <PressableScale onPress={add} hapticOnPress={false} style={styles.add}>
            <Ionicons name="add" size={22} color={colors.white} />
          </PressableScale>
        )
      ) : null}
    </PressableScale>
  );
}

/** Floating cart summary for a restaurant; slides in when it has items. */
export function RestaurantCartBar({ organizationId }: { organizationId?: string }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { groups, count, total } = useCart();
  const group = organizationId ? groups.find((g) => g.organizationId === organizationId) : undefined;
  const shownCount = organizationId ? group?.count || 0 : count;
  const shownTotal = organizationId ? group?.total || 0 : total;
  if (!shownCount) return null;
  const onPress = () => {
    if (group && group.items[0]) router.push({ pathname: "/request/[serviceId]", params: { serviceId: group.items[0].serviceId, cartOrg: group.organizationId } });
    else router.push("/cart");
  };
  return (
    <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(180)} style={[styles.cartBarWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <PressableScale onPress={onPress} style={[styles.cartBar, shadow(3)]} scaleTo={0.98}>
        <View style={styles.cartIcon}>
          <Ionicons name="bag-handle" size={20} color={colors.brandStrong} />
          <View style={styles.cartCount}><Text style={styles.cartCountText}>{shownCount}</Text></View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" }}>{group ? t.cart.checkout : t.cart.view}</Text>
          <Text style={{ color: colors.white, fontSize: 17, fontWeight: "900" }}>{money(shownTotal)}</Text>
        </View>
        <Ionicons name="arrow-forward-circle" size={30} color={colors.white} />
      </PressableScale>
    </Animated.View>
  );
}

export function RestaurantHeroCard({ item, statusLabel, open, onPress, index = 0 }: { item: Service; statusLabel: string; open: boolean; onPress: () => void; index?: number }) {
  const { locale } = useI18n();
  const meta = item.organizationMetadata || {};
  const banners = (Array.isArray(meta.bannerUrls) ? meta.bannerUrls : []) as string[];
  const logo = imageUri(meta.logoUrl);
  const cover = imageUri(banners[0]) || logo || itemImage(item);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 50).duration(320)}>
      <PressableScale onPress={onPress} scaleTo={0.985} style={[styles.hero, shadow(2), !open && { opacity: 0.75 }]}>
        <AppImage uri={cover} fallbackCode="food" style={styles.heroImage} />
        <View style={styles.heroBody}>
          {logo ? <AppImage uri={logo} style={styles.logo} /> : <View style={[styles.logo, styles.logoFallback]}><Text style={{ color: colors.white, fontWeight: "900", fontSize: 18 }}>喜</Text></View>}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={font.h2} numberOfLines={1}>{localizeOrganizationName(locale, item.organizationCode, item.organizationName, item.organizationMetadata)}</Text>
            <Text style={font.tiny} numberOfLines={1}>{str(item.organizationAddress)}</Text>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 6, alignItems: "center" }}>
              <View style={[styles.status, { backgroundColor: open ? colors.brandSoft : colors.dangerSoft }]}>
                <View style={[styles.statusDot, { backgroundColor: open ? colors.brand : colors.danger }]} />
                <Text style={[styles.statusText, { color: open ? colors.brandStrong : colors.danger }]} numberOfLines={1}>{statusLabel}</Text>
              </View>
              {item.distanceKm != null ? <Text style={styles.distance}>⌖ {item.distanceKm.toFixed(1)} km</Text> : null}
            </View>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  image: { width: 86, height: 86, borderRadius: radius.md },
  imageCompact: { width: 64, height: 64, borderRadius: 12 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  price: { color: colors.price, fontWeight: "900", fontSize: 15 },
  strike: { color: colors.textMuted, textDecorationLine: "line-through", fontSize: 12 },
  promo: { alignSelf: "flex-start", backgroundColor: "#FFF3E8", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  promoText: { color: "#C2410C", fontSize: 10, fontWeight: "800" },
  soldOut: { color: colors.danger, fontWeight: "800", fontSize: 12 },
  add: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", ...shadow(1) },
  cartBarWrap: { position: "absolute", left: 16, right: 16, bottom: 0 },
  cartBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 22, backgroundColor: colors.brandStrong },
  cartIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  cartCount: { position: "absolute", top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.price, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 2, borderColor: colors.brandStrong },
  cartCountText: { color: colors.white, fontSize: 10, fontWeight: "900" },
  hero: { borderRadius: radius.xl, backgroundColor: colors.white, overflow: "hidden" },
  heroImage: { width: "100%", height: 140 },
  heroBody: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  logo: { width: 52, height: 52, borderRadius: 16, borderWidth: 2, borderColor: colors.white, marginTop: -38, backgroundColor: colors.white },
  logoFallback: { backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  status: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, flexShrink: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "800" },
  distance: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
});
