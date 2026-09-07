"use client";
import { useEffect, useState } from "react";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import { readSessionPoint, subscribeSessionPoint, writeSessionPoint, type SessionPoint } from "../_lib/customer-location";
import styles from "../hub.module.css";
import { CustomerIcon } from "./CustomerIcon";

type Context = { source: "current" | "default_address" | "profile" | "none"; point: SessionPoint | null; addressText: string; label: string };
type AddressSuggestion = { coordinate: SessionPoint; label: string };
const copy = {
  "zh-CN": { title: "当前位置", current: "当前位置", saved: "默认地址", profile: "常用位置", none: "未设置位置", useCurrent: "使用当前位置", using: "定位中…", savedHint: "将优先显示附近服务", clear: "使用已保存地址", manual: "手动选择", manualPlaceholder: "输入街道、区域或地点", search: "搜索", noResults: "找不到位置", error: "无法获取位置，请检查浏览器定位权限。" },
  "zh-TW": { title: "目前位置", current: "目前位置", saved: "預設地址", profile: "常用位置", none: "尚未設定位置", useCurrent: "使用目前位置", using: "定位中…", savedHint: "將優先顯示附近服務", clear: "使用已儲存地址", manual: "手動選擇", manualPlaceholder: "輸入街道、區域或地點", search: "搜尋", noResults: "找不到位置", error: "無法取得位置，請檢查瀏覽器定位權限。" },
  "vi-VN": { title: "Vị trí hiện tại", current: "Vị trí hiện tại", saved: "Địa chỉ mặc định", profile: "Vị trí thường dùng", none: "Chưa thiết lập vị trí", useCurrent: "Dùng vị trí hiện tại", using: "Đang định vị…", savedHint: "ZhaoXi sẽ ưu tiên dịch vụ gần bạn", clear: "Dùng địa chỉ đã lưu", manual: "Nhập vị trí", manualPlaceholder: "Nhập đường, khu vực hoặc địa điểm", search: "Tìm", noResults: "Không tìm thấy vị trí", error: "Không lấy được vị trí. Hãy kiểm tra quyền định vị của trình duyệt." },
  "en-US": { title: "Current location", current: "Current location", saved: "Default address", profile: "Usual location", none: "No location set", useCurrent: "Use current location", using: "Locating…", savedHint: "ZhaoXi will prioritize nearby services", clear: "Use saved address", manual: "Enter location", manualPlaceholder: "Street, area or place", search: "Search", noResults: "Location not found", error: "Unable to get your location. Check browser location permission." },
} as const;

export default function CustomerLocationBar({
  compact = false,
  inline = false,
  banner = false,
  className = "",
}: {
  compact?: boolean;
  inline?: boolean;
  banner?: boolean;
  className?: string;
}) {
  const { locale } = useZhaoXiLocale();
  const t = copy[locale];
  const [point, setPoint] = useState<SessionPoint | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [manualLabel, setManualLabel] = useState("");
  const [manualResults, setManualResults] = useState<AddressSuggestion[]>([]);
  const [manualSearching, setManualSearching] = useState(false);

  async function load(next?: SessionPoint | null) {
    const p = next === undefined ? readSessionPoint() : next;
    setPoint(p);
    const qs = p ? `?lat=${p.latitude}&lng=${p.longitude}` : "";
    try {
      const r = await fetch(`/api/customer-location-context${qs}`, { cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (j?.ok) setContext(j.data);
    } catch {}
  }

  useEffect(() => {
    const initial = readSessionPoint();
    void load(initial);
    if (!initial) locate();
    return subscribeSessionPoint((p) => void load(p));
  }, []);

  function locate() {
    if (busy) return;
    setBusy(true);
    setError("");
    if (!navigator.geolocation) {
      setBusy(false);
      setError(t.error);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          latitude: Number(pos.coords.latitude.toFixed(7)),
          longitude: Number(pos.coords.longitude.toFixed(7)),
        };
        writeSessionPoint(next);
        setManualQuery("");
        setManualLabel("");
        setBusy(false);
      },
      () => {
        setBusy(false);
        setError(t.error);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  async function searchManualLocation() {
    const query = manualQuery.trim();
    if (query.length < 3) return;
    setManualSearching(true);
    setError("");
    try {
      const response = await fetch(`/api/delivery-distance?limit=5&address=${encodeURIComponent(query)}`, { cache: "no-store" });
      const data = await response.json() as { results?: AddressSuggestion[] };
      if (!response.ok || !data.results?.length) throw new Error("not-found");
      setManualResults(data.results);
    } catch {
      setManualResults([]);
      setError(t.noResults);
    } finally { setManualSearching(false); }
  }

  function selectManualLocation(result: AddressSuggestion) {
    writeSessionPoint(result.coordinate);
    setManualQuery(result.label);
    setManualLabel(result.label);
    setManualResults([]);
    setManualOpen(false);
    setError("");
  }

  const source = point ? "current" : context?.source || "none";
  const label =
    source === "current"
      ? t.current
      : source === "default_address"
        ? t.saved
        : source === "profile"
          ? t.profile
          : t.none;

  const isBanner = banner || (!compact && !inline);
  const containerClass = isBanner
    ? styles.locationBarBanner
    : inline
      ? styles.locationBarInline
      : compact
        ? styles.locationBarCompact
        : styles.locationBar;

  return (
    <section className={`${containerClass} ${className}`}>
      <div>
        <small>{label}</small>
        <b>{busy ? t.using : manualLabel || context?.addressText || t.savedHint}</b>
      </div>
      <button type="button" className={styles.locationPin} aria-label={t.useCurrent} onClick={locate}>
        <CustomerIcon name="location" />
      </button>
      <button type="button" onClick={() => setManualOpen((open) => !open)}>{t.manual}</button>
      {manualOpen && <div style={{ gridColumn: "1 / -1", display: "grid", gap: 7, paddingTop: 4 }}>
        <div style={{ display: "flex", gap: 7 }}>
          <input value={manualQuery} onChange={(event) => setManualQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchManualLocation(); } }} placeholder={t.manualPlaceholder} style={{ minWidth: 0, flex: 1, border: "1px solid #cbd5e1", borderRadius: 9, padding: "8px 10px", fontSize: 12 }} />
          <button type="button" onClick={() => void searchManualLocation()} disabled={manualSearching}>{manualSearching ? "…" : t.search}</button>
        </div>
        {manualResults.map((result) => <button type="button" key={`${result.coordinate.latitude}-${result.coordinate.longitude}`} onClick={() => selectManualLocation(result)} style={{ textAlign: "left", background: "#fff", border: "1px solid #dbeafe", color: "#1e293b" }}>{result.label}</button>)}
      </div>}
      {error && <em>{error}</em>}
    </section>
  );
}
