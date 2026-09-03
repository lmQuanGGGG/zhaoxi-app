"use client";
import { useEffect, useState } from "react";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
const C = {
  "zh-CN": {
    title: "向合作伙伴付款",
    direct: "款项直接进入旅行服务商账户，赵喜不持有您的付款。",
    start: "开始付款",
    refresh: "刷新状态",
    paid: "已付款",
    pending: "等待付款",
    failed: "付款失败",
    cancelled: "付款已取消",
    open: "打开合作伙伴收银台",
    qr: "合作伙伴 QR 内容",
    copy: "复制",
  },
  "zh-TW": {
    title: "向合作夥伴付款",
    direct: "款項直接進入旅遊服務商帳戶，趙喜不持有您的付款。",
    start: "開始付款",
    refresh: "重新整理狀態",
    paid: "已付款",
    pending: "等待付款",
    failed: "付款失敗",
    cancelled: "付款已取消",
    open: "開啟合作夥伴收銀台",
    qr: "合作夥伴 QR 內容",
    copy: "複製",
  },
  "vi-VN": {
    title: "Thanh toán cho Partner",
    direct:
      "Tiền đi trực tiếp vào tài khoản/merchant của Partner; ZhaoXi không giữ khoản thanh toán này.",
    start: "Bắt đầu thanh toán",
    refresh: "Cập nhật trạng thái",
    paid: "Đã thanh toán",
    pending: "Đang chờ thanh toán",
    failed: "Thanh toán thất bại",
    cancelled: "Thanh toán đã hủy",
    open: "Mở checkout của Partner",
    qr: "Nội dung QR của Partner",
    copy: "Sao chép",
  },
  "en-US": {
    title: "Pay Partner",
    direct:
      "Funds go directly to the Partner merchant; ZhaoXi never holds this payment.",
    start: "Start payment",
    refresh: "Refresh status",
    paid: "Paid",
    pending: "Awaiting payment",
    failed: "Payment failed",
    cancelled: "Payment cancelled",
    open: "Open Partner checkout",
    qr: "Partner QR payload",
    copy: "Copy",
  },
} as const;
export default function TravelPartnerPayment({
  id,
  stage,
  details,
  onChanged,
}: {
  id: string;
  stage: string;
  details: Record<string, unknown>;
  onChanged: () => void;
}) {
  const { locale } = useZhaoXiLocale(),
    t = C[locale];
  const [state, setState] = useState<any>({
      status: String(details.travelPaymentStatus || "not_started"),
      intent: details.partnerPaymentIntent || null,
    }),
    [busy, setBusy] = useState(false);
  async function refresh() {
    const r = await fetch(`/api/customer-travel-inquiries/${id}/payment`, {
        cache: "no-store",
      }),
      j = await r.json();
    if (j?.ok) setState(j.data);
  }
  useEffect(() => {
    if (stage === "confirmed") void refresh();
  }, [id, stage]);
  async function start() {
    setBusy(true);
    try {
      const r = await fetch(`/api/customer-travel-inquiries/${id}/payment`, {
          method: "POST",
        }),
        j = await r.json();
      if (j?.ok) {
        setState({
          status: String(
            j.data?.intent?.status === "paid" ? "paid" : "pending",
          ),
          intent: j.data?.intent,
        });
        onChanged();
      }
    } finally {
      setBusy(false);
    }
  }
  if (stage !== "confirmed" && state.status !== "paid") return null;
  const intent = state.intent || {};
  const label =
    state.status === "paid"
      ? t.paid
      : state.status === "failed"
        ? t.failed
        : state.status === "cancelled"
          ? t.cancelled
          : t.pending;
  return (
    <section
      style={{
        marginTop: 8,
        padding: 9,
        border: "1px solid #dfe8e3",
        borderRadius: 11,
        background: "#f8faf9",
      }}
    >
      <b style={{ fontSize: 9 }}>💳 {t.title}</b>
      <small style={{ display: "block", marginTop: 3, color: "#067647" }}>
        ✓ {t.direct}
      </small>
      {state.status !== "not_started" && (
        <div style={{ fontSize: 8, marginTop: 5 }}>
          {label}
          {intent.amount
            ? ` · ${Number(intent.amount).toLocaleString("vi-VN")} ${intent.currency || "VND"}`
            : ""}
        </div>
      )}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
        {state.status === "not_started" && (
          <button disabled={busy} onClick={() => void start()} style={btn}>
            {t.start}
          </button>
        )}
        {state.status !== "not_started" && state.status !== "paid" && (
          <button onClick={() => void refresh()} style={ghost}>
            {t.refresh}
          </button>
        )}
        {intent.checkoutUrl && (
          <a
            href={String(intent.checkoutUrl)}
            target="_blank"
            rel="noreferrer"
            style={link}
          >
            {t.open}
          </a>
        )}
      </div>
      {intent.qrPayload && (
        <div style={{ marginTop: 6, fontSize: 7, wordBreak: "break-all" }}>
          <b>{t.qr}</b>
          <div>{String(intent.qrPayload)}</div>
          <button
            onClick={() =>
              navigator.clipboard?.writeText(String(intent.qrPayload))
            }
            style={ghost}
          >
            {t.copy}
          </button>
        </div>
      )}
    </section>
  );
}
const btn = {
    border: 0,
    borderRadius: 8,
    padding: "6px 8px",
    background: "var(--zx-brand)",
    color: "#fff",
    fontWeight: 850,
    fontSize: 7,
  } as const,
  ghost = {
    border: "1px solid var(--zx-border)",
    borderRadius: 8,
    padding: "6px 8px",
    background: "var(--zx-surface-raised)",
    color: "var(--zx-text)",
    fontWeight: 850,
    fontSize: 7,
  } as const,
  link = { ...btn, textDecoration: "none" } as const;
