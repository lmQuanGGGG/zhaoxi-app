import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform, StyleSheet, View } from "react-native";

// Bản mini app của glass.tsx: giống GlassFill của host (customer-mobile/src/ui/glass.tsx).
// Liquid Glass thật trên iOS 26+, kính mờ (BlurView) ở bản cũ hơn; expo-blur và expo-glass-effect là shared module.
export const LIQUID_GLASS = Platform.OS === "ios" && isLiquidGlassAvailable();

export function GlassFill({ radius, tint }: { radius: number; tint?: string }) {
  if (LIQUID_GLASS) {
    // Không `isInteractive`: kính tương tác để lọt chạm xuống nội dung bên dưới (xem Dock của host).
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius }]}>
        <GlassView glassEffectStyle="regular" tintColor={tint} colorScheme="light" style={[StyleSheet.absoluteFill, { borderRadius: radius }]}/>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}>
      {Platform.OS === "ios" ? <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill}/> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint || (Platform.OS === "ios" ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.94)") }]}/>
    </View>
  );
}
