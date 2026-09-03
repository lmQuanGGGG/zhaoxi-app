export const supportedLocales = ["zh-CN", "zh-TW", "vi-VN", "en-US"] as const;
export type ZhaoXiLocale = (typeof supportedLocales)[number];
export const DEFAULT_LOCALE: ZhaoXiLocale = "zh-CN";
export const LOCALE_STORAGE_KEY = "zhaoxi-locale";

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
  document.documentElement.lang = locale;
  window.dispatchEvent(new CustomEvent("zhaoxi:locale", { detail: locale }));
}

export function pickText<T>(locale: ZhaoXiLocale, values: Record<ZhaoXiLocale, T>): T {
  return values[locale] ?? values[DEFAULT_LOCALE];
}

export const statusLabels: Record<ZhaoXiLocale, Record<string, string>> = {
  "zh-CN": { new:"新请求", reviewing:"审核中", assigned:"已发送给商家", accepted:"商家已接单", in_progress:"处理中", waiting_customer:"等待客户", completed:"已完成", cancelled:"已取消", rejected:"商家已拒绝" },
  "zh-TW": { new:"新請求", reviewing:"審核中", assigned:"已發送給商家", accepted:"商家已接單", in_progress:"處理中", waiting_customer:"等待客戶", completed:"已完成", cancelled:"已取消", rejected:"商家已拒絕" },
  "vi-VN": { new:"Yêu cầu mới", reviewing:"Đang xem xét", assigned:"Đã gửi đến đối tác", accepted:"Đối tác đã nhận", in_progress:"Đang xử lý", waiting_customer:"Chờ khách hàng", completed:"Hoàn thành", cancelled:"Đã hủy", rejected:"Đối tác từ chối" },
  "en-US": { new:"New request", reviewing:"Under review", assigned:"Sent to partner", accepted:"Accepted by partner", in_progress:"In progress", waiting_customer:"Waiting for customer", completed:"Completed", cancelled:"Cancelled", rejected:"Rejected by partner" },
};
