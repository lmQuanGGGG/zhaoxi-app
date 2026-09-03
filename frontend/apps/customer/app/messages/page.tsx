"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import CustomerSupportRating from "./CustomerSupportRating";
import {
  CustomerPageHeader,
  CustomerShell,
  customerShellStyles as shell,
} from "../_components/CustomerShell";
import styles from "../customer-center.module.css";
const C = {
  "zh-CN": {
    title: "消息中心",
    all: "全部",
    housing: "租房",
    travel: "旅游",
    payment: "支付支持",
    support: "赵喜支持",
    assistant: "赵喜助手",
    assistantHint: "即时服务咨询与帮助",
    newSupport: "新建支持会话",
    subject: "主题",
    message: "消息",
    create: "创建",
    empty: "暂无会话",
    send: "发送",
    back: "返回",
    unread: "未读",
    notifications: "通知中心",
    help: "帮助中心",
  },
  "zh-TW": {
    title: "訊息中心",
    all: "全部",
    housing: "租房",
    travel: "旅遊",
    payment: "支付支援",
    support: "趙喜支援",
    assistant: "趙喜助手",
    assistantHint: "即時服務諮詢與協助",
    newSupport: "建立支援會話",
    subject: "主題",
    message: "訊息",
    create: "建立",
    empty: "暫無會話",
    send: "發送",
    back: "返回",
    unread: "未讀",
    notifications: "通知中心",
    help: "幫助中心",
  },
  "vi-VN": {
    title: "Trung tâm tin nhắn",
    all: "Tất cả",
    housing: "Nhà ở",
    travel: "Du lịch",
    payment: "Hỗ trợ thanh toán",
    support: "Hỗ trợ ZhaoXi",
    assistant: "Trợ lý ZhaoXi",
    assistantHint: "Tư vấn dịch vụ và hỗ trợ tức thời",
    newSupport: "Tạo hội thoại hỗ trợ",
    subject: "Chủ đề",
    message: "Tin nhắn",
    create: "Tạo",
    empty: "Chưa có hội thoại",
    send: "Gửi",
    back: "Quay lại",
    unread: "chưa đọc",
    notifications: "Trung tâm thông báo",
    help: "Trung tâm trợ giúp",
  },
  "en-US": {
    title: "Message Center",
    all: "All",
    housing: "Housing",
    travel: "Travel",
    payment: "Payment support",
    support: "ZhaoXi Support",
    assistant: "ZhaoXi Assistant",
    assistantHint: "Instant service guidance and help",
    newSupport: "New support conversation",
    subject: "Subject",
    message: "Message",
    create: "Create",
    empty: "No conversations yet",
    send: "Send",
    back: "Back",
    unread: "unread",
    notifications: "Notification Center",
    help: "Help Center",
  },
} as const;
const kinds = ["all", "housing", "travel", "payment", "support"] as const;
export default function Messages() {
  const { locale } = useZhaoXiLocale(),
    t = C[locale],
    q = useSearchParams();
  const [box, setBox] = useState<any>({ threads: [], summary: {} }),
    [filter, setFilter] = useState("all"),
    [active, setActive] = useState<string | null>(q.get("thread")),
    [thread, setThread] = useState<any>(null),
    [query, setQuery] = useState(""),
    [draft, setDraft] = useState(""),
    [showNew, setShowNew] = useState(false),
    [subject, setSubject] = useState(""),
    [first, setFirst] = useState("");
  async function load() {
    const r = await fetch(`/api/customer-messages?locale=${locale}`, {
        cache: "no-store",
      }),
      j = await r.json();
    if (j?.ok) setBox(j.data);
  }
  async function loadThread(id: string) {
    const r = await fetch(`/api/customer-messages/${encodeURIComponent(id)}`, {
        cache: "no-store",
      }),
      j = await r.json();
    if (j?.ok) {
      setThread(j.data);
      await fetch(`/api/customer-messages/${encodeURIComponent(id)}`, {
        method: "PATCH",
      }).catch(() => {});
      await load();
    }
  }
  useEffect(() => {
    void load();
  }, [locale]);
  useEffect(() => {
    if (active) void loadThread(active);
  }, [active]);
  async function send() {
    if (!active || !draft.trim()) return;
    const r = await fetch(
      `/api/customer-messages/${encodeURIComponent(active)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: draft }),
      },
    );
    if (r.ok) {
      setDraft("");
      await loadThread(active);
    }
  }
  async function create() {
    if (!subject.trim() || !first.trim()) return;
    const r = await fetch("/api/customer-messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, message: first }),
      }),
      j = await r.json();
    if (j?.ok) {
      setShowNew(false);
      setSubject("");
      setFirst("");
      setActive(j.data.id);
      await load();
    }
  }
  const visible = useMemo(
    () => {
      const normalized = query.trim().toLocaleLowerCase(locale);
      return (box.threads || []).filter(
        (x: any) =>
          (filter === "all" || x.kind === filter) &&
          (!normalized ||
            [x.title, x.lastMessage, x.subtitle].some((value) =>
              String(value || "")
                .toLocaleLowerCase(locale)
                .includes(normalized),
            )),
      );
    },
    [box.threads, filter, locale, query],
  );
  const label = (k: string) =>
    k === "housing"
      ? t.housing
      : k === "travel"
        ? t.travel
        : k === "payment"
          ? t.payment
          : k === "support"
            ? t.support
            : t.all;
  if (active && thread)
    return (
      <CustomerShell>
        <CustomerPageHeader
          title={thread.thread.title}
          backHref={null}
          actions={
            <button
              className={styles.secondaryButton}
              onClick={() => {
                setActive(null);
                setThread(null);
              }}
            >
              {t.back}
            </button>
          }
        />
        {thread.thread.kind === "support" && (
          <CustomerSupportRating
            threadId={active.replace("support:", "")}
            status={thread.thread.status}
          />
        )}
        <section className={styles.conversation}>
          {(thread.messages || []).map((m: any) => (
            <div
              key={m.id}
              className={`${styles.bubble} ${(m.senderRole || m.sender) === "customer" ? styles.mine : ""}`}
            >
              <small>
                {(m.senderRole || m.sender) === "customer"
                  ? "ZhaoXi ID"
                  : label(thread.thread.kind)}
              </small>
              <div>{m.body}</div>
              <small>{new Date(m.createdAt).toLocaleString(locale)}</small>
            </div>
          ))}
        </section>
        <div className={styles.composer}>
          <textarea
            className={styles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.message}
            rows={2}
          />
          <button className={styles.primaryButton} onClick={() => void send()}>
            {t.send}
          </button>
        </div>
      </CustomerShell>
    );
  return (
    <CustomerShell>
      <CustomerPageHeader
        title={t.title}
        subtitle={`${box.summary?.unread || 0} ${t.unread}`}
        backHref={null}
        actions={
          <Link className={styles.textLink} href="/notifications">
            {t.notifications}
          </Link>
        }
      />
      <Link href="/support" className={`${shell.card} ${styles.assistant}`}>
        <span>喜</span>
        <div>
          <b>{t.assistant}</b>
          <small>{t.assistantHint}</small>
        </div>
        <i>›</i>
      </Link>
      <label className={styles.messageSearch}>
        <span aria-hidden="true">⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`${t.title}…`}
          aria-label={t.title}
        />
      </label>
      <nav className={shell.chips}>
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`${styles.chip} ${filter === k ? styles.chipActive : ""}`}
          >
            {label(k)}
          </button>
        ))}
      </nav>
      <div className={styles.toolbar}>
        <Link href="/help" className={styles.textLink}>
          {t.help}
        </Link>
        <button
          onClick={() => setShowNew((v) => !v)}
          className={styles.primaryButton}
        >
          {t.newSupport}
        </button>
      </div>
      {showNew && (
        <section className={`${shell.card} ${styles.form}`}>
          <input
            className={styles.input}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t.subject}
          />
          <textarea
            className={styles.input}
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder={t.message}
            rows={3}
          />
          <button
            className={styles.primaryButton}
            onClick={() => void create()}
          >
            {t.create}
          </button>
        </section>
      )}
      <div className={styles.list}>
        {visible.map((x: any) => (
          <button
            key={x.id}
            onClick={() => setActive(x.id)}
            className={styles.thread}
          >
            <div className={styles.threadTop}>
              <div className={styles.threadCopy}>
                <small>{label(x.kind)}</small>
                <b>{x.title}</b>
                <small>{x.lastMessage}</small>
              </div>
              {x.unreadCount > 0 && (
                <span className={styles.badge}>{x.unreadCount}</span>
              )}
            </div>
            <small>
              {x.subtitle} · {new Date(x.lastMessageAt).toLocaleString(locale)}
            </small>
          </button>
        ))}
        {!visible.length && (
          <div className={`${shell.card} ${shell.empty}`}>
            <h2>{t.empty}</h2>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
