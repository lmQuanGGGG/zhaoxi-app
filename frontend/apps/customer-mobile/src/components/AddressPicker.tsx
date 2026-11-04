import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { Point } from "../api/types";
import { useDebounced } from "../hooks";
import { useI18n } from "../i18n";
import { formatAddress, getLocationState, locate, searchAddress } from "../location";
import { colors, shadow } from "../theme";
import { Art3D, ArtLabel, GlassFill, PressableScale, ZxIcon } from "../ui";
import { DeliveryMap } from "./DeliveryMap";

const copy = {
  "vi-VN": { search: "Tìm đường, số nhà hoặc địa điểm", current: "Vị trí hiện tại", hint: "Kéo bản đồ hoặc chạm để đặt ghim đúng chỗ" },
  "en-US": { search: "Search street, number or place", current: "Current location", hint: "Drag the map or tap to drop the pin" },
  "zh-CN": { search: "搜索街道、门牌或地点", current: "当前位置", hint: "拖动或点击地图放置图钉" },
  "zh-TW": { search: "搜尋街道、門牌或地點", current: "目前位置", hint: "拖動或點擊地圖放置圖釘" },
} as const;

/**
 * Address search (Photon, whole of Vietnam) + draggable map pin + "current location", shared by every
 * place that asks for an address. Picking a result, moving the pin or locating fills `onChange` with the
 * point and its readable label.
 */
export function AddressPicker({ title, point, onChange }: { title?: string; point: Point | null; onChange: (point: Point, label: string | null) => void }) {
  const { locale } = useI18n();
  const c = copy[locale];
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 220);
  const results = useQuery({
    queryKey: ["geocode", "picker", debounced.trim().toLowerCase()],
    queryFn: ({ signal }) => searchAddress(debounced, signal),
    enabled: debounced.trim().length > 1,
    placeholderData: (previous) => previous,
    staleTime: 10 * 60_000,
  });
  const [locating, setLocating] = useState(false);

  const useCurrent = async () => {
    setLocating(true);
    const next = await locate(true);
    setLocating(false);
    if (next) onChange(next, getLocationState().label || null);
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.head}>
        {title ? <Text style={styles.title}>{title}</Text> : <View />}
        <PressableScale onPress={() => void useCurrent()} style={styles.current}>
          <GlassFill radius={999} tint="rgba(15,175,122,0.14)" />
          {locating ? <ActivityIndicator size="small" color={colors.header} /> : <ArtLabel kind="pin" size={16} style={styles.currentText}>{c.current}</ArtLabel>}
        </PressableScale>
      </View>
      <View style={[styles.search, shadow("card")]}>
        <Art3D kind="search" size={16} />
        <TextInput value={query} onChangeText={setQuery} placeholder={c.search} placeholderTextColor="#94A3B8" style={styles.input} returnKeyType="search" clearButtonMode="while-editing" autoCorrect={false} />
        {results.isFetching ? <ActivityIndicator size="small" color={colors.header} /> : null}
      </View>
      {results.data?.length && query.trim().length > 1 ? (
        <Animated.View entering={FadeIn.duration(160)} style={[styles.results, shadow("card")]}>
          {results.data.map((result) => (
            <PressableScale key={`${result.latitude}-${result.longitude}`} onPress={() => { setQuery(""); onChange(result, result.label); }} style={styles.result}>
              <ZxIcon name="location" size={16} color={colors.header} />
              <Text style={styles.resultText} numberOfLines={2}>{result.label}</Text>
            </PressableScale>
          ))}
        </Animated.View>
      ) : null}
      <DeliveryMap point={point} onChange={async (next) => onChange(next, await formatAddress(next))} />
      <Text style={styles.hint}>{c.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 14, fontWeight: "800", color: colors.text },
  current: { height: 34, paddingHorizontal: 14, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  currentText: { fontSize: 12, fontWeight: "700", color: colors.header },
  search: { flexDirection: "row", alignItems: "center", gap: 8, height: 46, paddingHorizontal: 14, borderRadius: 23, backgroundColor: colors.white },
  input: { flex: 1, fontSize: 14, color: colors.text },
  results: { borderRadius: 18, backgroundColor: colors.white, paddingVertical: 4 },
  result: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  resultText: { flex: 1, fontSize: 13, color: colors.text },
  hint: { fontSize: 11, color: colors.slate },
});
