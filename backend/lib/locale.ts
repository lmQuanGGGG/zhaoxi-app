export const SUPPORTED_LOCALES = ["zh-CN", "zh-TW", "vi-VN", "en-US"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "zh-CN";

export function normalizeLocale(value?: string | null): SupportedLocale {
  if (!value) return DEFAULT_LOCALE;
  const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === value.toLowerCase());
  if (exact) return exact;
  const lower = value.toLowerCase();
  if (lower.startsWith("zh-tw") || lower.startsWith("zh-hk") || lower.startsWith("zh-hant")) return "zh-TW";
  if (lower.startsWith("zh")) return "zh-CN";
  if (lower.startsWith("vi")) return "vi-VN";
  if (lower.startsWith("en")) return "en-US";
  return DEFAULT_LOCALE;
}

export function localeFromRequest(request: Request): SupportedLocale {
  const url = new URL(request.url);
  const queryLocale = url.searchParams.get("locale");
  if (queryLocale) return normalizeLocale(queryLocale);
  return normalizeLocale(request.headers.get("accept-language")?.split(",")[0]);
}
