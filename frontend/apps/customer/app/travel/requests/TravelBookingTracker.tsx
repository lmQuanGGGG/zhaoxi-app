"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import MiniTabBar from "../../_components/MiniTabBar";
import { CustomerServiceIcon } from "../../_components/CustomerServiceIcon";
import TravelMessageThread from "./TravelMessageThread";
import TravelPartnerPayment from "./TravelPartnerPayment";
import PaymentSupportPanel from "./PaymentSupportPanel";
type Row = {
  id: string;
  requestCode: string;
  status: string;
  customerName: string;
  createdAt: string;
  details?: Record<string, unknown>;
};
const C = {
  "zh-CN": {
    title: "我的旅游预约",
    back: "旅游",
    empty: "暂无旅游预约",
    requested: "待确认",
    confirmed: "已确认",
    completed: "已完成",
    cancelled: "已取消",
    rejected: "无法接待",
    date: "日期",
    time: "时间",
    guests: "人数",
    contact: "联系方式",
    cancel: "取消预约",
  },
  "zh-TW": {
    title: "我的旅遊預約",
    back: "旅遊",
    empty: "暫無旅遊預約",
    requested: "待確認",
    confirmed: "已確認",
    completed: "已完成",
    cancelled: "已取消",
    rejected: "無法接待",
    date: "日期",
    time: "時間",
    guests: "人數",
    contact: "聯絡方式",
    cancel: "取消預約",
  },
  "vi-VN": {
    title: "Yêu cầu du lịch của tôi",
    back: "Du lịch",
    empty: "Chưa có yêu cầu du lịch",
    requested: "Chờ Partner xác nhận",
    confirmed: "Đã xác nhận",
    completed: "Đã hoàn tất",
    cancelled: "Đã hủy",
    rejected: "Partner không thể tiếp nhận",
    date: "Ngày",
    time: "Giờ",
    guests: "Số khách",
    contact: "Liên hệ",
    cancel: "Hủy yêu cầu",
  },
  "en-US": {
    title: "My travel bookings",
    back: "Travel",
    empty: "No travel bookings yet",
    requested: "Awaiting Partner",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Unavailable",
    date: "Date",
    time: "Time",
    guests: "Guests",
    contact: "Contact",
    cancel: "Cancel",
  },
} as const;
export default function TravelBookingTracker() {
  const { locale } = useZhaoXiLocale(),
    t = C[locale];
  const [rows, setRows] = useState<Row[]>([]),
    [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    const r = await fetch("/api/customer-travel-inquiries", {
        cache: "no-store",
      }),
      j = await r.json();
    if (j?.ok) {
      const next = j.data || [];
      setRows(next);
      try {
        const current = JSON.parse(
          localStorage.getItem("zhaoxi-request-codes") || "[]",
        ) as string[];
        localStorage.setItem(
          "zhaoxi-request-codes",
          JSON.stringify(
            Array.from(
              new Set([...current, ...next.map((x: Row) => x.requestCode)]),
            ).slice(-100),
          ),
        );
      } catch {}
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function cancel(id: string) {
    setBusy(id);
    try {
      const r = await fetch(`/api/customer-travel-inquiries/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (r.ok) await load();
    } finally {
      setBusy("");
    }
  }
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
          padding: "12px 14px",
          background: "var(--zx-header-bg)",
          borderBottom: "1px solid var(--zx-border)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Link href="/du-lich" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:12,background:"#FFF",border:"1px solid #E2E8F0",textDecoration:"none",color:"#1E293B",fontSize:20,lineHeight:1,boxShadow:"none"}}>‹</Link>
        <b style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 750, color: "#1E293B" }}><CustomerServiceIcon serviceId="travel" size={32} />{t.title}</b>
        <span style={{width: 36}} />
      </header>
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "14px 14px calc(90px + env(safe-area-inset-bottom))" }}>
        {!rows.length ? (
          <p style={{ textAlign: "center", color: "#64748b" }}>{t.empty}</p>
        ) : (
          <div style={{ display: "grid", gap: 9 }}>
            {rows.map((r) => {
              const d = r.details || {},
                stage = String(d.travelBookingStage || "requested") as
                  | "requested"
                  | "confirmed"
                  | "completed"
                  | "cancelled"
                  | "rejected";
              return (
                <article
                  key={r.id}
                  style={{
                    padding: 11,
                    border: "1px solid var(--zx-border)",
                    borderRadius: 14,
                    background: "var(--zx-surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <b style={{ fontSize: 10 }}>{r.requestCode}</b>
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 850,
                        color:
                          stage === "confirmed"
                            ? "#067647"
                            : stage === "rejected" || stage === "cancelled"
                              ? "#b42318"
                              : "#1d4ed8",
                      }}
                    >
                      {String(t[stage] || stage)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                      gap: 5,
                      marginTop: 8,
                      fontSize: 9,
                    }}
                  >
                    <span>
                      {t.date}: <b>{String(d.requestedDate || "—")}</b>
                    </span>
                    <span>
                      {t.time}: <b>{String(d.requestedTime || "—")}</b>
                    </span>
                    <span>
                      {t.guests}: <b>{String(d.guests || 1)}</b>
                    </span>
                    <span>
                      {t.contact}:{" "}
                      <b>{String(d.preferredContact || "phone")}</b>
                    </span>
                  </div>
                  <TravelPartnerPayment
                    id={r.id}
                    stage={stage}
                    details={d}
                    onChanged={() => void load()}
                  />
                  <PaymentSupportPanel
                    requestId={r.id}
                    ticket={d.paymentSupportTicket || null}
                    onChanged={() => void load()}
                  />
                  <TravelMessageThread
                    id={r.id}
                    messages={
                      Array.isArray(d.travelMessages)
                        ? (d.travelMessages.filter(
                            (x) => x && typeof x === "object",
                          ) as any[])
                        : []
                    }
                    onChanged={() => void load()}
                  />
                  {Array.isArray(d.travelTimeline) &&
                    d.travelTimeline.length > 0 && (
                      <details style={{ marginTop: 7 }}>
                        <summary style={{ fontSize: 8, fontWeight: 850 }}>
                          Timeline · {d.travelTimeline.length}
                        </summary>
                        <div style={{ display: "grid", gap: 3, marginTop: 4 }}>
                          {[...d.travelTimeline]
                            .reverse()
                            .slice(0, 12)
                            .map((x: any, i: number) => (
                              <small
                                key={x.id || i}
                                style={{
                                  padding: 4,
                                  background: "var(--zx-surface-soft)",
                                  borderRadius: 6,
                                }}
                              >
                                {String(x.action || "")} ·{" "}
                                {x.at
                                  ? new Date(String(x.at)).toLocaleString()
                                  : ""}
                              </small>
                            ))}
                        </div>
                      </details>
                    )}
                  {!["completed", "cancelled", "rejected"].includes(stage) && (
                    <button
                      disabled={busy === r.id}
                      onClick={() => void cancel(r.id)}
                      style={{
                        marginTop: 8,
                        border: 0,
                        borderRadius: 9,
                        padding: "7px 9px",
                        background: "#fff1f2",
                        color: "#b42318",
                        fontWeight: 850,
                        fontSize: 8,
                      }}
                    >
                      {t.cancel}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
      <MiniTabBar />
    </main>
  );
}
