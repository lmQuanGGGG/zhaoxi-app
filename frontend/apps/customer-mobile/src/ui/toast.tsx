import { useEffect, useState, useSyncExternalStore } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { colors, shadow } from "../theme";
import { Glass } from "./glass";
import { Art3D } from "./service-icons";

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
let current: Toast | null = null;
let counter = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Show a centred HUD; a newer toast replaces the one on screen instead of stacking. */
export function toast(message: string, tone: Toast["tone"] = "success") {
  current = { id: ++counter, message, tone };
  emit();
}

function dismiss(id: number) {
  if (current?.id !== id) return;
  current = null;
  emit();
}

// Quick, barely-overshooting pop (~200ms to settle) and a shorter fade out.
const POP = { damping: 26, stiffness: 520, mass: 0.7 } as const;
const FADE_IN = { duration: 160, easing: Easing.out(Easing.cubic) };
const FADE_OUT = { duration: 150, easing: Easing.in(Easing.quad) };
const RADIUS = 30;

/**
 * iOS-style HUD in the middle of the screen: a Liquid Glass card with a clay
 * icon and a short line. Touches pass through everywhere except the card,
 * which dismisses on tap.
 */
export function ToastHost() {
  const value = useSyncExternalStore(subscribe, () => current);
  // What's drawn: outlives `value` while the card fades out.
  const [shown, setShown] = useState<Toast | null>(null);
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!value) {
      scale.value = withTiming(reduceMotion ? 1 : 0.94, FADE_OUT);
      opacity.value = withTiming(0, FADE_OUT, (finished) => { if (finished) scheduleOnRN(setShown, null); });
      return;
    }
    // Replacing a visible toast re-pops gently; a fresh one grows in from further.
    const replacing = opacity.value > 0.5;
    setShown(value);
    opacity.value = withTiming(1, FADE_IN);
    if (reduceMotion) scale.value = 1;
    else { scale.value = replacing ? 0.96 : 0.86; scale.value = withSpring(1, POP); }
    AccessibilityInfo.announceForAccessibility(value.message);
    const timer = setTimeout(() => dismiss(value.id), value.tone === "error" ? 2000 : 1700);
    return () => clearTimeout(timer);
  }, [value, reduceMotion]);

  const cardStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  if (!shown) return null;
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Animated.View pointerEvents={value ? "auto" : "none"} style={[styles.shadowBox, { maxWidth: Math.min(300, width - 64) }, cardStyle]}>
        {/* Milky backing under the glass: gives the soft shadow a body to cast from and keeps the text legible on busy or white screens. */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backing, shadow("dock")]} />
        <Pressable onPress={() => dismiss(shown.id)} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Glass style={styles.card} tint="rgba(255,255,255,0.35)" interactive={false}>
            <ToneArt tone={shown.tone} />
            <Text style={styles.text} numberOfLines={3}>{shown.message}</Text>
          </Glass>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// Clay spheres in the same style as Art3D's `check`, for the tones it has no art for.
const sphere = {
  error: { light: "#FF9A8F", dark: "#DD3B3F", glyph: <><Path d="M32 18.5v13.5" stroke="#FFFFFF" strokeWidth={4.8} strokeLinecap="round" /><Circle cx={32} cy={40} r={3} fill="#FFFFFF" /></> },
  info: { light: "#7CC3FF", dark: "#2B78DE", glyph: <><Circle cx={32} cy={19.5} r={3} fill="#FFFFFF" /><Path d="M32 27v14" stroke="#FFFFFF" strokeWidth={4.8} strokeLinecap="round" /></> },
} as const;

function ToneArt({ tone }: { tone: Toast["tone"] }) {
  if (tone === "success") return <Art3D kind="check" size={52} />;
  const { light, dark, glyph } = sphere[tone];
  const id = `toast-${tone}`;
  return (
    <Svg width={52} height={52} viewBox="0 0 64 64">
      <Defs>
        <RadialGradient id={`${id}-ground`} cx="0.5" cy="0.5" r="0.5"><Stop offset="0" stopColor="#0F172A" stopOpacity={0.22} /><Stop offset="1" stopColor="#0F172A" stopOpacity={0} /></RadialGradient>
        <RadialGradient id={id} cx="0.4" cy="0.35" r="0.7"><Stop offset="0" stopColor={light} /><Stop offset="1" stopColor={dark} /></RadialGradient>
      </Defs>
      <Ellipse cx={32} cy={56.5} rx={17} ry={3.4} fill={`url(#${id}-ground)`} />
      <Circle cx={32} cy={30} r={21} fill={`url(#${id})`} />
      {glyph}
      <Path d="M17 21c2.4-4 6.4-6.8 11-7.4" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, alignItems: "center", justifyContent: "center" },
  shadowBox: { minWidth: 156, borderRadius: RADIUS },
  backing: { borderRadius: RADIUS, backgroundColor: "rgba(255,255,255,0.86)" },
  card: { borderRadius: RADIUS, alignItems: "center", gap: 10, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 18 },
  text: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: colors.text, textAlign: "center" },
});
