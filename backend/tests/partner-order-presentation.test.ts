import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describePartnerOrder,
  newOrderAlertTitle,
  partnerOrderActions,
  partnerOrderKind,
  sanitizeOrderDetailsForModule,
} from "@/lib/services/partner-order-presentation";

const keys = (facts: Array<{ key: string }>) => facts.map((fact) => fact.key);

describe("partnerOrderKind", () => {
  it("maps every store module to a partner order kind", () => {
    assert.equal(partnerOrderKind("food"), "food_delivery");
    assert.equal(partnerOrderKind("housing"), "housing_inquiry");
    assert.equal(partnerOrderKind("travel"), "travel_booking");
    for (const code of ["visa", "car-rental", "translation", "payment", "community", "market", "emergency", null, undefined]) {
      assert.equal(partnerOrderKind(code), "service_booking", String(code));
    }
  });
});

describe("sanitizeOrderDetailsForModule", () => {
  const pwaDetails = { deliveryFulfillmentMode: "external_manual", driverDispatchRequired: false, scheduledDate: "2026-11-20", totalAmount: 1_500_000 };

  it("drops the food pipeline markers a client sends for a non-food order", () => {
    const next = sanitizeOrderDetailsForModule("visa", pwaDetails);
    assert.equal(next.deliveryFulfillmentMode, undefined);
    assert.equal(next.driverDispatchRequired, undefined);
    assert.equal(next.scheduledDate, "2026-11-20");
    assert.equal(pwaDetails.deliveryFulfillmentMode, "external_manual", "input is not mutated");
  });

  it("keeps food details untouched", () => {
    assert.deepEqual(sanitizeOrderDetailsForModule("food", pwaDetails), pwaDetails);
  });
});

describe("describePartnerOrder", () => {
  it("shows check-in, lease and occupants for a housing inquiry", () => {
    const view = describePartnerOrder({
      moduleCode: "housing",
      status: "assigned",
      description: "Có nuôi mèo",
      details: { requestedMoveInDate: "2026-12-01", requestedLeaseMonths: 6, occupants: 2, budget: 9_000_000, monthlyRent: 8_500_000, preferredContact: "wechat", wechat: "zx_wechat" },
    });
    assert.equal(view.orderKind, "housing_inquiry");
    assert.deepEqual(keys(view.orderFacts), ["moveInDate", "leaseMonths", "occupants", "budget", "monthlyRent", "preferredContact", "wechat", "customerNote"]);
    assert.deepEqual(view.partnerActions, ["accept", "reject"]);
  });

  it("shows tour date, time and guests for a travel booking", () => {
    const view = describePartnerOrder({
      moduleCode: "travel",
      status: "assigned",
      details: { requestedDate: "2026-11-21", requestedTime: "07:30", guests: 3, adults: 2, children: 1, packageName: "Bà Nà", quotedAmount: 2_400_000, travelBookingStage: "requested" },
    });
    assert.equal(view.orderKind, "travel_booking");
    assert.deepEqual(keys(view.orderFacts), ["visitDate", "visitTime", "guests", "adults", "children", "packageName", "quotedAmount"]);
    assert.deepEqual(view.partnerActions, ["accept", "reject"]);
  });

  it("shows the preferred schedule and total for other services", () => {
    const view = describePartnerOrder({
      moduleCode: "car-rental",
      status: "assigned",
      details: { scheduledDate: "2026-11-22", scheduledTime: "08:00", quantity: 1, totalAmount: 650_000, paymentMethod: "cash_on_delivery" },
    });
    assert.equal(view.orderKind, "service_booking");
    assert.deepEqual(keys(view.orderFacts), ["scheduledDate", "scheduledTime", "quantity", "totalAmount", "paymentMethod"]);
  });

  it("leaves food to the kitchen pipeline", () => {
    const view = describePartnerOrder({ moduleCode: "food", status: "assigned", details: { quantity: 2, totalAmount: 120_000 } });
    assert.deepEqual(view, { orderKind: "food_delivery", orderFacts: [], partnerActions: [] });
  });

  it("tolerates missing details", () => {
    const view = describePartnerOrder({ moduleCode: "visa", status: "assigned", details: null });
    assert.deepEqual(view.orderFacts, []);
    assert.deepEqual(view.partnerActions, ["accept", "reject"]);
  });
});

describe("partnerOrderActions", () => {
  it("follows the generic status transitions", () => {
    assert.deepEqual(partnerOrderActions("service_booking", "accepted", {}), ["start", "cancel"]);
    assert.deepEqual(partnerOrderActions("housing_inquiry", "in_progress", {}), ["complete", "cancel"]);
    assert.deepEqual(partnerOrderActions("service_booking", "waiting_customer", {}), ["complete", "cancel"]);
    for (const status of ["completed", "cancelled", "rejected"]) assert.deepEqual(partnerOrderActions("service_booking", status, {}), []);
  });

  it("follows the travel booking stages", () => {
    assert.deepEqual(partnerOrderActions("travel_booking", "accepted", { travelBookingStage: "confirmed" }), ["complete", "cancel"]);
    assert.deepEqual(partnerOrderActions("travel_booking", "completed", { travelBookingStage: "completed" }), []);
    assert.deepEqual(partnerOrderActions("travel_booking", "cancelled", { travelBookingStage: "cancelled" }), []);
  });
});

describe("newOrderAlertTitle", () => {
  it("names the kind of order in the push title", () => {
    assert.match(newOrderAlertTitle("food_delivery"), /đơn hàng mới/);
    assert.match(newOrderAlertTitle("housing_inquiry"), /thuê nhà/);
    assert.match(newOrderAlertTitle("travel_booking"), /tour/);
    assert.match(newOrderAlertTitle("service_booking"), /dịch vụ/);
  });
});
