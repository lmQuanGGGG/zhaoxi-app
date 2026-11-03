import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { getModules } from "../../src/api/endpoints";
import { TAB_BAR_SPACE } from "../../src/constants";
import { useI18n } from "../../src/i18n";
import { openModule, resolveModules, type ServiceGroup } from "../../src/modules";
import { keys } from "../../src/query";
import { colors, shadow } from "../../src/theme";
import { Chip, Header, PressableScale, Screen, ServiceBadge, ZxIcon, type ZxIconName } from "../../src/ui";

const groups: Array<{ key: "all" | ServiceGroup; icon: ZxIconName }> = [
  { key: "all", icon: "services" },
  { key: "life", icon: "home" },
  { key: "food", icon: "food" },
  { key: "housing", icon: "housing" },
  { key: "travel", icon: "travel" },
  { key: "transport", icon: "car" },
  { key: "community", icon: "community" },
  { key: "finance", icon: "payment" },
  { key: "support", icon: "support" },
];

const copy = {
  "vi-VN": { title: "Trung tâm dịch vụ", subtitle: "Chọn nhóm và tìm dịch vụ phù hợp.", search: "Trung tâm dịch vụ…" },
  "en-US": { title: "Service center", subtitle: "Choose a group and find the right service.", search: "Service center…" },
  "zh-CN": { title: "服务中心", subtitle: "选择分类，找到合适的服务。", search: "服务中心…" },
  "zh-TW": { title: "服務中心", subtitle: "選擇分類，找到合適的服務。", search: "服務中心…" },
} as const;

export default function ServicesHub() {
  const { t, locale } = useI18n();
  const c = copy[locale];
  const [group, setGroup] = useState<"all" | ServiceGroup>("all");
  const [query, setQuery] = useState("");
  const modules = useQuery({ queryKey: keys.modules(locale), queryFn: () => getModules(locale), staleTime: 5 * 60_000 });
  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return resolveModules(modules.data, locale).filter((item) => (group === "all" || item.group === group) && (!needle || `${item.name} ${item.description}`.toLowerCase().includes(needle)));
  }, [modules.data, locale, group, query]);

  return (
    <Screen tab>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }} keyboardShouldPersistTaps="handled">
        <Header title={c.title} subtitle={c.subtitle} back={false} />
        <View style={{ paddingHorizontal: 14, gap: 14, paddingTop: 6 }}>
          <View style={[styles.search, shadow("card")]}>
            <ZxIcon name="search" size={17} color="#64748B" />
            <TextInput value={query} onChangeText={setQuery} placeholder={c.search} placeholderTextColor="#94A3B8" style={styles.input} clearButtonMode="while-editing" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 14 }} style={{ marginRight: -14 }}>
            {groups.map(({ key, icon }) => (
              <Chip key={key} label={t.services[key]} active={group === key} onPress={() => setGroup(key)} image={<ZxIcon name={icon} size={15} color={group === key ? colors.white : "#475569"} />} />
            ))}
          </ScrollView>
          <View style={{ gap: 10 }}>
            {items.map((item, index) => (
              <Animated.View key={item.code} entering={FadeInDown.delay(index * 35).duration(260)} layout={LinearTransition.springify().damping(18)}>
                <PressableScale onPress={() => openModule(item.code)} scaleTo={0.98} style={[styles.card, shadow("card")]}>
                  <ServiceBadge code={item.code} size={52} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                  </View>
                  <ZxIcon name="chevron" size={18} color="#64748B" />
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { height: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, fontSize: 14, color: colors.text },
  card: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 78, borderRadius: 20, backgroundColor: colors.white, ...shadow("card") },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  cardDesc: { fontSize: 12, color: colors.slate, marginTop: 3 },
});
