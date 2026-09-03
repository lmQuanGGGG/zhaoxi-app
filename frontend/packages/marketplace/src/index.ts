export type MarketplaceRecommendation = {
  id: string;
  kind: "partner_service" | "module_fallback";
  moduleCode: string;
  title: string;
  summary?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  priceFrom?: string | null;
  currency?: string;
  imageUrl?: string;
  imageKey: string;
  emoji: string;
  href: string;
  usageCount: number;
  isNew: boolean;
  score: number;
};
export type MarketplaceSearchResult = {
  kind: "service" | "organization" | "module";
  id: string;
  moduleCode: string;
  moduleName?: string | null;
  name: string;
  summary?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  priceFrom?: string | null;
  currency?: string;
  imageUrl?: string;
  href: string;
};
export const marketplaceFallbackImage = (key: string) => `/marketplace/${encodeURIComponent(key || "default")}.svg`;
export function formatMarketplacePrice(value: string | null | undefined, currency = "VND", locale = "vi-VN") {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "";
  try { return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: currency === "VND" ? 0 : 2 }).format(number); }
  catch { return `${number.toLocaleString(locale)} ${currency}`; }
}
