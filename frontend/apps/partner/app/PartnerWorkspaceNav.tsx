"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useZhaoXiLocale, type ZhaoXiLocale } from "@zhaoxi/i18n";
import PartnerStoreSwitcher from "./PartnerStoreSwitcher";
import { useOrderChatUnread } from "./OrderChat";

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
  orders: "M7 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2ZM9 8.5h6M9 12h6M9 15.5h3.5",
  store: "M4.5 9.5 6 4.5h12l1.5 5M4.5 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M6 12v7.5h12V12M10 19.5v-4h4v4",
  messages: "M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3v-3H5A1.5 1.5 0 0 1 3.5 16V7A1.5 1.5 0 0 1 5 5.5ZM8 11h.01M12 11h.01M16 11h.01",
  analytics: "M4.5 19.5h15M7 16v-4M11 16V8M15 16v-6M19 16V5",
  settlements: "M4 7.5h16v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM4 7.5 6.5 4.5h11L20 7.5M8 12.5h4M15.5 14.5h1",
  onboarding: "M12 3.5l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9v-5zM9 12l2 2 4-4",
  housing: "M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z",
  travel: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  tools: "M14.5 6.5a4 4 0 0 0-5.3 5L4.5 16.2V19.5h3.3l4.7-4.7a4 4 0 0 0 5-5.3l-2.4 2.4-2.6-.6-.6-2.6z",
  support: "M4.5 13v-1a7.5 7.5 0 0 1 15 0v1M4.5 13h2.5v5H6a1.5 1.5 0 0 1-1.5-1.5zM19.5 13H17v5h1a1.5 1.5 0 0 0 1.5-1.5zM17 18c0 1.5-1.5 2.5-4 2.5",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5a7.5 7.5 0 0 1 15 0",
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

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenOn(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const badge = unread > 0 ? <span className="zx-pnav-badge" aria-label={`${unread}`}>{unread > 99 ? "99+" : unread}</span> : null;
  const moreActive = moreOrder.includes(active);

  return <div className="zx-partner-nav-wrapper">
    <nav className="zx-pnav-tabs" aria-label={t.nav}>
      {tabOrder.map((key) => <Link key={key} href={routes[key]} data-active={active === key} aria-current={active === key ? "page" : undefined}>
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
          {moreOrder.map((key) => <Link key={key} href={routes[key]} data-active={active === key}><i><PartnerNavIcon name={key} /></i>{t[key]}</Link>)}
        </div>
      </section>
    </div>}
  </div>;
}
