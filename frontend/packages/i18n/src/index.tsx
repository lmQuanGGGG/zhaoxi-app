"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const supportedLocales = ["zh-CN", "zh-TW", "vi-VN", "en-US"] as const;
export type ZhaoXiLocale = (typeof supportedLocales)[number];
export const DEFAULT_LOCALE: ZhaoXiLocale = "zh-CN";
export const LOCALE_STORAGE_KEY = "zhaoxi-locale";
export const LOCALE_COOKIE_KEY = "zhaoxi_locale";

export const localeNames: Record<ZhaoXiLocale, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  "vi-VN": "Tiếng Việt",
  "en-US": "English",
};


export const organizationLabels: Record<string, Record<ZhaoXiLocale, string>> = {
  "ZX-FOOD-001": { "zh-CN": "川渝老火锅", "zh-TW": "川渝老火鍋", "vi-VN": "Quán Lẩu Tứ Xuyên", "en-US": "Sichuan Hotpot" },
  "ZX-LIFE-001": { "zh-CN": "赵喜生活服务中心", "zh-TW": "趙喜生活服務中心", "vi-VN": "Trung tâm dịch vụ ZhaoXi", "en-US": "ZhaoXi Life Service Center" },
  "ZX-TRAVEL-001": { "zh-CN": "岘港华旅", "zh-TW": "峴港華旅", "vi-VN": "Du lịch Hoa Việt Đà Nẵng", "en-US": "Da Nang Chinese Travel" },
  "ZX-HOME-001": { "zh-CN": "安居岘港", "zh-TW": "安居峴港", "vi-VN": "An Cư Đà Nẵng", "en-US": "Da Nang Housing" },
};

export function localizeOrganizationName(locale: ZhaoXiLocale, code?: string | null, fallback?: string | null, metadata?: Record<string, unknown> | null) {
  const localized = metadata?.localizedNames;
  const seedLabels = code ? Object.values(organizationLabels[code] || {}) : [];
  if (localized && typeof localized === "object") {
    const value = (localized as Record<string, unknown>)[locale];
    const localizedName = typeof value === "string" ? value.trim() : "";
    // Do not let an old seeded/demo translation overwrite a merchant's real,
    // saved brand name after they change their store profile.
    if (localizedName && !(fallback && !seedLabels.includes(fallback.trim()) && seedLabels.includes(localizedName))) return localizedName;
  }
  // A merchant's saved name always wins. Demo labels are only a fallback for
  // seed records that do not yet have a real store name.
  if (fallback && fallback.trim() !== "川渝老火锅" && fallback.trim() !== "川渝老火鍋") return fallback.trim();
  if (code && organizationLabels[code]) return organizationLabels[code][locale];
  if (fallback && (fallback.trim() === "川渝老火锅" || fallback.trim() === "川渝老火鍋")) {
    return organizationLabels["ZX-FOOD-001"][locale];
  }
  return fallback || code || "ZhaoXi";
}

export const serviceNameLabels: Record<string, Record<ZhaoXiLocale, string>> = {
  "a1-藤椒鸡块": { "zh-CN": "A1 - 藤椒鸡块", "zh-TW": "A1 - 藤椒雞塊", "vi-VN": "A1 - Gà giòn tiêu Tứ Xuyên", "en-US": "A1 - Sichuan Pepper Chicken Bites" },
  "a2-避风塘蟹堡": { "zh-CN": "A2 - 避风塘蟹堡", "zh-TW": "A2 - 避風塘蟹堡", "vi-VN": "A2 - Burger cua lột Hong Kong", "en-US": "A2 - Typhoon Shelter Crab Burger" },
  "a3-孜然鸭肉堡": { "zh-CN": "A3 - 孜然鸭肉堡", "zh-TW": "A3 - 孜然鴨肉堡", "vi-VN": "A3 - Burger vịt nướng thì là", "en-US": "A3 - Cumin Roast Duck Burger" },
  "a4-板烧凤梨堡": { "zh-CN": "A4 - 板烧凤梨堡", "zh-TW": "A4 - 板燒鳳梨堡", "vi-VN": "A4 - Burger gà nướng dứa", "en-US": "A4 - Grilled Pineapple Chicken Burger" },
  "a5-香辣鸡腿堡": { "zh-CN": "A5 - 香辣鸡腿堡", "zh-TW": "A5 - 香辣雞腿堡", "vi-VN": "A5 - Burger đùi gà cay", "en-US": "A5 - Spicy Chicken Leg Burger" },
  "a6-双拼鸡虾堡": { "zh-CN": "A6 - 双拼鸡虾堡", "zh-TW": "A6 - 雙拼雞蝦堡", "vi-VN": "A6 - Burger đôi gà & tôm", "en-US": "A6 - Double Chicken & Shrimp Burger" },
  "a7-鳕鱼堡": { "zh-CN": "A7 - 鳕鱼堡", "zh-TW": "A7 - 鱈魚堡", "vi-VN": "A7 - Burger cá tuyết chiên giòn", "en-US": "A7 - Crispy Cod Fish Burger" },
  "a8-奥尔良鸡腿堡": { "zh-CN": "A8 - 奥尔良鸡腿堡", "zh-TW": "A8 - 奧爾良雞腿堡", "vi-VN": "A8 - Burger gà New Orleans", "en-US": "A8 - Orleans Chicken Leg Burger" },
  "a9-培根煎蛋堡": { "zh-CN": "A9 - 培根煎蛋堡", "zh-TW": "A9 - 培根煎蛋堡", "vi-VN": "A9 - Burger thịt xông khói trứng", "en-US": "A9 - Bacon & Egg Burger" },
  "a10-老北京鸡肉卷": { "zh-CN": "A10 - 老北京鸡肉卷", "zh-TW": "A10 - 老北京雞肉卷", "vi-VN": "A10 - Cuộn gà Bắc Kinh truyền thống", "en-US": "A10 - Beijing Chicken Wrap" },
  "a11-墨西哥鸡肉卷": { "zh-CN": "A11 - 墨西哥鸡肉卷", "zh-TW": "A11 - 墨西哥雞肉卷", "vi-VN": "A11 - Cuộn gà kiểu Mexico", "en-US": "A11 - Mexican Chicken Wrap" },
};

export function localizeServiceName(locale: ZhaoXiLocale, name?: string | null, code?: string | null): string {
  if (!name) return code || "";
  const key = name.toLowerCase().replace(/[\s–—-]+/g, "-");
  if (serviceNameLabels[key]?.[locale]) {
    return serviceNameLabels[key][locale];
  }
  const cleanKey = name.toLowerCase().replace(/[\s–—-]+/g, "");
  for (const [k, v] of Object.entries(serviceNameLabels)) {
    if (k.replace(/-/g, "") === cleanKey) {
      return v[locale];
    }
  }
  return name;
}


export const serviceModuleLabels: Record<string, Record<ZhaoXiLocale, string>> = {
  food:{"zh-CN":"外卖订餐","zh-TW":"外賣訂餐","vi-VN":"Đặt món","en-US":"Food delivery"},
  housing:{"zh-CN":"岘港租房","zh-TW":"峴港租房","vi-VN":"Thuê nhà","en-US":"Housing"},
  visa:{"zh-CN":"护照签证","zh-TW":"護照簽證","vi-VN":"Hộ chiếu – thị thực","en-US":"Passport & visa"},
  "car-rental":{"zh-CN":"租车服务","zh-TW":"租車服務","vi-VN":"Thuê xe","en-US":"Car rental"},
  translation:{"zh-CN":"翻译服务","zh-TW":"翻譯服務","vi-VN":"Phiên dịch","en-US":"Translation"},
  travel:{"zh-CN":"旅游服务","zh-TW":"旅遊服務","vi-VN":"Du lịch","en-US":"Travel"},
  payment:{"zh-CN":"支付服务","zh-TW":"支付服務","vi-VN":"Thanh toán","en-US":"Payments"},
  community:{"zh-CN":"华人社区","zh-TW":"華人社區","vi-VN":"Cộng đồng","en-US":"Community"},
  market:{"zh-CN":"华人商城","zh-TW":"華人商城","vi-VN":"Chợ Người Hoa","en-US":"Community market"},
  emergency:{"zh-CN":"紧急帮助","zh-TW":"緊急幫助","vi-VN":"Hỗ trợ khẩn cấp","en-US":"Emergency help"},
};
export function localizeServiceModuleName(locale: ZhaoXiLocale, code?: string | null, fallback?: string | null) {
  return (code && serviceModuleLabels[code]?.[locale]) || fallback || code || "ZhaoXi";
}

export function normalizeLocale(value?: string | null): ZhaoXiLocale {
  return supportedLocales.includes(value as ZhaoXiLocale) ? (value as ZhaoXiLocale) : DEFAULT_LOCALE;
}

export function readBrowserLocale(): ZhaoXiLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
}

export function saveBrowserLocale(locale: ZhaoXiLocale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE_KEY}=${encodeURIComponent(locale)}; Max-Age=31536000; Path=/; SameSite=Lax`;
  document.documentElement.lang = locale;
  window.dispatchEvent(new CustomEvent("zhaoxi:locale", { detail: locale }));
}

export function pickText<T>(locale: ZhaoXiLocale, values: Record<ZhaoXiLocale, T>): T {
  return values[locale] ?? values[DEFAULT_LOCALE];
}

export const statusLabels: Record<ZhaoXiLocale, Record<string, string>> = {
  "zh-CN": { new:"新请求", reviewing:"审核中", assigned:"等待商家接单", accepted:"商家已接单", in_progress:"处理中", waiting_customer:"等待客户", completed:"已完成", cancelled:"已取消", rejected:"商家已拒绝" },
  "zh-TW": { new:"新請求", reviewing:"審核中", assigned:"等待商家接單", accepted:"商家已接單", in_progress:"處理中", waiting_customer:"等待客戶", completed:"已完成", cancelled:"已取消", rejected:"商家已拒絕" },
  "vi-VN": { new:"Yêu cầu mới", reviewing:"Đang xem xét", assigned:"Chờ đối tác tiếp nhận", accepted:"Đối tác đã nhận", in_progress:"Đang xử lý", waiting_customer:"Chờ khách hàng", completed:"Hoàn thành", cancelled:"Đã hủy", rejected:"Đối tác từ chối" },
  "en-US": { new:"New request", reviewing:"Under review", assigned:"Waiting for partner", accepted:"Accepted by partner", in_progress:"In progress", waiting_customer:"Waiting for customer", completed:"Completed", cancelled:"Cancelled", rejected:"Rejected by partner" },
};

type I18nContextValue = {
  locale: ZhaoXiLocale;
  setLocale: (locale: ZhaoXiLocale) => void;
};

const I18nContext = createContext<I18nContextValue>({ locale: DEFAULT_LOCALE, setLocale: () => undefined });

export function ZhaoXiI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<ZhaoXiLocale>(DEFAULT_LOCALE);
  useEffect(() => {
    setLocaleState(readBrowserLocale());
    const sync = (event: Event) => setLocaleState(normalizeLocale((event as CustomEvent<string>).detail || window.localStorage.getItem(LOCALE_STORAGE_KEY)));
    window.addEventListener("zhaoxi:locale", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("zhaoxi:locale", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const value = useMemo(() => ({ locale, setLocale: (next: ZhaoXiLocale) => { saveBrowserLocale(next); setLocaleState(next); } }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useZhaoXiLocale() {
  return useContext(I18nContext);
}
