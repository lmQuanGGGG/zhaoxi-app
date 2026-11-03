import { StyleSheet, View } from "react-native";

/**
 * Nền kính cho thanh tab nổi và nút trên header. App Partner độc lập chưa có expo-blur /
 * expo-glass-effect trong bản native, nên dùng lớp trắng mờ; bản mini app (glass.miniapp.tsx)
 * dùng Liquid Glass thật của host ZhaoXi.
 */
export function GlassFill({ radius, tint }: { radius: number; tint?: string }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: tint || "rgba(255,255,255,0.94)" }]}/>;
}

export const LIQUID_GLASS = false;
