import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { locate, useLocationState } from "../location";
import { colors, shadow } from "../theme";
import { PressableScale, ZxIcon } from "../ui";

const locationCopy = {
  "vi-VN": { title: "Vị trí hiện tại", hint: "ZhaoXi sẽ ưu tiên dịch vụ gần bạn", choose: "Chọn vị trí" },
  "en-US": { title: "Current location", hint: "ZhaoXi will prioritise services near you", choose: "Choose location" },
  "zh-CN": { title: "当前位置", hint: "赵喜将优先推荐您附近的服务", choose: "选择位置" },
  "zh-TW": { title: "目前位置", hint: "趙喜將優先推薦您附近的服務", choose: "選擇位置" },
} as const;

/** PWA `CustomerLocationBar banner`. */
export function LocationBanner() {
  const { locale, t } = useI18n();
  const location = useLocationState();
  const c = locationCopy[locale];
  return (
    <View style={[styles.locBanner, shadow("card")]}>
      <LinearGradient colors={["#F7FBFA", "#DDF4F0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.locTitle}>{c.title}</Text>
        <Text style={styles.locBody} numberOfLines={1}>{location.status === "locating" ? t.home.locating : location.label || c.hint}</Text>
      </View>
      <PressableScale onPress={() => router.push("/services/food")} style={styles.locMap}><ZxIcon name="map" size={17} color={colors.brandDeep} /></PressableScale>
      <PressableScale onPress={() => void locate(true)} style={styles.locChoose}><Text style={styles.locChooseText}>{c.choose}</Text></PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  locBanner: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 60, paddingVertical: 10, paddingLeft: 14, paddingRight: 10, borderRadius: 18 },
  locTitle: { fontSize: 11, fontWeight: "700", color: "#067647" },
  locBody: { fontSize: 13, fontWeight: "600", color: colors.ink, marginTop: 2 },
  locMap: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 2, borderColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center", ...shadow("card") },
  locChoose: { height: 40, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "rgba(236,253,245,0.9)", alignItems: "center", justifyContent: "center", shadowColor: "#047857", shadowOpacity: 0.13, shadowRadius: 7, shadowOffset: { width: 0, height: 5 } },
  locChooseText: { color: "#047857", fontSize: 14 },
});
