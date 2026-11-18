"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useZhaoXiLocale, type ZhaoXiLocale } from "@zhaoxi/i18n";
import { Art3D, ServiceArt3D } from "@zhaoxi/ui";
import PartnerStoreSwitcher from "./PartnerStoreSwitcher";
import { useOrderChatUnread } from "./OrderChat";
import { STORE_FEATURES } from "./_lib/store-modules";
import { useStoreModule } from "./_lib/use-store-module";

type Key = "orders" | "store" | "messages" | "analytics" | "settlements" | "onboarding" | "housing" | "travel" | "tools" | "support" | "account";
type IconName = Key;

const copy: Record<ZhaoXiLocale, Record<Key, string> & { nav: string; more: string; close: string; moreTitle: string }> = {
  "zh-CN": { orders: "订单", store: "店铺管理", messages: "消息", analytics: "经营分析", settlements: "财务对账", onboarding: "资料与审核", housing: "房源库存", travel: "旅游产品", tools: "工具", support: "客服支持", account: "账号", nav: "合作伙伴工作台", more: "更多", close: "关闭", moreTitle: "更多功能" },
  "zh-TW": { orders: "訂單", store: "店鋪管理", messages: "訊息", analytics: "營運分析", settlements: "財務對帳", onboarding: "資料與審核", housing: "房源庫存", travel: "旅遊產品", tools: "工具", support: "客服支援", account: "帳號", nav: "合作夥伴工作台", more: "更多", close: "關閉", moreTitle: "更多功能" },
  "vi-VN": { orders: "Đơn hàng", store: "Gian hàng", messages: "Tin nhắn", analytics: "Phân tích", settlements: "Đối soát", onboarding: "Hồ sơ đối tác", housing: "Kho nhà/phòng", travel: "Kho tour", tools: "Công cụ", support: "Hỗ trợ", account: "Tài khoản", nav: "Khu làm việc đối tác", more: "Thêm", close: "Đóng", moreTitle: "Chức năng khác" },
  "en-US": { orders: "Orders", store: "Store", messages: "Messages", analytics: "Analytics", settlements: "Settlement", onboarding: "Profile & approval", housing: "Housing", travel: "Tours", tools: "Tools", support: "Support", account: "Account", nav: "Partner workspace", more: "More", close: "Close", moreTitle: "More" },
};

const routes: Record<Key, string> = {
  orders: "/",
  store: "/catalog",
  messages: "/messages",
  analytics: "/analytics",
  settlements: "/settlements",
  onboarding: "/onboarding",
  housing: "/housing-inventory",
  travel: "/travel-inventory",
  tools: "/tools",
  support: "/support",
  account: "/account",
};

/** Desktop / tablet tab strip, in workflow order. */
const tabOrder: Key[] = ["orders", "store", "messages", "analytics", "settlements", "housing", "travel", "onboarding"];
/** Phone dock: the four daily screens; everything else lives under "More". */
const dockOrder: Key[] = ["orders", "store", "messages", "analytics"];
const moreOrder: Key[] = ["settlements", "housing", "travel", "onboarding", "tools", "support", "account"];

const paths: Record<IconName, string> = {
  orders: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M9 3v3h6V3M9 11h6M9 15h4M8.5 8.5l1.2 1.2 2-2",
  store: "M5 9V5h14v4l-1 3H6Zm1 3v9h12v-9M9 21v-5h6v5",
  messages: "M4 5h16v12H8l-4 3z",
  analytics: "M4.5 19.5h15M7 16v-4M11 16V8M15 16v-6M19 16V5",
  settlements: "M3 6h18v13H3Zm0 4h18M7 15h4",
  onboarding: "M12 3.5l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9v-5zM9 12l2 2 4-4",
  housing: "M4 21V8l8-5 8 5v13M8 11h3v3H8zm5 0h3v3h-3m-5 3h3v4H8m5-4h3v4h-3",
  travel: "M4 18h16M7 18l2-12h6l2 12M9 9h6M8 13h8",
  tools: "M14.5 6.5a4 4 0 0 0-5.3 5L4.5 16.2V19.5h3.3l4.7-4.7a4 4 0 0 0 5-5.3l-2.4 2.4-2.6-.6-.6-2.6z",
  support: "M12 3a8 8 0 0 0-8 8v5h4v-5a4 4 0 0 1 8 0v5h4v-5a8 8 0 0 0-8-8Zm4 13c0 2-1.2 3-4 3",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0",
};

/** Clay icons for the "More" sheet (same set as the app's profile menu). */
const moreArt: Partial<Record<Key, React.ReactNode>> = {
  settlements: <Art3D kind="wallet" size={26} />,
  housing: <ServiceArt3D code="housing" size={26} />,
  travel: <ServiceArt3D code="travel" size={26} />,
  onboarding: <Art3D kind="clipboard" size={26} />,
  tools: <Art3D kind="pencil" size={26} />,
  support: <Art3D kind="help" size={26} />,
  account: <Art3D kind="people" size={26} />,
};

export function PartnerNavIcon({ name }: { name: IconName }) {
  return <svg className="zx-pnav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function activeKey(path: string): Key {
  const match = (Object.keys(routes) as Key[]).find((key) => key !== "orders" && (path === routes[key] || path.startsWith(`${routes[key]}/`)));
  return match || "orders";
}

/**
 * The workspace navigation, rendered once by the app frame (`placement="frame"`).
 * Screens still mount `<PartnerWorkspaceNav/>` from older layouts; those calls render nothing
 * so the store switcher and tabs never appear twice.
 */
export default function PartnerWorkspaceNav({ placement }: { placement?: "frame" }) {
  return placement === "frame" ? <FrameNav /> : null;
}

function FrameNav() {
  const path = usePathname() || "/";
  const { locale } = useZhaoXiLocale();
  const t = copy[locale];
  const unread = useOrderChatUnread();
  // The sheet belongs to the page it was opened on, so navigating away closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const moreOpen = openOn === path;
  const setMoreOpen = (open: boolean) => setOpenOn(open ? path : null);
  const active = activeKey(path);
  // Inventory screens belong to one kind of store; hidden while the kind is still loading.
  const storeModule = useStoreModule();
  const inventory = storeModule ? STORE_FEATURES[storeModule].inventory : null;
  const shown = (key: Key) => (key === "housing" ? inventory === "housing" : key === "travel" ? inventory === "travel" : true);
  const tabs = tabOrder.filter(shown);
  const more = moreOrder.filter(shown);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenOn(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const badge = unread > 0 ? <span className="zx-pnav-badge" aria-label={`${unread}`}>{unread > 99 ? "99+" : unread}</span> : null;
  const moreActive = more.includes(active);

  return <div className="zx-partner-nav-wrapper">
    <nav className="zx-pnav-tabs" aria-label={t.nav}>
      {tabs.map((key) => <Link key={key} href={routes[key]} data-active={active === key} aria-current={active === key ? "page" : undefined}>
        <PartnerNavIcon name={key} />{t[key]}{key === "messages" ? badge : null}
      </Link>)}
    </nav>
    <PartnerStoreSwitcher />

    <nav className="zx-pnav-dock" aria-label={t.nav}>
      {dockOrder.map((key) => <Link key={key} href={routes[key]} data-active={active === key} aria-current={active === key ? "page" : undefined}>
        <PartnerNavIcon name={key} /><span>{t[key]}</span>{key === "messages" ? badge : null}
      </Link>)}
      <button type="button" data-active={moreActive || moreOpen} aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}>
        <svg className="zx-pnav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14M5 12h14M5 17.5h9" /></svg><span>{t.more}</span>
      </button>
    </nav>

    {moreOpen && <div className="zx-pnav-sheet-backdrop" onClick={() => setMoreOpen(false)}>
      <section className="zx-pnav-sheet" role="dialog" aria-modal="true" aria-label={t.moreTitle} onClick={(event) => event.stopPropagation()}>
        <div className="zx-pnav-sheet-grip" />
        <header><b>{t.moreTitle}</b><button type="button" onClick={() => setMoreOpen(false)} aria-label={t.close}>×</button></header>
        <div className="zx-pnav-sheet-grid">
          {more.map((key) => <Link key={key} href={routes[key]} data-active={active === key}><i>{moreArt[key]}</i>{t[key]}</Link>)}
        </div>
      </section>
    </div>}
  </div>;
}
