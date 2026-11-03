"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useZhaoXiSession } from "@zhaoxi/auth";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import { useVisiblePolling } from "@zhaoxi/hooks";

// Order chat with customers (one conversation per order). Realtime is polling:
// 4s inside an open thread, 10s for the inbox, 20s for the nav badge.

type Sender = "customer" | "partner";
type ChatMessage = { id: string; senderRole: Sender; body: string; createdAt: string; clientMessageId: string | null; pending?: boolean };
type ChatSummary = { id: string; requestId: string; requestCode: string; title: string; subtitle: string; moduleCode: string; status: string; lastMessage: string; lastMessageAt: string; lastSenderRole: Sender | null; unreadCount: number };
type ChatThread = { thread: { id: string; requestId: string; requestCode: string; title: string; subtitle: string; status: string; moduleCode: string; canSend: boolean; counterpartReadAt: string | null }; messages: ChatMessage[] };
type Envelope<T> = { ok: true; data: T } | { ok: false; error?: { message?: string; code?: string } };

const C = {
  "zh-CN": { title: "客户消息", nav: "消息", empty: "暂无消息", emptyHint: "客户就订单发来的消息会显示在这里。", pick: "选择一个会话", placeholder: "回复客户…", send: "发送", you: "我", seen: "已读", chat: "联系客户", start: "就此订单联系客户", back: "返回", error: "发送失败，请重试。", closed: "该订单已不属于本店" },
  "zh-TW": { title: "客戶訊息", nav: "訊息", empty: "暫無訊息", emptyHint: "客戶就訂單傳來的訊息會顯示在這裡。", pick: "選擇一個對話", placeholder: "回覆客戶…", send: "傳送", you: "我", seen: "已讀", chat: "聯絡客戶", start: "就此訂單聯絡客戶", back: "返回", error: "傳送失敗，請重試。", closed: "此訂單已不屬於本店" },
  "vi-VN": { title: "Tin nhắn khách hàng", nav: "Tin nhắn", empty: "Chưa có tin nhắn", emptyHint: "Khách nhắn theo đơn sẽ hiện ở đây.", pick: "Chọn một hội thoại", placeholder: "Nhắn khách…", send: "Gửi", you: "Bạn", seen: "Đã xem", chat: "Nhắn khách", start: "Nhắn cho khách về đơn này", back: "Quay lại", error: "Không gửi được, thử lại.", closed: "Đơn không còn thuộc gian hàng này" },
  "en-US": { title: "Customer messages", nav: "Messages", empty: "No messages yet", emptyHint: "Customer messages about orders appear here.", pick: "Pick a conversation", placeholder: "Message the customer…", send: "Send", you: "You", seen: "Seen", chat: "Message customer", start: "Message the customer about this order", back: "Back", error: "Could not send, try again.", closed: "This order no longer belongs to this store" },
} as const;

function useCopy() {
  const { locale } = useZhaoXiLocale();
  return C[locale] || C["vi-VN"];
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!body?.ok) throw new Error((body && !body.ok && (body.error?.message || body.error?.code)) || `HTTP ${response.status}`);
  return body.data;
}

const chatPath = (requestId: string) => `/api/partner-order-chats/${encodeURIComponent(requestId)}`;
const newClientId = () => `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const clock = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? time : `${time} · ${d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`;
};

/** Unread customer messages for the current store (nav badge). */
export function useOrderChatUnread() {
  const session = useZhaoXiSession();
  const orgId = session?.organizationId || "";
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      setUnread((await api<{ unread: number }>(`/api/partner-order-chats?summary=1&organizationId=${encodeURIComponent(orgId)}`)).unread);
    } catch {}
  }, [orgId]);
  useVisiblePolling(load, { enabled: Boolean(orgId), intervalMs: 20_000 });
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("zhaoxi:order-chat-read", refresh);
    return () => window.removeEventListener("zhaoxi:order-chat-read", refresh);
  }, [load]);
  return unread;
}

/** "Message customer" link on an order card. */
export function OrderChatButton({ requestId }: { requestId: string }) {
  const t = useCopy();
  return <Link href={`/messages?order=${encodeURIComponent(requestId)}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 12, background: "#ecfdf3", color: "#067a3a", fontWeight: 850, textDecoration: "none" }}>💬 {t.chat}</Link>;
}

export function OrderChatInbox() {
  const t = useCopy();
  const session = useZhaoXiSession();
  const orgId = session?.organizationId || "";
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("order") || "";
  const [threads, setThreads] = useState<ChatSummary[] | null>(null);
  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      setThreads((await api<{ threads: ChatSummary[] }>(`/api/partner-order-chats?organizationId=${encodeURIComponent(orgId)}`)).threads);
    } catch {
      setThreads((current) => current || []);
    }
  }, [orgId]);
  useVisiblePolling(load, { enabled: Boolean(orgId), intervalMs: 10_000 });
  const open = (requestId: string) => router.replace(requestId ? `/messages?order=${encodeURIComponent(requestId)}` : "/messages", { scroll: false });

  return (
    <section className="zx-ochat" data-open={Boolean(active)}>
      <style>{CSS}</style>
      <aside className="zx-ochat-list">
        <h2>{t.title}</h2>
        {threads === null ? <p className="zx-ochat-muted">…</p> : !threads.length ? (
          <div className="zx-ochat-empty"><b>💬 {t.empty}</b><span>{t.emptyHint}</span></div>
        ) : threads.map((x) => (
          <button key={x.id} type="button" className="zx-ochat-item" data-active={x.requestId === active} onClick={() => open(x.requestId)}>
            <span className="zx-ochat-avatar">{(x.title || "?").trim().charAt(0).toUpperCase()}</span>
            <span className="zx-ochat-item-body">
              <span className="zx-ochat-row"><b>{x.title}</b><small>{clock(x.lastMessageAt)}</small></span>
              <small className="zx-ochat-code">{x.subtitle}</small>
              <span className="zx-ochat-row">
                <span className="zx-ochat-preview" data-unread={x.unreadCount > 0}>{x.lastSenderRole === "partner" ? `${t.you}: ` : ""}{x.lastMessage}</span>
                {x.unreadCount > 0 && <span className="zx-ochat-badge">{x.unreadCount > 99 ? "99+" : x.unreadCount}</span>}
              </span>
            </span>
          </button>
        ))}
      </aside>
      <div className="zx-ochat-pane">
        {active && orgId ? <OrderChatThread key={active} orgId={orgId} requestId={active} onBack={() => open("")} onChanged={() => void load()} /> : <div className="zx-ochat-placeholder">{t.pick}</div>}
      </div>
    </section>
  );
}

function OrderChatThread({ orgId, requestId, onBack, onChanged }: { orgId: string; requestId: string; onBack: () => void; onChanged: () => void }) {
  const t = useCopy();
  const [data, setData] = useState<ChatThread | null>(null);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  // The parent passes a fresh callback every render; keep it out of effect deps.
  const changed = useRef(onChanged);
  useEffect(() => { changed.current = onChanged; }, [onChanged]);

  const load = useCallback(async () => {
    try {
      setData(await api<ChatThread>(`${chatPath(requestId)}?organizationId=${encodeURIComponent(orgId)}`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.closed);
    }
  }, [orgId, requestId, t.closed]);
  useVisiblePolling(load, { intervalMs: 4_000 });

  // Mark read on open and whenever a new customer message arrives, not on every poll.
  const loaded = Boolean(data);
  const incoming = useMemo(() => (data?.messages || []).filter((m) => m.senderRole === "customer").length, [data?.messages]);
  useEffect(() => {
    if (!loaded) return;
    void api(chatPath(requestId), { method: "PATCH", body: JSON.stringify({ organizationId: orgId }) }).then(() => {
      changed.current();
      window.dispatchEvent(new Event("zhaoxi:order-chat-read"));
    }).catch(() => undefined);
  }, [incoming, loaded, orgId, requestId]);

  const messages = useMemo(() => {
    const saved = data?.messages || [];
    const savedIds = new Set(saved.map((m) => m.clientMessageId).filter(Boolean));
    return [...saved, ...pending.filter((m) => !savedIds.has(m.clientMessageId))];
  }, [data?.messages, pending]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  const readAt = data?.thread.counterpartReadAt ? new Date(data.thread.counterpartReadAt).getTime() : 0;
  const seenId = readAt ? messages.filter((m) => m.senderRole === "partner" && !m.pending && new Date(m.createdAt).getTime() <= readAt).at(-1)?.id : undefined;

  async function send() {
    const body = text.trim();
    if (!body) return;
    const clientMessageId = newClientId();
    const local: ChatMessage = { id: `local-${clientMessageId}`, clientMessageId, body, senderRole: "partner", createdAt: new Date().toISOString(), pending: true };
    setText("");
    setPending((current) => [...current, local]);
    try {
      await api(chatPath(requestId), { method: "POST", body: JSON.stringify({ organizationId: orgId, message: body, clientMessageId }) });
      await load();
      changed.current();
    } catch {
      setText(body);
      setError(t.error);
    } finally {
      setPending((current) => current.filter((m) => m.id !== local.id));
    }
  }

  return (
    <div className="zx-ochat-thread">
      <header>
        <button type="button" className="zx-ochat-back" aria-label={t.back} onClick={onBack}>‹</button>
        <div><b>{data?.thread.title || "…"}</b><small>{data?.thread.subtitle || ""}</small></div>
      </header>
      <div className="zx-ochat-messages">
        {data && !messages.length && <p className="zx-ochat-muted" style={{ textAlign: "center", margin: "auto" }}>💬 {t.start}</p>}
        {messages.map((m) => (
          <div key={m.clientMessageId || m.id} className="zx-ochat-msg" data-own={m.senderRole === "partner"} data-pending={Boolean(m.pending)}>
            <p>{m.body}</p>
            <small>{m.pending ? "…" : clock(m.createdAt)}{m.id === seenId ? ` · ${t.seen}` : ""}</small>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <p className="zx-ochat-error">{error}</p>}
      {data?.thread.canSend !== false && (
        <form className="zx-ochat-composer" onSubmit={(e) => { e.preventDefault(); void send(); }}>
          <textarea value={text} rows={1} maxLength={2000} placeholder={t.placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
          <button type="submit" disabled={!text.trim()}>{t.send}</button>
        </form>
      )}
    </div>
  );
}

const CSS = `
.zx-ochat{display:grid;grid-template-columns:minmax(260px,360px) 1fr;gap:16px;min-height:calc(100vh - 220px);margin-top:12px}
.zx-ochat-list,.zx-ochat-pane{background:#fff;border-radius:20px;box-shadow:0 10px 30px rgba(15,23,42,.07)}
.zx-ochat-list{padding:14px;display:flex;flex-direction:column;gap:6px;overflow-y:auto;max-height:calc(100vh - 200px)}
.zx-ochat-list h2{margin:4px 6px 8px;font-size:20px}
.zx-ochat-item{display:flex;gap:10px;align-items:center;width:100%;padding:10px;border:0;border-radius:14px;background:transparent;text-align:left;color:inherit}
.zx-ochat-item:hover{background:#f6faf8}.zx-ochat-item[data-active="true"]{background:#ecfdf3}
.zx-ochat-avatar{flex:0 0 42px;height:42px;border-radius:21px;display:grid;place-items:center;background:#e9f8ef;color:#07a856;font-weight:900;font-size:17px}
.zx-ochat-item-body{flex:1;min-width:0;display:grid;gap:2px}
.zx-ochat-row{display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0}
.zx-ochat-row b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.zx-ochat-row small{color:#94a3b8;flex:0 0 auto}
.zx-ochat-code{color:#07a856;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zx-ochat-preview{color:#64748b;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.zx-ochat-preview[data-unread="true"]{color:#0f172a;font-weight:800}
.zx-ochat-badge{flex:0 0 auto;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#ef4444;color:#fff;font-size:11px;font-weight:900;display:grid;place-items:center}
.zx-ochat-empty{display:grid;gap:6px;padding:30px 10px;text-align:center;color:#64748b}.zx-ochat-empty b{color:#0f172a}
.zx-ochat-muted{color:#94a3b8}
.zx-ochat-placeholder{height:100%;min-height:300px;display:grid;place-items:center;color:#94a3b8}
.zx-ochat-thread{display:flex;flex-direction:column;height:calc(100vh - 200px);min-height:420px}
.zx-ochat-thread header{display:flex;align-items:center;gap:10px;padding:14px 16px;box-shadow:0 6px 16px rgba(15,23,42,.05);border-radius:20px 20px 0 0}
.zx-ochat-thread header div{display:grid;min-width:0}.zx-ochat-thread header small{color:#64748b}
.zx-ochat-back{display:none;width:36px;height:36px;border:0;border-radius:18px;background:#f1f5f9;font-size:24px;line-height:1}
.zx-ochat-messages{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:16px;background:#f7f9f8}
.zx-ochat-msg{align-self:flex-start;max-width:78%;display:grid;gap:3px}.zx-ochat-msg[data-own="true"]{align-self:flex-end;justify-items:end}
.zx-ochat-msg p{margin:0;padding:10px 14px;border-radius:18px 18px 18px 6px;background:#fff;box-shadow:0 4px 12px rgba(15,23,42,.06);white-space:pre-wrap;word-break:break-word}
.zx-ochat-msg[data-own="true"] p{border-radius:18px 18px 6px 18px;background:#07c160;color:#fff}
.zx-ochat-msg[data-pending="true"]{opacity:.6}.zx-ochat-msg small{color:#94a3b8;font-size:11px}
.zx-ochat-error{margin:0;padding:8px 16px;color:#be123c;background:#fff1f2}
.zx-ochat-composer{display:flex;gap:8px;padding:12px;border-radius:0 0 20px 20px}
.zx-ochat-composer textarea{flex:1;resize:none;border:0;border-radius:16px;padding:12px 14px;background:#f1f6f3;font:inherit;min-height:46px;max-height:140px}
.zx-ochat-composer button{border:0;border-radius:16px;padding:0 20px;background:#07c160;color:#fff;font-weight:900}.zx-ochat-composer button:disabled{opacity:.5}
@media(max-width:820px){.zx-ochat{grid-template-columns:1fr}.zx-ochat[data-open="true"] .zx-ochat-list{display:none}.zx-ochat[data-open="false"] .zx-ochat-pane{display:none}.zx-ochat-back{display:inline-block}.zx-ochat-list,.zx-ochat-thread{max-height:none;height:calc(100vh - 170px)}}
`;
