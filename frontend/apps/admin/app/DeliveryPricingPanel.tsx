"use client";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import { getCached, setCached } from "./_lib/client-cache";

type Window = { start: string; end: string };
type LiveWeather = {
  source: string;
  temperature?: number;
  precipitationMm: number;
  weatherCode: number | null;
  rainLevel: "none" | "light" | "moderate" | "heavy";
  surcharge: number;
};
type Policy = {
  baseFee: number;
  baseDistanceKm: number;
  perKmFee: number;
  partnerSubsidyAmount: number;
  subsidyWindows: Window[];
  timezone: string;
  maxDeliveryRadiusKm: number;
  distanceProvider: string;
  allowGeoFallback: boolean;
  enabled: boolean;
  weatherSurchargeEnabled: boolean;
  weatherLightRainFee: number;
  weatherModerateRainFee: number;
  weatherHeavyRainFee: number;
  liveWeather?: LiveWeather;
};

const fallback: Policy = {
  baseFee: 15000,
  baseDistanceKm: 2,
  perKmFee: 8000,
  partnerSubsidyAmount: 20000,
  subsidyWindows: [
    { start: "07:00", end: "10:00" },
    { start: "13:00", end: "16:00" },
  ],
  timezone: "Asia/Ho_Chi_Minh",
  maxDeliveryRadiusKm: 15,
  distanceProvider: "google_routes",
  allowGeoFallback: true,
  enabled: true,
  weatherSurchargeEnabled: true,
  weatherLightRainFee: 4000,
  weatherModerateRainFee: 7000,
  weatherHeavyRainFee: 10000,
};

const copy = {
  "zh-CN": {
    title: "配送计价与天气附加费",
    hint: "统一管理赵喜餐饮配送费、商家补贴及 Open-Meteo 实时天气附加费。",
    base: "前段基础配送费 (VND)",
    baseKm: "基础距离 (km)",
    perKm: "超出后每公里 (VND)",
    subsidy: "商家配送补贴 (VND)",
    windows: "补贴时段",
    radius: "最大配送半径 (km)",
    provider: "距离来源",
    fallback: "Google 不可用时允许直线距离备用",
    enabled: "启用配送计价",
    weatherTitle: "Open-Meteo 实时天气联动",
    weatherHint: "系统自动抓取岘港当地降水与天气实况，雨天自动叠加运费补贴骑手。",
    weatherEnabled: "启用恶劣天气自动加价",
    lightRain: "小雨附加费 (VND)",
    moderateRain: "中雨附加费 (VND)",
    heavyRain: "大雨/雷暴附加费 (VND)",
    liveWeather: "岘港当前实况",
    temp: "气温",
    precip: "降雨量",
    currentSurcharge: "当前自动加价",
    save: "保存配置",
    saved: "配置已保存成功！",
    formula: "计价公式与试算",
    customer: "顾客实际配送费",
    timezone: "时区",
  },
  "zh-TW": {
    title: "配送計價與天氣附加費",
    hint: "統一管理趙喜餐飲配送費、商家補貼及 Open-Meteo 即時天氣附加費。",
    base: "前段基礎配送費 (VND)",
    baseKm: "基礎距離 (km)",
    perKm: "超出後每公里 (VND)",
    subsidy: "商家配送補貼 (VND)",
    windows: "補貼時段",
    radius: "最大配送半徑 (km)",
    provider: "距離來源",
    fallback: "Google 不可用時允許直線距離備援",
    enabled: "啟用配送計價",
    weatherTitle: "Open-Meteo 即時天氣聯動",
    weatherHint: "系統自動抓取峴港當地降水與天氣實況，雨天自動疊加運費補貼外送員。",
    weatherEnabled: "啟用惡劣天氣自動加價",
    lightRain: "小雨附加費 (VND)",
    moderateRain: "中雨附加費 (VND)",
    heavyRain: "大雨／雷暴附加費 (VND)",
    liveWeather: "峴港目前實況",
    temp: "氣溫",
    precip: "降雨量",
    currentSurcharge: "目前自動加價",
    save: "儲存設定",
    saved: "設定已儲存成功！",
    formula: "計價公式與試算",
    customer: "顧客實際配送費",
    timezone: "時區",
  },
  "vi-VN": {
    title: "Chính sách phí giao hàng & Phụ phí thời tiết",
    hint: "Quản lý tập trung phí giao đồ ăn, trợ giá đối tác và tự động tính phụ phí thời tiết theo Open-Meteo API.",
    base: "Phí cơ bản đoạn đầu (VND)",
    baseKm: "Khoảng cách cơ bản (km)",
    perKm: "Phí mỗi km vượt mức (VND)",
    subsidy: "Nhà hàng trợ giá (VND)",
    windows: "Khung giờ trợ giá",
    radius: "Bán kính giao tối đa (km)",
    provider: "Nguồn khoảng cách",
    fallback: "Cho phép khoảng cách dự phòng khi Google không khả dụng",
    enabled: "Bật chính sách giao hàng",
    weatherTitle: "Tích hợp API Thời tiết Open-Meteo (Thời gian thực)",
    weatherHint: "Hệ thống tự động đồng bộ thời tiết tại Đà Nẵng. Khi trời mưa hoặc giông bão, phụ phí sẽ tự động được cộng vào để hỗ trợ tài xế.",
    weatherEnabled: "Tự động cộng phụ phí khi thời tiết xấu (mưa/bão)",
    lightRain: "Phụ phí mưa nhỏ (VND)",
    moderateRain: "Phụ phí mưa vừa (VND)",
    heavyRain: "Phụ phí mưa to / dông (VND)",
    liveWeather: "Thời tiết thực tế tại Đà Nẵng hiện tại",
    temp: "Nhiệt độ",
    precip: "Lượng mưa",
    currentSurcharge: "Phụ phí thời tiết đang áp dụng",
    save: "Lưu chính sách",
    saved: "Đã lưu chính sách thành công!",
    formula: "Công thức tính & Mô phỏng ví dụ",
    customer: "Phí Customer thực trả",
    timezone: "Múi giờ",
  },
  "en-US": {
    title: "Delivery pricing & Weather surcharge",
    hint: "Centrally manage food delivery pricing, restaurant subsidy, and live Open-Meteo weather surcharge.",
    base: "Base delivery fee (VND)",
    baseKm: "Base distance (km)",
    perKm: "Fee per extra km (VND)",
    subsidy: "Restaurant subsidy (VND)",
    windows: "Subsidy windows",
    radius: "Maximum delivery radius (km)",
    provider: "Distance provider",
    fallback: "Allow geographic fallback when Google is unavailable",
    enabled: "Enable delivery pricing",
    weatherTitle: "Open-Meteo Live Weather Integration",
    weatherHint: "System dynamically fetches Da Nang precipitation. Bad weather triggers automated driver surcharges.",
    weatherEnabled: "Enable automated bad-weather surcharge",
    lightRain: "Light rain surcharge (VND)",
    moderateRain: "Moderate rain surcharge (VND)",
    heavyRain: "Heavy rain surcharge (VND)",
    liveWeather: "Current Da Nang weather status",
    temp: "Temperature",
    precip: "Precipitation",
    currentSurcharge: "Current active surcharge",
    save: "Save policy",
    saved: "Policy saved successfully!",
    formula: "Formula & Simulation",
    customer: "Customer delivery fee",
    timezone: "Timezone",
  },
} as const;

const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} VND`;

export default function DeliveryPricingPanel() {
  const { locale } = useZhaoXiLocale();
  const t = copy[locale];
  const cacheKey = "admin_delivery_policy";
  const [policy, setPolicy] = useState<Policy>(() => getCached<Policy>(cacheKey) || fallback);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/delivery-pricing-policy", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && j?.data) {
          const loaded = { ...fallback, ...j.data };
          setPolicy(loaded);
          setCached(cacheKey, loaded);
        }
      })
      .catch(() => {});
  }, [cacheKey]);

  const example = useMemo(() => {
    const d = 5;
    const distanceGross = policy.baseFee + Math.max(0, Math.ceil(d - policy.baseDistanceKm)) * policy.perKmFee;
    const weatherSurcharge = policy.weatherSurchargeEnabled ? policy.weatherModerateRainFee : 0;
    const gross = distanceGross + weatherSurcharge;
    const subsidy = Math.min(distanceGross, policy.partnerSubsidyAmount);
    return {
      d,
      distanceGross,
      weatherSurcharge,
      gross,
      subsidy,
      customer: Math.max(0, gross - subsidy),
    };
  }, [policy]);

  function setWindow(index: number, key: keyof Window, value: string) {
    setPolicy((v) => ({
      ...v,
      subsidyWindows: v.subsidyWindows.map((w, i) => (i === index ? { ...w, [key]: value } : w)),
    }));
  }

  async function save() {
    setMsg("");
    const r = await fetch("/api/delivery-pricing-policy", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(policy),
    });
    const j = await r.json();
    if (r.ok && j?.ok) {
      const nextPolicy = { ...fallback, ...j.data };
      setPolicy(nextPolicy);
      setCached(cacheKey, nextPolicy);
      setMsg(t.saved);
      setTimeout(() => setMsg(""), 4000);
    } else {
      setMsg(j?.error?.message || j?.error?.code || "ERROR");
    }
  }

  const live = policy.liveWeather;
  const isRain = (live?.surcharge || 0) > 0;

  return (
    <section style={{ display: "grid", gap: 16, maxWidth: 980, margin: "0 auto" }}>
      <header>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#1E293B" }}>{t.title}</h1>
        <p style={{ margin: 0, color: "#64748B", fontSize: 13 }}>{t.hint}</p>
      </header>

      {/* Live Weather Indicator Card */}
      <section
        style={{
          ...card,
          border: "1px solid #BAE6FD",
          background: isRain ? "#FEF3C7" : "#F0F9FF",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 26 }}>{isRain ? "🌧️" : "🌤️"}</span>
            <div>
              <b style={{ fontSize: 14, color: isRain ? "#B45309" : "#0369A1" }}>{t.liveWeather}</b>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#475569" }}>
                Nguồn: <b>Open-Meteo Live API (Đà Nẵng: 16.05°N, 108.20°E)</b>
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={badgeStyle}>
              <span>{t.temp}:</span>
              <b>{live?.temperature !== undefined ? `${live.temperature}°C` : "33°C"}</b>
            </div>
            <div style={badgeStyle}>
              <span>{t.precip}:</span>
              <b>{live?.precipitationMm !== undefined ? `${live.precipitationMm} mm` : "0.0 mm"}</b>
            </div>
            <div style={{ ...badgeStyle, background: isRain ? "#F59E0B" : "#10B981", color: "#fff" }}>
              <span>{t.currentSurcharge}:</span>
              <b>{money(live?.surcharge || 0)}</b>
            </div>
          </div>
        </div>
      </section>

      {/* Main Distance Pricing */}
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: 10 }}>
          <b style={{ fontSize: 15, color: "#0F172A" }}>Cấu hình cước theo khoảng cách</b>
          <label style={check}>
            <input
              type="checkbox"
              checked={policy.enabled}
              onChange={(e) => setPolicy((v) => ({ ...v, enabled: e.target.checked }))}
            />
            {t.enabled}
          </label>
        </div>

        <div style={grid3}>
          <Field label={t.base}>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step={1000}
              value={policy.baseFee}
              onChange={(e) => setPolicy((v) => ({ ...v, baseFee: Number(e.target.value) }))}
            />
          </Field>
          <Field label={t.baseKm}>
            <input
              style={inputStyle}
              type="number"
              min={0.1}
              step="0.5"
              value={policy.baseDistanceKm}
              onChange={(e) => setPolicy((v) => ({ ...v, baseDistanceKm: Number(e.target.value) }))}
            />
          </Field>
          <Field label={t.perKm}>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step={500}
              value={policy.perKmFee}
              onChange={(e) => setPolicy((v) => ({ ...v, perKmFee: Number(e.target.value) }))}
            />
          </Field>
        </div>

        <div style={grid2}>
          <Field label={t.subsidy}>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step={1000}
              value={policy.partnerSubsidyAmount}
              onChange={(e) => setPolicy((v) => ({ ...v, partnerSubsidyAmount: Number(e.target.value) }))}
            />
          </Field>
          <Field label={t.radius}>
            <input
              style={inputStyle}
              type="number"
              min={1}
              step="0.5"
              value={policy.maxDeliveryRadiusKm}
              onChange={(e) => setPolicy((v) => ({ ...v, maxDeliveryRadiusKm: Number(e.target.value) }))}
            />
          </Field>
        </div>

        <Field label={t.windows}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {policy.subsidyWindows.slice(0, 2).map((w, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  style={inputStyle}
                  type="time"
                  value={w.start}
                  onChange={(e) => setWindow(i, "start", e.target.value)}
                />
                <input
                  style={inputStyle}
                  type="time"
                  value={w.end}
                  onChange={(e) => setWindow(i, "end", e.target.value)}
                />
              </div>
            ))}
          </div>
        </Field>

        <div style={grid2}>
          <Field label={t.provider}>
            <select
              style={inputStyle}
              value={policy.distanceProvider}
              onChange={(e) => setPolicy((v) => ({ ...v, distanceProvider: e.target.value }))}
            >
              <option value="google_routes">Google Routes (Khuyến nghị)</option>
              <option value="geo_fallback">Đo khoảng cách địa lý (Haversine)</option>
            </select>
          </Field>
          <Field label={t.timezone}>
            <input
              style={inputStyle}
              value={policy.timezone}
              onChange={(e) => setPolicy((v) => ({ ...v, timezone: e.target.value }))}
            />
          </Field>
        </div>
        <label style={check}>
          <input
            type="checkbox"
            checked={policy.allowGeoFallback}
            onChange={(e) => setPolicy((v) => ({ ...v, allowGeoFallback: e.target.checked }))}
          />
          {t.fallback}
        </label>
      </section>

      {/* Weather Surcharge Configuration */}
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: 10 }}>
          <div>
            <b style={{ fontSize: 15, color: "#0F172A" }}>{t.weatherTitle}</b>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748B" }}>{t.weatherHint}</p>
          </div>
          <label style={check}>
            <input
              type="checkbox"
              checked={policy.weatherSurchargeEnabled}
              onChange={(e) => setPolicy((v) => ({ ...v, weatherSurchargeEnabled: e.target.checked }))}
            />
            {t.weatherEnabled}
          </label>
        </div>

        <div style={grid3}>
          <Field label={`🌦️ ${t.lightRain}`}>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step={1000}
              value={policy.weatherLightRainFee}
              onChange={(e) => setPolicy((v) => ({ ...v, weatherLightRainFee: Number(e.target.value) }))}
            />
          </Field>
          <Field label={`🌧️ ${t.moderateRain}`}>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step={1000}
              value={policy.weatherModerateRainFee}
              onChange={(e) => setPolicy((v) => ({ ...v, weatherModerateRainFee: Number(e.target.value) }))}
            />
          </Field>
          <Field label={`⛈️ ${t.heavyRain}`}>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step={1000}
              value={policy.weatherHeavyRainFee}
              onChange={(e) => setPolicy((v) => ({ ...v, weatherHeavyRainFee: Number(e.target.value) }))}
            />
          </Field>
        </div>
      </section>

      {/* Formula & Live Calculation Preview */}
      <section style={{ ...card, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
        <b style={{ fontSize: 13, color: "#166534" }}>{t.formula}</b>
        <p style={{ fontSize: 12, lineHeight: 1.6, margin: "8px 0 0", color: "#1E293B" }}>
          • Đoạn đầu: <b>0–{policy.baseDistanceKm} km</b> = <b>{money(policy.baseFee)}</b>
          <br />
          • Vượt mức: <b>&gt; {policy.baseDistanceKm} km</b> = <b>{money(policy.baseFee)}</b> + <b>{money(policy.perKmFee)}/km</b>
          <br />
          • Khung giờ trợ giá nhà hàng: <b>{policy.subsidyWindows.map((w) => `${w.start}–${w.end}`).join(" · ")}</b> (Trợ giá tối đa <b>{money(policy.partnerSubsidyAmount)}</b>)
          <br />
          • Phụ phí thời tiết tự động:{" "}
          {policy.weatherSurchargeEnabled ? (
            <span>
              Mưa nhỏ <b>+{money(policy.weatherLightRainFee)}</b> · Mưa vừa <b>+{money(policy.weatherModerateRainFee)}</b> · Mưa to/Dông <b>+{money(policy.weatherHeavyRainFee)}</b>
            </span>
          ) : (
            <span style={{ color: "#DC2626" }}>Đang tắt</span>
          )}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
          <Metric label="Khoảng cách 5 km" value={money(example.distanceGross)} />
          <Metric label="Mô phỏng mưa vừa" value={`+${money(example.weatherSurcharge)}`} color="#D97706" />
          <Metric label={t.subsidy} value={`−${money(example.subsidy)}`} color="#059669" />
          <Metric label={t.customer} value={money(example.customer)} color="#0F172A" highlight />
        </div>
      </section>

      <button
        onClick={() => void save()}
        style={{
          border: 0,
          borderRadius: 14,
          padding: "14px 20px",
          background: "#059669",
          color: "#fff",
          fontSize: 14,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        {t.save}
      </button>

      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: msg.includes("ERROR") || msg.includes("ADMIN") ? "#FEE2E2" : "#DCFCE7", color: msg.includes("ERROR") || msg.includes("ADMIN") ? "#991B1B" : "#166534", fontSize: 13, fontWeight: 700 }}>
          {msg}
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 600, color: "#475569" }}>
      <span>{label}</span>
      <div>{children}</div>
    </label>
  );
}

function Metric({ label, value, color, highlight }: { label: string; value: string; color?: string; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        background: highlight ? "#DCFCE7" : "#FFFFFF",
        border: highlight ? "1px solid #86EFAC" : "1px solid #E2E8F0",
      }}
    >
      <small style={{ display: "block", color: "#64748B", fontSize: 11 }}>{label}</small>
      <b style={{ display: "block", marginTop: 4, fontSize: 13, color: color || "#1E293B" }}>{value}</b>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #CBD5E1",
  background: "#F8FAFC",
  fontSize: 13,
  color: "#0F172A",
  outline: "none",
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 10px",
  borderRadius: 8,
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  fontSize: 12,
  color: "#334155",
};

const card: CSSProperties = {
  display: "grid",
  gap: 14,
  padding: 16,
  border: "1px solid #E2E8F0",
  borderRadius: 16,
  background: "#FFFFFF",
  boxShadow: "none",
};

const grid2: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const grid3: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };
const check: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#1E293B", cursor: "pointer" };
