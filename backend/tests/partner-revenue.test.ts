import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  completionTime,
  resolveRevenueWindow,
  revenueLine,
  safeTimeZone,
  summarizeStoreRevenue,
  type RevenueOrderRow,
} from "@/lib/services/partner-revenue";
import { calc } from "@/lib/services/restaurant-settlement-service";

const TZ = "Asia/Ho_Chi_Minh";

function row(overrides: Partial<RevenueOrderRow> & { id: string }): RevenueOrderRow {
  return {
    requestCode: `ZX-${overrides.id}`,
    status: "completed",
    serviceId: null,
    title: "Order",
    details: {},
    createdAt: new Date("2026-11-04T03:00:00Z"),
    updatedAt: new Date("2026-11-04T04:00:00Z"),
    ...overrides,
  };
}

// Production row ZX-20261103-DD91E83E (ZhaoXi Car Đà Nẵng): a car-rental booking, which never
// carries the food marker `deliveryFulfillmentMode`, created 01:05 and completed 02:49 on 4/11 (VN time).
const carRental = row({
  id: "car",
  serviceId: "svc-scooter",
  title: "Thuê xe máy tay ga theo ngày tại Đà Nẵng",
  createdAt: new Date("2026-11-03T18:05:55.843Z"),
  updatedAt: new Date("2026-11-03T19:49:41.657Z"),
  details: { currency: "VND", quantity: 1, unitPrice: 150000, totalAmount: 150000, itemDiscount: 0, itemSubtotal: 150000, paymentMethod: "cash_on_delivery", paymentStatus: "cash_due", couponDiscount: 0, itemBaseSubtotal: 150000, itemSubtotalBeforeCoupon: 150000 },
});
const carCompletedAt = new Map([["car", new Date("2026-11-03T19:49:41.658Z")]]);

describe("resolveRevenueWindow", () => {
  it("starts 'today' at midnight of the store's time zone, not the server's", () => {
    const w = resolveRevenueWindow({ period: 1, timeZone: TZ, now: new Date("2026-11-04T08:00:00Z") });
    assert.equal(w.start.toISOString(), "2026-11-03T17:00:00.000Z");
    assert.equal(w.end.toISOString(), "2026-11-04T08:00:00.000Z");
    assert.deepEqual(w.dayKeys, ["2026-11-04"]);
  });

  it("covers N calendar days ending today", () => {
    const w = resolveRevenueWindow({ period: 7, timeZone: TZ, now: new Date("2026-11-04T08:00:00Z") });
    assert.equal(w.dayKeys.length, 7);
    assert.equal(w.dayKeys[0], "2026-10-29");
    assert.equal(w.start.toISOString(), "2026-10-28T17:00:00.000Z");
  });

  it("treats a custom range as inclusive local days and accepts it reversed", () => {
    const w = resolveRevenueWindow({ period: 30, from: "2026-11-03", to: "2026-11-01", timeZone: TZ, now: new Date("2026-11-04T08:00:00Z") });
    assert.deepEqual(w.dayKeys, ["2026-11-01", "2026-11-02", "2026-11-03"]);
    assert.equal(w.start.toISOString(), "2026-10-31T17:00:00.000Z");
    assert.equal(w.end.toISOString(), "2026-11-03T16:59:59.999Z");
  });

  it("falls back to the period for an invalid custom range and caps long ranges", () => {
    assert.equal(resolveRevenueWindow({ period: 30, from: "2026-02-30", to: "2026-03-02", timeZone: TZ, now: new Date("2026-11-04T08:00:00Z") }).dayKeys.length, 30);
    assert.equal(resolveRevenueWindow({ period: 30, from: "2025-01-01", to: "2026-11-04", timeZone: TZ, now: new Date("2026-11-04T08:00:00Z") }).dayKeys.length, 180);
  });

  it("works for zones with daylight saving time", () => {
    const w = resolveRevenueWindow({ period: 1, from: "2026-07-01", to: "2026-07-01", timeZone: "Europe/Paris", now: new Date("2026-11-04T08:00:00Z") });
    assert.equal(w.start.toISOString(), "2026-06-30T22:00:00.000Z");
  });

  it("ignores an unknown time zone", () => {
    assert.equal(safeTimeZone("Mars/Base"), TZ);
    assert.equal(safeTimeZone(""), TZ);
    assert.equal(safeTimeZone("Asia/Shanghai"), "Asia/Shanghai");
  });
});

describe("revenueLine", () => {
  it("reads food orders as before", () => {
    const line = revenueLine({ itemBaseSubtotal: 120000, itemDiscount: 10000, couponDiscount: 10000, itemSubtotal: 100000, deliveryGrossFee: 30000, deliverySubsidy: 10000, deliveryCustomerFee: 20000, totalAmount: 120000 });
    assert.deepEqual(line, { itemBaseRevenue: 120000, promotionDiscount: 10000, couponDiscount: 10000, itemRevenue: 100000, deliveryGrossFee: 30000, deliverySubsidy: 10000, customerDeliveryFee: 20000, customerPaid: 120000 });
  });

  it("keeps a fully discounted item at 0", () => {
    assert.equal(revenueLine({ itemSubtotal: 0, itemBaseSubtotal: 50000, couponDiscount: 50000, totalAmount: 0 }).itemRevenue, 0);
  });

  it("derives missing fields for service and legacy orders", () => {
    assert.equal(revenueLine({ unitPrice: 200000, quantity: 2 }).itemRevenue, 400000);
    assert.equal(revenueLine({ unitPrice: 200000, quantity: 2 }).customerPaid, 400000);
    assert.equal(revenueLine({ unitPrice: 68000, quantity: "abc" }).itemRevenue, 68000);
    const legacy = revenueLine({ totalAmount: 267000, deliveryFee: 63000 });
    assert.equal(legacy.customerDeliveryFee, 63000);
    assert.equal(legacy.itemRevenue, 204000);
    assert.equal(revenueLine({ quotedAmount: 900000 }).itemRevenue, 900000);
    assert.equal(revenueLine({}).customerPaid, 0);
  });
});

describe("completionTime", () => {
  it("prefers the status history over updatedAt", () => {
    const recorded = new Date("2026-11-01T10:00:00Z");
    assert.equal(completionTime(row({ id: "x" }), recorded), recorded);
    assert.equal(completionTime(row({ id: "x", details: { autoCompletedAt: "2026-11-02T10:00:00.000Z" } })).toISOString(), "2026-11-02T10:00:00.000Z");
    assert.equal(completionTime(row({ id: "x" })).toISOString(), "2026-11-04T04:00:00.000Z");
  });
});

describe("summarizeStoreRevenue", () => {
  const today = resolveRevenueWindow({ period: 1, timeZone: TZ, now: new Date("2026-11-04T08:00:00Z") });

  it("counts a completed car-rental order in today's revenue (the reported bug)", () => {
    const s = summarizeStoreRevenue({ rows: [carRental], completedAt: carCompletedAt, window: today, timeZone: TZ });
    assert.equal(s.orders.total, 1);
    assert.equal(s.orders.completed, 1);
    assert.equal(s.revenue.foodRevenue, 150000);
    assert.equal(s.revenue.gmv, 150000);
    assert.equal(s.revenue.averageOrderValue, 150000);
    assert.deepEqual(s.daily.map((d) => [d.date, d.orders, d.completed, d.gmv]), [["2026-11-04", 1, 1, 150000]]);
    assert.deepEqual(s.topItems.map((x) => [x.serviceId, x.name, x.quantity, x.revenue, x.orders]), [["svc-scooter", carRental.title, 1, 150000, 1]]);
  });

  it("counts an order once even when both queries return it", () => {
    const s = summarizeStoreRevenue({ rows: [carRental, { ...carRental }], completedAt: carCompletedAt, window: today, timeZone: TZ });
    assert.equal(s.orders.completed, 1);
    assert.equal(s.revenue.gmv, 150000);
  });

  it("books revenue on the completion day, not the order day", () => {
    const lastNight = row({ id: "late", createdAt: new Date("2026-11-03T16:50:00Z"), updatedAt: new Date("2026-11-03T17:20:00Z"), details: { itemSubtotal: 80000, totalAmount: 95000, deliveryCustomerFee: 15000 } });
    const two = resolveRevenueWindow({ period: 2, timeZone: TZ, now: new Date("2026-11-04T08:00:00Z") });
    const s = summarizeStoreRevenue({ rows: [lastNight], completedAt: new Map(), window: two, timeZone: TZ });
    assert.deepEqual(s.daily.map((d) => [d.date, d.orders, d.completed, d.gmv, d.foodRevenue]), [["2026-11-03", 1, 0, 0, 0], ["2026-11-04", 0, 1, 95000, 80000]]);
    // Today alone: revenue is in, the order was received yesterday.
    const t = summarizeStoreRevenue({ rows: [lastNight], completedAt: new Map(), window: today, timeZone: TZ });
    assert.equal(t.orders.total, 0);
    assert.equal(t.orders.completed, 1);
    assert.equal(t.revenue.foodRevenue, 80000);
  });

  it("does not count an order completed before the window that was touched later", () => {
    const old = row({ id: "old", createdAt: new Date("2026-11-01T03:00:00Z"), updatedAt: new Date("2026-11-04T02:00:00Z"), details: { itemSubtotal: 50000, totalAmount: 50000 } });
    const s = summarizeStoreRevenue({ rows: [old], completedAt: new Map([["old", new Date("2026-11-01T04:00:00Z")]]), window: today, timeZone: TZ });
    assert.equal(s.orders.completed, 0);
    assert.equal(s.revenue.gmv, 0);
  });

  it("mixes modules and statuses in one store", () => {
    const food = row({ id: "food", details: { deliveryFulfillmentMode: "external_manual", itemSubtotal: 100000, totalAmount: 120000, deliveryCustomerFee: 20000, couponCode: "SALE", couponDiscount: 5000, items: [{ serviceId: "pho", name: "Phở", quantity: 2, subtotal: 100000 }] } });
    const rejected = row({ id: "rej", status: "rejected", details: { totalAmount: 200000 } });
    const accepted = row({ id: "acc", status: "accepted", details: { totalAmount: 200000 } });
    const s = summarizeStoreRevenue({ rows: [carRental, food, rejected, accepted], completedAt: carCompletedAt, window: today, timeZone: TZ });
    assert.deepEqual(s.orders, { total: 4, completed: 2, cancelled: 1, inProgress: 1, completionRate: 50, cancellationRate: 25 });
    assert.equal(s.revenue.foodRevenue, 250000);
    assert.equal(s.revenue.gmv, 270000);
    assert.equal(s.revenue.customerDeliveryFee, 20000);
    assert.deepEqual(s.coupons.get("SALE"), { code: "SALE", orders: 1, discount: 5000, revenue: 120000 });
    assert.deepEqual(s.topItems.map((x) => x.serviceId), ["svc-scooter", "pho"]);
  });
});

describe("settlement preview uses the same definition", () => {
  it("includes non-food completed orders by completion time", () => {
    const start = new Date("2026-11-03T00:00:00.000Z"), end = new Date("2026-11-03T23:59:59.999Z");
    const outside = row({ id: "out", createdAt: new Date("2026-11-02T03:00:00Z"), updatedAt: new Date("2026-11-03T05:00:00Z"), details: { itemSubtotal: 70000, totalAmount: 70000 } });
    const result = calc([carRental, outside], new Map([...carCompletedAt, ["out", new Date("2026-11-02T04:00:00Z")]]), start, end);
    assert.equal(result.orderCount, 1);
    assert.equal(result.foodRevenue, 150000);
    assert.equal(result.customerPaid, 150000);
    assert.equal(result.orders[0].requestCode, "ZX-car");
    assert.equal(result.orders[0].completedAt.toISOString(), "2026-11-03T19:49:41.658Z");
  });
});
