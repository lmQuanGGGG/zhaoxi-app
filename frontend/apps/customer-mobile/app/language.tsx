import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { localeLabels, supportedLocales, useI18n } from "../src/i18n";
import { registerForPush } from "../src/notifications";
import { colors, font, radius, space } from "../src/theme";
import { Ionicons, PressableScale, haptic } from "../src/ui";

export default function LanguageSheet() {
  const { t, locale, setLocale } = useI18n();
  const client = useQueryClient();
  return (
    <View style={{ flex: 1, padding: space.xl, gap: 12, backgroundColor: colors.bg }}>
      <Text style={font.h1}>{t.language.title}</Text>
      <Text style={font.small}>{t.language.hint}</Text>
      {supportedLocales.map((code) => {
        const active = code === locale;
        return (
          <PressableScale key={code} onPress={() => {
            haptic.select();
            setLocale(code);
            // Localized API content (service names, notifications) refetches in the new language.
            void client.invalidateQueries();
            void registerForPush(code, false);
            setTimeout(() => router.back(), 180);
          }} style={[styles.row, active && styles.active]}>
            <Text style={{ fontSize: 26 }}>{localeLabels[code].flag}</Text>
            <Text style={[font.h3, { flex: 1 }]}>{localeLabels[code].native}</Text>
            <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={22} color={active ? colors.brand : colors.textMuted} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.borderSoft },
  active: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
});
