import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getPayments } from "../src/api/endpoints";
import { TAB_BAR_SPACE } from "../src/constants";
import { money, shortDate, str } from "../src/format";
import { usePullRefresh, useSession } from "../src/hooks";
import { useI18n } from "../src/i18n";
import { paymentMethodLabels, paymentStatusLabels } from "../src/order-copy";
import { keys } from "../src/query";
import { colors, shadow } from "../src/theme";
import { Header, PressableScale, Screen, SkeletonList, StatusPill } from "../src/ui";

// Copy from the PWA payment center (/payment).
const copy = {
  "vi-VN": { title: "Trung tâm thanh toán", subtitle: "Thanh toán địa phương, trạng thái yêu cầu và hỗ trợ trong một nơi.", overview: "THANH TOÁN ZHAOXI", safe: "Thanh toán cho dịch vụ", safeHint: "ZhaoXi hiển thị trạng thái thật từ yêu cầu và cổng thanh toán; không tạo số dư ví.", services: "Dịch vụ thanh toán", servicesHint: "Xem các hình thức thanh toán đang được đối tác hỗ trợ", support: "Hỗ trợ thanh toán", supportHint: "Trao đổi về giao dịch hoặc yêu cầu thanh toán", requests: "Thanh toán gần đây", empty: "Chưa có thanh toán nào", from: "Yêu cầu" },
  "en-US": { title: "Payment Center", subtitle: "Local payment services, request states and support in one place.", overview: "ZHAOXI PAYMENT", safe: "Service payments", safeHint: "ZhaoXi shows live request and gateway state; no wallet balance is fabricated.", services: "Payment services", servicesHint: "Browse payment methods currently supported by providers", support: "Payment support", supportHint: "Discuss a transaction or payment request", requests: "Recent payments", empty: "No payments yet", from: "Request" },
  "zh-CN": { title: "支付中心", subtitle: "本地支付服务、请求状态与支持集中管理。", overview: "赵喜支付", safe: "服务支付", safeHint: "赵喜显示真实请求与支付网关状态，不虚构钱包余额。", services: "支付服务", servicesHint: "查看服务商当前支持的支付方式", support: "支付支持", supportHint: "咨询交易或支付请求", requests: "最近支付", empty: "暂无支付记录", from: "请求" },
  "zh-TW": { title: "支付中心", subtitle: "本地支付服務、請求狀態與支援集中管理。", overview: "趙喜支付", safe: "服務支付", safeHint: "趙喜顯示真實請求與支付閘道狀態，不虛構錢包餘額。", services: "支付服務", servicesHint: "查看服務商目前支援的支付方式", support: "支付支援", supportHint: "諮詢交易或支付請求", requests: "最近支付", empty: "暫無支付記錄", from: "請求" },
} as const;

export default function PaymentsScreen() {
  const { locale } = useI18n();
  const c = copy[locale];
  const { userId } = useSession();
  const payments = useQuery({ queryKey: keys.payments(userId), queryFn: () => getPayments(), enabled: Boolean(userId) });
  const pull = usePullRefresh(payments.refetch);
  const rows = payments.data || [];
  const openSupport = () => router.push({ pathname: "/support", params: { subject: c.support } });
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }} refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={colors.brand} />}>
        <Header title={c.title} subtitle={c.subtitle} />
        <View style={{ paddingHorizontal: 14, gap: 10 }}>
          <Animated.View entering={FadeInDown.duration(200)} style={[styles.overviewShadow, shadow("soft")]}>
          <View style={styles.overview}>
            {/* PWA 18.3.4 "aurora glass" overview card */}
            <LinearGradient colors={["rgba(196,178,255,0.52)", "rgba(158,220,255,0.47)", "rgba(160,242,210,0.36)"]} locations={[0, 0.52, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.glow} />
            <Text style={styles.eyebrow}>{c.overview}</Text>
            <Text style={styles.overviewTitle}>{c.safe}</Text>
            <Text style={styles.overviewText}>{c.safeHint}</Text>
          </View>
          </Animated.View>

          <Text style={styles.section}>{c.services}</Text>
          <View style={styles.actions}>
            <PressableScale onPress={() => router.push("/services/payment")} style={[styles.action, shadow("card")]} scaleTo={0.97}>
              <Text style={styles.actionTitle}>{c.services}</Text>
              <Text style={styles.actionHint}>{c.servicesHint}</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push("/messages")} style={[styles.action, shadow("card")]} scaleTo={0.97}>
              <Text style={styles.actionTitle}>{c.support}</Text>
              <Text style={styles.actionHint}>{c.supportHint}</Text>
            </PressableScale>
          </View>

          <Text style={styles.section}>{c.requests}</Text>
          {payments.isPending && userId ? <SkeletonList count={2} image={false} /> : rows.length ? rows.map((item, index) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(Math.min(index, 6) * 20).duration(200)}>
              <PressableScale disabled={!item.requestId} onPress={() => item.requestId && router.push(`/order/${item.requestId}`)} style={[styles.record, shadow("card")]} scaleTo={0.985}>
                <View style={styles.recordHead}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.recordFrom}>{c.from} {item.requestCode || item.requestId} · {shortDate(item.createdAt, locale)}</Text>
                    <Text style={styles.recordMethod}>{paymentMethodLabels[locale][str(item.method)] || str(item.method) || "Payment"}</Text>
                  </View>
                  <StatusPill tone={item.status === "paid" ? "brand" : item.status === "failed" ? "danger" : "warning"} label={paymentStatusLabels[locale][item.status] || item.status} />
                </View>
                {Number(item.amount || 0) > 0 ? <Text style={styles.amount}>{money(item.amount, item.currency)}</Text> : null}
              </PressableScale>
            </Animated.View>
          )) : <View style={[styles.empty, shadow("card")]}><Text style={styles.emptyText}>{c.empty}</Text></View>}

          <Text style={styles.section}>{c.support}</Text>
          <PressableScale onPress={openSupport} style={[styles.supportRow, shadow("card")]} scaleTo={0.985}>
            <View style={{ flex: 1 }}>
              <Text style={styles.recordMethod}>{c.support}</Text>
              <Text style={styles.actionHint}>{c.supportHint}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </Screen>
  );
}

const card = { borderRadius: 14, backgroundColor: "rgba(255,255,255,0.86)", borderWidth: 1, borderColor: "rgba(255,255,255,0.92)" } as const;
const styles = StyleSheet.create({
  overviewShadow: { borderRadius: 16, backgroundColor: "#DCEBFA" },
  overview: { minHeight: 106, justifyContent: "center", padding: 15, borderRadius: 16, overflow: "hidden", backgroundColor: "#DCEBFA" },
  glow: { position: "absolute", right: -30, top: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.4)" },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.9, color: colors.brand },
  overviewTitle: { fontSize: 20, fontWeight: "700", color: colors.navy, marginVertical: 5 },
  overviewText: { fontSize: 12, color: "#334155", lineHeight: 17 },
  section: { fontSize: 18, fontWeight: "700", color: colors.ink, marginTop: 12 },
  actions: { flexDirection: "row", gap: 8 },
  action: { ...card, flex: 1, minHeight: 72, justifyContent: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 11, borderColor: colors.borderSoft },
  actionTitle: { fontSize: 13, fontWeight: "800", color: colors.brand },
  actionHint: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  record: { ...card, padding: 12, borderColor: colors.borderSoft },
  recordHead: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  recordFrom: { fontSize: 10.5, color: colors.textMuted },
  recordMethod: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: "800", color: colors.text, marginTop: 6 },
  empty: { ...card, alignItems: "center", paddingVertical: 20, borderColor: colors.borderWarm },
  emptyText: { fontSize: 14, fontWeight: "700", color: colors.text },
  supportRow: { ...card, flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderColor: colors.borderSoft },
  chevron: { fontSize: 20, color: "#94A3B8" },
});
