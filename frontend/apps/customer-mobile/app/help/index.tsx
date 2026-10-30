import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getHelpArticles } from "../../src/api/endpoints";
import { useDebounced } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { colors, font, radius, space } from "../../src/theme";
import { Button, EmptyState, Header, Ionicons, PressableScale, Screen, SkeletonList } from "../../src/ui";

export default function HelpCenter() {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim(), 300);
  const articles = useQuery({ queryKey: keys.help(locale, search), queryFn: () => getHelpArticles(locale, search), placeholderData: (previous) => previous });
  return (
    <Screen>
      <Header title={t.help.title} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 4, gap: 12, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput value={query} onChangeText={setQuery} placeholder={t.help.search} placeholderTextColor={colors.textMuted} style={{ flex: 1, fontSize: 15, color: colors.text }} />
        </View>
        {articles.isPending ? <SkeletonList count={5} image={false} /> : !(articles.data || []).length ? <EmptyState icon="help-buoy-outline" title={t.help.empty} action={t.messages.newSupport} onAction={() => router.push("/support")} /> : (articles.data || []).map((article, index) => (
          <Animated.View key={article.id} entering={FadeInDown.delay(Math.min(index, 8) * 30)}>
            <PressableScale onPress={() => router.push(`/help/${encodeURIComponent(article.slug || article.id)}`)} style={styles.row} scaleTo={0.98}>
              <View style={styles.icon}><Ionicons name="document-text" size={18} color={colors.brandStrong} /></View>
              <View style={{ flex: 1 }}>
                <Text style={font.h3}>{article.title}</Text>
                {article.summary ? <Text style={font.tiny} numberOfLines={2}>{article.summary}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </PressableScale>
          </Animated.View>
        ))}
        <Button variant="secondary" icon="headset" title={t.messages.newSupport} onPress={() => router.push("/support")} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, height: 48, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
});
