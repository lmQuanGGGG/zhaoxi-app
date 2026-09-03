export type AnalyticsModuleMetric = {
  code: string;
  name: string;
  orders: number;
  completed: number;
  cancelled: number;
  gmv: number;
};
export type AnalyticsOverview = {
  generatedAt: string;
  scope: "platform" | "organization";
  organizationId?: string;
  periodDays: number;
  totals: {
    orders: number;
    completed: number;
    active: number;
    cancelled: number;
    completionRate: number;
    gmv: number;
    collectedRevenue: number;
    partners: number;
    services: number;
    drivers: number;
    activeDrivers: number;
    deliveries: number;
    delivered: number;
    openSupport: number;
  };
  modules: AnalyticsModuleMetric[];
  orderStatus: Array<{ status: string; count: number }>;
  paymentStatus: Array<{ status: string; count: number; amount: number }>;
  deliveryStatus: Array<{ status: string; count: number }>;
  daily: Array<{ date: string; orders: number; completed: number; gmv: number }>;
};

export function money(value: number, locale = "vi-VN", currency = "VND") {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: currency === "VND" ? 0 : 2 }).format(value || 0);
}
export function percent(value: number) { return `${Math.round((value || 0) * 10) / 10}%`; }
