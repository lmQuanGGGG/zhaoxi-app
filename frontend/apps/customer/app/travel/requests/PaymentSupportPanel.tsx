"use client";
import { useEffect, useMemo, useState } from "react";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
const C = {
  "zh-CN": {
    title: "支付与退款支持",
    open: "提交支持请求",
    category: "问题类型",
    message: "问题说明",
    refund: "退款问题",
    payment: "支付问题",
    status: "状态",
    sla: "预计处理时间",
    refundEta: "预计退款完成",
    direct: "赵喜仅协助处理，款项仍由合作伙伴直接处理",
    send: "发送",
    reply: "发送消息",
    new: "新消息",
  },
  "zh-TW": {
    title: "支付與退款支援",
    open: "提交支援請求",
    category: "問題類型",
    message: "問題說明",
    refund: "退款問題",
    payment: "支付問題",
    status: "狀態",
    sla: "預計處理時間",
    refundEta: "預計退款完成",
    direct: "趙喜僅協助處理，款項仍由合作夥伴直接處理",
    send: "傳送",
    reply: "傳送訊息",
    new: "新訊息",
  },
  "vi-VN": {
    title: "Hỗ trợ thanh toán & hoàn tiền",
    open: "Gửi yêu cầu hỗ trợ",
    category: "Loại vấn đề",
    message: "Mô tả vấn đề",
    refund: "Vấn đề hoàn tiền",
    payment: "Vấn đề thanh toán",
    status: "Trạng thái",
    sla: "Dự kiến xử lý",
    refundEta: "Dự kiến hoàn tiền",
    direct: "ZhaoXi chỉ hỗ trợ điều phối; tiền vẫn do Partner xử lý trực tiếp",
    send: "Gửi",
    reply: "Nhắn cho Partner",
    new: "Tin mới",
  },
  "en-US": {
    title: "Payment & refund support",
    open: "Open support request",
    category: "Issue type",
    message: "Describe the issue",
    refund: "Refund issue",
    payment: "Payment issue",
    status: "Status",
    sla: "Expected response",
    refundEta: "Refund ETA",
    direct:
      "ZhaoXi only coordinates support; funds remain handled directly by Partner",
    send: "Send",
    reply: "Message Partner",
    new: "New",
  },
} as const;
export default function PaymentSupportPanel({
  requestId,
  ticket,
  onChanged,
}: {
  requestId: string;
  ticket: any;
  onChanged: () => void;
}) {
  const { locale } = useZhaoXiLocale(),
    t = C[locale];
  const [category, setCategory] = useState("payment"),
    [message, setMessage] = useState(""),
    [reply, setReply] = useState("");
  const messages = Array.isArray(ticket?.messages) ? ticket.messages : [],
    unread = useMemo(
      () =>
        messages.filter((x: any) => x.sender === "partner" && !x.customerReadAt)
          .length,
      [messages],
    );
  useEffect(() => {
    if (ticket && unread)
      fetch(`/api/customer-payment-support/${requestId}/messages`, {
        method: "PATCH",
      })
        .then(() => onChanged())
        .catch(() => {});
  }, [requestId, unread]);
  async function open() {
    if (!message.trim()) return;
    const r = await fetch(`/api/customer-payment-support/${requestId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category, message }),
    });
    if (r.ok) {
      setMessage("");
      onChanged();
    }
  }
  async function send() {
    if (!reply.trim()) return;
    const r = await fetch(
      `/api/customer-payment-support/${requestId}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: reply }),
      },
    );
    if (r.ok) {
      setReply("");
      onChanged();
    }
  }
  return (
    <section
      style={{
        marginTop: 8,
        padding: 9,
        border: "1px solid var(--zx-border)",
        borderRadius: 11,
        background: "var(--zx-surface)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <b>🛟 {t.title}</b>
        {unread > 0 && (
          <span style={{ fontSize: 7, color: "#b42318", fontWeight: 900 }}>
            {t.new} {unread}
          </span>
        )}
      </div>
      <small style={{ display: "block", color: "#067647", marginTop: 3 }}>
        ✓ {t.direct}
      </small>
      {ticket ? (
        <div style={{ fontSize: 8, marginTop: 6 }}>
          <b>
            {t.status}: {ticket.stage}
          </b>
          {ticket.slaDueAt && (
            <small style={{ display: "block" }}>
              {t.sla}: {new Date(ticket.slaDueAt).toLocaleString()}
            </small>
          )}
          {ticket.refundEtaAt && (
            <small style={{ display: "block", color: "#b54708" }}>
              {t.refundEta}: {new Date(ticket.refundEtaAt).toLocaleString()}
            </small>
          )}
          <div
            style={{
              display: "grid",
              gap: 3,
              maxHeight: 130,
              overflowY: "auto",
              marginTop: 6,
            }}
          >
            {messages.slice(-20).map((m: any) => (
              <div
                key={m.id}
                style={{
                  justifySelf: m.sender === "customer" ? "end" : "start",
                  maxWidth: "85%",
                  padding: "5px 7px",
                  borderRadius: 8,
                  background: m.sender === "customer" ? "var(--zx-brand-soft)" : "var(--zx-surface-soft)",
                }}
              >
                {m.body}
                <small style={{ display: "block", color: "#64748b" }}>
                  {new Date(m.createdAt).toLocaleString()}
                </small>
              </div>
            ))}
          </div>
          {!["resolved", "closed"].includes(ticket.stage) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 4,
                marginTop: 5,
              }}
            >
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={t.reply}
              />
              <button onClick={() => void send()}>{t.send}</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 5, marginTop: 6 }}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="payment">{t.payment}</option>
            <option value="refund">{t.refund}</option>
          </select>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.message}
            rows={3}
          />
          <button onClick={() => void open()}>{t.open}</button>
        </div>
      )}
    </section>
  );
}
