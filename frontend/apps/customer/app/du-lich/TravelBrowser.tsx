"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import MiniTabBar from "../_components/MiniTabBar";
import VerifiedPartnerIdentity from "../_components/VerifiedPartnerIdentity";
import { CustomerServiceIcon } from "../_components/CustomerServiceIcon";
import { getCached, setCached } from "../_lib/client-cache";
type Item = {
  id: string;
  code: string;
  name?: string;
  summary?: string;
  priceFrom?: string | null;
  currency?: string;
  metadata?: Record<string, unknown>;
  organizationId?: string | null;
  organizationCode?: string | null;
  organizationName?: string;
  distanceKm?: number | null;
};
const C = {
  "zh-CN": {
    title: "旅游与本地体验",
    search: "搜索目的地、玩法或体验",
    all: "全部",
    price: "起",
    guests: "人",
    empty: "暂无合适体验",
    detail: "查看详情",
    ask: "让赵喜推荐行程",
    requests: "我的预约",
    verified: "赵喜认证",
  },
  "zh-TW": {
    title: "旅遊與在地體驗",
    search: "搜尋目的地、玩法或體驗",
    all: "全部",
    price: "起",
    guests: "人",
    empty: "暫無合適體驗",
    detail: "查看詳情",
    ask: "讓趙喜推薦行程",
    requests: "我的預約",
    verified: "趙喜認證",
  },
  "vi-VN": {
    title: "Du lịch & Trải nghiệm địa phương",
    search: "Tìm điểm đến, loại trải nghiệm hoặc tour",
    all: "Tất cả",
    price: "từ",
    guests: "khách",
    empty: "Chưa có trải nghiệm phù hợp",
    detail: "Xem chi tiết",
    ask: "Nhờ ZhaoXi gợi ý hành trình",
    requests: "Yêu cầu của tôi",
    verified: "ZhaoXi xác thực",
  },
  "en-US": {
    title: "Tours & Local Experiences",
    search: "Search destination, activity or tour",
    all: "All",
    price: "from",
    guests: "guests",
    empty: "No matching experiences",
    detail: "View details",
    ask: "Ask ZhaoXi for itinerary ideas",
    requests: "My bookings",
    verified: "ZhaoXi verified",
  },
} as const;
const money = (v: number, c = "VND") =>
  `${Math.round(v).toLocaleString("vi-VN")} ${c}`;
export default function TravelBrowser() {
  const { locale } = useZhaoXiLocale(),
    t = C[locale];
  const cacheKey = `travel_browser_${locale}`;
  const initialTravel = getCached<Item[]>(cacheKey);
  const [items, setItems] = useState<Item[]>(() => initialTravel || []),
    [q, setQ] = useState(""),
    [type, setType] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/customer-nearby-services?module=travel&locale=${encodeURIComponent(locale)}&limit=100`,
      { cache: "no-store" },
    )
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
  }, [cacheKey, locale]);
  const types = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((x) => String(x.metadata?.experienceType || ""))
            .filter(Boolean),
        ),
      ),
    [items],
  );
  const shown = useMemo(
    () =>
      items.filter((x) => {
        const m = x.metadata || {},
          text =
            `${x.name || ""} ${x.summary || ""} ${m.destination || ""} ${m.experienceType || ""}`.toLowerCase();
        return (
          (!q.trim() || text.includes(q.trim().toLowerCase())) &&
          (!type || String(m.experienceType || "") === type) &&
          m.isAvailable !== false
        );
      }),
    [items, q, type],
  );
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--zx-bg)",
        color: "var(--zx-text)",
        paddingBottom: "calc(66px + env(safe-area-inset-bottom))",
        fontFamily: "Inter,Arial,sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "10px 14px",
          background: "var(--zx-header-bg)",
          borderBottom: "1px solid var(--zx-border)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Link href="/">‹</Link>
        <b style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CustomerServiceIcon serviceId="travel" size={40} />
          {t.title}
        </b>
        <span />
      </header>
      <section style={{ maxWidth: 760, margin: "0 auto", padding: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.search}
          style={input}
        />
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            margin: "8px 0",
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
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}
        >
          <Link href="/support?topic=travel" style={assist}>
            喜 · {t.ask}
          </Link>
          <Link
            href="/travel/requests"
            style={{ ...assist, textAlign: "center" }}
          >
            {t.requests}
          </Link>
        </div>
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
              img = String(m.imageUrl || "");
            return (
              <Link key={x.id} href={`/travel/${x.id}`} style={card}>
                {img ? (
                  <img
                    src={img}
                    alt=""
                    style={{
                      width: "100%",
                      aspectRatio: "1.35",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      aspectRatio: "1.35",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 38,
                      background: "var(--zx-brand-soft)",
                    }}
                  >
                    <CustomerServiceIcon serviceId="travel" size={48} />
                  </div>
                )}
                <div style={{ padding: 9 }}>
                  <b style={{ fontSize: 11 }}>{x.name || x.code}</b>
                  {m.travelAdminVerified === true && (
                    <small
                      style={{
                        display: "block",
                        color: "#1d4ed8",
                        fontWeight: 900,
                      }}
                    >
                      ✓ {t.verified}
                    </small>
                  )}
                  {x.organizationId && (
                    <VerifiedPartnerIdentity
                      organizationId={x.organizationId}
                      compact
                    />
                  )}
                  <small
                    style={{
                      display: "block",
                      color: "var(--zx-text-secondary)",
                      marginTop: 3,
                    }}
                  >
                    {String(m.destination || "")}{" "}
                    {m.duration ? `· ${String(m.duration)}` : ""}
                  </small>
                  <strong
                    style={{
                      display: "block",
                      color: "#ef5a3c",
                      fontSize: 10,
                      marginTop: 4,
                    }}
                  >
                    {t.price} {money(Number(x.priceFrom || 0), x.currency)}
                  </strong>
                  {Boolean(m.maxGuests) && (
                    <small
                      style={{
                        display: "block",
                        marginTop: 3,
                        color: "var(--zx-text-secondary)",
                      }}
                    >
                      👥 {String(m.maxGuests)} {t.guests}
                    </small>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        {!shown.length && (
          <p style={{ textAlign: "center", color: "var(--zx-text-secondary)" }}>
            {t.empty}
          </p>
        )}
      </section>
      <MiniTabBar />
    </main>
  );
}
const input = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid var(--zx-border)",
    borderRadius: 10,
    padding: "9px 10px",
    background: "var(--zx-surface)",
    color: "var(--zx-text)",
  } as const,
  card = {
    textDecoration: "none",
    color: "inherit",
    background: "var(--zx-surface)",
    border: "1px solid var(--zx-border)",
    borderRadius: 12,
    overflow: "hidden",
  } as const,
  assist = {
    display: "block",
    padding: 9,
    borderRadius: 10,
    background: "var(--zx-brand-soft)",
    color: "var(--zx-brand)",
    textDecoration: "none",
    fontWeight: 850,
    fontSize: 9,
  } as const;
const chip = (a: boolean) => ({
  border: "1px solid var(--zx-border)",
  borderRadius: 999,
  padding: "6px 9px",
  background: a ? "var(--zx-brand)" : "var(--zx-surface)",
  color: a ? "#fff" : "var(--zx-text-secondary)",
  fontSize: 8,
  fontWeight: 850,
});
