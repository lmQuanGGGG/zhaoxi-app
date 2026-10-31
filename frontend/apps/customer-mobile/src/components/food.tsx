import { localizeOrganizationName, localizeServiceName } from "@zhaoxi/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { FoodPrice, RestaurantStatus, Service } from "../api/types";
import { cart, useCart } from "../cart";
import { imageUri, money, num, str } from "../format";
import { useI18n } from "../i18n";
import { colors, shadow } from "../theme";
import { AppImage, PressableScale, QuantityStepper, haptic } from "../ui";
import { CartIcon } from "../ui/icons";
import { toast } from "../ui/toast";

export function itemImage(item: Service) {
  return imageUri(item.metadata?.imageUrl);
}

/** PWA `menuItem` card: image + name + price, stepper, "Thêm vào giỏ", "Chi tiết ›". */
export function MenuCard({ item, price, restaurantOpen }: { item: Service; price?: FoodPrice; restaurantOpen: boolean }) {
  const { t, locale } = useI18n();
  const [quantity, setQuantity] = useState(0);
  const unitPrice = num(price?.effectiveUnitPrice ?? item.priceFrom);
  const basePrice = num(price?.baseUnitPrice ?? item.priceFrom);
  const available = item.metadata?.isAvailable !== false && restaurantOpen && price?.scheduledAvailable !== false;
  const name = localizeServiceName(locale, item.name || item.code);
  const organizationName = localizeOrganizationName(locale, item.organizationCode, item.organizationName, item.organizationMetadata);

  const add = () => {
    if (!quantity) return;
    cart.add({ serviceId: item.id, organizationId: item.organizationId, organizationName, name, imageUrl: itemImage(item), unitPrice, currency: item.currency || "VND", quantity });
    haptic.success();
    toast(`${t.browse.added} · ${name}`);
    setQuantity(0);
  };

  return (
    <View style={[styles.menuCard, !available && { opacity: 0.58 }]}>
      <Pressable disabled={!available} onPress={() => router.push(`/service/${item.id}`)} style={styles.menuMain}>
        <AppImage uri={itemImage(item)} fallbackCode="food" style={styles.menuImage} contentFit="contain" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.menuName} numberOfLines={2}>{name}</Text>
          {unitPrice ? <Text style={styles.menuPrice} numberOfLines={2}>{money(unitPrice, item.currency)}</Text> : null}
          {price?.promoActive ? <Text style={styles.strike}>{money(basePrice, item.currency)}</Text> : null}
          {price?.promoActive ? <View style={styles.promo}><Text style={styles.promoText}>{price.promotionLabel || t.browse.promo}</Text></View> : null}
        </View>
      </Pressable>
      <View style={styles.dashed} />
      {available ? (
        <View style={{ alignItems: "center", gap: 8 }}>
          <QuantityStepper value={quantity} onChange={setQuantity} />
          <PressableScale disabled={!quantity} onPress={add} style={[styles.addButton, quantity > 0 && styles.addButtonOn]}>
            <Text style={[styles.addText, quantity > 0 && { color: colors.white }]}>{t.detail.addCart}</Text>
          </PressableScale>
        </View>
      ) : (
        <Text style={styles.soldOut}>{!restaurantOpen ? t.browse.closed : price?.scheduledAvailable === false ? t.browse.scheduledOff : t.browse.soldOut}</Text>
      )}
    </View>
  );
}

/** Two-column grid of `MenuCard`s. */
export function MenuGrid({ items, pricing, restaurantOpen, withDetailLink }: { items: Service[]; pricing?: Record<string, FoodPrice>; restaurantOpen: boolean; withDetailLink?: boolean }) {
  const { t } = useI18n();
  return (
    <View style={styles.menuGrid}>
      {items.map((item, index) => (
        <Animated.View key={item.id} entering={FadeIn.delay(Math.min(index, 6) * 30)} style={styles.menuCell}>
          <MenuCard item={item} price={pricing?.[item.id]} restaurantOpen={restaurantOpen} />
          {withDetailLink ? <Pressable onPress={() => router.push(`/service/${item.id}`)} hitSlop={6}><Text style={styles.detailLink}>{t.detail.title} ›</Text></Pressable> : null}
        </Animated.View>
      ))}
    </View>
  );
}

export function statusText(status: RestaurantStatus | undefined, t: ReturnType<typeof useI18n>["t"]) {
  if (!status || status.code === "open") return t.browse.open;
  if (status.code === "platform_paused") return t.browse.platformPaused;
  if (status.code === "manual_paused") return t.browse.paused;
  if (status.code === "closed_hours") return t.browse.closed;
  return t.browse.busy;
}

/** PWA `restaurant` card (banner + preview menu + "Xem thêm món"). */
export function RestaurantCard({ id, menu, status, pricing, index = 0, onOpen }: { id: string; menu: Service[]; status?: RestaurantStatus; pricing?: Record<string, FoodPrice>; index?: number; onOpen: () => void }) {
  const { t, locale } = useI18n();
  const first = menu[0]!;
  const meta = first.organizationMetadata || {};
  const banners = ((Array.isArray(meta.draftBannerUrls) && meta.draftBannerUrls.length ? meta.draftBannerUrls : Array.isArray(meta.bannerUrls) ? meta.bannerUrls : []) as string[]).map(imageUri).filter(Boolean) as string[];
  const logo = imageUri(meta.draftLogoUrl || meta.logoUrl);
  const open = status?.open !== false;
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => setSlide((value) => (value + 1) % banners.length), 4200);
    return () => clearInterval(timer);
  }, [banners.length]);
  const hours = status?.code === "closed_hours" && status.businessHoursToday?.enabled ? `${t.browse.hours}: ${status.businessHoursToday.open}–${status.businessHoursToday.close}` : !open ? status?.pauseReason || "" : "";

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 50).duration(300)} style={[styles.restaurantShadow, shadow("float")]}>
     <View style={[styles.restaurant, !open && { opacity: 0.72 }]}>
      <Pressable onPress={onOpen} style={styles.banner}>
        <LinearGradient colors={["#07C160", "#0AA6CF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {banners.length ? <AppImage key={banners[slide]} uri={banners[slide]} style={StyleSheet.absoluteFill} transition={600} /> : logo ? <AppImage uri={logo} style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={["rgba(0,0,0,0.58)", "rgba(0,0,0,0.1)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <View style={styles.bannerRow}>
          {logo ? <AppImage uri={logo} style={styles.logo} contentFit="contain" /> : <View style={[styles.logo, styles.logoFallback]}><Text style={{ color: colors.white, fontWeight: "900", fontSize: 20 }}>喜</Text></View>}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={[styles.openBadge, !open && { backgroundColor: "#FFF1F2" }]}><Text style={[styles.openText, !open && { color: "#B42318" }]}>{statusText(status, t)}</Text></View>
            <Text style={styles.restName} numberOfLines={1}>{localizeOrganizationName(locale, first.organizationCode, first.organizationName, first.organizationMetadata)}</Text>
            <Text style={styles.restAddress} numberOfLines={2}>{str(first.organizationAddress)}</Text>
            {hours ? <Text style={styles.hours} numberOfLines={1}>{hours}</Text> : null}
            {first.distanceKm != null ? <View style={styles.distance}><Text style={styles.distanceText}>⌖ {first.distanceKm.toFixed(1)} km</Text></View> : null}
          </View>
        </View>
      </Pressable>
      <View style={{ padding: 12 }}>
        <MenuGrid items={menu.slice(0, 2)} pricing={pricing} restaurantOpen={open} withDetailLink />
        <PressableScale onPress={onOpen} style={styles.viewMore}><Text style={styles.viewMoreText}>{t.browse.viewMenu}{menu.length > 2 ? ` (${menu.length - 2})` : ""} ›</Text></PressableScale>
      </View>
     </View>
    </Animated.View>
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
    <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(180)} style={[styles.cartBarWrap, { bottom: Math.max(insets.bottom - 12, 10) + 74 }]}>
      <PressableScale onPress={onPress} style={[styles.cartBar, shadow("dock")]} scaleTo={0.98}>
        <View style={styles.cartIcon}>
          <CartIcon size={18} color={colors.wechat} />
          <View style={styles.cartCount}><Text style={styles.cartCountText}>{shownCount}</Text></View>
        </View>
        <Text style={styles.cartLabel}>{group ? t.cart.checkout : t.cart.view}</Text>
        <Text style={styles.cartTotal}>{money(shownTotal)}</Text>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  menuCell: { width: "48.3%", gap: 6 },
  menuCard: { padding: 10, borderRadius: 16, backgroundColor: colors.surfaceMuted, gap: 8, ...shadow("card") },
  menuMain: { flexDirection: "row", gap: 9 },
  menuImage: { width: 52, height: 52, borderRadius: 12, backgroundColor: "#E2E8F0" },
  menuName: { fontSize: 12, fontWeight: "700", color: colors.ink },
  menuPrice: { fontSize: 13, fontWeight: "700", color: colors.price, marginTop: 3 },
  strike: { fontSize: 10, color: "#94A3B8", textDecorationLine: "line-through" },
  promo: { alignSelf: "flex-start", marginTop: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: "#FFF7ED" },
  promoText: { fontSize: 8, fontWeight: "800", color: "#C2410C" },
  dashed: { height: 0, borderWidth: 0.6, borderStyle: "dashed", borderColor: "#CBD5E1" },
  addButton: { alignSelf: "stretch", height: 28, borderRadius: 999, backgroundColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  addButtonOn: { backgroundColor: colors.wechat },
  addText: { fontSize: 10, fontWeight: "700", color: "#94A3B8" },
  soldOut: { textAlign: "center", color: colors.dangerText, fontWeight: "900", fontSize: 12, paddingVertical: 6 },
  detailLink: { textAlign: "center", fontSize: 11, fontWeight: "600", color: colors.brandStrong },
  // Shadow on an unclipped wrapper; iOS drops shadows on views with overflow hidden.
  restaurantShadow: { borderRadius: 22, backgroundColor: colors.white },
  restaurant: { borderRadius: 22, backgroundColor: colors.white, overflow: "hidden" },
  banner: { height: 112, overflow: "hidden" },
  bannerRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  logo: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.white, borderWidth: 2, borderColor: "rgba(255,255,255,0.95)" },
  logoFallback: { backgroundColor: colors.wechat, alignItems: "center", justifyContent: "center" },
  openBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999, backgroundColor: "#D1FAE5" },
  openText: { fontSize: 9.5, fontWeight: "700", color: "#065F46" },
  restName: { fontSize: 15.5, fontWeight: "700", color: colors.white, marginTop: 3 },
  restAddress: { fontSize: 11, color: "rgba(255,255,255,0.88)", marginTop: 2, lineHeight: 14 },
  hours: { fontSize: 10, color: "#FECACA", fontWeight: "800", marginTop: 2 },
  distance: { alignSelf: "flex-start", marginTop: 4, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.92)" },
  distanceText: { fontSize: 9, fontWeight: "700", color: "#065F46" },
  viewMore: { marginTop: 12, height: 39, borderRadius: 14, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  viewMoreText: { fontSize: 12, fontWeight: "700", color: "#15803D" },
  cartBarWrap: { position: "absolute", left: 16, right: 16 },
  cartBar: { flexDirection: "row", alignItems: "center", gap: 10, height: 52, paddingHorizontal: 8, paddingRight: 16, borderRadius: 999, backgroundColor: colors.wechat },
  cartIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  cartCount: { position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 2, borderColor: colors.wechat },
  cartCountText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  cartLabel: { flex: 1, color: colors.white, fontSize: 14, fontWeight: "800" },
  cartTotal: { color: colors.white, fontSize: 15, fontWeight: "900" },
});
