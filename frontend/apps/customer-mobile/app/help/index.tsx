import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getHelpArticles } from "../../src/api/endpoints";
import { TAB_BAR_SPACE } from "../../src/constants";
import { useDebounced } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { colors, shadow } from "../../src/theme";
import { Header, PressableScale, Screen, SkeletonList, ZxIcon } from "../../src/ui";

// Copy from the PWA help page.
const copy = {
  "vi-VN": { title: "Trung tâm trợ giúp ZhaoXi", search: "Tìm câu trả lời…", empty: "Chưa có bài hướng dẫn phù hợp", support: "Vẫn cần hỗ trợ?", supportHint: "Chat trực tiếp với ZhaoXi Support", message: "Mở Message Center" },
  "en-US": { title: "ZhaoXi Help Center", search: "Search for answers…", empty: "No matching help articles", support: "Still need help?", supportHint: "Chat directly with ZhaoXi Support", message: "Open Message Center" },
  "zh-CN": { title: "赵喜帮助中心", search: "搜索答案…", empty: "暂无匹配的帮助文章", support: "仍需要帮助？", supportHint: "直接与赵喜客服聊天", message: "打开消息中心" },
  "zh-TW": { title: "趙喜幫助中心", search: "搜尋答案…", empty: "暫無符合的幫助文章", support: "仍需要協助？", supportHint: "直接與趙喜客服聊天", message: "開啟訊息中心" },
} as const;

export default function HelpCenter() {
  const { locale } = useI18n();
  const c = copy[locale];
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim(), 250);
  const articles = useQuery({ queryKey: keys.help(locale, search), queryFn: () => getHelpArticles(locale, search), placeholderData: (previous) => previous });
  const rows = articles.data || [];
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }} keyboardShouldPersistTaps="handled">
        <Header title={c.title} />
        <View style={{ paddingHorizontal: 14, gap: 12 }}>
          <View style={styles.search}>
            <ZxIcon name="search" size={17} color="#64748B" />
            <TextInput value={query} onChangeText={setQuery} placeholder={c.search} placeholderTextColor="#94A3B8" style={styles.searchInput} clearButtonMode="while-editing" returnKeyType="search" />
          </View>
          {articles.isPending ? <SkeletonList count={4} image={false} /> : rows.length ? rows.map((article, index) => (
            <Animated.View key={article.id} entering={FadeInDown.delay(Math.min(index, 8) * 30)}>
              <PressableScale onPress={() => router.push(`/help/${encodeURIComponent(article.slug || article.id)}`)} style={[styles.article, shadow("card")]} scaleTo={0.985}>
                {article.category ? <Text style={styles.category}>{article.category}</Text> : null}
                <Text style={styles.title}>{article.title}</Text>
                {article.summary ? <Text style={styles.summary} numberOfLines={2}>{article.summary}</Text> : null}
              </PressableScale>
            </Animated.View>
          )) : (
            <View style={styles.empty}>
              <Text style={{ fontSize: 32 }}>❓</Text>
              <Text style={styles.emptyText}>{c.empty}</Text>
            </View>
          )}
          <View style={styles.support}>
            <View style={{ flex: 1 }}>
              <Text style={styles.supportTitle}>{c.support}</Text>
              <Text style={styles.supportHint}>{c.supportHint}</Text>
            </View>
            <PressableScale onPress={() => router.push("/support")} style={styles.supportButton}><Text style={styles.supportButtonText}>{c.message} ›</Text></PressableScale>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 10, height: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink },
  article: { gap: 4, padding: 14, borderRadius: 16, backgroundColor: colors.white, ...shadow("card") },
  category: { fontSize: 10.5, fontWeight: "700", color: "#059669" },
  title: { fontSize: 14, fontWeight: "700", color: colors.ink },
  summary: { fontSize: 12, color: colors.slate, lineHeight: 17 },
  empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  emptyText: { fontSize: 13, color: "#94A3B8", marginTop: 8 },
  support: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, backgroundColor: "#F0FDF4", ...shadow("card") },
  supportTitle: { fontSize: 13.5, fontWeight: "700", color: "#166534" },
  supportHint: { fontSize: 12, color: "#15803D", marginTop: 2 },
  supportButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: "#059669" },
  supportButtonText: { color: colors.white, fontWeight: "800", fontSize: 12 },
});
