"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import { CustomerServiceIcon } from "./CustomerServiceIcon";

const C = {
  "zh-CN": {
    same: "同一合作伙伴的其他服务",
    related: "您可能还喜欢",
    from: "起",
  },
  "zh-TW": {
    same: "同一合作夥伴的其他服務",
    related: "您可能還喜歡",
    from: "起",
  },
  "vi-VN": {
    same: "Dịch vụ khác của cùng Partner",
    related: "Có thể bạn cũng quan tâm",
    from: "từ",
  },
  "en-US": {
    same: "More from this Partner",
    related: "You may also like",
    from: "from",
  },
} as const;
export default function CrossModuleRecommendations({
  serviceId,
}: {
  serviceId: string;
}) {
  const { locale } = useZhaoXiLocale();
  const t = C[locale];
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    if (!serviceId) return;
    fetch(`/api/public/recommendations/${serviceId}?locale=${locale}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((j) => j?.ok && setD(j.data))
      .catch(() => {});
  }, [serviceId, locale]);
  if (!d) return null;
  const blocks = [
    { title: t.same, items: d.samePartner },
    { title: t.related, items: d.crossModule },
  ].filter((x) => x.items?.length);
  if (!blocks.length) return null;
  return (
    <section style={{ margin: "20px 0" }}>
      {blocks.map((b) => (
        <div key={b.title} style={{ marginTop: 14 }}>
          <b style={{ fontSize: 16, lineHeight: 1.25 }}>{b.title}</b>
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              overflowY: "hidden",
              padding: "8px 0",
            }}
          >
            {b.items.slice(0, 8).map((x: any) => (
              <Link
                key={x.id}
                href={x.publicHref}
                style={{
                  minWidth: 118,
                  maxWidth: 138,
                  padding: 9,
                  border: "1px solid var(--zx-border)",
                  borderRadius: 12,
                  background: "var(--zx-surface)",
                  boxShadow: "var(--zx-shadow-sm)",
                  textDecoration: "none",
                  color: "var(--zx-text)",
                }}
              >
                <span style={{ display: "block", width: 24, height: 24 }}>
                  <CustomerServiceIcon serviceId={x.moduleCode} size={24} />
                </span>
                <b
                  style={{
                    display: "block",
                    fontSize: 12,
                    lineHeight: 1.25,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {x.name}
                </b>
                <small
                  style={{
                    display: "block",
                    color: "var(--zx-text-secondary)",
                    fontSize: 10,
                    lineHeight: 1.3,
                  }}
                >
                  {x.organizationName}
                </small>
                {x.priceFrom > 0 && (
                  <small
                    style={{
                      display: "block",
                      color: "var(--zx-danger)",
                      fontSize: 10,
                      lineHeight: 1.3,
                      fontWeight: 600,
                    }}
                  >
                    {t.from} {Math.round(x.priceFrom).toLocaleString("vi-VN")}{" "}
                    {x.currency}
                  </small>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
