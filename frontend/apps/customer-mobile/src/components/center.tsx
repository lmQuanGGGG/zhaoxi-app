import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, shadow } from "../theme";
import { Chip, GlassFill, PressableScale, SolidFill, ZxIcon, type ZxIconName } from "../ui";

// Shared pieces of the notification / message centers, in the app's glass style.

export function CenterChip({ label, active, onPress, count }: { label: string; active: boolean; onPress: () => void; count?: number }) {
  return <Chip label={label} active={active} onPress={onPress} count={count || undefined} />;
}

/** Glass pill; `dark` is a solid petrol fill (Liquid Glass drops dark tints). */
export function SoftButton({ label, onPress, dark, icon }: { label: string; onPress: () => void; dark?: boolean; icon?: ZxIconName }) {
  return (
    <PressableScale onPress={onPress} style={styles.soft}>
      {dark ? <SolidFill radius={999} tint={colors.header} /> : <GlassFill radius={999} />}
      {icon ? <ZxIcon name={icon} size={14} color={dark ? colors.white : colors.ink} strokeWidth={2.2} /> : null}
      <Text style={[styles.softText, dark && { color: colors.white }]}>{label}</Text>
    </PressableScale>
  );
}

/** Glass pill for the petrol page header (white text on a frosted chip). */
export function HeaderPill({ label, onPress, icon }: { label?: string; onPress: () => void; icon?: ZxIconName }) {
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress} style={[styles.headerPill, !label && styles.headerRound]}>
      <GlassFill radius={999} tint="rgba(255,255,255,0.22)" />
      {icon ? <ZxIcon name={icon} size={17} color={colors.white} strokeWidth={2} /> : null}
      {label ? <Text style={styles.headerPillText}>{label}</Text> : null}
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
  soft: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 14, borderRadius: 999 },
  softText: { fontSize: 12.5, fontWeight: "600", color: colors.ink },
  headerPill: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 13, borderRadius: 999 },
  headerRound: { width: 36, paddingHorizontal: 0, justifyContent: "center" },
  headerPillText: { fontSize: 12.5, fontWeight: "700", color: colors.white },
  link: { fontSize: 12.5, fontWeight: "600", color: colors.ink },
  empty: { minHeight: 112, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.86)", alignItems: "center", justifyContent: "center", padding: 16, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "center" },
});
