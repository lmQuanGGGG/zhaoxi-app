import { useMutation, useQuery } from "@tanstack/react-query";
import { localizeOrganizationName, localizeServiceModuleName, localizeServiceName } from "@zhaoxi/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createHousingInquiry, createTravelInquiry, getFoodPricing, getProfile, getRestaurantStatus, recordView } from "../../src/api/endpoints";
import { cart, useCart } from "../../src/cart";
import { imageUri, money, num, str } from "../../src/format";
import { restaurantStatusLabel, useFavorite, useServiceDetail, useSession } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { colors, font, radius, shadow, space } from "../../src/theme";
import { AppImage, Button, Field, GlassCard, IconButton, Ionicons, QuantityStepper, Screen, Skeleton, StatusPill, haptic } from "../../src/ui";
import { toast } from "../../src/ui/toast";

const HERO = 320;

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const { userId } = useSession();
  const { quantityOf, count: cartCount } = useCart();
  const service = useServiceDetail(id);
  const data = service.data;
  const isFood = data?.moduleCode === "food";
  const orgId = data?.organization?.id;
  const status = useQuery({ queryKey: keys.restaurantStatus(orgId || ""), queryFn: () => getRestaurantStatus(orgId || ""), enabled: Boolean(isFood && orgId) });
  const pricing = useQuery({ queryKey: keys.foodPricing(id), queryFn: () => getFoodPricing([{ id, quantity: 1 }]), enabled: Boolean(isFood) });
  const favorite = useFavorite(id);
  const [quantity, setQuantity] = useState(1);
  const scrollY = useSharedValue(0);

  useEffect(() => { if (userId && id) void recordView(id).catch(() => undefined); }, [id, userId]);

  const onScroll = useAnimatedScrollHandler((event) => { scrollY.value = event.contentOffset.y; });
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-HERO, 0, HERO], [-HERO / 2, 0, HERO * 0.4]) },
      { scale: interpolate(scrollY.value, [-HERO, 0], [2, 1], "clamp") },
    ],
  }));
  const barStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [HERO - 140, HERO - 60], [0, 1], "clamp") }));

  const price = pricing.data?.[id];
  const unitPrice = num(price?.effectiveUnitPrice ?? data?.priceFrom);
  const open = status.data?.open !== false;
  const available = Boolean(data) && data?.metadata?.isAvailable !== false && (!isFood || (open && price?.scheduledAvailable !== false));
  const name = data ? localizeServiceName(locale, data.name || data.code) : "";
  const partnerName = data?.organization ? localizeOrganizationName(locale, data.organization.code, data.organization.name, data.organization.metadata) : "";
  const inCart = quantityOf(id);

  const addToCart = () => {
    if (!data) return;
    cart.add({ serviceId: data.id, organizationId: orgId, organizationName: partnerName, name, imageUrl: imageUri(data.metadata?.imageUrl), unitPrice, currency: data.currency || "VND", quantity });
    haptic.success();
    toast(`${t.browse.added} · ${name}`);
  };

  return (
    <Screen edges={[]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View style={[styles.hero, heroStyle]}>
          {service.isPending ? <Skeleton height={HERO} radius={0} /> : <AppImage uri={imageUri(data?.metadata?.imageUrl)} fallbackCode={data?.moduleCode} style={StyleSheet.absoluteFill} />}
          <LinearGradient colors={["rgba(0,0,0,0.3)", "transparent"]} style={[StyleSheet.absoluteFill, { height: 120 }]} />
        </Animated.View>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: HERO - 36, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(380)} style={[styles.sheet, shadow(3)]}>
            {service.isPending ? (
              <View style={{ gap: 10 }}><Skeleton width="40%" height={12} /><Skeleton width="80%" height={24} /><Skeleton width="30%" height={20} /><Skeleton height={60} /></View>
            ) : data ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eyebrow}>{localizeServiceModuleName(locale, data.moduleCode)}</Text>
                    <Text style={[font.h1, { fontSize: 24, marginTop: 4 }]}>{name}</Text>
                  </View>
                  <Animated.View key={String(favorite.favorite)} entering={ZoomIn.springify().damping(12)}>
                    <IconButton icon={favorite.favorite ? "heart" : "heart-outline"} color={favorite.favorite ? colors.danger : colors.text} label={favorite.favorite ? t.detail.unfavorite : t.detail.favorite} onPress={favorite.toggle} />
                  </Animated.View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                  {unitPrice > 0 ? <Text style={styles.price}>{money(unitPrice, data.currency)}</Text> : <Text style={font.small}>{t.detail.priceTbd}</Text>}
                  {price?.promoActive ? <Text style={styles.strike}>{money(price.baseUnitPrice, data.currency)}</Text> : null}
                  {price?.promoActive ? <StatusPill tone="warning" label={price.promotionLabel || t.browse.promo} /> : null}
                </View>
                {isFood && status.data ? <View style={{ marginTop: 10 }}><StatusPill tone={open ? "brand" : "danger"} label={restaurantStatusLabel(status.data, t)} /></View> : null}
                {data.summary ? <Text style={[font.body, styles.paragraph]}>{data.summary}</Text> : null}
                {data.description ? <Text style={[font.small, styles.paragraph, { lineHeight: 20 }]}>{data.description}</Text> : null}
              </>
            ) : null}
          </Animated.View>

          {data?.organization ? (
            <GlassCard style={{ marginHorizontal: space.lg, marginTop: space.lg, gap: 10 }}>
              <Text style={font.tiny}>{t.detail.partner}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <AppImage uri={imageUri(data.organization.metadata?.logoUrl)} fallbackCode={data.moduleCode} style={{ width: 48, height: 48, borderRadius: 16 }} />
                <View style={{ flex: 1 }}>
                  <Text style={font.h3}>{partnerName}</Text>
                  {data.organization.address ? <Text style={font.tiny} numberOfLines={2}>{data.organization.address}</Text> : null}
                </View>
                {isFood && orgId ? <IconButton icon="storefront-outline" onPress={() => router.push(`/restaurant/${orgId}`)} /> : null}
                {data.organization.phone ? <IconButton icon="call-outline" onPress={() => void Linking.openURL(`tel:${data.organization?.phone}`)} /> : null}
              </View>
            </GlassCard>
          ) : null}

          {data && (data.moduleCode === "housing" || data.moduleCode === "travel") ? <InquiryForm serviceId={data.id} kind={data.moduleCode} /> : null}
        </Animated.ScrollView>

        <Animated.View style={[styles.topBar, { paddingTop: insets.top + 6 }, barStyle]} pointerEvents="none">
          <Text style={[font.h3, { textAlign: "center" }]} numberOfLines={1}>{name}</Text>
        </Animated.View>
        <View style={[styles.floating, { top: insets.top + 6 }]}>
          <IconButton icon="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
          {isFood ? <IconButton icon="bag-handle-outline" badge={cartCount} onPress={() => router.push("/cart")} /> : null}
        </View>

        {data && data.moduleCode !== "housing" && data.moduleCode !== "travel" ? (
          <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {isFood ? (
              <>
                <QuantityStepper value={quantity} min={1} onChange={setQuantity} disabled={!available} />
                <Button title={inCart ? `${t.detail.addCart} (${inCart})` : t.detail.addCart} icon="bag-add" disabled={!available} onPress={addToCart} style={{ flex: 1 }} />
              </>
            ) : (
              <Button title={t.detail.book} icon="calendar" disabled={!available} onPress={() => router.push({ pathname: "/request/[serviceId]", params: { serviceId: data.id } })} style={{ flex: 1 }} />
            )}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function InquiryForm({ serviceId, kind }: { serviceId: string; kind: "housing" | "travel" }) {
  const { t, locale } = useI18n();
  const profile = useQuery({ queryKey: keys.profile(useSession().userId), queryFn: getProfile });
  const [form, setForm] = useState({ customerName: "", customerPhone: "", date: "", months: "12", people: "1", budget: "", notes: "" });
  useEffect(() => {
    const user = profile.data?.user;
    if (user) setForm((value) => ({ ...value, customerName: value.customerName || str(user.displayName), customerPhone: value.customerPhone || str(user.phone) }));
  }, [profile.data]);
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  const mutation = useMutation({
    mutationFn: () => kind === "housing"
      ? createHousingInquiry({ serviceId, locale, customerName: form.customerName, moveInDate: form.date, leaseMonths: Number(form.months || 0), occupants: Number(form.people || 1), budget: Number(form.budget || 0), preferredContact: "phone", notes: form.notes })
      : createTravelInquiry({ serviceId, locale, customerName: form.customerName, visitDate: form.date, visitTime: "", guests: Number(form.people || 1), adults: Number(form.people || 1), children: 0, notes: form.notes, packageId: "" }),
    onSuccess: () => {
      haptic.success();
      toast(t.detail.inquirySent);
      router.push("/orders");
    },
    onError: (error) => toast(error instanceof Error ? error.message : t.common.error, "error"),
  });
  const valid = form.customerName.trim() && form.customerPhone.trim();
  return (
    <GlassCard style={{ marginHorizontal: space.lg, marginTop: space.lg, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="chatbubble-ellipses" size={18} color={colors.brand} />
        <Text style={font.h2}>{t.detail.inquiry}</Text>
      </View>
      <Field label={t.checkout.name} value={form.customerName} onChangeText={set("customerName")} autoComplete="name" />
      <Field label={t.checkout.phone} value={form.customerPhone} onChangeText={set("customerPhone")} keyboardType="phone-pad" autoComplete="tel" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label={t.checkout.date} value={form.date} onChangeText={set("date")} placeholder="YYYY-MM-DD" /></View>
        <View style={{ width: 96 }}><Field label={kind === "housing" ? "👥" : "🧳"} value={form.people} onChangeText={set("people")} keyboardType="number-pad" /></View>
      </View>
      {kind === "housing" ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="📅" value={form.months} onChangeText={set("months")} keyboardType="number-pad" /></View>
          <View style={{ flex: 2 }}><Field label="💰 VND" value={form.budget} onChangeText={set("budget")} keyboardType="number-pad" /></View>
        </View>
      ) : null}
      <Field label={t.checkout.note} value={form.notes} onChangeText={set("notes")} multiline />
      <Button title={t.detail.inquiry} icon="send" loading={mutation.isPending} disabled={!valid} onPress={() => mutation.mutate()} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  hero: { position: "absolute", top: 0, left: 0, right: 0, height: HERO, overflow: "hidden", backgroundColor: "#DDEDE7" },
  sheet: { marginHorizontal: space.lg, padding: space.xl, borderRadius: radius.xl, backgroundColor: colors.white },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: colors.brand, textTransform: "uppercase" },
  price: { color: colors.price, fontSize: 22, fontWeight: "900" },
  strike: { color: colors.textMuted, textDecorationLine: "line-through", fontSize: 13 },
  paragraph: { marginTop: 14 },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, paddingBottom: 12, paddingHorizontal: 72, backgroundColor: "rgba(247,250,249,0.97)", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  floating: { position: "absolute", left: space.lg, right: space.lg, flexDirection: "row", justifyContent: "space-between" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: space.lg, paddingTop: 12, backgroundColor: "rgba(255,255,255,0.97)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
