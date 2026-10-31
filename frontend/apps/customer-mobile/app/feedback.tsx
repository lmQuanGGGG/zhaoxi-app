import { useMutation } from "@tanstack/react-query";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { sendFeedback, type FeedbackCategory } from "../src/api/endpoints";
import { OptionPills } from "../src/components/pickers";
import { useI18n } from "../src/i18n";
import { colors, shadow } from "../src/theme";
import { Button, Field, Header, PressableScale, Screen, haptic } from "../src/ui";
import { toast } from "../src/ui/toast";

// Copy from @zhaoxi/feedback BetaFeedback (PWA /feedback).
const copy = {
  "vi-VN": { title: "Gửi phản hồi Beta", sub: "Phản hồi của bạn được gắn với phiên bản hiện tại để đội ZhaoXi xử lý nhanh hơn.", placeholder: "Mô tả vấn đề hoặc đề xuất...", send: "Gửi phản hồi", sent: "Đã gửi phản hồi. Cảm ơn bạn!", rating: "Đánh giá", category: "Chủ đề", back: "Quay lại", general: "Chung", bug: "Lỗi", suggestion: "Đề xuất", payment: "Thanh toán", delivery: "Giao hàng", partner: "Đối tác", account: "Tài khoản", failed: "Không gửi được phản hồi" },
  "en-US": { title: "Beta feedback", sub: "Your feedback is tagged with the current release so ZhaoXi can investigate faster.", placeholder: "Describe the issue or suggestion...", send: "Send feedback", sent: "Feedback sent. Thank you!", rating: "Rating", category: "Topic", back: "Back", general: "General", bug: "Bug", suggestion: "Suggestion", payment: "Payment", delivery: "Delivery", partner: "Partner", account: "Account", failed: "Could not send feedback" },
  "zh-CN": { title: "Beta 反馈", sub: "反馈会自动关联当前版本，方便赵喜团队快速处理。", placeholder: "描述问题或建议…", send: "提交反馈", sent: "反馈已提交，谢谢！", rating: "评分", category: "类型", back: "返回", general: "一般", bug: "错误", suggestion: "建议", payment: "支付", delivery: "配送", partner: "商家", account: "账号", failed: "提交失败" },
  "zh-TW": { title: "Beta 回饋", sub: "回饋會自動關聯目前版本，方便趙喜團隊快速處理。", placeholder: "描述問題或建議…", send: "提交回饋", sent: "回饋已提交，謝謝！", rating: "評分", category: "類型", back: "返回", general: "一般", bug: "錯誤", suggestion: "建議", payment: "付款", delivery: "配送", partner: "商家", account: "帳號", failed: "提交失敗" },
} as const;

const categories: FeedbackCategory[] = ["general", "bug", "suggestion", "payment", "delivery", "partner", "account"];

export default function FeedbackScreen() {
  const { locale } = useI18n();
  const c = copy[locale];
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const send = useMutation({
    mutationFn: () => sendFeedback({ category, rating, message: message.trim(), route: "/feedback", release: `mobile-${Constants.expoConfig?.version || "1.0.0"}` }),
    onSuccess: () => { haptic.success(); setMessage(""); },
    onError: () => { haptic.warn(); toast(c.failed, "error"); },
  });
  return (
    <Screen soft>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
          <Header title={c.title} subtitle={c.sub} />
          <View style={{ paddingHorizontal: 14 }}>
            {send.isSuccess ? (
              <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.sent}>
                <View style={styles.sentIcon}><Text style={{ color: colors.white, fontSize: 22 }}>✓</Text></View>
                <Text style={styles.sentText}>{c.sent}</Text>
                <Button title={c.back} variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))} style={{ alignSelf: "stretch" }} />
              </Animated.View>
            ) : (
              <View style={[styles.card, shadow("card")]}>
                <Text style={styles.label}>{c.category}</Text>
                <OptionPills value={category} onChange={setCategory} options={categories.map((value) => ({ value, label: c[value] }))} />
                <Text style={styles.label}>{c.rating}</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <PressableScale key={n} hapticOnPress={false} onPress={() => { haptic.select(); setRating(n); }} scaleTo={0.85}>
                      <Text style={[styles.star, { opacity: n <= rating ? 1 : 0.25 }]}>★</Text>
                    </PressableScale>
                  ))}
                </View>
                <Field value={message} onChangeText={setMessage} placeholder={c.placeholder} multiline maxLength={4000} style={{ minHeight: 140 }} />
                <Button title={c.send} loading={send.isPending} disabled={!message.trim()} onPress={() => send.mutate()} />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: 22, backgroundColor: colors.white, ...shadow("card") },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink },
  stars: { flexDirection: "row", gap: 6 },
  star: { fontSize: 32, color: "#F5A524" },
  sent: { alignItems: "center", gap: 10, padding: 22, borderRadius: 22, backgroundColor: colors.brandSoft, ...shadow("card") },
  sentIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.wechat, alignItems: "center", justifyContent: "center" },
  sentText: { fontSize: 15, fontWeight: "800", color: colors.brandStrong, textAlign: "center" },
});
