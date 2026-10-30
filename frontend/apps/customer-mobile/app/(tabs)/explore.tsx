import { useQuery } from "@tanstack/react-query";
import { localizeServiceModuleName, localizeServiceName } from "@zhaoxi/i18n";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getModules, getRecommendations, searchDiscovery } from "../../src/api/endpoints";
import { TAB_BAR_SPACE } from "../../src/constants";
import { imageUri, money } from "../../src/format";
import { useDebounced } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { routeForWebHref } from "../../src/links";
import { moduleRoute, resolveModules } from "../../src/modules";
import { keys } from "../../src/query";
import { colors, font, radius, shadow, space } from "../../src/theme";
import { AppImage, Chip, EmptyState, Ionicons, PressableScale, Screen, SectionTitle, ServiceBadge, SkeletonList } from "../../src/ui";

const suggestions: Record<string, string[]> = {
  "vi-VN": ["Lẩu", "Thuê nhà gần biển", "Visa", "Phiên dịch", "Thuê xe", "Bà Nà"],
  "en-US": ["Hotpot", "Beach apartment", "Visa", "Interpreter", "Car rental", "Ba Na"],
  "zh-CN": ["火锅", "海边租房", "签证", "翻译", "租车", "巴拿山"],
  "zh-TW": ["火鍋", "海邊租房", "簽證", "翻譯", "租車", "巴拿山"],
};

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { t, locale } = useI18n();
  const [query, setQuery] = useState(params.q || "");
  const [module, setModule] = useState<string | undefined>();
  useEffect(() => { if (params.q) setQuery(params.q); }, [params.q]);
  const debounced = useDebounced(query.trim(), 300);
  const modules = useQuery({ queryKey: keys.modules(locale), queryFn: () => getModules(locale), staleTime: 5 * 60_000 });
  const tiles = useMemo(() => resolveModules(modules.data, locale).filter((m) => m.code !== "emergency" && m.code !== "payment"), [modules.data, locale]);
  const results = useQuery({ queryKey: keys.search(debounced, locale, module), queryFn: () => searchDiscovery(debounced, locale, module), enabled: debounced.length > 0 || Boolean(module), placeholderData: (previous) => previous });
  const recs = useQuery({ queryKey: keys.recommendations(locale), queryFn: () => getRecommendations(locale) });
  const searching = debounced.length > 0 || Boolean(module);

  return (
    <Screen>
      <View style={styles.top}>
        <Text style={[font.h1, { marginBottom: 12 }]}>{t.search.title}</Text>
        <View style={[styles.search, shadow(1)]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput value={query} onChangeText={setQuery} placeholder={t.search.placeholder} placeholderTextColor={colors.textMuted} style={styles.input} returnKeyType="search" clearButtonMode="while-editing" autoCorrect={false} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
          <Chip label={t.services.all} active={!module} onPress={() => setModule(undefined)} />
          {tiles.map((tile) => <Chip key={tile.code} label={tile.name} active={module === tile.code} onPress={() => setModule(module === tile.code ? undefined : tile.code)} />)}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: TAB_BAR_SPACE }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        {!searching ? (
          <>
            <SectionTitle title={t.search.trending} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(suggestions[locale] || suggestions["vi-VN"]!).map((word) => <Chip key={word} icon="trending-up" label={word} onPress={() => setQuery(word)} />)}
            </View>
            <SectionTitle title={t.home.recommend} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {(recs.data?.items || []).slice(0, 8).map((item, index) => (
                <Animated.View key={`${item.kind}-${item.id}`} entering={FadeInDown.delay(index * 40)} style={{ width: "47.5%" }}>
                  <PressableScale onPress={() => router.push(routeForWebHref(item.href))} style={[styles.tile, shadow(1)]}>
                    <AppImage uri={imageUri(item.imageUrl)} fallbackCode={item.moduleCode} style={styles.tileImage} />
                    <View style={{ padding: 10, gap: 2 }}>
                      <Text style={font.h3} numberOfLines={1}>{localizeServiceName(locale, item.title)}</Text>
                      <Text style={font.tiny} numberOfLines={1}>{localizeServiceModuleName(locale, item.moduleCode)}</Text>
                      {Number(item.priceFrom || 0) > 0 ? <Text style={styles.price}>{money(item.priceFrom, item.currency)}</Text> : null}
                    </View>
                  </PressableScale>
                </Animated.View>
              ))}
            </View>
            <SectionTitle title={t.services.title} action={t.common.more} onAction={() => router.push("/services")} />
            <View style={{ gap: 10 }}>
              {tiles.slice(0, 5).map((tile) => (
                <PressableScale key={tile.code} onPress={() => router.push(moduleRoute(tile.code))} style={styles.row}>
                  <ServiceBadge code={tile.code} size={44} />
                  <View style={{ flex: 1 }}><Text style={font.h3}>{tile.name}</Text><Text style={font.tiny} numberOfLines={1}>{tile.description}</Text></View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </PressableScale>
              ))}
            </View>
          </>
        ) : results.isPending ? <View style={{ marginTop: 12 }}><SkeletonList count={5} /></View> : (
          <>
            {results.data?.partners?.length ? (
              <>
                <SectionTitle title={t.search.partners} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {results.data.partners.map((partner) => (
                    <PressableScale key={partner.id} onPress={() => router.push(partner.moduleCode === "food" ? `/restaurant/${partner.id}` : routeForWebHref(partner.href || "/"))} style={styles.partner}>
                      <ServiceBadge code={partner.moduleCode} size={40} />
                      <Text style={font.h3} numberOfLines={2}>{partner.name}</Text>
                      {partner.serviceCount ? <Text style={font.tiny}>{partner.serviceCount} {t.common.items}</Text> : null}
                    </PressableScale>
                  ))}
                </ScrollView>
              </>
            ) : null}
            <SectionTitle title={t.search.services} />
            {results.data?.services?.length ? (
              <View style={{ gap: 10 }}>
                {results.data.services.map((item, index) => (
                  <Animated.View key={item.id} entering={FadeInDown.delay(Math.min(index, 8) * 30)}>
                    <PressableScale onPress={() => router.push(`/service/${item.id}`)} style={styles.row}>
                      <AppImage uri={imageUri(item.imageUrl)} fallbackCode={item.moduleCode} style={{ width: 56, height: 56, borderRadius: 14 }} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={font.h3} numberOfLines={1}>{localizeServiceName(locale, item.name)}</Text>
                        <Text style={font.tiny} numberOfLines={1}>{item.organizationName || localizeServiceModuleName(locale, item.moduleCode, item.moduleName)}</Text>
                        {Number(item.priceFrom || 0) > 0 ? <Text style={styles.price}>{money(item.priceFrom, item.currency)}</Text> : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </PressableScale>
                  </Animated.View>
                ))}
              </View>
            ) : <EmptyState icon="search-outline" title={t.search.empty} action={t.browse.ask} onAction={() => router.push("/support")} />}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm },
  search: { flexDirection: "row", alignItems: "center", gap: 8, height: 50, paddingHorizontal: 16, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft },
  input: { flex: 1, fontSize: 15, color: colors.text },
  tile: { borderRadius: radius.lg, backgroundColor: colors.white, overflow: "hidden" },
  tileImage: { width: "100%", height: 110 },
  price: { color: colors.price, fontWeight: "800", fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder },
  partner: { width: 140, padding: 12, gap: 8, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft },
});
