import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../src/i18n";
import { miniAppRegistry } from "../src/miniapps/registry";
import { colors, shadow } from "../src/theme";
import { Header, PressableScale, Screen } from "../src/ui";

const copy = {
  "vi-VN": { title: "Mini app", subtitle: "Ứng dụng chạy bên trong ZhaoXi", note: "Mini app tải về theo phiên bản, được ZhaoXi kiểm chữ ký trước khi mở." },
  "en-US": { title: "Mini apps", subtitle: "Apps that run inside ZhaoXi", note: "Mini apps are downloaded per version and signature-checked by ZhaoXi before opening." },
  "zh-CN": { title: "小程序", subtitle: "在赵喜内运行的应用", note: "小程序按版本下载，打开前由赵喜校验签名。" },
  "zh-TW": { title: "小程式", subtitle: "在趙喜內執行的應用", note: "小程式按版本下載，開啟前由趙喜驗證簽章。" },
} as const;

export default function MiniAppsScreen() {
  const { locale } = useI18n();
  const c = copy[locale];
  return (
    <Screen soft>
      <Header title={c.title} subtitle={c.subtitle} />
      <ScrollView contentContainerStyle={styles.list}>
        {miniAppRegistry.map((entry) => (
          <PressableScale key={entry.id} onPress={() => router.push(`/miniapp/${encodeURIComponent(entry.id)}`)} style={[styles.card, shadow("card")]}>
            <View style={[styles.tile, { backgroundColor: `${entry.tint}1A` }]}>
              <Ionicons name={entry.icon} size={26} color={entry.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{entry.title[locale]}</Text>
              <Text style={styles.sub} numberOfLines={2}>{entry.subtitle[locale]}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </PressableScale>
        ))}
        <Text style={styles.note}>{c.note}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 22, backgroundColor: colors.surface },
  tile: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 16, fontWeight: "800", color: colors.ink },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  note: { fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 8, paddingHorizontal: 12 },
});
