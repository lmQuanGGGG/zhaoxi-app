"use client";
import { useEffect, useMemo, useState } from "react";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
type M = {
  id: string;
  senderRole: "customer" | "partner";
  body: string;
  createdAt: string;
  customerReadAt?: string | null;
  partnerReadAt?: string | null;
};
const C = {
  "zh-CN": {
    title: "与旅行服务商沟通",
    send: "发送",
    placeholder: "输入消息…",
    new: "新消息",
  },
  "zh-TW": {
    title: "與旅遊服務商溝通",
    send: "傳送",
    placeholder: "輸入訊息…",
    new: "新訊息",
  },
  "vi-VN": {
    title: "Trao đổi với Partner du lịch",
    send: "Gửi",
    placeholder: "Nhập tin nhắn…",
    new: "Tin mới",
  },
  "en-US": {
    title: "Message Travel Partner",
    send: "Send",
    placeholder: "Type a message…",
    new: "New",
  },
} as const;
export default function TravelMessageThread({
  id,
  messages,
  onChanged,
}: {
  id: string;
  messages: M[];
  onChanged: () => void;
}) {
  const { locale } = useZhaoXiLocale(),
    t = C[locale];
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    unread = useMemo(
      () =>
        messages.filter((x) => x.senderRole === "partner" && !x.customerReadAt)
          .length,
      [messages],
    );
  useEffect(() => {
    if (unread)
      fetch(`/api/customer-travel-inquiries/${id}/messages`, {
        method: "PATCH",
      })
        .then(() => onChanged())
        .catch(() => {});
  }, [id, unread]);
  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/customer-travel-inquiries/${id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (r.ok) {
        setText("");
        onChanged();
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <section style={box}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <b style={{ fontSize: 9 }}>💬 {t.title}</b>
        {unread > 0 && (
          <span style={badge}>
            {t.new} {unread}
          </span>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gap: 4,
          maxHeight: 160,
          overflowY: "auto",
          marginTop: 6,
        }}
      >
        {messages.slice(-20).map((m) => (
          <div
            key={m.id}
            style={{
              justifySelf: m.senderRole === "customer" ? "end" : "start",
              maxWidth: "85%",
              background: m.senderRole === "customer" ? "#dcfce7" : "#f1f5f9",
              padding: "6px 8px",
              borderRadius: 9,
              fontSize: 8,
            }}
          >
            {m.body}
            <small style={{ display: "block", color: "#64748b" }}>
              {new Date(m.createdAt).toLocaleString()}
            </small>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 5,
          marginTop: 6,
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.placeholder}
          style={input}
        />
        <button
          disabled={busy || !text.trim()}
          onClick={() => void send()}
          style={sendBtn}
        >
          {t.send}
        </button>
      </div>
    </section>
  );
}
const box = {
    marginTop: 8,
    padding: 8,
    border: "1px solid var(--zx-border)",
    borderRadius: 11,
    background: "var(--zx-surface)",
  } as const,
  input = {
    border: "1px solid var(--zx-border)",
    borderRadius: 8,
    padding: 6,
    fontSize: 8,
    background: "var(--zx-surface-raised)",
    color: "var(--zx-text)",
  } as const,
  sendBtn = {
    border: 0,
    borderRadius: 8,
    padding: "6px 8px",
    background: "var(--zx-brand)",
    color: "#fff",
    fontWeight: 850,
    fontSize: 8,
  } as const,
  badge = {
    padding: "2px 5px",
    borderRadius: 999,
    background: "var(--zx-danger-soft)",
    color: "var(--zx-danger)",
    fontSize: 7,
    fontWeight: 900,
  } as const;
