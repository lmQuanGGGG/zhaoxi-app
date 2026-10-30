import { useMutation, useQuery } from "@tanstack/react-query";
import { localizeOrganizationName, localizeServiceName } from "@zhaoxi/i18n";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { createHousingInquiry, createTravelInquiry, getFoodPricing, getProfile, getRestaurantStatus, recordView } from "../../src/api/endpoints";
import { TAB_BAR_SPACE } from "../../src/constants";
import { imageUri, money, num, str } from "../../src/format";
import { restaurantStatusLabel, useFavorite, useServiceDetail, useSession } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { colors, shadow } from "../../src/theme";
import { AppImage, BackButton, Button, Field, PressableScale, Screen, ServiceIcon, Skeleton, StatusPill, haptic } from "../../src/ui";
import { toast } from "../../src/ui/toast";

const copy = {
  "vi-VN": { verified: "✓ Đối tác ZhaoXi xác thực", from: "Từ", info: "Thông tin dịch vụ", address: "Địa chỉ", phone: "Điện thoại", book: "Đặt dịch vụ" },
  "en-US": { verified: "✓ ZhaoXi verified partner", from: "From", info: "Service information", address: "Address", phone: "Phone", book: "Book service" },
  "zh-CN": { verified: "✓ 赵喜认证商家", from: "起", info: "服务信息", address: "地址", phone: "电话", book: "预订服务" },
  "zh-TW": { verified: "✓ 趙喜認證商家", from: "起", info: "服務資訊", address: "地址", phone: "電話", book: "預訂服務" },
} as const;

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const c = copy[locale];
  const { userId } = useSession();
  const service = useServiceDetail(id);
  const data = service.data;
  const isFood = data?.moduleCode === "food";
  const orgId = data?.organization?.id;
  const status = useQuery({ queryKey: keys.restaurantStatus(orgId || ""), queryFn: () => getRestaurantStatus(orgId || ""), enabled: Boolean(isFood && orgId) });
  const pricing = useQuery({ queryKey: keys.foodPricing(id), queryFn: () => getFoodPricing([{ id, quantity: 1 }]), enabled: Boolean(isFood) });
  const favorite = useFavorite(id);

  useEffect(() => { if (userId && id) void recordView(id).catch(() => undefined); }, [id, userId]);

  const price = pricing.data?.[id];
  const unitPrice = num(price?.effectiveUnitPrice ?? data?.priceFrom);
  const open = status.data?.open !== false;
  const available = Boolean(data) && data?.metadata?.isAvailable !== false && (!isFood || (open && price?.scheduledAvailable !== false));
  const name = data ? localizeServiceName(locale, data.name || data.code) : "";
  const partnerName = data?.organization ? localizeOrganizationName(locale, data.organization.code, data.organization.name, data.organization.metadata) : "";
  const isInquiry = data?.moduleCode === "housing" || data?.moduleCode === "travel";
  const priceText = unitPrice > 0 ? (locale.startsWith("zh") ? `${money(unitPrice, data?.currency)} ${c.from}` : `${c.from} ${money(unitPrice, data?.currency)}`) : t.detail.priceTbd;

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }} keyboardShouldPersistTaps="handled">
          <View>
            <View style={styles.hero}>
              {service.isPending ? <Skeleton height={200} radius={0} /> : <AppImage uri={imageUri(data?.metadata?.imageUrl)} fallbackCode={data?.moduleCode} style={StyleSheet.absoluteFill} />}
              <BackButton style={styles.back} />
            </View>
            <View style={[styles.moduleBadge, shadow("soft")]}><ServiceIcon code={data?.moduleCode} size={42} /></View>
          </View>

          <View style={styles.body}>
            {service.isPending ? (
              <View style={{ gap: 10 }}><Skeleton width="45%" height={20} /><Skeleton width="80%" height={26} /><Skeleton width="40%" height={26} /></View>
            ) : data ? (
              <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 8 }}>
                <View style={styles.verified}><Text style={styles.verifiedText}>{c.verified}</Text></View>
                <Text style={styles.title}>{name}</Text>
                {data.summary ? <Text style={styles.summary}>{data.summary}</Text> : null}
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{priceText}</Text>
                  <Animated.View key={String(favorite.favorite)} entering={ZoomIn.springify().damping(14)}>
                    <PressableScale onPress={favorite.toggle} style={styles.favorite}>
                      <Text style={[styles.favoriteText, favorite.favorite && { color: colors.danger }]}>{favorite.favorite ? "★" : "☆"} {favorite.favorite ? t.detail.unfavorite : t.detail.favorite}</Text>
                    </PressableScale>
                  </Animated.View>
                </View>
                {isFood && status.data && !open ? <StatusPill tone="danger" label={restaurantStatusLabel(status.data, t)} /> : null}
              </Animated.View>
            ) : null}

            {data?.organization ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>{partnerName}</Text>
                {data.organization.address ? <Text style={styles.infoLine}><Text style={styles.infoLabel}>{c.address}  </Text>{data.organization.address}</Text> : null}
                {data.organization.phone ? <Text style={styles.infoLine}><Text style={styles.infoLabel}>{c.phone}  </Text><Text style={styles.phone} onPress={() => void Linking.openURL(`tel:${data.organization?.phone}`)}>{data.organization.phone}</Text></Text> : null}
              </View>
            ) : null}

            {data ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>{c.info}</Text>
                <Text style={styles.infoBody}>{data.description || data.summary || name}</Text>
              </View>
            ) : null}

            {data && isInquiry ? <InquiryForm serviceId={data.id} kind={data.moduleCode as "housing" | "travel"} /> : null}

            {data && !isInquiry ? (
              <Button title={c.book} disabled={!available} onPress={() => router.push({ pathname: "/request/[serviceId]", params: { serviceId: data.id } })} style={{ marginTop: 30 }} />
            ) : null}
            {isFood && orgId ? <Button variant="soft" small title={`${partnerName} ›`} onPress={() => router.push(`/restaurant/${orgId}`)} style={{ marginTop: 12, alignSelf: "center" }} /> : null}
          </View>
        </ScrollView>
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
    onSuccess: () => { haptic.success(); toast(t.detail.inquirySent); router.push("/orders"); },
    onError: (error) => toast(error instanceof Error ? error.message : t.common.error, "error"),
  });
  const valid = form.customerName.trim() && form.customerPhone.trim();
  return (
    <View style={[styles.infoCard, { gap: 12 }]}>
      <Text style={styles.infoTitle}>{t.detail.inquiry}</Text>
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
      <Button title={t.detail.inquiry} loading={mutation.isPending} disabled={!valid} onPress={() => mutation.mutate()} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 200, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden", backgroundColor: "#E9F4EE", borderWidth: 1, borderTopWidth: 0, borderColor: "rgba(255,255,255,0.3)" },
  back: { position: "absolute", top: 16, left: 14 },
  moduleBadge: { position: "absolute", left: 11, top: 139, width: 50, height: 50, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: "rgba(255,255,255,0.62)", alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },
  verified: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.brandSoft },
  verifiedText: { fontSize: 10, fontWeight: "800", color: "#065F46" },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  summary: { fontSize: 13, color: colors.slate },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  price: { fontSize: 22, fontWeight: "800", color: colors.priceRose },
  favorite: { paddingHorizontal: 14, height: 35, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, justifyContent: "center", shadowColor: "#71371B", shadowOpacity: 0.18, shadowRadius: 0, shadowOffset: { width: 0, height: 4 } },
  favoriteText: { fontSize: 12, fontWeight: "800", color: "#475569" },
  infoCard: { padding: 16, borderRadius: 20, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.borderSoft, gap: 8 },
  infoTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  infoLine: { fontSize: 12, color: colors.slate, lineHeight: 17 },
  infoLabel: { fontWeight: "700", color: colors.ink },
  phone: { color: "#059669", fontWeight: "700" },
  infoBody: { fontSize: 12.5, color: "#475569", lineHeight: 18 },
});
