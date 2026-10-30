import { Platform, type ViewStyle } from "react-native";

// Design tokens mirrored from the customer PWA (globals.css / hub.module.css).
export const colors = {
  brand: "#0FAF7A",
  brandStrong: "#078C62",
  brandSoft: "#E3F6EE",
  brandGlow: "rgba(15,175,122,0.18)",
  bg: "#F7FAF9",
  bgElevated: "#FBFDFC",
  surface: "rgba(255,255,255,0.86)",
  surfaceStrong: "#FFFFFF",
  surfaceSoft: "rgba(248,252,251,0.72)",
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.92)",
  border: "rgba(70,105,95,0.16)",
  borderSoft: "rgba(70,105,95,0.10)",
  text: "#13211E",
  textSecondary: "#5F6F6A",
  textMuted: "#87938F",
  danger: "#D65D50",
  dangerSoft: "#FFF1F0",
  warning: "#B7791F",
  warningSoft: "#FFF7E6",
  price: "#EF5A3C",
  white: "#FFFFFF",
  overlay: "rgba(8,22,19,0.45)",
} as const;

export const serviceColors: Record<string, { accent: string; tint: string }> = {
  food: { accent: "#E06D3C", tint: "#FFF0E8" },
  housing: { accent: "#4788C7", tint: "#EAF3FC" },
  visa: { accent: "#7A68C8", tint: "#F0EDFC" },
  "car-rental": { accent: "#318D8A", tint: "#E7F6F5" },
  translation: { accent: "#A46BAE", tint: "#F7ECF8" },
  travel: { accent: "#3885B8", tint: "#E9F5FB" },
  payment: { accent: "#B88925", tint: "#FFF7DD" },
  community: { accent: "#D07159", tint: "#FFF0EB" },
  market: { accent: "#7A8D3F", tint: "#F3F7E7" },
  emergency: { accent: "#D4564D", tint: "#FDECEA" },
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const font = {
  h1: { fontSize: 26, fontWeight: "800", letterSpacing: -0.6, color: colors.text },
  h2: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3, color: colors.text },
  h3: { fontSize: 15, fontWeight: "700", color: colors.text },
  body: { fontSize: 14, color: colors.text },
  small: { fontSize: 12, color: colors.textSecondary },
  tiny: { fontSize: 11, color: colors.textMuted },
} as const;

export function shadow(level: 1 | 2 | 3 = 1): ViewStyle {
  const opacity = level === 1 ? 0.06 : level === 2 ? 0.09 : 0.14;
  const radiusValue = level === 1 ? 14 : level === 2 ? 22 : 30;
  return Platform.select<ViewStyle>({
    ios: { shadowColor: "#16342C", shadowOpacity: opacity, shadowRadius: radiusValue, shadowOffset: { width: 0, height: level * 4 } },
    android: { elevation: level * 2 },
    default: {},
  });
}
