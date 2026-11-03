import { useQuery } from "@tanstack/react-query";
import { getColors } from "react-native-image-colors";

const rgb = (hex: string) => {
  const value = hex.replace("#", "");
  const n = parseInt(value.length === 3 ? value.split("").map((c) => c + c).join("") : value.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

/** HSL saturation × mid-lightness weight: favours vivid colours, ignores white/black/grey backdrops. */
function vividness(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return s * (1 - Math.abs(l - 0.5) * 1.6);
}

/** Picks the dish's dominant vivid colour from the platform palette. */
async function dominantColor(uri: string, fallback: string) {
  const result = await getColors(uri, { fallback, cache: true, key: uri, quality: "low" });
  const candidates =
    result.platform === "ios" ? [result.primary, result.secondary, result.detail, result.background]
    : result.platform === "android" ? [result.vibrant, result.dominant, result.darkVibrant, result.muted]
    : [result.vibrant, result.dominant, result.muted];
  const valid = candidates.filter((c): c is string => typeof c === "string" && /^#?[0-9a-f]{6}/i.test(c));
  const best = valid.sort((a, b) => vividness(b) - vividness(a))[0];
  return best && vividness(best) > 0.08 ? (best.startsWith("#") ? best : `#${best}`) : fallback;
}

/** Dominant colour of an image (cached per URL), `fallback` while loading or when there is no image. */
export function useDishColor(uri: string | undefined, fallback: string) {
  const query = useQuery({
    queryKey: ["dish-color", uri],
    queryFn: () => dominantColor(uri as string, fallback),
    enabled: Boolean(uri),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });
  return query.data || fallback;
}
