import { useQuery } from "@tanstack/react-query";
import { localizeOrganizationName, localizeServiceName } from "@zhaoxi/i18n";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { getFoodPricing, getRestaurantStatus, recordView } from "../../src/api/endpoints";
import { Gallery, HousingFacts, HousingInquiryForm, TravelBookingForm, TravelFacts } from "../../src/components/inquiry";
import { TAB_BAR_SPACE } from "../../src/constants";
import { imageUri, money, num } from "../../src/format";
import { restaurantStatusLabel, useFavorite, useServiceDetail, useSession } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { colors, shadow } from "../../src/theme";
import { AppImage, BackButton, Button, GlassFill, PressableScale, Screen, ServiceIcon, Skeleton, StatusPill } from "../../src/ui";

const copy = {
  "vi-VN": { verified: "✓ Đối tác ZhaoXi xác thực", from: "Từ", info: "Thông tin dịch vụ", address: "Địa chỉ", phone: "Điện thoại", book: "Đặt dịch vụ" },
  "en-US": { verified: "✓ ZhaoXi verified partner", from: "From", info: "Service information", address: "Address", phone: "Phone", book: "Book service" },
  "zh-CN": { verified: "✓ 赵喜认证商家", from: "起", info: "服务信息", address: "地址", phone: "电话", book: "预订服务" },
  "zh-TW": { verified: "✓ 趙喜認證商家", from: "起", info: "服務資訊", address: "地址", phone: "電話", book: "預訂服務" },
} as const;

const monthUnit = { "vi-VN": "tháng", "en-US": "month", "zh-CN": "月", "zh-TW": "月" } as const;

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
            {/* Photo as an inset card: shadow on the unclipped wrapper, rounded clip inside */}
            <View style={[styles.heroWrap, shadow("soft")]}>
              <View style={styles.hero}>
                {service.isPending ? <Skeleton height={HERO_H} radius={0} /> : <AppImage uri={imageUri(data?.metadata?.imageUrl)} fallbackCode={data?.moduleCode} style={StyleSheet.absoluteFill} />}
                <BackButton style={styles.back} />
              </View>
            </View>
            <View style={[styles.moduleBadge, shadow("soft")]}><ServiceIcon code={data?.moduleCode} size={42} /></View>
          </View>

          <View style={styles.body}>
            {service.isPending ? (
              <View style={{ gap: 10 }}><Skeleton width="45%" height={20} /><Skeleton width="80%" height={26} /><Skeleton width="40%" height={26} /></View>
            ) : data ? (
              <Animated.View entering={FadeInDown.duration(200)} style={{ gap: 8 }}>
                {/* Housing listings carry the badge only once an admin has verified them (PWA parity) */}
                {data.moduleCode !== "housing" || data.metadata?.adminVerified === true ? <View style={styles.verified}><Text style={styles.verifiedText}>{c.verified}</Text></View> : null}
                <Text style={styles.title}>{name}</Text>
                {data.summary ? <Text style={styles.summary}>{data.summary}</Text> : null}
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{priceText}{data.moduleCode === "housing" && unitPrice > 0 ? <Text style={styles.perMonth}> / {monthUnit[locale]}</Text> : null}</Text>
                  <Animated.View key={String(favorite.favorite)} entering={ZoomIn.duration(200)}>
                    <PressableScale onPress={favorite.toggle} style={styles.favorite}>
                      <GlassFill radius={18} />
                      <Text style={[styles.favoriteText, favorite.favorite && { color: colors.danger }]}>{favorite.favorite ? "★" : "☆"} {favorite.favorite ? t.detail.unfavorite : t.detail.favorite}</Text>
                    </PressableScale>
                  </Animated.View>
                </View>
                {isFood && status.data && !open ? <StatusPill tone="danger" label={restaurantStatusLabel(status.data, t)} /> : null}
              </Animated.View>
            ) : null}

            {data && isInquiry ? <Gallery data={data} /> : null}
            {data?.moduleCode === "housing" ? <HousingFacts data={data} /> : null}
            {data?.moduleCode === "travel" ? <TravelFacts data={data} /> : null}

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


            {data?.moduleCode === "housing" ? <HousingInquiryForm data={data} /> : null}
            {data?.moduleCode === "travel" ? <TravelBookingForm data={data} /> : null}

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

const HERO_H = 214;

const styles = StyleSheet.create({
  heroWrap: { marginHorizontal: 16, marginTop: 10, borderRadius: 26, backgroundColor: "#E9F4EE" },
  hero: { height: HERO_H, borderRadius: 26, overflow: "hidden", backgroundColor: "#E9F4EE" },
  back: { position: "absolute", top: 12, left: 12 },
  moduleBadge: { position: "absolute", left: 28, top: 10 + HERO_H - 62, width: 50, height: 50, borderRadius: 15, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", ...shadow("card") },
  body: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },
  verified: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.brandSoft },
  verifiedText: { fontSize: 10, fontWeight: "800", color: "#065F46" },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  summary: { fontSize: 13, color: colors.slate },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 },
  price: { flexShrink: 1, fontSize: 22, fontWeight: "800", color: colors.priceRose },
  perMonth: { fontSize: 14, fontWeight: "700", color: colors.slate },
  favorite: { paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: "center" },
  favoriteText: { fontSize: 12, fontWeight: "800", color: "#475569" },
  infoCard: { padding: 16, borderRadius: 20, backgroundColor: colors.surfaceMuted, gap: 8, ...shadow("card") },
  infoTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  infoLine: { fontSize: 12, color: colors.slate, lineHeight: 17 },
  infoLabel: { fontWeight: "700", color: colors.ink },
  phone: { color: "#059669", fontWeight: "700" },
  infoBody: { fontSize: 12.5, color: "#475569", lineHeight: 18 },
});
