import { View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

/**
 * Service icon set drawn for the native app: one squircle tile per service with a
 * two-stop gradient, a soft top sheen and a white glyph accented in the tile colour.
 * Replaces the mixed 3D webp illustrations so every tile reads as one family.
 */
export const servicePalettes: Record<string, { from: string; to: string; ink: string }> = {
  food: { from: "#FFA061", to: "#EC5B2C", ink: "#D24E22" },
  housing: { from: "#6CB6F5", to: "#2F72D2", ink: "#2A66BD" },
  visa: { from: "#A898F5", to: "#6650D4", ink: "#5B47C2" },
  "car-rental": { from: "#45D0BD", to: "#12948A", ink: "#0F8278" },
  translation: { from: "#DE9AE8", to: "#A44FC0", ink: "#9343AE" },
  travel: { from: "#5FCDF4", to: "#1C8CD1", ink: "#187DBB" },
  payment: { from: "#FBCB55", to: "#E59410", ink: "#C97F08" },
  community: { from: "#FF9C86", to: "#E2564A", ink: "#C9473C" },
  market: { from: "#A8D35C", to: "#5C9A29", ink: "#4F8722" },
  emergency: { from: "#FF7A7A", to: "#D83A3A", ink: "#C22F2F" },
};
const fallback = { from: "#3FD49B", to: "#0FAF7A", ink: "#0B8F63" };

const W = "#FFFFFF";

/** Glyphs on a 24×24 grid; `ink` is the tile's dark tone for cut-outs and details. */
function Glyph({ code, ink }: { code: string; ink: string }) {
  switch (code) {
    case "food": // rice bowl + chopsticks
      return (
        <G>
          <Path d="M13.2 3.2 9.6 10.4M17.6 4 12.9 10.4" stroke={W} strokeWidth={1.7} strokeLinecap="round" />
          <Path d="M3.5 11.2h17a8.5 8.5 0 0 1-17 0Z" fill={W} />
          <Path d="M9 20.6h6" stroke={W} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M7 14.2c1.4 1.5 3 2.2 5 2.2" stroke={ink} strokeWidth={1.3} strokeLinecap="round" fill="none" opacity={0.55} />
        </G>
      );
    case "housing":
      return (
        <G>
          <Path d="M3.6 11.3 12 4l8.4 7.3v8.2a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6Z" fill={W} />
          <Path d="M2.6 11.4 12 3.2l9.4 8.2" stroke={W} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Path d="M10 21.1v-4.4a2 2 0 0 1 4 0v4.4Z" fill={ink} />
        </G>
      );
    case "visa": // passport
      return (
        <G>
          <Path d="M5.5 3.2h11.3a2.2 2.2 0 0 1 2.2 2.2v13.2a2.2 2.2 0 0 1-2.2 2.2H5.5Z" fill={W} />
          <Path d="M5.5 3.2v17.4" stroke={ink} strokeWidth={1.2} opacity={0.35} />
          <Circle cx={12.4} cy={10.2} r={3.3} stroke={ink} strokeWidth={1.4} fill="none" />
          <Path d="M9.1 10.2h6.6M12.4 6.9c1.3 1.6 1.3 5 0 6.6M12.4 6.9c-1.3 1.6-1.3 5 0 6.6" stroke={ink} strokeWidth={1.1} fill="none" />
          <Path d="M9.6 16.8h5.6" stroke={ink} strokeWidth={1.4} strokeLinecap="round" />
        </G>
      );
    case "car-rental":
      return (
        <G>
          <Path d="M6.2 10.8 7.7 7a2 2 0 0 1 1.9-1.3h4.8A2 2 0 0 1 16.3 7l1.5 3.8Z" fill={W} opacity={0.75} />
          <Path d="M3.2 12.8a2 2 0 0 1 2-2h13.6a2 2 0 0 1 2 2v3.6a1.2 1.2 0 0 1-1.2 1.2H4.4a1.2 1.2 0 0 1-1.2-1.2Z" fill={W} />
          <Circle cx={7.4} cy={17.6} r={2.1} fill={ink} stroke={W} strokeWidth={1.3} />
          <Circle cx={16.6} cy={17.6} r={2.1} fill={ink} stroke={W} strokeWidth={1.3} />
          <Path d="M5.6 13.4h1.6M16.8 13.4h1.6" stroke={ink} strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
        </G>
      );
    case "translation": // two speech bubbles: 文 / A
      return (
        <G>
          <Path d="M2.8 5.6A2.6 2.6 0 0 1 5.4 3h7.2a2.6 2.6 0 0 1 2.6 2.6v4a2.6 2.6 0 0 1-2.6 2.6H8l-3.2 2.5v-2.5h0a2.6 2.6 0 0 1-2-2.6Z" fill={W} opacity={0.72} />
          <Path d="M6.2 6.2h6M9.2 5v1.2M7.4 6.2c.4 1.6 1.6 2.8 3.4 3.3M11 6.2c-.4 1.6-1.7 2.8-3.6 3.3" stroke={ink} strokeWidth={1.1} strokeLinecap="round" fill="none" />
          <Path d="M9.4 13.1a2.6 2.6 0 0 1 2.6-2.6h6.6a2.6 2.6 0 0 1 2.6 2.6v3.9a2.6 2.6 0 0 1-2.6 2.6h-.2v2.5l-3.2-2.5H12a2.6 2.6 0 0 1-2.6-2.6Z" fill={W} />
          <Path d="M13.4 17.6l1.9-4.8 1.9 4.8M14 16.2h2.6" stroke={ink} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </G>
      );
    case "travel": // aeroplane
      return (
        <G>
          <Path d="M21 15.2v-1.7l-7.6-4.8V4.4a1.4 1.4 0 0 0-2.8 0v4.3L3 13.5v1.7l7.6-2.3v4.8l-2.1 1.5V21l3.5-1 3.5 1v-1.8l-2.1-1.5v-4.8Z" fill={W} />
        </G>
      );
    case "payment": // wallet
      return (
        <G>
          <Path d="M6 4.6h9.6a1.6 1.6 0 0 1 1.6 1.6v1.2H6Z" fill={W} opacity={0.72} />
          <Path d="M3.4 8.6A2 2 0 0 1 5.4 6.6h13.2a2 2 0 0 1 2 2v9.4a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2Z" fill={W} />
          <Path d="M14.6 11h6v4.6h-6a2.3 2.3 0 0 1 0-4.6Z" fill={ink} />
          <Circle cx={15.2} cy={13.3} r={1} fill={W} />
        </G>
      );
    case "community": // group of people
      return (
        <G>
          <Circle cx={5.8} cy={9.4} r={2.2} fill={W} opacity={0.72} />
          <Circle cx={18.2} cy={9.4} r={2.2} fill={W} opacity={0.72} />
          <Path d="M1.6 18.4a4.2 4.2 0 0 1 6.6-3.5 6.6 6.6 0 0 0-2.3 3.5ZM22.4 18.4a4.2 4.2 0 0 0-6.6-3.5 6.6 6.6 0 0 1 2.3 3.5Z" fill={W} opacity={0.72} />
          <Circle cx={12} cy={8.2} r={3.1} fill={W} />
          <Path d="M6.4 19.2a5.6 5.6 0 0 1 11.2 0Z" fill={W} />
        </G>
      );
    case "market": // storefront with awning
      return (
        <G>
          <Path d="M5 12.2V19a1.6 1.6 0 0 0 1.6 1.6h10.8A1.6 1.6 0 0 0 19 19v-6.8" fill={W} opacity={0.72} />
          <Path d="M4.4 4h15.2l1.9 5.3a2.4 2.4 0 0 1-4.6 1.2 2.6 2.6 0 0 1-4.9 0 2.6 2.6 0 0 1-4.9 0 2.4 2.4 0 0 1-4.6-1.2Z" fill={W} />
          <Path d="M9.6 4l-.8 6.5M14.4 4l.8 6.5" stroke={ink} strokeWidth={1} opacity={0.35} />
          <Path d="M10 20.6v-3.9a2 2 0 0 1 4 0v3.9Z" fill={ink} />
        </G>
      );
    case "emergency": // shield with medical cross
      return (
        <G>
          <Path d="M12 2.6 19.6 5.8v5.7c0 4.8-3.2 8.5-7.6 9.9-4.4-1.4-7.6-5.1-7.6-9.9V5.8Z" fill={W} />
          <Path d="M10.6 7.8h2.8v2.6H16v2.8h-2.6v2.6h-2.8v-2.6H8v-2.8h2.6Z" fill={ink} />
        </G>
      );
    default: // generic services grid
      return (
        <G>
          <Rect x={4} y={4} width={7} height={7} rx={2} fill={W} />
          <Rect x={13} y={4} width={7} height={7} rx={2} fill={W} opacity={0.72} />
          <Rect x={4} y={13} width={7} height={7} rx={2} fill={W} opacity={0.72} />
          <Rect x={13} y={13} width={7} height={7} rx={2} fill={W} />
        </G>
      );
  }
}

export function ServiceTile({ code, size = 48, shadow = true }: { code?: string | null; size?: number; shadow?: boolean }) {
  const key = code && servicePalettes[code] ? code : "default";
  const palette = servicePalettes[key] || fallback;
  const id = `zx-${key}`;
  const glyph = size * 0.6;
  return (
    <View
      style={[
        { width: size, height: size },
        shadow && size >= 28 ? { shadowColor: palette.to, shadowOpacity: 0.32, shadowRadius: size * 0.16, shadowOffset: { width: 0, height: size * 0.1 } } : null,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.from} />
            <Stop offset="1" stopColor={palette.to} />
          </LinearGradient>
          <LinearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={W} stopOpacity={0.34} />
            <Stop offset="0.55" stopColor={W} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} rx={28} fill={`url(#${id}-bg)`} />
        <Rect x={0} y={0} width={100} height={100} rx={28} fill={`url(#${id}-sheen)`} />
        <Rect x={0.75} y={0.75} width={98.5} height={98.5} rx={27.4} fill="none" stroke={W} strokeOpacity={0.28} strokeWidth={1.5} />
      </Svg>
      <View style={{ position: "absolute", left: (size - glyph) / 2, top: (size - glyph) / 2 }}>
        <Svg width={glyph} height={glyph} viewBox="0 0 24 24">
          <Glyph code={key} ink={palette.ink} />
        </Svg>
      </View>
    </View>
  );
}
