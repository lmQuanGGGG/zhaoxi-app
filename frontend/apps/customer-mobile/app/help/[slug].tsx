import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { getHelpArticle, sendHelpFeedback } from "../../src/api/endpoints";
import { useI18n } from "../../src/i18n";
import { font, space } from "../../src/theme";
import { Button, GlassCard, Header, Screen, SkeletonList } from "../../src/ui";
import { toast } from "../../src/ui/toast";

export default function HelpArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, locale } = useI18n();
  const article = useQuery({ queryKey: ["help-article", slug, locale], queryFn: () => getHelpArticle(slug, locale) });
  const feedback = useMutation({ mutationFn: (helpful: boolean) => sendHelpFeedback(slug, locale, helpful), onSettled: () => toast(t.help.thanks) });
  return (
    <Screen>
      <Header title={article.data?.title || t.help.title} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 4, gap: space.lg, paddingBottom: 48 }}>
        {article.isPending ? <SkeletonList count={3} image={false} /> : (
          <GlassCard style={{ gap: 12 }}>
            <Text style={[font.h1, { fontSize: 22 }]}>{article.data?.title}</Text>
            {article.data?.summary ? <Text style={[font.small, { lineHeight: 20 }]}>{article.data.summary}</Text> : null}
            <Text style={[font.body, { lineHeight: 23 }]}>{article.data?.body || ""}</Text>
          </GlassCard>
        )}
        <GlassCard style={{ gap: 10 }}>
          <Text style={font.h3}>{t.help.helpful}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button small icon="thumbs-up" title={t.help.yes} style={{ flex: 1 }} disabled={feedback.isSuccess} onPress={() => feedback.mutate(true)} />
            <Button small variant="secondary" icon="thumbs-down" title={t.help.no} style={{ flex: 1 }} disabled={feedback.isSuccess} onPress={() => feedback.mutate(false)} />
          </View>
        </GlassCard>
      </ScrollView>
    </Screen>
  );
}
