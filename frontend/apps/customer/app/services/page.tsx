"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { localizeServiceModuleName, useZhaoXiLocale } from "@zhaoxi/i18n";
import { serviceModules } from "@zhaoxi/branding";
import {
  CustomerPageHeader,
  CustomerShell,
} from "../_components/CustomerShell";
import { CustomerIcon } from "../_components/CustomerIcon";
import { CustomerServiceIcon } from "../_components/CustomerServiceIcon";
import {
  getCustomerServiceHref,
  getCustomerServicePresentation,
  type CustomerServiceGroup,
} from "../_components/customer-service-presentation";
import styles from "./services-hub.module.css";

type ApiModule = { code?: string; name?: string; route?: string };
const C = {
  "vi-VN": {
    title: "Trung tâm dịch vụ",
    subtitle: "Chọn nhóm và tìm dịch vụ phù hợp.",
    all: "Tất cả",
    life: "Đời sống",
    food: "Đặt món",
    housing: "Nhà ở",
    travel: "Du lịch",
    transport: "Giao thông",
    finance: "Tài chính",
    community: "Cộng đồng",
    support: "Hỗ trợ",
    emergency: "Khẩn cấp & hỗ trợ",
    emergencyHint: "Y tế, công an, cứu hộ và hỗ trợ địa phương",
  },
  "en-US": {
    title: "Service Hub",
    subtitle: "Choose a group and find the right service.",
    all: "All",
    life: "Daily life",
    food: "Food",
    housing: "Housing",
    travel: "Travel",
    transport: "Transport",
    finance: "Finance",
    community: "Community",
    support: "Support",
    emergency: "Emergency & support",
    emergencyHint: "Medical, police, rescue and local assistance",
  },
  "zh-CN": {
    title: "服务中心",
    subtitle: "选择分类，快速找到合适服务。",
    all: "全部",
    life: "生活",
    food: "餐饮",
    housing: "住房",
    travel: "旅行",
    transport: "交通",
    finance: "支付",
    community: "社区",
    support: "支持",
    emergency: "紧急与支持",
    emergencyHint: "医疗、公安、救援和本地协助",
  },
  "zh-TW": {
    title: "服務中心",
    subtitle: "選擇分類，快速找到合適服務。",
    all: "全部",
    life: "生活",
    food: "餐飲",
    housing: "住房",
    travel: "旅遊",
    transport: "交通",
    finance: "支付",
    community: "社區",
    support: "支援",
    emergency: "緊急與支援",
    emergencyHint: "醫療、公安、救援和本地協助",
  },
} as const;
const groups: CustomerServiceGroup[] = [
  "all",
  "life",
  "food",
  "housing",
  "travel",
  "transport",
  "finance",
  "community",
  "support",
];

export default function ServicesHub() {
  const { locale } = useZhaoXiLocale();
  const t = C[locale];
  const [apiModules, setApiModules] = useState<ApiModule[]>([]);
  const [group, setGroup] = useState<CustomerServiceGroup>("all");
  const [query, setQuery] = useState("");
  useEffect(() => {
    fetch(`/api/platform-modules?locale=${encodeURIComponent(locale)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((j) =>
        setApiModules(
          Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : [],
        ),
      )
      .catch(() => setApiModules([]));
  }, [locale]);
  const modules = useMemo(
    () =>
      apiModules.length
        ? apiModules.map((x, i) => {
            const fallback =
              serviceModules.find((m) => m.id === x.code) || serviceModules[i];
            const id = x.code || fallback?.id || `module-${i}`;
            return {
              id,
              name: x.name || localizeServiceModuleName(locale, id, fallback?.vi || fallback?.zh),
              href: getCustomerServiceHref(id, x.route || `/services/${id}`),
            };
          })
        : serviceModules.map((x) => ({
            id: x.id,
            name: localizeServiceModuleName(locale, x.id, x.vi || x.zh),
            href: getCustomerServiceHref(x.id, x.customerHref),
          })),
    [apiModules, locale],
  );
  const visible = modules.filter((item) => {
    const matchesGroup =
      group === "all" ||
      getCustomerServicePresentation(item.id).group === group;
    const normalized = query.trim().toLocaleLowerCase(locale);
    return (
      matchesGroup &&
      (!normalized || item.name.toLocaleLowerCase(locale).includes(normalized))
    );
  });
  return (
    <CustomerShell>
      <CustomerPageHeader
        title={t.title}
        subtitle={t.subtitle}
        backHref={null}
      />
      <section className={styles.browser}>
        <label className={styles.searchField}>
          <CustomerIcon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`${t.title}…`}
            aria-label={t.title}
          />
        </label>
        <nav className={styles.categoryRail}>
          {groups.map((id) => (
            <button
              key={id}
              type="button"
              data-active={group === id}
              onClick={() => setGroup(id)}
            >
              <span>
                {id === "all" ? (
                  <CustomerIcon name="services" />
                ) : (
                  <CustomerIcon
                    name={
                      id === "food"
                        ? "food"
                        : id === "housing"
                          ? "housing"
                          : id === "travel"
                            ? "travel"
                            : id === "transport"
                              ? "car"
                              : id === "finance"
                                ? "payment"
                                : id === "community"
                                  ? "community"
                                  : id === "support"
                                    ? "support"
                                    : "home"
                    }
                  />
                )}
              </span>
              <b>{t[id]}</b>
            </button>
          ))}
        </nav>
        <div className={styles.serviceList}>
          {visible.map((x) => {
            const visual = getCustomerServicePresentation(x.id);
            return (
              <Link
                key={x.id}
                href={x.href || `/services/${x.id}`}
                className={styles.serviceRow}
                style={
                  {
                    "--service-accent": visual.accent,
                    "--service-tint": visual.tint,
                  } as React.CSSProperties
                }
              >
                <span>
                  <CustomerServiceIcon serviceId={x.id} />
                </span>
                <div>
                  <b>{x.name}</b>
                  <small>{visual.description[locale]}</small>
                </div>
                <CustomerIcon name="chevron" />
              </Link>
            );
          })}
          {group === "support" && (
            <Link
              href="/khan-cap"
              className={styles.serviceRow}
              style={
                {
                  "--service-accent": "var(--zx-service-emergency)",
                  "--service-tint": "var(--zx-service-emergency-soft)",
                } as React.CSSProperties
              }
            >
              <span>
                <CustomerServiceIcon serviceId="emergency" />
              </span>
              <div>
                <b>{t.emergency}</b>
                <small>{t.emergencyHint}</small>
              </div>
              <CustomerIcon name="chevron" />
            </Link>
          )}
        </div>
      </section>
    </CustomerShell>
  );
}
