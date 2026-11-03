import { Ionicons } from "@expo/vector-icons";
import { useEffect, useSyncExternalStore } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, shadow } from "../theme";

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
let current: Toast | null = null;
let counter = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function toast(message: string, tone: Toast["tone"] = "success") {
  current = { id: ++counter, message, tone };
  emit();
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const value = useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => current);
  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(() => { if (current?.id === value.id) { current = null; emit(); } }, 2200);
    return () => clearTimeout(timer);
  }, [value]);
  if (!value) return null;
  const icon = value.tone === "success" ? "checkmark-circle" : value.tone === "error" ? "alert-circle" : "information-circle";
  const tint = value.tone === "error" ? colors.danger : colors.brand;
  return (
    <Animated.View key={value.id} entering={FadeInUp.duration(200)} exiting={FadeOutUp.duration(180)} pointerEvents="none" style={[styles.toast, { top: insets.top + 8 }, shadow(3)]}>
      <Ionicons name={icon} size={20} color={tint} />
      <Text style={styles.text} numberOfLines={2}>{value.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: "absolute", left: 16, right: 16, zIndex: 1000, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.97)", borderWidth: 1, borderColor: colors.glassBorder },
  text: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
});
