import { Platform, type ViewStyle } from "react-native";

// Design tokens measured from the running customer PWA (getComputedStyle at a
// 402px mobile viewport) so the native app renders the same colours, radii,
// shadows and type scale.
export const colors = {
  // brand
  brand: "#0FAF7A", // eyebrows, accents
  wechat: "#07C160", // primary buttons, active chips, + buttons
  brandStrong: "#078343", // text on soft green
  brandDeep: "#183F35", // banner, dark chips, active dock icon
  brandSoft: "#ECFDF5",
  brandMint: "#E2F0E8",
  brandGlow: "rgba(15,175,122,0.22)",
  // surfaces
  bg: "#FFFFFF",
  bgSoft: "#F5F7FA", // cart / checkout pages
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC", // menu cards, info cards
  glass: "rgba(255,255,255,0.74)",
  glassBorder: "rgba(255,255,255,0.92)",
  topbar: "rgba(246,244,239,0.72)",
  // lines
  border: "#E2E8F0",
  borderSoft: "#EEF2F6",
  borderWarm: "#E5DED3",
  // text
  text: "#18211E",
  ink: "#1E293B", // slate text used inside cards
  navy: "#13213A",
  textSecondary: "#68716C",
  slate: "#64748B",
  textMuted: "#898F8B",
  // status
  danger: "#EF4444",
  dangerText: "#DC2626",
  dangerSoft: "#FFF1F2",
  price: "#DC2626",
  priceRose: "#E11D48",
  warning: "#B45309",
  warningSoft: "#FFF7ED",
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

export const radius = { xs: 9, sm: 12, md: 16, lg: 20, xl: 22, xxl: 24, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 14, gutter: 16, xl: 20, xxl: 28 } as const;

export const font = {
  h1: { fontSize: 20, fontWeight: "700", color: colors.text },
  hero: { fontSize: 23, fontWeight: "800", letterSpacing: -0.3, color: colors.white },
  h2: { fontSize: 18, fontWeight: "700", color: colors.ink },
  h3: { fontSize: 15, fontWeight: "700", color: colors.ink },
  body: { fontSize: 14, color: colors.text },
  small: { fontSize: 12, color: colors.textSecondary },
  tiny: { fontSize: 10, color: colors.textMuted },
  eyebrow: { fontSize: 10, color: colors.brand, letterSpacing: 1 },
} as const;

type ShadowSpec = { color: string; opacity: number; radius: number; y: number };
const shadowSpec: Record<"card" | "soft" | "float" | "dock" | "banner" | "search", ShadowSpec> = {
  card: { color: "#0F172A", opacity: 0.075, radius: 34, y: 10 }, // soft diffused card shadow, cards have no border
  soft: { color: "#18211E", opacity: 0.09, radius: 40, y: 14 }, // larger floating cards
  float: { color: "#0F172A", opacity: 0.09, radius: 40, y: 14 }, // restaurant card
  dock: { color: "#18211E", opacity: 0.12, radius: 32, y: 12 }, // 0 12px 36px rgba(24,33,30,.1)
  banner: { color: "#183F35", opacity: 0.2, radius: 26, y: 14 }, // 0 14px 28px rgba(24,63,53,.18)
  search: { color: "#18211E", opacity: 0.08, radius: 22, y: 10 }, // 0 10px 24px rgba(24,33,30,.08)
};

export function shadow(kind: keyof typeof shadowSpec | 1 | 2 | 3 = "card"): ViewStyle {
  const key = kind === 1 ? "card" : kind === 2 ? "soft" : kind === 3 ? "dock" : kind;
  const spec = shadowSpec[key];
  return Platform.select<ViewStyle>({
    ios: { shadowColor: spec.color, shadowOpacity: spec.opacity, shadowRadius: spec.radius / 2, shadowOffset: { width: 0, height: spec.y } },
    android: { elevation: Math.round(spec.radius / 6) },
    default: {},
  });
}
