import { router } from "expo-router";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useI18n } from "../src/i18n";
import { colors, font, radius, shadow, space } from "../src/theme";
import { Button, GlassCard, Header, Ionicons, PressableScale, Screen, haptic, type IconName } from "../src/ui";

export default function EmergencyScreen() {
  const { t } = useI18n();
  const lines: Array<{ icon: IconName; label: string; number: string; tint: string }> = [
    { icon: "shield", label: t.emergency.police, number: "113", tint: "#2563EB" },
    { icon: "flame", label: t.emergency.fire, number: "114", tint: "#EA580C" },
    { icon: "medkit", label: t.emergency.ambulance, number: "115", tint: colors.danger },
    { icon: "boat", label: t.emergency.rescue, number: "112", tint: "#0891B2" },
  ];
  const call = (number: string) => { haptic.warn(); void Linking.openURL(`tel:${number}`); };
  return (
    <Screen>
      <Header title={t.emergency.title} subtitle={t.emergency.subtitle} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12, paddingBottom: 48 }}>
        {lines.map((line, index) => (
          <Animated.View key={line.number} entering={FadeInDown.delay(index * 50)}>
            <PressableScale onPress={() => call(line.number)} style={[styles.card, shadow(1)]} scaleTo={0.97}>
              <View style={[styles.icon, { backgroundColor: `${line.tint}1A` }]}><Ionicons name={line.icon} size={24} color={line.tint} /></View>
              <View style={{ flex: 1 }}>
                <Text style={font.h3}>{line.label}</Text>
                <Text style={[styles.number, { color: line.tint }]}>{line.number}</Text>
              </View>
              <View style={[styles.callButton, { backgroundColor: line.tint }]}><Ionicons name="call" size={18} color={colors.white} /></View>
            </PressableScale>
          </Animated.View>
        ))}
        <GlassCard style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <Ionicons name="information-circle" size={20} color={colors.warning} />
          <Text style={[font.small, { flex: 1, lineHeight: 19 }]}>{t.emergency.tip}</Text>
        </GlassCard>
        <Button icon="language" title={t.emergency.interpret} onPress={() => router.push({ pathname: "/support", params: { subject: t.emergency.title } })} />
        <Button variant="secondary" icon="business" title={t.emergency.consulate} onPress={() => router.push({ pathname: "/support", params: { subject: t.emergency.consulate } })} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: radius.lg, backgroundColor: colors.white },
  icon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  number: { fontSize: 22, fontWeight: "900", marginTop: 2 },
  callButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
