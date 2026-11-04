// One definition of "store revenue" for every module (food, car rental, visa, travel, ...).
// The Partner app revenue tab, partner web analytics and the settlement preview all build on it,
// so a completed order counts once, with the same amount, on the day it was completed in the
// store's time zone.
//
// Pure functions only (no database access) so the aggregation can be unit tested.

export const DEFAULT_REVENUE_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const COMPLETED_STATUS = "completed";
export const CANCELLED_STATUSES: readonly string[] = ["cancelled", "rejected"];
export const IN_PROGRESS_STATUSES: readonly string[] = ["assigned", "accepted", "in_progress", "waiting_customer"];

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 180;

type Details = Record<string, unknown>;

export type RevenueOrderRow = {
  id: string;
  requestCode: string;
  status: string;
  serviceId: string | null;
  title: string;
  details: Details | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Money of one order, read from the fields every checkout writes into `details`. */
export type RevenueLine = {
  itemBaseRevenue: number;
  promotionDiscount: number;
  couponDiscount: number;
  /** Store revenue: items/service after discounts, without delivery. */
  itemRevenue: number;
  deliveryGrossFee: number;
  deliverySubsidy: number;
  customerDeliveryFee: number;
  /** What the customer pays for the order (GMV). */
  customerPaid: number;
};

export type RevenueWindow = { start: Date; end: Date; dayKeys: string[] };

type DailyRow = { date: string; orders: number; completed: number; gmv: number; foodRevenue: number; promotionDiscount: number; couponDiscount: number; deliverySubsidy: number };
type ItemStats = { serviceId: string; name: string; quantity: number; revenue: number; discount: number; orders: Set<string> };
export type CouponStats = { code: string; orders: number; discount: number; revenue: number };

/** A finite number, or null when the field is missing/blank/not numeric (0 stays 0). */
function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const x = Number(value);
  return Number.isFinite(x) ? x : null;
}
function n(value: unknown): number {
  return num(value) ?? 0;
}
function money(value: number) {
  return Math.round(value);
}
function pct(a: number, b: number) {
  return b > 0 ? Number((a / b * 100).toFixed(1)) : 0;
}
function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function revenueLine(details: Details | null | undefined): RevenueLine {
  const d = details || {};
  const customerDeliveryFee = num(d.deliveryCustomerFee) ?? num(d.deliveryFee) ?? 0;
  const unitPrice = num(d.unitPrice);
  const quantity = num(d.quantity);
  const total = num(d.totalAmount);
  const itemRevenue =
    num(d.itemSubtotal) ??
    (unitPrice !== null ? unitPrice * (quantity !== null && quantity > 0 ? quantity : 1) : null) ??
    (total !== null ? Math.max(0, total - customerDeliveryFee) : null) ??
    num(d.quotedAmount) ??
    0;
  return {
    itemBaseRevenue: n(d.itemBaseSubtotal || d.itemSubtotalBeforeCoupon) || itemRevenue,
    promotionDiscount: n(d.itemDiscount),
    couponDiscount: n(d.couponDiscount),
    itemRevenue,
    deliveryGrossFee: n(d.deliveryGrossFee),
    deliverySubsidy: n(d.deliverySubsidy),
    customerDeliveryFee,
    customerPaid: total ?? itemRevenue + customerDeliveryFee,
  };
}

/**
 * When the order became completed: the first status-history entry into `completed`
 * (`updatedAt` moves on later edits such as payment support or chat), then the timestamps
 * the food auto-complete writes, then `updatedAt`.
 */
export function completionTime(row: Pick<RevenueOrderRow, "details" | "updatedAt">, recordedAt?: Date | null): Date {
  const d = row.details || {};
  return recordedAt || parseDate(d.completedAt) || parseDate(d.autoCompletedAt) || row.updatedAt;
}

export function isRevenueOrder(row: Pick<RevenueOrderRow, "status">): boolean {
  return row.status === COMPLETED_STATUS;
}

export function safeTimeZone(timeZone: string | null | undefined): string {
  const tz = String(timeZone || "").trim();
  if (!tz) return DEFAULT_REVENUE_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_REVENUE_TIME_ZONE;
  }
}

/** Calendar day (YYYY-MM-DD) of an instant in the store's time zone. */
export function dateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function keyToUtc(key: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(t).toISOString().slice(0, 10) === key ? t : null;
}
function addDays(key: string, days: number): string {
  return new Date((keyToUtc(key) as number) + days * DAY_MS).toISOString().slice(0, 10);
}
/** Offset (ms) of `timeZone` from UTC at a given instant. */
function zoneOffset(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - Math.floor(instant / 1000) * 1000;
}
/** Instant of 00:00 of a calendar day in `timeZone` (not in the server's zone). */
export function zonedDayStart(key: string, timeZone: string): Date {
  const utcMidnight = keyToUtc(key);
  if (utcMidnight === null) throw new Error("REVENUE_DATE_INVALID");
  let guess = utcMidnight - zoneOffset(utcMidnight, timeZone);
  guess = utcMidnight - zoneOffset(guess, timeZone);
  return new Date(guess);
}

/**
 * Days are calendar days of the store's time zone: `period` = today plus the previous
 * period-1 days; `from`/`to` (YYYY-MM-DD) are inclusive and capped at 180 days.
 */
export function resolveRevenueWindow(input: { period: number; from?: string; to?: string; timeZone: string; now?: Date }): RevenueWindow {
  const now = input.now || new Date();
  const today = dateKey(now, input.timeZone);
  let firstKey: string;
  let lastKey: string;
  if (input.from && input.to && keyToUtc(input.from) !== null && keyToUtc(input.to) !== null) {
    [firstKey, lastKey] = input.from <= input.to ? [input.from, input.to] : [input.to, input.from];
    const lastAllowed = addDays(firstKey, MAX_RANGE_DAYS - 1);
    if (lastKey > lastAllowed) lastKey = lastAllowed;
  } else {
    const days = Math.max(1, Math.min(MAX_RANGE_DAYS, Math.floor(input.period) || 30));
    lastKey = today;
    firstKey = addDays(today, -(days - 1));
  }
  const dayKeys: string[] = [];
  for (let key = firstKey; key <= lastKey; key = addDays(key, 1)) dayKeys.push(key);
  const start = zonedDayStart(firstKey, input.timeZone);
  const endOfLastDay = new Date(zonedDayStart(addDays(lastKey, 1), input.timeZone).getTime() - 1);
  return { start, end: endOfLastDay < now ? endOfLastDay : now, dayKeys };
}

function within(date: Date, window: RevenueWindow) {
  return date >= window.start && date <= window.end;
}

/**
 * Aggregates the store's orders for a window.
 * - Received orders (counts, cancellations, in progress) use `createdAt`.
 * - Completed orders and every money figure use the completion time, so an order placed
 *   yesterday and completed today is today's revenue, counted once.
 */
export function summarizeStoreRevenue(input: {
  rows: RevenueOrderRow[];
  completedAt: ReadonlyMap<string, Date>;
  window: RevenueWindow;
  timeZone: string;
}) {
  const { window, timeZone } = input;
  const unique = new Map<string, RevenueOrderRow>();
  for (const row of input.rows) unique.set(row.id, row);
  const rows = [...unique.values()];

  const received = rows.filter((r) => within(r.createdAt, window));
  const completed = rows
    .filter(isRevenueOrder)
    .map((row) => ({ row, at: completionTime(row, input.completedAt.get(row.id)) }))
    .filter((x) => within(x.at, window));
  const cancelled = received.filter((r) => CANCELLED_STATUSES.includes(r.status));
  const inProgress = received.filter((r) => IN_PROGRESS_STATUSES.includes(r.status));
  const receivedCompleted = received.filter(isRevenueOrder);

  const dailyMap = new Map<string, DailyRow>();
  for (const key of window.dayKeys) dailyMap.set(key, { date: key, orders: 0, completed: 0, gmv: 0, foodRevenue: 0, promotionDiscount: 0, couponDiscount: 0, deliverySubsidy: 0 });
  for (const row of received) {
    const day = dailyMap.get(dateKey(row.createdAt, timeZone));
    if (day) day.orders++;
  }

  let itemBaseRevenue = 0, itemPromotionDiscount = 0, couponDiscount = 0, itemRevenue = 0, deliveryGrossFee = 0, deliverySubsidy = 0, customerDeliveryFee = 0, gmv = 0;
  let prepMinutesTotal = 0, prepCount = 0;
  const items = new Map<string, ItemStats>();
  const coupons = new Map<string, CouponStats>();

  for (const { row, at } of completed) {
    const d = row.details || {};
    const line = revenueLine(d);
    itemBaseRevenue += line.itemBaseRevenue;
    itemPromotionDiscount += line.promotionDiscount;
    couponDiscount += line.couponDiscount;
    itemRevenue += line.itemRevenue;
    deliveryGrossFee += line.deliveryGrossFee;
    deliverySubsidy += line.deliverySubsidy;
    customerDeliveryFee += line.customerDeliveryFee;
    gmv += line.customerPaid;

    const day = dailyMap.get(dateKey(at, timeZone));
    if (day) {
      day.completed++;
      day.gmv += line.customerPaid;
      day.foodRevenue += line.itemRevenue;
      day.promotionDiscount += line.promotionDiscount;
      day.couponDiscount += line.couponDiscount;
      day.deliverySubsidy += line.deliverySubsidy;
    }

    const started = parseDate(d.preparationStartedAt || d.acceptedAt), ready = parseDate(d.foodReadyAt);
    if (started && ready && ready >= started) { prepMinutesTotal += (ready.getTime() - started.getTime()) / 60000; prepCount++; }

    const lines = Array.isArray(d.items) ? (d.items as Array<Record<string, unknown>>) : [];
    if (lines.length) {
      for (const item of lines) {
        const serviceId = String(item.serviceId || "unknown");
        const current = items.get(serviceId) || { serviceId, name: String(item.name || item.itemName || item.title || serviceId), quantity: 0, revenue: 0, discount: 0, orders: new Set<string>() };
        current.quantity += n(item.quantity) || 1;
        current.revenue += n(item.subtotal);
        current.discount += n(item.discount);
        current.orders.add(row.id);
        items.set(serviceId, current);
      }
    } else if (row.serviceId) {
      // Service orders (car rental, visa, ...) book one service without an items array.
      const current = items.get(row.serviceId) || { serviceId: row.serviceId, name: row.title, quantity: 0, revenue: 0, discount: 0, orders: new Set<string>() };
      current.quantity += n(d.quantity) || 1;
      current.revenue += line.itemRevenue;
      current.discount += line.promotionDiscount;
      current.orders.add(row.id);
      items.set(row.serviceId, current);
    }

    const code = String(d.couponCode || "").trim();
    if (code) {
      const c = coupons.get(code) || { code, orders: 0, discount: 0, revenue: 0 };
      c.orders++;
      c.discount += line.couponDiscount;
      c.revenue += line.customerPaid;
      coupons.set(code, c);
    }
  }

  return {
    orders: {
      total: received.length,
      completed: completed.length,
      cancelled: cancelled.length,
      inProgress: inProgress.length,
      completionRate: pct(receivedCompleted.length, received.length),
      cancellationRate: pct(cancelled.length, received.length),
    },
    revenue: {
      gmv: money(gmv),
      itemBaseRevenue: money(itemBaseRevenue),
      itemPromotionDiscount: money(itemPromotionDiscount),
      couponDiscount: money(couponDiscount),
      foodRevenue: money(itemRevenue),
      deliveryGrossFee: money(deliveryGrossFee),
      deliverySubsidy: money(deliverySubsidy),
      customerDeliveryFee: money(customerDeliveryFee),
      averageOrderValue: completed.length ? money(gmv / completed.length) : 0,
    },
    operations: { averagePreparationMinutes: prepCount ? Number((prepMinutesTotal / prepCount).toFixed(1)) : 0, preparationSamples: prepCount },
    daily: [...dailyMap.values()].map((x) => ({ ...x, gmv: money(x.gmv), foodRevenue: money(x.foodRevenue), promotionDiscount: money(x.promotionDiscount), couponDiscount: money(x.couponDiscount), deliverySubsidy: money(x.deliverySubsidy) })),
    topItems: [...items.values()].map((x) => ({ ...x, orders: x.orders.size })).sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity).slice(0, 10),
    coupons,
  };
}
