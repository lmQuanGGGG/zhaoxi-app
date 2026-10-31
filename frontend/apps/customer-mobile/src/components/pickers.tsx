import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, shadow } from "../theme";
import { PressableScale, haptic } from "../ui";

/** YYYY-MM-DD in local time (what the backend stores for move-in / visit dates). */
export function isoDay(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function nextDays(count: number, startOffset = 0) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + startOffset + index);
    return isoDay(day);
  });
}

/**
 * Native replacement for `<input type="date">`: a horizontal strip of day cards.
 * Days in `enabled` (when given) are selectable, the rest are dimmed.
 */
export function DateStrip({ days, value, onChange, locale, enabled, badges }: { days: string[]; value: string; onChange: (day: string) => void; locale: string; enabled?: Set<string>; badges?: Record<string, string> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: 1 }}>
      {days.map((day) => {
        const date = new Date(`${day}T12:00:00`);
        const active = day === value;
        const disabled = enabled ? !enabled.has(day) : false;
        return (
          <PressableScale key={day} disabled={disabled} hapticOnPress={false} onPress={() => { haptic.select(); onChange(day); }} style={[styles.day, active && styles.dayActive, active && shadow("card"), disabled && { opacity: 0.38 }]}>
            <Text style={[styles.weekday, active && { color: "rgba(255,255,255,0.85)" }]}>{date.toLocaleDateString(locale, { weekday: "short" })}</Text>
            <Text style={[styles.dayNumber, active && { color: colors.white }]}>{date.getDate()}</Text>
            <Text style={[styles.month, active && { color: "rgba(255,255,255,0.85)" }]}>{badges?.[day] ?? date.toLocaleDateString(locale, { month: "short" })}</Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

/** Wrapping row of selectable pills (time slots, contact methods, filters). */
export function OptionPills<T extends string>({ options, value, onChange }: { options: Array<{ value: T; label: string; hint?: string; disabled?: boolean }>; value: T; onChange: (value: T) => void }) {
  return (
    <View style={styles.pills}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <PressableScale key={option.value} disabled={option.disabled} hapticOnPress={false} onPress={() => { haptic.select(); onChange(option.value); }} style={[styles.pill, active && styles.pillActive, option.disabled && { opacity: 0.4 }]}>
            <Text style={[styles.pillText, active && { color: colors.white }]}>{option.label}</Text>
            {option.hint ? <Text style={[styles.pillHint, active && { color: "rgba(255,255,255,0.8)" }]}>{option.hint}</Text> : null}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  day: { width: 56, paddingVertical: 9, borderRadius: 16, alignItems: "center", gap: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  dayActive: { backgroundColor: colors.wechat, borderColor: colors.wechat },
  weekday: { fontSize: 10, fontWeight: "600", color: colors.slate, textTransform: "capitalize" },
  dayNumber: { fontSize: 18, fontWeight: "800", color: colors.ink },
  month: { fontSize: 9, fontWeight: "600", color: colors.textMuted },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { minHeight: 36, paddingHorizontal: 13, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  pillActive: { backgroundColor: colors.wechat, borderColor: colors.wechat },
  pillText: { fontSize: 13, fontWeight: "700", color: colors.ink },
  pillHint: { fontSize: 9, fontWeight: "600", color: colors.slate, marginTop: 1 },
});
