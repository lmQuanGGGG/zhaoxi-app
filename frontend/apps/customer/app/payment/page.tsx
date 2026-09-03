"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import {
  CustomerPageHeader,
  CustomerShell,
  customerShellStyles as shell,
} from "../_components/CustomerShell";
import styles from "./payment.module.css";
const C = {
  "vi-VN": {
    title: "Trung tâm thanh toán",
    subtitle:
      "Thanh toán địa phương, trạng thái yêu cầu và hỗ trợ trong một nơi.",
    overview: "THANH TOÁN ZHAOXI",
    safe: "Thanh toán cho dịch vụ",
    safeHint:
      "ZhaoXi hiển thị trạng thái thật từ yêu cầu và cổng thanh toán; không tạo số dư ví.",
    services: "Dịch vụ thanh toán",
    servicesHint: "Xem các hình thức thanh toán đang được đối tác hỗ trợ",
    support: "Hỗ trợ thanh toán",
    supportHint: "Trao đổi về giao dịch hoặc yêu cầu thanh toán",
    requests: "Thanh toán gần đây",
    empty: "Chưa có thanh toán nào trên thiết bị này",
    from: "Yêu cầu",
  },
  "en-US": {
    title: "Payment Center",
    subtitle:
      "Local payment services, request states and support in one place.",
    overview: "ZHAOXI PAYMENT",
    safe: "Service payments",
    safeHint:
      "ZhaoXi shows live request and gateway state; no wallet balance is fabricated.",
    services: "Payment services",
    servicesHint: "Browse payment methods currently supported by providers",
    support: "Payment support",
    supportHint: "Discuss a transaction or payment request",
    requests: "Recent payments",
    empty: "No payments found for this device",
    from: "Request",
  },
  "zh-CN": {
    title: "支付中心",
    subtitle: "本地支付服务、请求状态与支持集中管理。",
    overview: "赵喜支付",
    safe: "服务支付",
    safeHint: "赵喜显示真实请求与支付网关状态，不虚构钱包余额。",
    services: "支付服务",
    servicesHint: "查看服务商当前支持的支付方式",
    support: "支付支持",
    supportHint: "咨询交易或支付请求",
    requests: "最近支付",
    empty: "此设备暂无支付记录",
    from: "请求",
  },
  "zh-TW": {
    title: "支付中心",
    subtitle: "本地支付服務、請求狀態與支援集中管理。",
    overview: "趙喜支付",
    safe: "服務支付",
    safeHint: "趙喜顯示真實請求與支付閘道狀態，不虛構錢包餘額。",
    services: "支付服務",
    servicesHint: "查看服務商目前支援的支付方式",
    support: "支付支援",
    supportHint: "諮詢交易或支付請求",
    requests: "最近支付",
    empty: "此裝置暫無支付記錄",
    from: "請求",
  },
} as const;
export default function PaymentCenter() {
  const { locale } = useZhaoXiLocale();
  const t = C[locale];
  const [payments, setPayments] = useState<any[]>([]);
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const codes = JSON.parse(
          localStorage.getItem("zhaoxi-request-codes") || "[]",
        ) as string[];
        if (!codes.length) return;
        const q = new URLSearchParams({
          locale,
          mine: "1",
          codes: codes.join(","),
        });
        const orders = await fetch(`/api/platform-requests?${q}`, {
          cache: "no-store",
        }).then((r) => r.json());
        const ids = (Array.isArray(orders?.data) ? orders.data : [])
          .map((x: any) => x.id)
          .filter(Boolean)
          .slice(0, 20);
        const rows = (
          await Promise.all(
            ids.map((id: string) =>
              fetch(
                `/api/platform-payments?requestId=${encodeURIComponent(id)}`,
                { cache: "no-store" },
              )
                .then((r) => r.json())
                .catch(() => null),
            ),
          )
        ).flatMap((x) => (Array.isArray(x?.data) ? x.data : []));
        if (live) setPayments(rows);
      } catch {
        if (live) setPayments([]);
      }
    }
    void load();
    return () => {
      live = false;
    };
  }, [locale]);
  return (
    <CustomerShell>
      <CustomerPageHeader
        title={t.title}
        subtitle={t.subtitle}
        backHref={null}
      />
      <section className={`${shell.card} ${styles.overview}`}>
        <small>{t.overview}</small>
        <h2>{t.safe}</h2>
        <p>{t.safeHint}</p>
      </section>
      <div className={shell.sectionTitle}>
        <h2>{t.services}</h2>
      </div>
      <section className={styles.actions}>
        <Link
          href="/services/payment"
          className={`${shell.card} ${styles.action}`}
        >
          <span>{t.services}</span>
          <small>{t.servicesHint}</small>
        </Link>
        <Link href="/messages" className={`${shell.card} ${styles.action}`}>
          <span>{t.support}</span>
          <small>{t.supportHint}</small>
        </Link>
      </section>
      <div className={shell.sectionTitle}>
        <h2>{t.requests}</h2>
      </div>
      <section className={shell.stack}>
        {payments.map((x) => (
          <article className={`${shell.card} ${styles.record}`} key={x.id}>
            <header>
              <div>
                <small>
                  {t.from} {x.requestCode || x.requestId}
                </small>
                <b>{x.method || "Payment"}</b>
              </div>
              <span className={styles.status}>{x.status}</span>
            </header>
            {Number(x.amount || 0) > 0 && (
              <strong className={styles.amount}>
                {Math.round(Number(x.amount)).toLocaleString(locale)}{" "}
                {x.currency || "VND"}
              </strong>
            )}
          </article>
        ))}
        {!payments.length && (
          <div className={`${shell.card} ${shell.empty}`}>
            <h2>{t.empty}</h2>
          </div>
        )}
      </section>
      <div className={shell.sectionTitle}>
        <h2>{t.support}</h2>
      </div>
      <Link
        href="/support?topic=service"
        className={`${shell.card} ${styles.support}`}
      >
        <div>
          <b>{t.support}</b>
          <small>{t.supportHint}</small>
        </div>
        <span>›</span>
      </Link>
    </CustomerShell>
  );
}
