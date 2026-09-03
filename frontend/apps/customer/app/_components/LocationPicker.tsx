"use client";

import { useEffect, useRef, useState } from "react";
import type { ZhaoXiLocale } from "@zhaoxi/i18n";

type Point = { latitude: number; longitude: number };
type AddressSuggestion = { coordinate: Point; label: string };
type MapLibreMap = {
  flyTo: (options: { center: [number, number]; zoom?: number; essential?: boolean }) => void;
  on: (name: string, fn: (event: { lngLat: { lat: number; lng: number } }) => void) => void;
  addControl: (control: unknown, position?: string) => void;
  remove: () => void;
};
type MapLibreMarker = {
  setLngLat: (coords: [number, number]) => MapLibreMarker;
  addTo: (map: MapLibreMap) => MapLibreMarker;
};
type MapLibre = {
  Map: new (options: Record<string, unknown>) => MapLibreMap;
  Marker: new (options?: Record<string, unknown>) => MapLibreMarker;
  NavigationControl: new (options?: Record<string, unknown>) => unknown;
};

declare global { interface Window { maplibregl?: MapLibre; } }

const copy = {
  "zh-CN": { title: "配送位置", current: "使用当前位置", locate: "正在定位…", search: "搜索街道、门牌号或地点", searching: "正在搜索地址…", find: "搜索", hint: "选择搜索结果，或点击地图调整收货位置", unavailable: "无法获取位置，请检查浏览器定位权限。", notFound: "找不到该地址，请输入更详细的信息。", mapError: "地图暂时无法加载，请检查网络后重试。" },
  "zh-TW": { title: "配送位置", current: "使用目前位置", locate: "正在定位…", search: "搜尋街道、門牌號或地點", searching: "正在搜尋地址…", find: "搜尋", hint: "選擇搜尋結果，或點擊地圖調整收貨位置", unavailable: "無法取得位置，請檢查瀏覽器定位權限。", notFound: "找不到該地址，請輸入更詳細的資訊。", mapError: "地圖暫時無法載入，請檢查網路後重試。" },
  "vi-VN": { title: "Vị trí giao hàng", current: "Dùng vị trí hiện tại", locate: "Đang định vị…", search: "Tìm đường, số nhà hoặc địa điểm", searching: "Đang tìm địa chỉ…", find: "Tìm", hint: "Chọn kết quả tìm kiếm hoặc chạm bản đồ để chỉnh điểm nhận hàng", unavailable: "Không lấy được vị trí. Hãy kiểm tra quyền định vị của trình duyệt.", notFound: "Không tìm thấy địa chỉ. Hãy nhập thêm số nhà, tên đường hoặc phường.", mapError: "Chưa tải được bản đồ. Hãy kiểm tra mạng rồi thử lại." },
  "en-US": { title: "Delivery location", current: "Use current location", locate: "Locating…", search: "Search street, house number or place", searching: "Searching addresses…", find: "Search", hint: "Choose a result or click the map to adjust the delivery point", unavailable: "Unable to get your location. Check browser location permission.", notFound: "Address not found. Add a house number, street, or ward.", mapError: "The map could not load. Check your connection and try again." },
} as const;

const DEFAULT_POINT: Point = { latitude: 16.047079, longitude: 108.20623 };
// OpenFreeMap's Bright style is rendered from OpenStreetMap data. It avoids
// the intermittent direct-tile blocking seen with tile.openstreetmap.org.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";

function loadMapLibre() {
  if (typeof window === "undefined") return Promise.reject(new Error("browser-only"));
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  return new Promise<MapLibre>((resolve, reject) => {
    if (!document.querySelector('link[data-zhaoxi-maplibre]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css";
      link.dataset.zhaoxiMaplibre = "true";
      document.head.appendChild(link);
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-zhaoxi-maplibre]');
    if (existing) {
      existing.addEventListener("load", () => window.maplibregl ? resolve(window.maplibregl) : reject(new Error("maplibre-missing")), { once: true });
      existing.addEventListener("error", () => reject(new Error("maplibre-load-failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js";
    script.async = true;
    script.dataset.zhaoxiMaplibre = "true";
    script.onload = () => window.maplibregl ? resolve(window.maplibregl) : reject(new Error("maplibre-missing"));
    script.onerror = () => reject(new Error("maplibre-load-failed"));
    document.body.appendChild(script);
  });
}

export default function LocationPicker({ locale, address, point, onAddress, onPoint }: {
  locale: ZhaoXiLocale;
  address: string;
  point: Point | null;
  onAddress: (value: string) => void;
  onPoint: (value: Point) => void;
}) {
  const t = copy[locale];
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const selectedAddressRef = useRef("");
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadMapLibre().then((maplibregl) => {
      if (cancelled || !mapNode.current || mapRef.current) return;
      const center = point || DEFAULT_POINT;
      const map = new maplibregl.Map({
        container: mapNode.current,
        style: MAP_STYLE,
        center: [center.longitude, center.latitude],
        zoom: 14.2,
        attributionControl: true,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), "top-right");
      markerRef.current = new maplibregl.Marker({ color: "#079b68", scale: 1.05 }).setLngLat([center.longitude, center.latitude]).addTo(map);
      map.on("click", async (event) => {
        const next = { latitude: Number(event.lngLat.lat.toFixed(7)), longitude: Number(event.lngLat.lng.toFixed(7)) };
        markerRef.current?.setLngLat([next.longitude, next.latitude]);
        onPoint(next);
        try {
          const res = await fetch(`/api/delivery-distance?lat=${next.latitude}&lon=${next.longitude}`);
          const json = await res.json() as { label?: string };
          if (json?.label) {
            selectedAddressRef.current = json.label;
            onAddress(json.label);
          }
        } catch {}
      });
      mapRef.current = map;
    }).catch(() => setError(t.mapError));
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!point) return;
    mapRef.current?.flyTo({ center: [point.longitude, point.latitude], zoom: 15.5, essential: true });
    markerRef.current?.setLngLat([point.longitude, point.latitude]);
  }, [point?.latitude, point?.longitude]);

  useEffect(() => {
    const query = address.trim();
    if (selectedAddressRef.current === query) {
      selectedAddressRef.current = "";
      return;
    }
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/delivery-distance?limit=5&address=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json() as { results?: AddressSuggestion[] };
        if (!response.ok) throw new Error("not-found");
        setSuggestions(data.results || []);
        setShowSuggestions(Boolean(data.results?.length));
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 120);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [address]);

  function selectSuggestion(suggestion: AddressSuggestion) {
    selectedAddressRef.current = suggestion.label;
    onAddress(suggestion.label);
    onPoint(suggestion.coordinate);
    setSuggestions([]);
    setShowSuggestions(false);
    setError("");
  }

  function currentLocation() {
    setBusy(true);
    setError("");
    if (!navigator.geolocation) {
      setBusy(false);
      setError(t.unavailable);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const next = { latitude: Number(position.coords.latitude.toFixed(7)), longitude: Number(position.coords.longitude.toFixed(7)) };
        onPoint(next);
        try {
          const res = await fetch(`/api/delivery-distance?lat=${next.latitude}&lon=${next.longitude}`);
          const json = await res.json() as { label?: string };
          const resolved = json?.label || `${next.latitude}, ${next.longitude}`;
          selectedAddressRef.current = resolved;
          onAddress(resolved);
        } catch {
          if (!address.trim()) onAddress(`${next.latitude}, ${next.longitude}`);
        } finally {
          setBusy(false);
        }
      },
      () => {
        setError(t.unavailable);
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  async function geocodeAddress() {
    if (!address.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/delivery-distance?limit=5&address=${encodeURIComponent(address.trim())}`);
      const data = await response.json() as { results?: AddressSuggestion[] };
      if (!response.ok || !data.results?.length) throw new Error("not-found");
      selectSuggestion(data.results[0]);
    } catch {
      setError(t.notFound);
    } finally {
      setBusy(false);
    }
  }

  return <section style={{ display: "grid", gap: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <b>{t.title}</b>
      <button type="button" className="zx-loc-btn" onClick={currentLocation} disabled={busy} style={buttonStyle}>◎ {busy ? t.locate : t.current}</button>
    </div>
    <div style={{ position: "relative", zIndex: 10 }}>
      <div style={searchShellStyle}>
        <span aria-hidden="true" style={{ color: "#07845a", fontSize: 20 }}>⌕</span>
        <input value={address} onChange={(event) => { onAddress(event.target.value); setSuggestions([]); setShowSuggestions(true); setSearching(event.target.value.trim().length >= 3); setError(""); }} onFocus={() => suggestions.length && setShowSuggestions(true)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void geocodeAddress(); } }} placeholder={t.search} autoComplete="street-address" maxLength={300} required style={searchInputStyle}/>
        <button type="button" className="zx-loc-search-btn" onClick={() => void geocodeAddress()} disabled={busy || searching || !address.trim()} style={searchButtonStyle}>{searching ? "…" : t.find}</button>
      </div>
      {showSuggestions && (searching || suggestions.length > 0) && <div className="zx-suggestion-list" style={suggestionListStyle}>
        {searching && suggestions.length === 0 && <div style={{ padding: "13px 14px", color: "#648178", fontWeight: 650 }}>{t.searching}</div>}
        {suggestions.map((suggestion, index) => <button type="button" className="zx-suggestion-item" key={`${suggestion.coordinate.latitude}-${suggestion.coordinate.longitude}-${index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSuggestion(suggestion)} style={{...suggestionStyle, borderBottom: index < suggestions.length - 1 ? "1px solid #f1f5f9" : "none"}}>
          <span aria-hidden="true" style={{ color: "#079b68", fontSize: 16, marginTop: 2, flexShrink: 0 }}>📍</span>
          <span style={{ flex: 1, minWidth: 0, wordBreak: "break-word", fontSize: 13, lineHeight: 1.45, color: "#1e293b" }}>{suggestion.label}</span>
        </button>)}
      </div>}
    </div>
    <div ref={mapNode} style={{ height: 320, borderRadius: 22, overflow: "hidden", border: 0, background: "#eaf3ef", boxShadow: "0 12px 32px rgba(15,70,52,.12)" }}/>
    <small style={{ color: "#64748b" }}>{t.hint}</small>
    {point && <small style={{ color: "#047857" }}>✓ {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</small>}
    {error && <small style={{ color: "#be123c", fontWeight: 650 }}>{error}</small>}
  </section>;
}

const buttonStyle = { border: 0, background: "#ecfdf5", color: "#047857", borderRadius: 12, padding: "9px 14px", fontWeight: 750, cursor: "pointer", height: "auto", boxShadow: "0 2px 8px rgba(4,120,87,0.12)" } as const;
const searchShellStyle = { minHeight: 52, display: "flex", alignItems: "center", gap: 9, padding: "0 8px 0 14px", border: 0, borderRadius: 16, background: "rgba(255,255,255,.98)", boxShadow: "0 2px 8px rgba(15,23,42,.08), 0 8px 24px rgba(15,23,42,.06)" } as const;
const searchInputStyle = { flex: 1, minWidth: 0, height: 48, border: 0, outline: 0, background: "transparent", color: "#153b2f", fontSize: 15, fontWeight: 600 } as const;
const searchButtonStyle = { minWidth: 58, height: 38, border: 0, borderRadius: 11, padding: "0 12px", background: "#079b68", color: "white", fontWeight: 800, cursor: "pointer" } as const;
const suggestionListStyle = { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 9999, maxHeight: "280px", overflowY: "auto", border: 0, borderRadius: 16, background: "white", boxShadow: "0 16px 40px rgba(15,23,42,.15)", padding: "4px 0", margin: 0 } as const;
const suggestionStyle = { width: "100%", height: "auto", minHeight: "52px", maxHeight: "none", display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", border: 0, borderRadius: 0, background: "white", color: "#1e293b", textAlign: "left", fontWeight: 500, lineHeight: 1.45, cursor: "pointer", boxShadow: "none" } as const;

