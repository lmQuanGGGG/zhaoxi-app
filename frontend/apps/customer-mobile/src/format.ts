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

export function relativeTime(value: string, locale: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return rtf.format(-days, "day");
  return shortDate(value, locale);
}

/** Resolves image URLs from the API; relative paths live on the customer web app or the API. */
export function imageUri(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return undefined;
  if (/^https?:\/\//.test(text)) return text;
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
