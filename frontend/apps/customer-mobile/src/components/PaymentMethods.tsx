import { File, Paths } from "expo-file-system";
import { Share, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import type { PaymentCapabilities, PaymentMethod } from "../api/types";
import { useI18n } from "../i18n";
import { paymentMethodLabels } from "../order-copy";
import { colors, shadow } from "../theme";
import { AppImage, Button, PressableScale, haptic } from "../ui";
import { toast } from "../ui/toast";

// Copy from the PWA ServiceRequestForm payment section.
const descriptions: Record<string, Record<PaymentMethod, string>> = {
  "vi-VN": { cash_on_delivery: "Thanh toán bằng tiền mặt hoặc chuyển khoản khi nhận hàng", bank_transfer: "Chuyển khoản trực tiếp qua ngân hàng", wechat_pay: "Thanh toán trực tuyến bằng WeChat Pay" },
  "zh-CN": { cash_on_delivery: "送达时支付现金或转账", bank_transfer: "银行转账付款", wechat_pay: "微信跨境在线支付" },
  "zh-TW": { cash_on_delivery: "送達時支付現金或轉帳", bank_transfer: "銀行轉帳付款", wechat_pay: "微信跨境線上支付" },
  "en-US": { cash_on_delivery: "Pay with cash or transfer on delivery", bank_transfer: "Bank transfer payment", wechat_pay: "Online payment via WeChat Pay" },
};
const copy = {
  "vi-VN": { disabled: "Chưa kích hoạt", title: "Chuyển khoản cho quán", instruction: "Lưu QR rồi mở bằng app ngân hàng để chuyển khoản. Chuyển xong hãy bấm nút bên dưới để mở khóa đặt đơn.", save: "Lưu / chia sẻ ảnh QR", confirm: "Tôi đã chuyển khoản", confirmed: "Đã xác nhận chuyển khoản", saveFailed: "Không lưu được ảnh QR" },
  "en-US": { disabled: "Not enabled", title: "Transfer to the store", instruction: "Save the QR and open it in your banking app to transfer, then confirm below to unlock order placement.", save: "Save / share QR image", confirm: "I have transferred", confirmed: "Transfer confirmed", saveFailed: "Could not save the QR image" },
  "zh-CN": { disabled: "尚未启用", title: "向商家转账", instruction: "保存二维码后用银行 App 扫码转账，完成后点击下方按钮以解锁下单。", save: "保存 / 分享二维码", confirm: "我已转账", confirmed: "已确认转账", saveFailed: "无法保存二维码" },
  "zh-TW": { disabled: "尚未啟用", title: "向商家轉帳", instruction: "儲存 QR 後用銀行 App 掃碼轉帳，完成後點擊下方按鈕以解鎖下單。", save: "儲存 / 分享 QR", confirm: "我已轉帳", confirmed: "已確認轉帳", saveFailed: "無法儲存 QR" },
} as const;

const methods: PaymentMethod[] = ["cash_on_delivery", "bank_transfer", "wechat_pay"];

/** Write a `data:image/...;base64,` QR (how partners store it) to a temp file so iOS can save or share it. */
async function shareQr(qr: string) {
  let url = qr;
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(qr);
  if (match) {
    const file = new File(Paths.cache, `zhaoxi-payment-qr.${match[1] === "jpeg" ? "jpg" : match[1]}`);
    if (file.exists) file.delete();
    file.create();
    file.write(match[2]!, { encoding: "base64" });
    url = file.uri;
  }
  await Share.share({ url });
}

export function PaymentMethods({ value, onChange, qr, capabilities, confirmed, onConfirm }: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  qr?: string;
  capabilities?: PaymentCapabilities;
  confirmed: boolean;
  onConfirm: () => void;
}) {
  const { locale } = useI18n();
  const c = copy[locale];
  // WeChat Pay needs the WeChat Open SDK (not in this build), so it stays visible but disabled like on the PWA when unconfigured.
  const enabled = (method: PaymentMethod) => method === "cash_on_delivery" || (method === "bank_transfer" ? Boolean(qr) && capabilities?.bankTransfer !== false : false);
  return (
    <View style={{ gap: 8 }}>
      {methods.map((method) => {
        const on = enabled(method);
        const selected = value === method;
        return (
          <PressableScale key={method} disabled={!on} hapticOnPress={false} onPress={() => { haptic.select(); onChange(method); }} scaleTo={0.985} style={[styles.card, selected ? styles.cardActive : shadow("card"), !on && styles.cardDisabled]}>
            <View style={[styles.radio, selected && styles.radioActive]}>{selected ? <View style={styles.radioInner} /> : null}</View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name}>{paymentMethodLabels[locale][method]}</Text>
              <Text style={styles.desc}>{descriptions[locale]?.[method]}</Text>
            </View>
            {!on ? <View style={styles.badge}><Text style={styles.badgeText}>{c.disabled}</Text></View> : null}
          </PressableScale>
        );
      })}
      {value === "bank_transfer" && qr ? (
        <Animated.View entering={FadeInDown} layout={LinearTransition} style={styles.panel}>
          <Text style={styles.panelTitle}>💳 {c.title}</Text>
          <AppImage uri={qr} contentFit="contain" style={styles.qr} />
          <Button small variant="secondary" title={c.save} onPress={() => void shareQr(qr).catch(() => toast(c.saveFailed, "error"))} style={{ alignSelf: "stretch" }} />
          <Text style={styles.instruction}>{c.instruction}</Text>
          <Button title={confirmed ? `✓ ${c.confirmed}` : c.confirm} variant={confirmed ? "dark" : "primary"} onPress={() => { haptic.success(); onConfirm(); }} style={{ alignSelf: "stretch" }} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.white },
  cardActive: { backgroundColor: "#F0FDF4", shadowColor: "#059669", shadowOpacity: 0.16, shadowRadius: 7, shadowOffset: { width: 0, height: 4 } },
  cardDisabled: { opacity: 0.55, backgroundColor: colors.surfaceMuted },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: "#059669" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#059669" },
  name: { fontSize: 13, fontWeight: "700", color: colors.ink },
  desc: { fontSize: 11, color: colors.slate, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#F1F5F9" },
  badgeText: { fontSize: 11, fontWeight: "600", color: colors.slate },
  panel: { alignItems: "center", gap: 10, marginTop: 4, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  panelTitle: { alignSelf: "flex-start", fontSize: 14, fontWeight: "800", color: colors.ink },
  qr: { width: 220, height: 220, borderRadius: 14, backgroundColor: colors.white },
  instruction: { fontSize: 13, color: "#475569", textAlign: "center", lineHeight: 18 },
});
