"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { localizeOrganizationName, useZhaoXiLocale } from "@zhaoxi/i18n";
import MiniTabBar from "./MiniTabBar";
import VerifiedPartnerIdentity from "./VerifiedPartnerIdentity";
import CustomerLocationBar from "./CustomerLocationBar";
import { CustomerServiceIcon } from "./CustomerServiceIcon";
import { CustomerIcon } from "./CustomerIcon";
import {
  readSessionPoint,
  subscribeSessionPoint,
  type SessionPoint,
} from "../_lib/customer-location";
import { getCached, setCached } from "../_lib/client-cache";
import styles from "../services.module.css";
type H = {
  id: string;
  code: string;
  name?: string;
  summary?: string;
  priceFrom?: string | null;
  currency?: string;
  metadata?: Record<string, unknown>;
  organizationId?: string;
  organizationCode?: string;
  organizationName?: string;
  organizationAddress?: string;
  organizationMetadata?: Record<string, unknown>;
  distanceKm?: number | null;
};
const C = {
  "zh-CN": {
    title: "租房",
    search: "搜索区域、房型或房源",
    all: "全部",
    monthly: "月",
    bed: "卧室",
    empty: "暂无符合条件的房源",
    assistant: "让赵喜帮您找房",
    hint: "告诉赵喜预算、区域和入住时间",
    back: "返回",
    price: "价格",
    min: "最低",
    max: "最高",
    moveIn: "入住日期",
    sort: "排序",
    nearest: "距离最近",
    priceLow: "价格从低到高",
    priceHigh: "价格从高到低",
    newest: "最新房源",
    availableOnly: "仅看可租",
    status: "状态",
    available: "可租",
    reserved: "已预订",
    rented: "已出租",
    requests: "我的租房意向",
    filters: "更多筛选",
    clear: "清除",
    verified: "赵喜认证",
  },
  "zh-TW": {
    title: "租房",
    search: "搜尋區域、房型或房源",
    all: "全部",
    monthly: "月",
    bed: "臥室",
    empty: "暫無符合條件的房源",
    assistant: "讓趙喜幫您找房",
    hint: "告訴趙喜預算、區域與入住時間",
    back: "返回",
    price: "價格",
    min: "最低",
    max: "最高",
    moveIn: "入住日期",
    sort: "排序",
    nearest: "距離最近",
    priceLow: "價格低至高",
    priceHigh: "價格高至低",
    newest: "最新房源",
    availableOnly: "只看可租",
    status: "狀態",
    available: "可租",
    reserved: "已預訂",
    rented: "已出租",
    requests: "我的租房意向",
    filters: "更多篩選",
    clear: "清除",
    verified: "趙喜認證",
  },
  "vi-VN": {
    title: "Thuê nhà",
    search: "Tìm khu vực, loại nhà hoặc căn hộ",
    all: "Tất cả",
    monthly: "tháng",
    bed: "PN",
    empty: "Chưa có nhà phù hợp",
    assistant: "Nhờ ZhaoXi tìm nhà",
    hint: "Cho ZhaoXi biết ngân sách, khu vực và ngày muốn vào ở",
    back: "Quay lại",
    price: "Khoảng giá",
    min: "Từ",
    max: "Đến",
    moveIn: "Ngày muốn vào ở",
    sort: "Sắp xếp",
    nearest: "Gần nhất",
    priceLow: "Giá thấp → cao",
    priceHigh: "Giá cao → thấp",
    newest: "Mới nhất",
    availableOnly: "Chỉ còn trống",
    status: "Trạng thái",
    available: "Còn trống",
    reserved: "Đã giữ chỗ",
    rented: "Đã cho thuê",
    requests: "Yêu cầu thuê nhà của tôi",
    filters: "Bộ lọc nâng cao",
    clear: "Xóa lọc",
    verified: "ZhaoXi xác thực",
  },
  "en-US": {
    title: "Housing",
    search: "Search area, property type or listing",
    all: "All",
    monthly: "month",
    bed: "beds",
    empty: "No matching properties",
    assistant: "Ask ZhaoXi to find a home",
    hint: "Tell ZhaoXi your budget, area and move-in date",
    back: "Back",
    price: "Price range",
    min: "Min",
    max: "Max",
    moveIn: "Move-in date",
    sort: "Sort",
    nearest: "Nearest",
    priceLow: "Price low → high",
    priceHigh: "Price high → low",
    newest: "Newest",
    availableOnly: "Available only",
    status: "Status",
    available: "Available",
    reserved: "Reserved",
    rented: "Rented",
    requests: "My rental inquiries",
    filters: "More filters",
    clear: "Clear",
    verified: "ZhaoXi verified",
  },
} as const;
const money = (v: number, c = "VND") =>
  `${Math.round(v).toLocaleString("vi-VN")} ${c}`;
function statusOf(m: Record<string, unknown>) {
  const s = String(m.housingAvailabilityStatus || "available");
  return ["available", "reserved", "rented"].includes(s) ? s : "available";
}
export default function HousingBrowser() {
  const { locale } = useZhaoXiLocale(),
    t = C[locale];
  const [point, setPoint] = useState<SessionPoint | null>(() => readSessionPoint());
  const cacheKey = `housing_browser_${locale}_${point?.latitude || 0}_${point?.longitude || 0}`;
  const initialHousing = getCached<H[]>(cacheKey);
  const [items, setItems] = useState<H[]>(() => initialHousing || []),
    [q, setQ] = useState(""),
    [type, setType] = useState(""),
    [beds, setBeds] = useState(0),
    [minPrice, setMinPrice] = useState(""),
    [maxPrice, setMaxPrice] = useState(""),
    [moveIn, setMoveIn] = useState(""),
    [availableOnly, setAvailableOnly] = useState(true),
    [sort, setSort] = useState<
      "distance" | "priceAsc" | "priceDesc" | "newest"
    >("distance"),
    [showFilters, setShowFilters] = useState(false);
  useEffect(() => {
    return subscribeSessionPoint(setPoint);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const u = new URLSearchParams({
      module: "housing",
      locale,
      limit: "100",
    });
    if (point) {
      u.set("lat", String(point.latitude));
      u.set("lng", String(point.longitude));
    }
    fetch(`/api/customer-nearby-services?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) {
          const next = Array.isArray(j?.data) ? j.data : [];
          setItems(next);
          setCached(cacheKey, next);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cacheKey, locale, point?.latitude, point?.longitude]);
  const types = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((x) => String(x.metadata?.propertyType || ""))
            .filter(Boolean),
        ),
      ),
    [items],
  );
  const shown = useMemo(() => {
    const lo = Number(minPrice || 0),
      hi = Number(maxPrice || 0),
      needle = q.trim().toLowerCase();
    const filtered = items.filter((x) => {
      const m = x.metadata || {},
        price = Number(x.priceFrom || 0),
        status = statusOf(m),
        availableFrom = String(m.availableFrom || "");
      const text =
        `${x.name || ""} ${x.summary || ""} ${x.organizationAddress || ""} ${m.propertyType || ""} ${m.district || ""} ${m.propertyAddress || ""}`.toLowerCase();
      if (needle && !text.includes(needle)) return false;
      if (type && String(m.propertyType || "") !== type) return false;
      if (beds && Number(m.bedrooms || 0) < beds) return false;
      if (lo && price < lo) return false;
      if (hi && price > hi) return false;
      if (availableOnly && status !== "available") return false;
      if (m.isAvailable === false) return false;
      if (moveIn && availableFrom && availableFrom > moveIn) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "priceAsc")
        return Number(a.priceFrom || 0) - Number(b.priceFrom || 0);
      if (sort === "priceDesc")
        return Number(b.priceFrom || 0) - Number(a.priceFrom || 0);
      const av = (a.metadata || {}).adminVerified === true ? 1 : 0,
        bv = (b.metadata || {}).adminVerified === true ? 1 : 0;
      if (av !== bv) return bv - av;
      if (sort === "distance")
        return (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999);
      return String((b.metadata || {}).publishedAt || "").localeCompare(
        String((a.metadata || {}).publishedAt || ""),
      );
    });
  }, [items, q, type, beds, minPrice, maxPrice, moveIn, availableOnly, sort]);
  function clear() {
    setQ("");
    setType("");
    setBeds(0);
    setMinPrice("");
    setMaxPrice("");
    setMoveIn("");
    setAvailableOnly(true);
    setSort("distance");
  }
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.foodHeaderBar}>
          <Link href="/" className={styles.backButton}>‹</Link>
          <div className={styles.headerTitle}>
            <span><CustomerServiceIcon serviceId="housing" size={36} /></span>
            <div>
              <b>{t.title}</b>
              <small>{shown.length} {locale==="vi-VN"?"căn hộ":"kết quả"}</small>
            </div>
          </div>
          <Link
            href="/housing/requests"
            style={{
              padding: "6px 13px",
              borderRadius: 999,
              background: "#F0FDF4",
              border: "1px solid #DCFCE7",
              color: "#15803D",
              fontSize: "11.5px",
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap"
            }}
          >
            {t.requests}
          </Link>
        </div>
      </header>
      <section className={styles.body}>
        <div className={styles.locationWrap}><CustomerLocationBar banner /></div>
        <label className={styles.search}>
          <CustomerIcon name="search" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.search}
          />
        </label>
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            padding: "3px 0 8px",
          }}
        >
          <button onClick={() => setType("")} style={chip(!type)}>
            {t.all}
          </button>
          {types.map((x) => (
            <button key={x} onClick={() => setType(x)} style={chip(type === x)}>
              {x}
            </button>
          ))}
          {[1, 2, 3].map((x) => (
            <button
              key={x}
              onClick={() => setBeds(beds === x ? 0 : x)}
              style={chip(beds === x)}
            >
              {x}+ {t.bed}
            </button>
          ))}
          <button
            onClick={() => setShowFilters((v) => !v)}
            style={chip(showFilters)}
          >
            ⚙ {t.filters}
          </button>
        </div>
        {showFilters && (
          <section
            style={{
              padding: 10,
              border: "1px solid #e5ebe7",
              borderRadius: 14,
              background: "#fff",
              display: "grid",
              gap: 8,
              marginBottom: 9,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: 7,
              }}
            >
              <label style={field}>
                {t.min}
                <input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </label>
              <label style={field}>
                {t.max}
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </label>
              <label style={field}>
                {t.moveIn}
                <input
                  type="date"
                  value={moveIn}
                  onChange={(e) => setMoveIn(e.target.value)}
                />
              </label>
              <label style={field}>
                {t.sort}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                >
                  <option value="distance">{t.nearest}</option>
                  <option value="priceAsc">{t.priceLow}</option>
                  <option value="priceDesc">{t.priceHigh}</option>
                  <option value="newest">{t.newest}</option>
                </select>
              </label>
            </div>
            <label style={{ fontSize: 9, fontWeight: 750 }}>
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
              />{" "}
              {t.availableOnly}
            </label>
            <button
              onClick={clear}
              style={{
                border: 0,
                borderRadius: 10,
                padding: 8,
                background: "#f1f5f9",
                fontWeight: 800,
              }}
            >
              {t.clear}
            </button>
          </section>
        )}

        {!shown.length && (
          <div className={styles.state}>
            <CustomerServiceIcon serviceId="housing" size={48} />
            <p>{t.empty}</p>
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 9,
            marginTop: 10,
          }}
        >
          {shown.map((x) => {
            const m = x.metadata || {},
              img = String(m.imageUrl || ""),
              status = statusOf(m),
              statusLabel =
                status === "available"
                  ? t.available
                  : status === "reserved"
                    ? t.reserved
                    : t.rented;
            return (
              <Link
                href={`/housing/${x.id}`}
                key={x.id}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  background: "#fff",
                  border: "1px solid #EEF2F6",
                  borderRadius: 20,
                  overflow: "hidden",
                  position: "relative",
                  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 7,
                    left: 7,
                    zIndex: 2,
                    display: "flex",
                    gap: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      padding: "4px 6px",
                      borderRadius: 999,
                      background:
                        status === "available"
                          ? "#ecfdf5"
                          : status === "reserved"
                            ? "#fff7ed"
                            : "#f1f5f9",
                      color:
                        status === "available"
                          ? "#067647"
                          : status === "reserved"
                            ? "#c2410c"
                            : "#64748b",
                      fontSize: 7,
                      fontWeight: 900,
                    }}
                  >
                    {statusLabel}
                  </span>
                  {m.adminVerified === true && (
                    <span
                      style={{
                        padding: "4px 6px",
                        borderRadius: 999,
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        fontSize: 7,
                        fontWeight: 900,
                      }}
                    >
                      ✓ {t.verified}
                    </span>
                  )}
                </div>
                {img ? (
                  <img
                    src={img}
                    alt=""
                    style={{
                      width: "100%",
                      aspectRatio: "1.35",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      aspectRatio: "1.35",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 38,
                      background: "#eef8f1",
                    }}
                  >
                    <CustomerServiceIcon serviceId="housing" size={48} />
                  </div>
                )}
                <div style={{ padding: 9 }}>
                  <b
                    style={{
                      fontSize: 12,
                      display: "block",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {x.name || x.code}
                  </b>
                  <small
                    style={{
                      color: "#64748b",
                      display: "block",
                      margin: "3px 0",
                    }}
                  >
                    {m.propertyType ? `${m.propertyType} · ` : ""}
                    {Number(m.bedrooms || 0) > 0
                      ? `${m.bedrooms} ${t.bed} · `
                      : ""}
                    {Number(m.areaSqm || 0) > 0 ? `${m.areaSqm} m²` : ""}
                  </small>
                  <strong style={{ fontSize: 11, color: "#ef5a3c" }}>
                    {Number(x.priceFrom || 0) > 0
                      ? `${money(Number(x.priceFrom), x.currency)}/${t.monthly}`
                      : ""}
                  </strong>
                  {Boolean(m.availableFrom) && (
                    <small
                      style={{
                        display: "block",
                        marginTop: 3,
                        color: "#64748b",
                      }}
                    >
                      {t.moveIn}: {String(m.availableFrom)}
                    </small>
                  )}
                  <small
                    style={{ display: "block", marginTop: 4, color: "#078343" }}
                  >
                    {localizeOrganizationName(
                      locale,
                      x.organizationCode,
                      x.organizationName,
                      x.organizationMetadata,
                    )}
                  </small>
                  {x.organizationId && (
                    <VerifiedPartnerIdentity
                      organizationId={x.organizationId}
                      compact
                    />
                  )}
                  {x.distanceKm != null && (
                    <small style={{ display: "block", color: "#64748b" }}>
                      ⌖ {x.distanceKm.toFixed(1)} km
                    </small>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      <MiniTabBar />
    </main>
  );
}
const chip = (on: boolean) => ({
  whiteSpace: "nowrap" as const,
  border: on ? "1px solid #07c160" : "1px solid #E2E8F0",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 650,
  background: on ? "#07c160" : "#fff",
  color: on ? "#fff" : "#475569",
  boxShadow: "none",
  cursor: "pointer",
});
const field = {
  display: "grid",
  gap: 4,
  fontSize: 8,
  color: "#64748b",
} as const;
