import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { getModules } from "../../src/api/endpoints";
import { useI18n } from "../../src/i18n";
import { moduleRoute, resolveModules, type ServiceGroup } from "../../src/modules";
import { keys } from "../../src/query";
import { colors, font, radius, serviceColors, shadow, space } from "../../src/theme";
import { Chip, Header, Ionicons, PressableScale, Screen, ServiceIcon } from "../../src/ui";

const groups: Array<"all" | ServiceGroup> = ["all", "food", "housing", "travel", "transport", "life", "community", "finance", "support"];

export default function ServicesHub() {
  const { t, locale } = useI18n();
  const [group, setGroup] = useState<"all" | ServiceGroup>("all");
  const modules = useQuery({ queryKey: keys.modules(locale), queryFn: () => getModules(locale), staleTime: 5 * 60_000 });
  const items = useMemo(() => resolveModules(modules.data, locale).filter((item) => group === "all" || item.group === group), [modules.data, locale, group]);

  return (
    <Screen>
      <Header title={t.services.title} subtitle={t.services.subtitle} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.lg, paddingBottom: space.md }} style={{ flexGrow: 0 }}>
        {groups.map((key) => <Chip key={key} label={t.services[key]} active={group === key} onPress={() => setGroup(key)} />)}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 4, gap: 12, paddingBottom: 48 }}>
        {items.map((item, index) => {
          const palette = serviceColors[item.code] || { accent: colors.brand, tint: colors.brandSoft };
          return (
            <Animated.View key={item.code} entering={FadeInDown.delay(index * 40).duration(300)} layout={LinearTransition.springify().damping(18)}>
              <PressableScale onPress={() => router.push(moduleRoute(item.code))} scaleTo={0.98} style={[styles.card, shadow(1)]}>
                <View style={[styles.icon, { backgroundColor: palette.tint }]}><ServiceIcon code={item.code} size={44} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={font.h2} numberOfLines={1}>{item.name}</Text>
                  <Text style={[font.small, { marginTop: 3 }]} numberOfLines={2}>{item.description}</Text>
                </View>
                <View style={[styles.arrow, { backgroundColor: palette.tint }]}><Ionicons name="arrow-forward" size={16} color={palette.accent} /></View>
              </PressableScale>
            </Animated.View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder },
  icon: { width: 62, height: 62, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  arrow: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
