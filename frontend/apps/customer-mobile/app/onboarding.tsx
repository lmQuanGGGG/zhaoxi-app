import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { ONBOARDING_KEY } from "../src/constants";
import { localeLabels, supportedLocales, useI18n } from "../src/i18n";
import { registerForPush } from "../src/notifications";
import { colors, shadow } from "../src/theme";
import { PressableScale, haptic } from "../src/ui";

// Same first-run card as the PWA (`ZhaoXiFoundationApp` language gate).
const copy = {
  "zh-CN": { title: "选择语言", hint: "此选择会保存，下次打开应用时自动使用。", next: "继续" },
  "zh-TW": { title: "選擇語言", hint: "此選擇會儲存，下次開啟應用程式時自動使用。", next: "繼續" },
  "vi-VN": { title: "Chọn ngôn ngữ", hint: "Lựa chọn sẽ được lưu và tự áp dụng lần sau.", next: "Tiếp tục" },
  "en-US": { title: "Choose language", hint: "Your choice is saved and used next time.", next: "Continue" },
} as const;
const codes = { "zh-CN": "ZH", "zh-TW": "ZH", "vi-VN": "VI", "en-US": "EN" } as const;
const order = ["zh-CN", "zh-TW", "vi-VN", "en-US"] as const;

export default function Onboarding() {
  const { locale, setLocale } = useI18n();
  const c = copy[locale];
  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    haptic.success();
    router.replace("/");
    // Ask once, after the first choice — same moment the partner app uses.
    void registerForPush(locale, true);
  };
  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <Animated.View entering={FadeInDown.duration(380)} style={[styles.card, shadow("float")]}>
        <View style={styles.brand}>
          <View style={[styles.logoWrap, shadow("card")]}><Image source={require("../assets/brand-logo.png")} style={styles.logo} contentFit="cover" /></View>
          <View>
            <Text style={styles.brandName}>ZHAOXI</Text>
            <Text style={styles.brandSub}>Customer · Partner · Admin</Text>
          </View>
        </View>
        <Text style={styles.title}>{c.title}</Text>
        <Text style={styles.hint}>{c.hint}</Text>
        <View style={{ gap: 10, marginTop: 6 }}>
          {order.filter((code) => supportedLocales.includes(code)).map((code) => {
            const active = locale === code;
            return (
              <Animated.View key={code} layout={LinearTransition.springify().damping(18)}>
                <Pressable onPress={() => { haptic.select(); setLocale(code); }} style={({ pressed }) => [styles.option, active ? styles.optionActive : shadow("card"), pressed && { transform: [{ scale: 0.98 }] }]}>
                  <Text style={styles.optionText}>{localeLabels[code].native}</Text>
                  {active ? <View style={styles.check}><Text style={styles.checkText}>✓</Text></View> : <View style={styles.code}><Text style={styles.codeText}>{codes[code]}</Text></View>}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
        <PressableScale onPress={() => void finish()} style={styles.next}><Text style={styles.nextText}>{c.next}</Text></PressableScale>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F6F4EF", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 420, padding: 28, borderRadius: 30, backgroundColor: colors.white, gap: 8 },
  brand: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  logoWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.white, overflow: "hidden" },
  logo: { width: 52, height: 52 },
  brandName: { fontSize: 20, fontWeight: "700", color: "#10203A" },
  brandSub: { fontSize: 11.5, fontWeight: "600", color: "#66758D", marginTop: 4 },
  title: { fontSize: 26, fontWeight: "800", color: "#10203A" },
  hint: { fontSize: 13, color: colors.slate, marginBottom: 6 },
  option: { height: 54, borderRadius: 16, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F8FAFC" },
  optionActive: { backgroundColor: colors.brandSoft, borderWidth: 1.5, borderColor: "#10B981", shadowColor: "#059669", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  optionText: { fontSize: 15, fontWeight: "800", color: "#15233B" },
  check: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#228662", alignItems: "center", justifyContent: "center" },
  checkText: { color: colors.white, fontSize: 13, fontWeight: "900" },
  code: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  codeText: { fontSize: 10, fontWeight: "800", color: "#64748B" },
  next: { marginTop: 16, height: 50, borderRadius: 16, backgroundColor: "#228662", alignItems: "center", justifyContent: "center" },
  nextText: { color: colors.white, fontSize: 15, fontWeight: "800" },
});
