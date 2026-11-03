import { API_URL } from "./config";

const WEB_URL = String(process.env.EXPO_PUBLIC_WEB_URL || "https://zhaoxi-customer.vercel.app").replace(/\/+$/, "");

export function money(value: number | string | null | undefined, currency = "VND") {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "";
  return `${Math.round(number).toLocaleString("vi-VN")} ${currency}`;
}

export function shortDate(value: string | Date, locale: string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// Hermes on iOS ships without Intl.RelativeTimeFormat, so relative times use a small table.
const relativeCopy: Record<string, { now: string; minute: string; hour: string; day: string }> = {
  "vi-VN": { now: "Vừa xong", minute: "{n} phút trước", hour: "{n} giờ trước", day: "{n} ngày trước" },
  "en-US": { now: "Just now", minute: "{n} min ago", hour: "{n} h ago", day: "{n} d ago" },
  "zh-CN": { now: "刚刚", minute: "{n}分钟前", hour: "{n}小时前", day: "{n}天前" },
  "zh-TW": { now: "剛剛", minute: "{n}分鐘前", hour: "{n}小時前", day: "{n}天前" },
};

export function relativeTime(value: string, locale: string) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const copy = relativeCopy[locale] || relativeCopy["vi-VN"];
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return copy.now;
  if (minutes < 60) return copy.minute.replace("{n}", String(minutes));
  const hours = Math.round(minutes / 60);
  if (hours < 24) return copy.hour.replace("{n}", String(hours));
  const days = Math.round(hours / 24);
  if (days < 7) return copy.day.replace("{n}", String(days));
  return shortDate(value, locale);
}

/** Resolves image URLs from the API; relative paths live on the customer web app or the API. */
export function imageUri(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return undefined;
  if (/^https?:\/\//.test(text)) return text;
  // Partners upload payment QR codes as inline images.
  if (/^data:image\//.test(text)) return text;
  if (text.startsWith("/api/")) return `${API_URL}${text}`;
  if (text.startsWith("/")) return `${WEB_URL}${text}`;
  return undefined;
}

export function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value === null || value === undefined ? fallback : String(value);
}

export function num(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
