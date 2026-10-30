import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, shadow } from "../theme";
import { PressableScale } from "../ui";

// Shared pieces of the PWA notification / message centers (customer-center.module.css).

export function CenterChip({ label, active, onPress, count }: { label: string; active: boolean; onPress: () => void; count?: number }) {
  return (
    <PressableScale onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}{count ? ` ${count}` : ""}</Text>
    </PressableScale>
  );
}

/** Light pill with the PWA's "pressed paper" bottom shadow. */
export function SoftButton({ label, onPress, dark }: { label: string; onPress: () => void; dark?: boolean }) {
  return (
    <PressableScale onPress={onPress} style={[styles.soft, dark && styles.softDark]}>
      <Text style={[styles.softText, dark && { color: colors.white }]}>{label}</Text>
    </PressableScale>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable hitSlop={8} onPress={onPress}><Text style={styles.link}>{label}</Text></Pressable>;
}

export function CenterEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={[styles.empty, shadow("soft")]}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#F1F4F2", alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: "#22C55E", ...shadow("card") },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  soft: { minHeight: 34, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#F3F4F3", alignItems: "center", justifyContent: "center", shadowColor: "#71371B", shadowOpacity: 0.16, shadowRadius: 0, shadowOffset: { width: 0, height: 4 } },
  softDark: { backgroundColor: colors.brandDeep },
  softText: { fontSize: 11.5, fontWeight: "500", color: colors.textSecondary },
  link: { fontSize: 11.5, color: colors.ink },
  empty: { minHeight: 112, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.86)", alignItems: "center", justifyContent: "center", padding: 16, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "center" },
});
