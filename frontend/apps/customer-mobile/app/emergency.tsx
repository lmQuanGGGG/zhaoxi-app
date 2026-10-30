import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { TAB_BAR_SPACE } from "../src/constants";
import { useI18n } from "../src/i18n";
import { colors, shadow } from "../src/theme";
import { Header, PressableScale, Screen, ZxIcon, haptic, type ZxIconName } from "../src/ui";

// Same content as the PWA emergency page (khan-cap/page.tsx).
const data = {
  "zh-CN": { title: "紧急帮助", hint: "选择需要的帮助，赵喜助手会先提供基础指引。如需在线人工一对一服务，可在助手中申请付费支持。", items: [["medical", "医疗急救", "医院、急救与医疗沟通"], ["police", "报警与证件遗失", "报警、证件遗失与语言协助"], ["road", "道路救援与事故", "车辆救援、事故沟通与定位"], ["passport", "领事协助", "官方联系方式与沟通准备"]], hotline: "紧急电话" },
  "zh-TW": { title: "緊急幫助", hint: "選擇需要的幫助，趙喜助手會先提供基礎指引。如需線上人工一對一服務，可在助手中申請付費支援。", items: [["medical", "醫療急救", "醫院、急救與醫療溝通"], ["police", "報警與證件遺失", "報警、證件遺失與語言協助"], ["road", "道路救援與事故", "車輛救援、事故溝通與定位"], ["passport", "領事協助", "官方聯絡方式與溝通準備"]], hotline: "緊急電話" },
  "vi-VN": { title: "Hỗ trợ khẩn cấp", hint: "Chọn nội dung cần hỗ trợ. Trợ lý ZhaoXi sẽ cung cấp hướng dẫn cơ bản trước; hỗ trợ nhân viên Online 1-1 có thể được yêu cầu trong trợ lý và là dịch vụ có phí.", items: [["medical", "Cấp cứu y tế", "Bệnh viện, cấp cứu và hỗ trợ giao tiếp y tế"], ["police", "Công an & mất giấy tờ", "Trình báo, thất lạc giấy tờ và hỗ trợ ngôn ngữ"], ["road", "Cứu hộ xe & tai nạn", "Cứu hộ phương tiện, tai nạn và xác định vị trí"], ["passport", "Hỗ trợ lãnh sự", "Thông tin liên hệ chính thức và chuẩn bị trao đổi"]], hotline: "Gọi khẩn cấp" },
  "en-US": { title: "Emergency help", hint: "Choose the help you need. ZhaoXi Assistant provides basic guidance first; paid 1-to-1 online staff support can be requested inside the assistant.", items: [["medical", "Medical emergency", "Hospital, emergency and medical communication"], ["police", "Police & lost documents", "Police reports, lost documents and language help"], ["road", "Roadside rescue & accidents", "Vehicle rescue, accident communication and location"], ["passport", "Consular assistance", "Official contacts and communication preparation"]], hotline: "Emergency calls" },
} as const;

const hotlines = [["113", "police"], ["114", "emergency"], ["115", "medical"]] as const;

export default function EmergencyScreen() {
  const { locale } = useI18n();
  const c = data[locale];
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}>
        <Header title={c.title} subtitle={c.hint} />
        <View style={{ paddingHorizontal: 14, gap: 12, paddingTop: 6 }}>
          {c.items.map(([icon, title, desc], index) => (
            <Animated.View key={icon} entering={FadeInDown.delay(index * 40).duration(260)}>
              <PressableScale onPress={() => router.push({ pathname: "/support", params: { subject: title } })} scaleTo={0.985} style={[styles.choice, shadow("soft")]}>
                <View style={styles.icon}>
                  <LinearGradient colors={["rgba(220,105,81,0.16)", "rgba(139,116,202,0.15)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 10 }]} />
                  <ZxIcon name={icon as ZxIconName} size={23} color="#D47763" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.desc}>{desc}</Text>
                </View>
                <ZxIcon name="chevron" size={20} color={colors.text} />
              </PressableScale>
            </Animated.View>
          ))}
          <View style={styles.hotlines}>
            <Text style={styles.hotlineTitle}>{c.hotline}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {hotlines.map(([number, icon]) => (
                <PressableScale key={number} onPress={() => { haptic.warn(); void Linking.openURL(`tel:${number}`); }} style={styles.hotline}>
                  <ZxIcon name={icon} size={16} color="#B42318" />
                  <Text style={styles.hotlineNumber}>{number}</Text>
                </PressableScale>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  choice: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.86)", borderWidth: 1, borderColor: colors.borderWarm },
  icon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "600", color: colors.text },
  desc: { fontSize: 13, color: colors.textMuted, marginTop: 3, lineHeight: 19 },
  hotlines: { marginTop: 4, gap: 8 },
  hotlineTitle: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  hotline: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: 12, backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#FECDD3" },
  hotlineNumber: { fontSize: 15, fontWeight: "800", color: "#B42318" },
});
