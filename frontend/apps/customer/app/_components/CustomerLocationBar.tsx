"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import { readSessionPoint, subscribeSessionPoint, writeSessionPoint, type SessionPoint } from "../_lib/customer-location";
import styles from "../hub.module.css";
import { CustomerIcon } from "./CustomerIcon";
import LocationPicker from "./LocationPicker";

type Context = { source: "current" | "default_address" | "profile" | "none"; point: SessionPoint | null; addressText: string; label: string };
const copy = {
  "zh-CN": { title: "当前位置", current: "当前位置", saved: "默认地址", profile: "常用位置", none: "未设置位置", useCurrent: "使用当前位置", using: "定位中…", savedHint: "将优先显示附近服务", clear: "使用已保存地址", manual: "选择位置", cancel: "取消", apply: "使用此位置", error: "无法获取位置，请检查浏览器定位权限。" },
  "zh-TW": { title: "目前位置", current: "目前位置", saved: "預設地址", profile: "常用位置", none: "尚未設定位置", useCurrent: "使用目前位置", using: "定位中…", savedHint: "將優先顯示附近服務", clear: "使用已儲存地址", manual: "選擇位置", cancel: "取消", apply: "使用此位置", error: "無法取得位置，請檢查瀏覽器定位權限。" },
  "vi-VN": { title: "Vị trí hiện tại", current: "Vị trí hiện tại", saved: "Địa chỉ mặc định", profile: "Vị trí thường dùng", none: "Chưa thiết lập vị trí", useCurrent: "Dùng vị trí hiện tại", using: "Đang định vị…", savedHint: "ZhaoXi sẽ ưu tiên dịch vụ gần bạn", clear: "Dùng địa chỉ đã lưu", manual: "Chọn vị trí", cancel: "Hủy", apply: "Dùng vị trí này", error: "Không lấy được vị trí. Hãy kiểm tra quyền định vị của trình duyệt." },
  "en-US": { title: "Current location", current: "Current location", saved: "Default address", profile: "Usual location", none: "No location set", useCurrent: "Use current location", using: "Locating…", savedHint: "ZhaoXi will prioritize nearby services", clear: "Use saved address", manual: "Choose location", cancel: "Cancel", apply: "Use this location", error: "Unable to get your location. Check browser location permission." },
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
  const [manualPoint, setManualPoint] = useState<SessionPoint | null>(null);

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

  function openManualLocation() { setManualPoint(point); setManualQuery(manualLabel || context?.addressText || ""); setManualOpen(true); }
  function applyManualLocation() { if (!manualPoint) return; writeSessionPoint(manualPoint); setManualLabel(manualQuery || `${manualPoint.latitude}, ${manualPoint.longitude}`); setManualOpen(false); setError(""); }

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
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15m6-12v15"/></svg>
      </button>
      <button type="button" className={styles.locationChooseButton} onClick={openManualLocation}>{t.manual}</button>
      {error && <em>{error}</em>}
      {manualOpen && typeof document !== "undefined" && createPortal(<div className={styles.locationModalBackdrop} role="presentation" onMouseDown={() => setManualOpen(false)}><section className={styles.locationModal} role="dialog" aria-modal="true" aria-label={t.manual} onMouseDown={(event) => event.stopPropagation()}>
        <LocationPicker locale={locale} address={manualQuery} point={manualPoint} onAddress={setManualQuery} onPoint={setManualPoint}/>
        <div className={styles.locationModalActions}><button type="button" onClick={() => setManualOpen(false)}>{t.cancel}</button><button type="button" onClick={applyManualLocation} disabled={!manualPoint}>{t.apply}</button></div>
      </section></div>, document.body)}
    </section>
  );
}
