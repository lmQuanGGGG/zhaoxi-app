import { useQuery } from "@tanstack/react-query";
import { localizeServiceModuleName, localizeServiceName } from "@zhaoxi/i18n";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getModules, searchDiscovery } from "../src/api/endpoints";
import { TAB_BAR_SPACE } from "../src/constants";
import { imageUri, money } from "../src/format";
import { useDebounced } from "../src/hooks";
import { useI18n } from "../src/i18n";
import { resolveModules } from "../src/modules";
import { keys } from "../src/query";
import { colors, shadow } from "../src/theme";
import { ArtLabel, Art3D, AppImage, BackButton, Chip, EmptyState, PressableScale, Screen, ServiceIcon, SkeletonList, ZxIcon } from "../src/ui";

const copy = {
  "vi-VN": { title: "Khám phá dịch vụ ZhaoXi", placeholder: "Tìm nhà hàng, nhà ở, du lịch, Partner…", saved: "Tìm kiếm đã lưu", savedEmpty: "Chưa có tìm kiếm đã lưu", storefront: "Xem storefront ›", services: "Dịch vụ" },
  "en-US": { title: "Explore ZhaoXi services", placeholder: "Search restaurants, homes, travel, partners…", saved: "Saved searches", savedEmpty: "No saved searches yet", storefront: "View storefront ›", services: "Services" },
  "zh-CN": { title: "探索赵喜服务", placeholder: "搜索餐厅、住房、旅游、商家…", saved: "已保存的搜索", savedEmpty: "暂无保存的搜索", storefront: "查看店铺 ›", services: "服务" },
  "zh-TW": { title: "探索趙喜服務", placeholder: "搜尋餐廳、住房、旅遊、商家…", saved: "已儲存的搜尋", savedEmpty: "暫無儲存的搜尋", storefront: "查看店鋪 ›", services: "服務" },
} as const;

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { t, locale } = useI18n();
  const c = copy[locale];
  const [query, setQuery] = useState(params.q || "");
  const [module, setModule] = useState<string | undefined>();
  useEffect(() => { if (params.q) setQuery(params.q); }, [params.q]);
  const debounced = useDebounced(query.trim(), 300);
  const modules = useQuery({ queryKey: keys.modules(locale), queryFn: () => getModules(locale), staleTime: 5 * 60_000 });
  const tiles = useMemo(() => resolveModules(modules.data, locale).filter((m) => m.code !== "emergency" && m.code !== "payment"), [modules.data, locale]);
  const results = useQuery({ queryKey: keys.search(debounced, locale, module), queryFn: () => searchDiscovery(debounced, locale, module), placeholderData: (previous) => previous });
  const services = results.data?.services || [];
  const partners = results.data?.partners || [];

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton style={{ backgroundColor: colors.white }} />
        <ArtLabel kind="search" size={22} style={styles.title} numberOfLines={1}>{c.title}</ArtLabel>
        <PressableScale onPress={() => router.push("/favorites")} style={styles.heart}><ZxIcon name="heart" size={18} color={colors.brandStrong} strokeWidth={2} /></PressableScale>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: TAB_BAR_SPACE }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <View style={[styles.search, shadow("soft")]}>
          <TextInput value={query} onChangeText={setQuery} placeholder={c.placeholder} placeholderTextColor="#94A3B8" style={styles.input} returnKeyType="search" clearButtonMode="while-editing" autoCorrect={false} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10 }} style={{ marginHorizontal: -14, paddingHorizontal: 14 }}>
          <Chip tone="dark" label={t.services.all} active={!module} onPress={() => setModule(undefined)} />
          {tiles.map((tile) => <Chip key={tile.code} tone="dark" label={tile.name} active={module === tile.code} image={<ServiceIcon code={tile.code} size={20} />} onPress={() => setModule(module === tile.code ? undefined : tile.code)} />)}
        </ScrollView>
        <View style={[styles.saved, shadow("card")]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <ArtLabel kind="bookmark" size={18} style={styles.savedTitle}>{c.saved}</ArtLabel>
          </View>
          <Text style={styles.savedEmpty}>{c.savedEmpty}</Text>
        </View>

        {results.isPending ? <View style={{ marginTop: 14 }}><SkeletonList count={4} /></View> : (
          <>
            {partners.length ? (
              <>
                <Text style={styles.section}>Partner</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 14 }} style={{ marginRight: -14 }}>
                  {partners.map((partner) => (
                    <PressableScale key={partner.organizationId} onPress={() => router.push(`/restaurant/${partner.organizationId}`)} style={[styles.partner, shadow("card")]}>
                      <Art3D kind="store" size={30} />
                      <Text style={styles.partnerName} numberOfLines={2}>{partner.name}</Text>
                      {partner.serviceCount ? <Text style={styles.partnerMeta}>{partner.serviceCount} {c.services.toLowerCase()}</Text> : null}
                      <Text style={styles.storefront}>{c.storefront}</Text>
                    </PressableScale>
                  ))}
                </ScrollView>
              </>
            ) : null}
            <Text style={styles.section}>{c.services} · {services.length}</Text>
            {services.length ? (
              <View style={styles.grid}>
                {services.map((item, index) => (
                  <Animated.View key={item.id} entering={FadeInDown.delay(Math.min(index, 6) * 20).duration(200)} style={styles.gridItem}>
                    <PressableScale onPress={() => router.push(`/service/${item.id}`)} style={[styles.card, shadow("card")]}>
                      <AppImage uri={imageUri(item.imageUrl)} fallbackCode={item.moduleCode} style={styles.cardImage} />
                      <View style={{ padding: 10, gap: 3 }}>
                        <Text style={styles.cardModule}>{localizeServiceModuleName(locale, item.moduleCode, item.moduleName)}</Text>
                        <Text style={styles.cardTitle} numberOfLines={1}>{localizeServiceName(locale, item.name)}</Text>
                        {item.organizationName ? <Text style={styles.cardOrg} numberOfLines={2}>{item.organizationName}</Text> : null}
                        {Number(item.priceFrom || 0) > 0 ? <Text style={styles.cardPrice}>{t.common.from} {money(item.priceFrom, item.currency)}</Text> : null}
                      </View>
                    </PressableScale>
                  </Animated.View>
                ))}
              </View>
            ) : <EmptyState zx="search" title={t.search.empty} action={t.browse.ask} onAction={() => router.push("/support")} />}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  title: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: colors.ink },
  heart: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#BBF7D0", alignItems: "center", justifyContent: "center" },
  search: { marginTop: 14, height: 50, borderRadius: 14, backgroundColor: colors.white, justifyContent: "center", paddingHorizontal: 14 },
  input: { fontSize: 15, color: colors.text },
  saved: { padding: 12, borderRadius: 14, backgroundColor: colors.white, gap: 8, ...shadow("card") },
  savedTitle: { fontSize: 12, fontWeight: "700", color: colors.ink },
  savedEmpty: { fontSize: 13, color: colors.textSecondary },
  section: { fontSize: 13, fontWeight: "700", color: colors.ink, marginTop: 16, marginBottom: 10 },
  partner: { width: 148, padding: 12, borderRadius: 14, backgroundColor: colors.white, gap: 4, ...shadow("card") },
  partnerName: { fontSize: 11, fontWeight: "800", color: colors.ink, marginTop: 6 },
  partnerMeta: { fontSize: 10, color: colors.textSecondary },
  storefront: { fontSize: 10, color: colors.brandStrong, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: { width: "48.5%" },
  // No overflow clip on the card itself so the soft shadow shows; the image rounds its own top corners.
  card: { borderRadius: 14, backgroundColor: colors.white },
  cardImage: { width: "100%", height: 130, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  cardModule: { fontSize: 12, color: colors.textMuted },
  cardTitle: { fontSize: 12.5, fontWeight: "800", color: colors.text },
  cardOrg: { fontSize: 12, color: colors.ink },
  cardPrice: { fontSize: 11, fontWeight: "700", color: "#E06D3C" },
});
