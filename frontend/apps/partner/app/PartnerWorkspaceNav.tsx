"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import PartnerStoreSwitcher from "./PartnerStoreSwitcher";

const copy = {
  "zh-CN": { store: "商家管理", housing: "房源库存", travel: "旅游产品", orders: "订单管理", analytics: "经营分析", settlements: "财务对账", onboarding: "资料与审核" },
  "zh-TW": { store: "商家管理", housing: "房源庫存", travel: "旅遊產品", orders: "訂單管理", analytics: "營運分析", settlements: "財務對帳", onboarding: "資料與審核" },
  "vi-VN": { store: "Quản lý gian hàng", housing: "Kho nhà/phòng", travel: "Kho tour", orders: "Quản lý đơn hàng / dịch vụ", analytics: "Phân tích kinh doanh", settlements: "Đối soát", onboarding: "Hồ sơ & duyệt" },
  "en-US": { store: "Store management", housing: "Housing inventory", travel: "Travel inventory", orders: "Orders & services", analytics: "Analytics", settlements: "Settlement", onboarding: "Profile & approval" },
} as const;

export default function PartnerWorkspaceNav() {
  const path = usePathname();
  const { locale } = useZhaoXiLocale();
  const t = copy[locale];
  const active = path.startsWith("/onboarding") ? "onboarding" : path.startsWith("/settlements") ? "settlements" : path.startsWith("/analytics") ? "analytics" : path.startsWith("/housing-inventory") ? "housing" : path.startsWith("/travel-inventory") ? "travel" : path.startsWith("/catalog") ? "store" : "orders";

  return <div className="zx-partner-nav-wrapper">
    <nav className="zx-partner-tabs" aria-label="Partner workspace">
      <Link data-active={active === "onboarding"} href="/onboarding">{t.onboarding}</Link>
      <Link data-active={active === "store"} href="/catalog">{t.store}</Link>
      <Link data-active={active === "housing"} href="/housing-inventory">{t.housing}</Link>
      <Link data-active={active === "travel"} href="/travel-inventory">{t.travel}</Link>
      <Link data-active={active === "orders"} href="/">{t.orders}</Link>
      <Link data-active={active === "analytics"} href="/analytics">{t.analytics}</Link>
      <Link data-active={active === "settlements"} href="/settlements">{t.settlements}</Link>
    </nav>
    <PartnerStoreSwitcher />
  </div>;
}
