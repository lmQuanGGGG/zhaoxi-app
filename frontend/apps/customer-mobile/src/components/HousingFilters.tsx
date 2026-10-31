import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import type { Service } from "../api/types";
import { num, str } from "../format";
import { useI18n } from "../i18n";
import { colors, shadow } from "../theme";
import { Chip, PressableScale, ServiceBadge, ZxIcon } from "../ui";
import { housingStatus } from "./inquiry";
import { OptionPills } from "./pickers";

// Copy from the PWA HousingBrowser filters.
const copy = {
  "vi-VN": { all: "Tất cả", bed: "PN", price: "Khoảng giá", min: "Từ", max: "Đến", sort: "Sắp xếp", nearest: "Gần nhất", priceLow: "Giá thấp → cao", priceHigh: "Giá cao → thấp", newest: "Mới nhất", availableOnly: "Chỉ còn trống", housingRequests: "Yêu cầu thuê nhà của tôi", travelRequests: "Yêu cầu du lịch của tôi", filters: "Bộ lọc nâng cao", clear: "Xóa lọc" },
  "en-US": { all: "All", bed: "beds", price: "Price range", min: "Min", max: "Max", sort: "Sort", nearest: "Nearest", priceLow: "Price low → high", priceHigh: "Price high → low", newest: "Newest", availableOnly: "Available only", housingRequests: "My rental inquiries", travelRequests: "My travel bookings", filters: "More filters", clear: "Clear" },
  "zh-CN": { all: "全部", bed: "卧室", price: "价格", min: "最低", max: "最高", sort: "排序", nearest: "距离最近", priceLow: "价格从低到高", priceHigh: "价格从高到低", newest: "最新房源", availableOnly: "仅看可租", housingRequests: "我的租房意向", travelRequests: "我的旅游预约", filters: "更多筛选", clear: "清除" },
  "zh-TW": { all: "全部", bed: "臥室", price: "價格", min: "最低", max: "最高", sort: "排序", nearest: "距離最近", priceLow: "價格低至高", priceHigh: "價格高至低", newest: "最新房源", availableOnly: "只看可租", housingRequests: "我的租房意向", travelRequests: "我的旅遊預約", filters: "更多篩選", clear: "清除" },
} as const;

type Sort = "distance" | "priceAsc" | "priceDesc" | "newest";

/** Link card to the housing / travel tracker shown on top of those module lists. */
export function RequestsLink({ kind }: { kind: "housing" | "travel" }) {
  const { locale } = useI18n();
  const c = copy[locale];
  return (
    <PressableScale onPress={() => router.push(`/inquiries/${kind}`)} scaleTo={0.98} style={[styles.requests, shadow("card")]}>
      <ServiceBadge code={kind} size={34} />
      <Text style={styles.requestsText}>{kind === "housing" ? c.housingRequests : c.travelRequests}</Text>
      <Text style={styles.chevron}>›</Text>
    </PressableScale>
  );
}

/** PWA HousingBrowser filtering + sorting, applied on top of the text search. */
export function useHousingFilters(items: Service[]) {
  const { locale } = useI18n();
  const c = copy[locale];
  const [type, setType] = useState("");
  const [beds, setBeds] = useState(0);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [sort, setSort] = useState<Sort>("distance");
  const [expanded, setExpanded] = useState(false);
  const types = useMemo(() => [...new Set(items.map((x) => str(x.metadata?.propertyType)).filter(Boolean))], [items]);
  const shown = useMemo(() => {
    const lo = Number(minPrice || 0);
    const hi = Number(maxPrice || 0);
    const filtered = items.filter((x) => {
      const m = x.metadata || {};
      const price = num(x.priceFrom);
      if (type && str(m.propertyType) !== type) return false;
      if (beds && num(m.bedrooms) < beds) return false;
      if (lo && price < lo) return false;
      if (hi && price > hi) return false;
      if (availableOnly && housingStatus(m) !== "available") return false;
      if (m.isAvailable === false) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "priceAsc") return num(a.priceFrom) - num(b.priceFrom);
      if (sort === "priceDesc") return num(b.priceFrom) - num(a.priceFrom);
      const av = a.metadata?.adminVerified === true ? 1 : 0;
      const bv = b.metadata?.adminVerified === true ? 1 : 0;
      if (av !== bv) return bv - av;
      if (sort === "distance") return (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999);
      return str(b.metadata?.publishedAt).localeCompare(str(a.metadata?.publishedAt));
    });
  }, [items, type, beds, minPrice, maxPrice, availableOnly, sort]);
  const active = Boolean(type || beds || minPrice || maxPrice || !availableOnly || sort !== "distance");
  const clear = () => { setType(""); setBeds(0); setMinPrice(""); setMaxPrice(""); setAvailableOnly(true); setSort("distance"); };

  const ui = (
    <Animated.View layout={LinearTransition} style={{ gap: 10 }}>
      {types.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 14 }} style={{ marginRight: -14 }}>
          <Chip label={c.all} active={!type} onPress={() => setType("")} />
          {types.map((value) => <Chip key={value} label={value} active={type === value} onPress={() => setType(type === value ? "" : value)} />)}
        </ScrollView>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 14 }} style={{ marginRight: -14 }}>
        {[0, 1, 2, 3].map((value) => <Chip key={value} tone="soft" label={value ? `${value}+ ${c.bed}` : `${c.all} ${c.bed}`} active={beds === value} onPress={() => setBeds(value)} />)}
        <Chip tone="soft" label={`⚙︎ ${c.filters}`} active={expanded} onPress={() => setExpanded((v) => !v)} />
        {active ? <Chip tone="soft" label={`✕ ${c.clear}`} onPress={clear} /> : null}
      </ScrollView>
      {expanded ? (
        <Animated.View entering={FadeInDown.duration(220)} style={[styles.panel, shadow("card")]}>
          <Text style={styles.label}>{c.price} (VND)</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput value={minPrice} onChangeText={(v) => setMinPrice(v.replace(/\D/g, ""))} placeholder={c.min} placeholderTextColor="#94A3B8" keyboardType="number-pad" style={styles.input} />
            <TextInput value={maxPrice} onChangeText={(v) => setMaxPrice(v.replace(/\D/g, ""))} placeholder={c.max} placeholderTextColor="#94A3B8" keyboardType="number-pad" style={styles.input} />
          </View>
          <Text style={styles.label}>{c.sort}</Text>
          <OptionPills<Sort> value={sort} onChange={setSort} options={[{ value: "distance", label: c.nearest }, { value: "priceAsc", label: c.priceLow }, { value: "priceDesc", label: c.priceHigh }, { value: "newest", label: c.newest }]} />
          <View style={styles.switchRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><ZxIcon name="check" size={15} color={colors.brandStrong} /><Text style={styles.label}>{c.availableOnly}</Text></View>
            <Switch value={availableOnly} onValueChange={setAvailableOnly} trackColor={{ true: colors.wechat, false: "#CBD5E1" }} />
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
  return { shown, ui };
}

const styles = StyleSheet.create({
  requests: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft },
  requestsText: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.ink },
  chevron: { fontSize: 20, color: "#94A3B8" },
  panel: { gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink },
  input: { flex: 1, height: 44, borderRadius: 14, backgroundColor: "#F2F5F8", paddingHorizontal: 14, fontSize: 14, color: colors.text },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
