import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { localizeOrganizationName, localizeServiceName } from "@zhaoxi/i18n";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createServiceRequest, evaluateCoupon, getCoupons, getDeliveryQuote, getFoodPricing, getPaymentCapabilities, getProfile, getRestaurantStatus } from "../../src/api/endpoints";
import type { CouponEvaluation, PaymentMethod, Point } from "../../src/api/types";
import { cart } from "../../src/cart";
import { imageUri, money, num, str } from "../../src/format";
import { useDebounced, useServiceDetail, useSession } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { getLocationState, locate, searchAddress, setManualLocation } from "../../src/location";
import { keys } from "../../src/query";
import { colors, font, radius, shadow, space } from "../../src/theme";
import { AppImage, Button, Chip, Field, GlassCard, Header, Ionicons, PressableScale, QuantityStepper, Row, Screen, SkeletonList, haptic } from "../../src/ui";
import { toast } from "../../src/ui/toast";

type Courier = "green_sm" | "grab";

function defaultSchedule() {
  const target = new Date(Date.now() + 15 * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`, time: `${pad(target.getHours())}:${pad(target.getMinutes())}` };
}

export default function CheckoutScreen() {
  const { serviceId, cartOrg } = useLocalSearchParams<{ serviceId: string; cartOrg?: string }>();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const { userId, session } = useSession();

  const service = useServiceDetail(serviceId);
  const profile = useQuery({ queryKey: keys.profile(userId), queryFn: getProfile, enabled: Boolean(userId) });
  const capabilities = useQuery({ queryKey: ["payment-capabilities"], queryFn: getPaymentCapabilities, staleTime: 10 * 60_000 });
  const data = service.data;
  const isFood = data?.moduleCode === "food";
  const orgId = data?.organization?.id;
  const status = useQuery({ queryKey: keys.restaurantStatus(orgId || ""), queryFn: () => getRestaurantStatus(orgId || ""), enabled: Boolean(isFood && orgId), refetchInterval: 15_000 });

  const cartItems = useMemo(() => (cartOrg ? cart.itemsFor(cartOrg) : []), [cartOrg]);
  const locked = cartItems.length > 0;
  const schedule = useMemo(defaultSchedule, []);
  const [form, setForm] = useState({ name: "", phone: "", address: "", date: schedule.date, time: schedule.time, quantity: 1, note: "" });
  const [point, setPoint] = useState<Point | null>(getLocationState().point);
  const [addressQuery, setAddressQuery] = useState("");
  const debouncedAddress = useDebounced(addressQuery, 450);
  const [payment, setPayment] = useState<PaymentMethod>("cash_on_delivery");
  const [bankConfirmed, setBankConfirmed] = useState(false);
  const [courier, setCourier] = useState<Courier>("green_sm");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponEvaluation | null>(null);
  const [error, setError] = useState("");

  // Prefill from profile / default address once.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || !profile.data) return;
    const p = profile.data;
    const fallback = getLocationState();
    const saved = p.addresses?.find((x) => x.isDefault);
    setForm((f) => ({ ...f, name: f.name || str(saved?.recipientName || p.user?.displayName || session?.displayName), phone: f.phone || str(saved?.recipientPhone || p.user?.phone || session?.phone), address: f.address || str(saved?.addressText || p.profile?.addressText || fallback.label) }));
    const lat = num(saved?.latitude ?? p.profile?.latitude, NaN), lng = num(saved?.longitude ?? p.profile?.longitude, NaN);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) setPoint({ latitude: lat, longitude: lng });
    setPrefilled(true);
  }, [profile.data, prefilled, session]);
  useEffect(() => {
    if (!prefilled && !form.address && getLocationState().label) setForm((f) => ({ ...f, address: getLocationState().label }));
  }, [prefilled, form.address]);

  const quantity = locked ? cartItems.reduce((sum, item) => sum + item.quantity, 0) : form.quantity;
  const lines = useMemo(() => (locked ? cartItems.map((x) => ({ id: x.serviceId, quantity: x.quantity })) : [{ id: serviceId, quantity: form.quantity }]), [locked, cartItems, serviceId, form.quantity]);
  const pricing = useQuery({ queryKey: keys.foodPricing(lines.map((l) => `${l.id}:${l.quantity}`).join(",")), queryFn: () => getFoodPricing(lines), enabled: Boolean(isFood) });
  const pricingLines = Object.values(pricing.data || {});
  const unitPrice = num(data?.priceFrom);
  const fallbackSubtotal = locked ? cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) : unitPrice * quantity;
  const itemBase = isFood && pricingLines.length ? pricingLines.reduce((s, x) => s + num(x.baseSubtotal), 0) : fallbackSubtotal;
  const itemDiscount = isFood && pricingLines.length ? pricingLines.reduce((s, x) => s + num(x.discount), 0) : 0;
  const itemSubtotal = isFood && pricingLines.length ? pricingLines.reduce((s, x) => s + num(x.finalSubtotal), 0) : fallbackSubtotal;
  const couponDiscount = isFood && coupon?.valid ? num(coupon.discountAmount) : 0;
  const itemAfterCoupon = Math.max(0, itemSubtotal - couponDiscount);
  const scheduleBlocked = isFood && pricingLines.some((x) => x.scheduledAvailable === false);

  const quote = useQuery({ queryKey: ["delivery-quote", serviceId, point?.latitude, point?.longitude], queryFn: () => getDeliveryQuote(serviceId, point!), enabled: Boolean(isFood && point) });
  const shippingGross = isFood ? num(quote.data?.grossFee) : 0;
  const subsidy = isFood ? num(quote.data?.subsidy) : 0;
  const shipping = isFood ? num(quote.data?.customerDeliveryFee) : 0;
  const total = itemAfterCoupon + shipping;
  const currency = data?.currency || "VND";

  const coupons = useQuery({ queryKey: keys.coupons(orgId || "", Math.round(itemSubtotal)), queryFn: () => getCoupons(orgId || "", itemSubtotal), enabled: Boolean(isFood && orgId && itemSubtotal > 0) });
  const addressResults = useQuery({ queryKey: ["geocode", debouncedAddress], queryFn: () => searchAddress(debouncedAddress), enabled: debouncedAddress.trim().length > 3 });

  const applyCoupon = useMutation({
    mutationFn: (code: string) => evaluateCoupon(orgId || "", code, itemSubtotal),
    onSuccess: (value) => {
      setCoupon(value);
      setCouponCode(value.code);
      if (!value.valid) { haptic.warn(); setError(value.reason === "COUPON_EXPIRED" ? t.checkout.couponExpired : value.reason?.includes("LIMIT") ? t.checkout.couponLimit : t.checkout.couponInvalid); }
      else { haptic.success(); setError(""); }
    },
    onError: () => { setCoupon(null); setError(t.checkout.couponInvalid); },
  });
  // Re-evaluate an applied coupon when the subtotal changes.
  useEffect(() => {
    if (coupon?.valid && couponCode && orgId) applyCoupon.mutate(couponCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(itemSubtotal)]);

  const quoteError = quote.data && !quote.data.eligible ? (quote.data.reason === "outside_service_zone" ? t.checkout.outsideZone : t.checkout.noOrigin) : "";
  const restaurantError = isFood && status.data && !status.data.open
    ? status.data.code === "closed_hours" ? `${t.checkout.restaurantClosed}${status.data.businessHoursToday?.enabled ? ` · ${status.data.businessHoursToday.open}–${status.data.businessHoursToday.close}` : ""}` : status.data.code === "at_capacity" ? t.checkout.restaurantBusy : status.data.pauseReason || t.checkout.restaurantPaused
    : "";
  const paymentQr = imageUri(data?.organization?.metadata?.paymentQrUrl);

  const submit = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error(t.common.error);
      const items = locked ? cartItems.map((item) => ({ serviceId: item.serviceId, name: item.name, imageUrl: item.imageUrl, quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.unitPrice * item.quantity })) : undefined;
      return createServiceRequest({
        moduleCode: data.moduleCode, serviceId: data.id, customerName: form.name.trim(), customerPhone: form.phone.trim(), recipientPhone: form.phone.trim(),
        title: data.name || data.code, description: form.note.trim() || undefined, locale, addressText: form.address.trim(), latitude: point?.latitude, longitude: point?.longitude,
        details: {
          recipientPhone: form.phone.trim(), scheduledDate: form.date || undefined, scheduledTime: form.time || undefined, quantity, unitPrice, items,
          itemBaseSubtotal: itemBase, itemDiscount, itemSubtotalBeforeCoupon: itemSubtotal, couponCode: coupon?.valid ? coupon.code : undefined, couponDiscount, itemSubtotal: itemAfterCoupon,
          pricingSource: "customer_mobile_1.0",
          ...(isFood ? {
            deliveryProvider: courier, deliveryProviderLabel: courier === "grab" ? "Grab" : "Xanh SM", deliveryPricingMode: "platform_calculated",
            deliveryDistanceKm: quote.data?.distanceKm ?? null, deliveryGrossFee: shippingGross, deliveryDistanceFee: num(quote.data?.distanceFee), deliveryWeatherSurcharge: num(quote.data?.weather?.surcharge),
            deliveryWeatherLevel: quote.data?.weather?.rainLevel || "none", deliverySubsidy: subsidy, deliveryFee: shipping, deliveryCustomerFee: shipping, deliverySubsidyActive: Boolean(quote.data?.subsidyActive),
            deliverySubsidyWindow: quote.data?.subsidyWindow || null, deliveryEtaMinutes: quote.data?.etaMinutes || null, deliveryRouteDurationMinutes: quote.data?.routeDurationMinutes || null,
            deliveryZoneKm: quote.data?.zoneKm || 12, deliveryDistanceProvider: quote.data?.distanceProvider || null, deliveryPricingSource: "backend_policy_16.25.1",
            deliveryFulfillmentMode: "external_manual", driverDispatchRequired: false,
          } : {}),
          totalAmount: total, currency, paymentMethod: payment, paymentCustomerConfirmed: payment === "bank_transfer" && bankConfirmed,
        },
      });
    },
    onSuccess: (created) => {
      haptic.success();
      if (locked && cartOrg) cart.clearOrganization(cartOrg);
      if (point) setManualLocation(point, form.address.trim());
      void client.invalidateQueries({ queryKey: ["orders"] });
      const partner = localizeOrganizationName(locale, created.routing?.organizationCode || data?.organization?.code, created.routing?.organizationName || data?.organization?.name);
      router.replace({ pathname: "/request-success", params: { id: created.id, code: created.requestCode, partner, payment, reported: payment === "bank_transfer" && bankConfirmed ? "1" : "0" } });
    },
    onError: (e) => { haptic.warn(); setError(e instanceof Error ? e.message : t.common.error); },
  });

  const onSubmit = () => {
    setError("");
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) return setError(t.checkout.required);
    if (isFood && !point) return setError(t.checkout.locationRequired);
    if (scheduleBlocked) return setError(t.browse.scheduledOff);
    if (restaurantError) return setError(restaurantError);
    if (quoteError) return setError(quoteError);
    if (payment === "bank_transfer" && !bankConfirmed) return setError(t.checkout.bankRequired);
    submit.mutate();
  };

  const useCurrentLocation = async () => {
    const next = await locate(true);
    if (next) {
      setPoint(next);
      const label = getLocationState().label;
      if (label) setForm((f) => ({ ...f, address: label }));
    }
  };

  if (service.isPending) return <Screen><Header title={t.checkout.title} /><View style={{ padding: space.lg }}><SkeletonList count={4} /></View></Screen>;

  return (
    <Screen>
      <Header title={t.checkout.title} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 4, gap: space.lg, paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(300)}>
            <GlassCard style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <AppImage uri={imageUri(data?.metadata?.imageUrl)} fallbackCode={data?.moduleCode} style={styles.thumb} />
                <View style={{ flex: 1 }}>
                  <Text style={font.tiny}>{localizeOrganizationName(locale, data?.organization?.code, data?.organization?.name, data?.organization?.metadata)}</Text>
                  <Text style={font.h2} numberOfLines={2}>{locked ? `${cartItems.length} ${t.common.items}` : localizeServiceName(locale, data?.name || data?.code)}</Text>
                </View>
                {!locked ? <QuantityStepper value={form.quantity} min={1} onChange={(q) => setForm((f) => ({ ...f, quantity: q }))} /> : null}
              </View>
              {locked ? cartItems.map((item) => (
                <View key={item.serviceId} style={styles.cartLine}>
                  <Text style={[font.small, { flex: 1, color: colors.text }]} numberOfLines={1}>{item.quantity} × {item.name}</Text>
                  <Text style={font.small}>{money(item.unitPrice * item.quantity, item.currency)}</Text>
                </View>
              )) : null}
            </GlassCard>
          </Animated.View>

          <GlassCard style={{ gap: 12 }}>
            <Text style={font.h2}>{t.checkout.contact}</Text>
            {profile.data?.addresses?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {profile.data.addresses.slice(0, 6).map((address) => (
                  <PressableScale key={address.id} onPress={() => {
                    setForm((f) => ({ ...f, name: address.recipientName || f.name, phone: address.recipientPhone || f.phone, address: address.addressText }));
                    const lat = num(address.latitude, NaN), lng = num(address.longitude, NaN);
                    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0) setPoint({ latitude: lat, longitude: lng });
                  }} style={[styles.savedAddress, address.addressText === form.address && styles.savedAddressActive]}>
                    <Text style={font.h3} numberOfLines={1}>{address.label}</Text>
                    <Text style={font.tiny} numberOfLines={2}>{address.addressText}</Text>
                  </PressableScale>
                ))}
              </ScrollView>
            ) : null}
            <Field label={t.checkout.name} value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} autoComplete="name" />
            <Field label={t.checkout.phone} value={form.phone} onChangeText={(phone) => setForm((f) => ({ ...f, phone }))} keyboardType="phone-pad" autoComplete="tel" placeholder="09…" />
            <Field label={t.checkout.address} value={form.address} onChangeText={(address) => { setForm((f) => ({ ...f, address })); if (isFood) setAddressQuery(address); }} multiline style={{ minHeight: 60 }} />
            {isFood ? (
              <>
                {addressResults.data?.length && addressQuery ? (
                  <Animated.View entering={FadeIn} style={styles.suggestions}>
                    {addressResults.data.map((result) => (
                      <PressableScale key={`${result.latitude}-${result.longitude}`} onPress={() => { setPoint(result); setForm((f) => ({ ...f, address: result.label })); setAddressQuery(""); }} style={styles.suggestion}>
                        <Ionicons name="location-outline" size={16} color={colors.brand} />
                        <Text style={[font.small, { flex: 1, color: colors.text }]} numberOfLines={2}>{result.label}</Text>
                      </PressableScale>
                    ))}
                  </Animated.View>
                ) : null}
                <View style={styles.pointRow}>
                  <Ionicons name={point ? "checkmark-circle" : "alert-circle"} size={18} color={point ? colors.brand : colors.warning} />
                  <Text style={[font.small, { flex: 1 }]}>{point ? `${t.checkout.pointSet} · ${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}` : t.checkout.locationRequired}</Text>
                  <Button small variant="secondary" icon="navigate" title={t.checkout.useLocation} onPress={() => void useCurrentLocation()} />
                </View>
              </>
            ) : null}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Field label={t.checkout.date} value={form.date} onChangeText={(date) => setForm((f) => ({ ...f, date }))} placeholder="YYYY-MM-DD" /></View>
              <View style={{ width: 110 }}><Field label={t.checkout.time} value={form.time} onChangeText={(time) => setForm((f) => ({ ...f, time }))} placeholder="HH:MM" /></View>
            </View>
            <Text style={font.tiny}>{t.checkout.scheduleHint}</Text>
            <Field label={t.checkout.note} value={form.note} onChangeText={(note) => setForm((f) => ({ ...f, note }))} multiline />
          </GlassCard>

          {isFood ? (
            <GlassCard style={{ gap: 12 }}>
              <Text style={font.h2}>🛵 {t.checkout.courier}</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(["green_sm", "grab"] as const).map((id) => {
                  const selected = courier === id;
                  const accent = id === "grab" ? "#00B14F" : "#00B092";
                  return (
                    <PressableScale key={id} onPress={() => { haptic.select(); setCourier(id); }} hapticOnPress={false} style={[styles.courier, selected && { borderColor: accent, backgroundColor: `${accent}12` }]}>
                      <Image source={id === "grab" ? require("../../assets/couriers/grab.png") : require("../../assets/couriers/green-sm.png")} style={{ width: 72, height: 26 }} contentFit="contain" />
                      <Text style={font.h3}>{id === "grab" ? t.checkout.grab : t.checkout.xanh}</Text>
                      <Text style={font.tiny}>{id === "grab" ? t.checkout.grabSub : t.checkout.xanhSub}</Text>
                      <View style={[styles.radio, selected && { borderColor: accent, borderWidth: 6 }]} />
                    </PressableScale>
                  );
                })}
              </View>
              <Text style={font.tiny}>{t.checkout.courierNote}</Text>
            </GlassCard>
          ) : null}

          <GlassCard style={{ gap: 10 }}>
            <Text style={font.h2}>{t.checkout.payment}</Text>
            {(["cash_on_delivery", "bank_transfer"] as const).map((method) => {
              const enabled = method === "cash_on_delivery" || Boolean(paymentQr);
              if (!enabled) return null;
              const selected = payment === method;
              return (
                <PressableScale key={method} onPress={() => { haptic.select(); setPayment(method); }} hapticOnPress={false} style={[styles.method, selected && styles.methodActive]}>
                  <Ionicons name={method === "cash_on_delivery" ? "cash-outline" : "qr-code-outline"} size={22} color={selected ? colors.brandStrong : colors.textSecondary} />
                  <Text style={[font.h3, { flex: 1 }]}>{method === "cash_on_delivery" ? t.checkout.cod : t.checkout.bank}</Text>
                  <View style={[styles.radio, selected && { borderColor: colors.brand, borderWidth: 6 }]} />
                </PressableScale>
              );
            })}
            {payment === "bank_transfer" && paymentQr ? (
              <Animated.View entering={FadeInDown} layout={LinearTransition} style={{ alignItems: "center", gap: 10, paddingTop: 6 }}>
                <AppImage uri={paymentQr} contentFit="contain" style={styles.qr} />
                <Text style={[font.small, { textAlign: "center" }]}>{t.checkout.bankHint}</Text>
                <Button variant={bankConfirmed ? "secondary" : "primary"} icon={bankConfirmed ? "checkmark-circle" : "card"} title={bankConfirmed ? t.checkout.bankConfirmed : t.checkout.bankConfirm} onPress={() => { haptic.success(); setBankConfirmed(true); }} style={{ alignSelf: "stretch" }} />
              </Animated.View>
            ) : null}
          </GlassCard>

          {isFood && orgId ? (
            <GlassCard style={{ gap: 10 }}>
              <Text style={font.h2}>🎟️ {t.checkout.coupon}</Text>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                <View style={{ flex: 1 }}><Field value={couponCode} onChangeText={(value) => setCouponCode(value.toUpperCase())} placeholder={t.checkout.couponPlaceholder} autoCapitalize="characters" /></View>
                {coupon?.valid ? <Button small variant="danger" title={t.checkout.removeCoupon} onPress={() => { setCoupon(null); setCouponCode(""); }} style={{ minHeight: 48 }} />
                  : <Button small title={t.checkout.apply} loading={applyCoupon.isPending} disabled={!couponCode.trim()} onPress={() => applyCoupon.mutate(couponCode)} style={{ minHeight: 48 }} />}
              </View>
              {coupons.data?.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {coupons.data.filter((c) => c.eligible).map((c) => <Chip key={c.id} icon="pricetag" label={`${c.code} · ${c.discountType === "percent" ? `-${c.discountValue}%` : `-${money(c.discountValue)}`}`} active={coupon?.code === c.code} onPress={() => applyCoupon.mutate(c.code)} />)}
                </ScrollView>
              ) : null}
            </GlassCard>
          ) : null}

          <GlassCard style={{ gap: 2 }}>
            <Text style={[font.h2, { marginBottom: 6 }]}>{t.checkout.summary}</Text>
            <Row label={t.checkout.items} value={itemBase > 0 ? money(itemBase, currency) : t.detail.priceTbd} />
            {itemDiscount > 0 ? <Row label={t.checkout.itemDiscount} value={`-${money(itemDiscount, currency)}`} color={colors.brandStrong} /> : null}
            {couponDiscount > 0 ? <Row label={t.checkout.couponDiscount} value={`-${money(couponDiscount, currency)}`} color={colors.brandStrong} /> : null}
            {isFood ? (
              quote.isFetching ? <Row label={t.checkout.delivery} value={t.checkout.calculating} /> : quote.data ? (
                <>
                  {quote.data.distanceKm != null ? <Row label={t.checkout.distance} value={`${quote.data.distanceKm.toFixed(1)} km`} /> : null}
                  {subsidy > 0 ? <Row label={t.checkout.deliveryGross} value={money(shippingGross, currency)} /> : null}
                  {subsidy > 0 ? <Row label={t.checkout.subsidy} value={`-${money(subsidy, currency)}`} color={colors.brandStrong} /> : null}
                  {num(quote.data.weather?.surcharge) > 0 ? <Row label={t.checkout.rain} value={money(quote.data.weather?.surcharge, currency)} /> : null}
                  <Row label={t.checkout.delivery} value={money(shipping, currency)} />
                </>
              ) : null
            ) : null}
            <View style={styles.divider} />
            <Row label={t.checkout.total} value={money(total, currency)} strong color={colors.price} />
            <Text style={[font.tiny, { marginTop: 6 }]}>{t.checkout.privacy}</Text>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }, shadow(3)]}>
        {error || restaurantError || quoteError ? (
          <Animated.View entering={FadeInDown} style={styles.error}><Ionicons name="alert-circle" size={16} color={colors.danger} /><Text style={styles.errorText}>{error || restaurantError || quoteError}</Text></Animated.View>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={font.tiny}>{t.checkout.total}</Text>
            <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>{money(total, currency)}</Text>
          </View>
          <Button title={submit.isPending ? t.checkout.sending : t.checkout.submit} icon="checkmark-circle" loading={submit.isPending} onPress={onSubmit} style={{ minWidth: 170 }} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 56, height: 56, borderRadius: 16 },
  cartLine: { flexDirection: "row", gap: 10, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  savedAddress: { width: 170, padding: 10, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, gap: 3 },
  savedAddressActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  suggestions: { borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  suggestion: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pointRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  courier: { flex: 1, padding: 12, gap: 4, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  radio: { position: "absolute", top: 12, right: 12, width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#CBD5E1", backgroundColor: colors.white },
  method: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  methodActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  qr: { width: 220, height: 220, borderRadius: radius.md, backgroundColor: colors.white },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 8 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, gap: 10, paddingHorizontal: space.lg, paddingTop: 12, backgroundColor: "rgba(255,255,255,0.98)", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  error: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: radius.sm, backgroundColor: colors.dangerSoft },
  errorText: { flex: 1, color: colors.danger, fontSize: 12, fontWeight: "700" },
});
