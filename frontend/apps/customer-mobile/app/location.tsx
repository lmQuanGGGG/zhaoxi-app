import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { type Region } from "react-native-maps";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Point } from "../src/api/types";
import { useDebounced } from "../src/hooks";
import { useI18n } from "../src/i18n";
import { formatAddress, getLocationState, locate, searchAddress, setManualLocation } from "../src/location";
import { colors, shadow } from "../src/theme";
import { BackButton, Button, Glass, ZxIcon, haptic } from "../src/ui";

const DA_NANG: Point = { latitude: 16.0544, longitude: 108.2022 };

const copy = {
  "vi-VN": { search: "Tìm đường, toà nhà, địa điểm…", current: "Dùng vị trí hiện tại", confirm: "Xác nhận vị trí", hint: "Kéo bản đồ để đặt ghim đúng chỗ", resolving: "Đang lấy địa chỉ…", noResult: "Không tìm thấy địa chỉ phù hợp", denied: "Chưa có quyền vị trí — hãy tìm hoặc kéo bản đồ", unnamed: "Vị trí đã chọn trên bản đồ" },
  "en-US": { search: "Search street, building, place…", current: "Use current location", confirm: "Confirm location", hint: "Drag the map to place the pin", resolving: "Finding address…", noResult: "No matching address", denied: "Location permission is off — search or drag the map", unnamed: "Pinned location" },
  "zh-CN": { search: "搜索街道、大楼或地点…", current: "使用当前位置", confirm: "确认位置", hint: "拖动地图，把图钉放到准确位置", resolving: "正在获取地址…", noResult: "没有找到匹配的地址", denied: "未开启定位权限——请搜索或拖动地图", unnamed: "地图上选定的位置" },
  "zh-TW": { search: "搜尋街道、大樓或地點…", current: "使用目前位置", confirm: "確認位置", hint: "拖動地圖，把圖釘放到準確位置", resolving: "正在取得地址…", noResult: "找不到符合的地址", denied: "未開啟定位權限——請搜尋或拖動地圖", unnamed: "地圖上選定的位置" },
} as const;

/** Full-screen location picker: fixed centre pin over a draggable map, address search and GPS shortcut. */
export default function LocationScreen() {
  const insets = useSafeAreaInsets();
  const { locale } = useI18n();
  const c = copy[locale];
  const map = useRef<MapView>(null);
  const start = getLocationState().point || DA_NANG;
  const [point, setPoint] = useState<Point>(start);
  const [label, setLabel] = useState(getLocationState().label);
  const [resolving, setResolving] = useState(false);
  const [query, setQuery] = useState("");
  const [denied, setDenied] = useState(false);
  const debounced = useDebounced(query, 220);
  const results = useQuery({ queryKey: ["geocode", "picker", debounced.trim().toLowerCase()], queryFn: ({ signal }) => searchAddress(debounced, signal), enabled: debounced.trim().length > 1, placeholderData: (previous) => previous, staleTime: 10 * 60_000 });
  const lift = useSharedValue(0);
  const pin = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value }] }));

  // Reverse-geocode the centre once the map settles.
  useEffect(() => {
    let alive = true;
    setResolving(true);
    const timer = setTimeout(async () => {
      const text = await formatAddress(point);
      if (alive) { setLabel(text); setResolving(false); }
    }, 350);
    return () => { alive = false; clearTimeout(timer); };
  }, [point.latitude, point.longitude]);

  const moveTo = (next: Point) => map.current?.animateToRegion({ ...next, latitudeDelta: 0.008, longitudeDelta: 0.008 } satisfies Region, 450);

  const useCurrent = async () => {
    haptic.tap();
    const here = await locate(true);
    if (here) { setDenied(false); moveTo(here); } else setDenied(true);
  };

  const confirm = () => {
    haptic.success();
    setManualLocation(point, label || c.unnamed);
    router.back();
  };

  const showResults = query.trim().length > 1;
  return (
    <View style={{ flex: 1, backgroundColor: "#E9EEF0" }}>
      <StatusBar style="dark" />
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...start, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
        showsUserLocation
        showsCompass={false}
        toolbarEnabled={false}
        onPanDrag={() => { if (lift.value === 0) lift.value = withSpring(12, { damping: 14 }); }}
        onRegionChangeComplete={(region) => {
          lift.value = withSpring(0, { damping: 12 });
          setPoint({ latitude: region.latitude, longitude: region.longitude });
        }}
      />

      {/* Fixed centre pin: the map moves underneath it */}
      <View pointerEvents="none" style={styles.pinWrap}>
        <Animated.View style={[styles.pin, pin]}>
          <View style={styles.pinHead}><ZxIcon name="location" size={20} color={colors.white} strokeWidth={2.4} /></View>
          <View style={styles.pinStem} />
        </Animated.View>
        <View style={styles.pinShadow} />
      </View>

      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <BackButton />
        <Glass style={styles.searchBox} tint="rgba(255,255,255,0.86)" interactive={false}>
          <ZxIcon name="search" size={17} color="#64748B" />
          <TextInput value={query} onChangeText={setQuery} placeholder={c.search} placeholderTextColor="#94A3B8" style={styles.searchInput} returnKeyType="search" clearButtonMode="while-editing" autoCorrect={false} />
          {results.isFetching ? <ActivityIndicator size="small" color={colors.header} /> : null}
        </Glass>
      </View>

      {showResults ? (
        <Animated.View entering={FadeIn.duration(160)} style={[styles.results, { top: insets.top + 64 }, shadow("soft")]}>
          {results.data?.length ? results.data.map((item) => (
            <Pressable
              key={`${item.latitude}-${item.longitude}`}
              onPress={() => { Keyboard.dismiss(); setQuery(""); moveTo(item); }}
              style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: "#F1F5F9" }]}
            >
              <ZxIcon name="location" size={16} color={colors.header} />
              <Text style={styles.resultText} numberOfLines={2}>{item.label}</Text>
            </Pressable>
          )) : !results.isFetching && debounced === query ? <Text style={styles.empty}>{c.noResult}</Text> : null}
        </Animated.View>
      ) : null}

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }, shadow("soft")]}>
        <Text style={styles.hint}>{denied ? c.denied : c.hint}</Text>
        <View style={styles.addressRow}>
          <View style={styles.addressIcon}><ZxIcon name="location" size={18} color={colors.header} /></View>
          <Text style={styles.address} numberOfLines={2}>{resolving ? c.resolving : label || c.unnamed}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={() => void useCurrent()} style={({ pressed }) => [styles.currentButton, pressed && { transform: [{ scale: 0.97 }] }]}>
            <ZxIcon name="location" size={16} color={colors.header} />
            <Text style={styles.currentText} numberOfLines={1}>{c.current}</Text>
          </Pressable>
          <Button title={c.confirm} variant="dark" onPress={confirm} disabled={resolving} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
  searchBox: { flex: 1, height: 46, borderRadius: 23, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 14.5, color: colors.ink },
  results: { position: "absolute", left: 14, right: 14, borderRadius: 18, backgroundColor: colors.white, paddingVertical: 6, maxHeight: 300 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  resultText: { flex: 1, fontSize: 13.5, color: colors.ink },
  empty: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: colors.slate },
  pinWrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  pin: { alignItems: "center", marginBottom: 46 },
  pinHead: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.header, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.white, shadowColor: "#00323A", shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 5 } },
  pinStem: { width: 3, height: 12, borderRadius: 2, backgroundColor: colors.header },
  pinShadow: { position: "absolute", width: 16, height: 6, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.22)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 16, paddingHorizontal: 16, gap: 12, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.white },
  hint: { fontSize: 12, color: colors.slate, fontWeight: "600" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  addressIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#E6F1F1", alignItems: "center", justifyContent: "center" },
  address: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.ink, lineHeight: 20 },
  currentButton: { height: 48, paddingHorizontal: 14, borderRadius: 24, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E6F1F1" },
  currentText: { fontSize: 13, fontWeight: "800", color: colors.header },
});
