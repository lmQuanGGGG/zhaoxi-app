"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import MiniTabBar from "../_components/MiniTabBar";
import { CustomerServiceIcon } from "../_components/CustomerServiceIcon";
import SavedSearchControls from "./SavedSearchControls";
const C = {
  "zh-CN": {
    title: "发现赵喜服务",
    search: "搜索餐厅、住房、旅游、合作伙伴…",
    all: "全部",
    services: "服务",
    partners: "合作伙伴",
    empty: "暂无匹配结果",
    from: "起",
    verified: "已认证",
    store: "查看主页",
    mine: "我的收藏",
  },
  "zh-TW": {
    title: "發現趙喜服務",
    search: "搜尋餐廳、住房、旅遊、合作夥伴…",
    all: "全部",
    services: "服務",
    partners: "合作夥伴",
    empty: "暫無符合結果",
    from: "起",
    verified: "已認證",
    store: "查看主頁",
    mine: "我的收藏",
  },
  "vi-VN": {
    title: "Khám phá dịch vụ ZhaoXi",
    search: "Tìm nhà hàng, nhà ở, du lịch, Partner…",
    all: "Tất cả",
    services: "Dịch vụ",
    partners: "Partner",
    empty: "Chưa có kết quả phù hợp",
    from: "từ",
    verified: "Đã xác minh",
    store: "Xem storefront",
    mine: "Của tôi",
  },
  "en-US": {
    title: "Discover ZhaoXi Services",
    search: "Search restaurants, housing, travel, Partners…",
    all: "All",
    services: "Services",
    partners: "Partners",
    empty: "No matching results",
    from: "from",
    verified: "Verified",
    store: "View storefront",
    mine: "For You",
  },
} as const;
export default function UnifiedServiceDiscovery() {
  const { locale } = useZhaoXiLocale(),
    t = C[locale];
  const [q, setQ] = useState(""),
    [module, setModule] = useState(""),
    [d, setD] = useState<any>({ services: [], partners: [] });
  useEffect(() => {
    const u = new URLSearchParams(window.location.search);
    setQ(u.get("q") || "");
    setModule(u.get("module") || "");
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      const u = new URLSearchParams({ q, locale, limit: "60" });
      if (module) u.set("module", module);
      fetch(`/api/public/discovery?${u}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => j?.ok && setD(j.data))
        .catch(() => setD({ services: [], partners: [] }));
    }, 180);
    return () => clearTimeout(timer);
  }, [q, module, locale]);
  const modules = useMemo(
    () =>
      Array.from(
        new Set((d.services || []).map((x: any) => x.moduleCode)),
      ) as string[],
    [d],
  );
  return (
    <main style={shell}>
      <header style={{ ...header, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #EEF2F6" }}>
        <Link href="/" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:12,background:"#FFF",border:"1px solid #E2E8F0",textDecoration:"none",color:"#1E293B",fontSize:20,lineHeight:1,boxShadow:"none"}}>‹</Link>
        <b style={{fontSize: 16, fontWeight: 750, color: "#1E293B"}}>⌕ {t.title}</b>
        <Link
          href="/discover"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            fontSize: 14,
            color: "#059669",
            textDecoration: "none",
            fontWeight: 850,
          }}
        >
          ♥
        </Link>
      </header>
      <section style={{ padding: "14px 14px calc(90px + env(safe-area-inset-bottom))" }}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.search}
          style={input}
        />
        <div style={chips}>
          <button onClick={() => setModule("")} style={chip(!module)}>
            {t.all}
          </button>
          {modules.map((x) => (
            <button
              key={x}
              onClick={() => setModule(x)}
              style={chip(module === x)}
            >
              <CustomerServiceIcon serviceId={x} size={20} />
              {d.services.find((s: any) => s.moduleCode === x)?.moduleName || x}
            </button>
          ))}
        </div>
        <SavedSearchControls query={q} moduleCode={module} />
        {d.partners?.length > 0 && (
          <>
            <b style={sectionTitle}>{t.partners}</b>
            <div style={partnerRow}>
              {d.partners.map((x: any) => (
                <Link key={x.organizationId} href={x.href} style={partner}>
                  <div style={{ fontSize: 22 }}>🏪</div>
                  <b>{x.name}</b>
                  <small>
                    {x.serviceCount} {t.services.toLowerCase()}
                  </small>
                  {x.badgeCount > 0 && (
                    <small style={{ color: "#067647", fontWeight: 850 }}>
                      ✓ {t.verified}
                    </small>
                  )}
                  <small style={{ color: "#078343" }}>{t.store} ›</small>
                </Link>
              ))}
            </div>
          </>
        )}
        <b style={sectionTitle}>
          {t.services} · {d.services?.length || 0}
        </b>
        <div style={grid}>
          {(d.services || []).map((x: any) => (
            <Link
              key={x.id}
              href={x.publicHref}
              onClick={() => {
                fetch(`/api/customer-discovery/views/${x.id}`, {
                  method: "POST",
                }).catch(() => {});
              }}
              style={card}
            >
              {x.imageUrl ? (
                <img src={x.imageUrl} alt="" style={img} />
              ) : (
                <div style={placeholder}><CustomerServiceIcon serviceId={x.moduleCode} size={48} /></div>
              )}
              <div style={{ padding: 8 }}>
                <small style={{ color: "#64748b" }}>{x.moduleName}</small>
                <b style={name}>{x.name}</b>
                <small style={{ display: "block" }}>{x.organizationName}</small>
                {x.verifiedBadgeCount > 0 && (
                  <small
                    style={{
                      display: "block",
                      color: "#067647",
                      fontWeight: 850,
                    }}
                  >
                    ✓ {t.verified}
                  </small>
                )}
                {x.priceFrom > 0 && (
                  <strong
                    style={{
                      display: "block",
                      color: "#ef5a3c",
                      fontSize: 9,
                      marginTop: 3,
                    }}
                  >
                    {t.from} {Math.round(x.priceFrom).toLocaleString("vi-VN")}{" "}
                    {x.currency}
                  </strong>
                )}
              </div>
            </Link>
          ))}
        </div>
        {!d.services?.length && !d.partners?.length && (
          <p style={{ textAlign: "center", color: "#64748b" }}>{t.empty}</p>
        )}
      </section>
      <MiniTabBar />
    </main>
  );
}
const shell = {
    minHeight: "100vh",
    background: "var(--zx-bg)",
    color: "var(--zx-text)",
    paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
    maxWidth: 760,
    margin: "0 auto",
  } as const,
  header = {
    position: "sticky",
    top: 0,
    zIndex: 10,
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    padding: 12,
    background: "var(--zx-header-bg)",
    backdropFilter: "blur(12px)",
  } as const,
  input = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: 0,
    background: "#FFFFFF",
    color: "var(--zx-text)",
    borderRadius: 14,
    fontSize: 11,
    boxShadow: "0 8px 22px rgba(24,33,30,.055)",
  } as const,
  chips = {
    display: "flex",
    gap: 5,
    overflowX: "auto",
    padding: "8px 0",
  } as const,
  chip = (a: boolean) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    border: 0,
    borderRadius: 999,
    padding: "6px 9px",
    background: a ? "var(--zx-brand)" : "#FFFFFF",
    color: a ? "#fff" : "var(--zx-text-secondary)",
    fontSize: 8,
    fontWeight: 850,
    whiteSpace: "nowrap" as const,
    boxShadow: a ? "0 6px 16px rgba(24,63,53,.16)" : "0 5px 14px rgba(24,33,30,.05)",
  }),
  sectionTitle = {
    display: "block",
    fontSize: 11,
    margin: "10px 0 6px",
  } as const,
  partnerRow = { display: "flex", gap: 7, overflowX: "auto" } as const,
  partner = {
    minWidth: 125,
    padding: 9,
    border: 0,
    borderRadius: 13,
    background: "#FFFFFF",
    textDecoration: "none",
    color: "inherit",
    display: "grid",
    gap: 2,
    fontSize: 9,
    boxShadow: "0 6px 18px rgba(24,33,30,.055)",
  } as const,
  grid = {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 8,
  } as const,
  card = {
    textDecoration: "none",
    color: "inherit",
    background: "#FFFFFF",
    border: 0,
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 8px 22px rgba(24,33,30,.06)",
  } as const,
  img = {
    width: "100%",
    aspectRatio: "1.4",
    objectFit: "cover",
    display: "block",
  } as const,
  placeholder = {
    aspectRatio: "1.4",
    display: "grid",
    placeItems: "center",
    fontSize: 34,
    background: "var(--zx-brand-soft)",
  } as const,
  name = {
    display: "block",
    fontSize: 10,
    margin: "2px 0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  } as const;
