import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

/** iOS 26+ Liquid Glass is available (real refraction); otherwise we fall back to a frosted blur. */
export const LIQUID_GLASS = Platform.OS === "ios" && isLiquidGlassAvailable();

/** Real Liquid Glass where the OS has it, frosted blur otherwise. */
export function Glass({ style, children, tint, clear = false, interactive = true }: { style?: StyleProp<ViewStyle>; children?: ReactNode; tint?: string; clear?: boolean; interactive?: boolean }) {
  if (LIQUID_GLASS) {
    return <GlassView glassEffectStyle={clear ? "clear" : "regular"} tintColor={tint} isInteractive={interactive} colorScheme="light" style={style}>{children}</GlassView>;
  }
  return (
    <View style={[style, { overflow: "hidden" }]}>
      {Platform.OS === "ios" ? <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint || "rgba(255,255,255,0.72)" }]} />
      {children}
    </View>
  );
}

/**
 * Glass background layer for a control: fills its parent (give the parent the
 * shape) and sits behind the label/icon. `tint` makes it a prominent tinted
 * glass button (iOS 26 "glassProminent"), no tint = clear/regular glass.
 */
export function GlassFill({ radius, tint, clear = false }: { radius: number; tint?: string; clear?: boolean }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: LIQUID_GLASS ? "visible" : "hidden" }]}>
      <Glass style={[StyleSheet.absoluteFill, { borderRadius: radius }]} tint={tint} clear={clear} interactive={false} />
    </View>
  );
}

/**
 * Static stand-in for `GlassFill` on controls repeated in lists (menu steppers,
 * add-to-cart): dozens of live glass layers make scrolling stutter, a flat fill costs nothing.
 */
export function SolidFill({ radius, tint }: { radius: number; tint?: string }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: tint || "#EEF2F1" }]} />;
}
