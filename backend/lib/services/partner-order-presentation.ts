// One place that decides how a partner sees an order of any module.
// Partner web and partner mobile render these fields instead of guessing the
// module from client-supplied details (food used to be the only shape they knew).

export type PartnerOrderKind = "food_delivery" | "housing_inquiry" | "travel_booking" | "service_booking";

export type PartnerOrderFactKey =
  | "scheduledDate" | "scheduledTime" | "quantity" | "totalAmount" | "paymentMethod"
  | "moveInDate" | "leaseMonths" | "occupants" | "budget" | "monthlyRent" | "propertyType"
  | "visitDate" | "visitTime" | "guests" | "adults" | "children" | "packageName" | "departurePoint" | "quotedAmount"
  | "preferredContact" | "wechat" | "whatsapp" | "customerNote";

export type PartnerOrderFactFormat = "text" | "date" | "time" | "money" | "count" | "months" | "payment";
export type PartnerOrderFact = { key: PartnerOrderFactKey; value: string | number; format: PartnerOrderFactFormat };

/** Partner-facing next steps. Food keeps its own kitchen/courier flow and has none here. */
export type PartnerOrderAction = "accept" | "start" | "complete" | "reject" | "cancel";

export type PartnerOrderPresentation = { orderKind: PartnerOrderKind; orderFacts: PartnerOrderFact[]; partnerActions: PartnerOrderAction[] };

type Details = Record<string, unknown>;

/** Keys that switch on the food kitchen + courier pipeline (kitchen queue, ETA timer, restaurant analytics). */
const FOOD_PIPELINE_KEYS = ["deliveryFulfillmentMode", "driverDispatchRequired"] as const;

export function partnerOrderKind(moduleCode: string | null | undefined): PartnerOrderKind {
  if (moduleCode === "food") return "food_delivery";
  if (moduleCode === "housing") return "housing_inquiry";
  if (moduleCode === "travel") return "travel_booking";
  return "service_booking";
}

/**
 * The PWA checkout used to send `deliveryFulfillmentMode: "external_manual"` for every module,
 * which pushed visa/car-rental/... orders into the restaurant pipeline. Only the backend food
 * branch may set those markers, so they are dropped from client details for any other module.
 */
export function sanitizeOrderDetailsForModule(moduleCode: string, details: Details): Details {
  if (moduleCode === "food") return details;
  const next = { ...details };
  for (const key of FOOD_PIPELINE_KEYS) delete next[key];
  return next;
}

function text(value: unknown, max = 300): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim().slice(0, max) : "";
}
function positive(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function partnerOrderFacts(kind: PartnerOrderKind, details: Details, description?: string | null): PartnerOrderFact[] {
  const facts: PartnerOrderFact[] = [];
  const add = (key: PartnerOrderFactKey, value: string | number, format: PartnerOrderFactFormat) => {
    if (value === "" || value === 0) return;
    facts.push({ key, value, format });
  };
  if (kind === "food_delivery") return facts;
  if (kind === "housing_inquiry") {
    add("moveInDate", text(details.requestedMoveInDate, 10), "date");
    add("leaseMonths", positive(details.requestedLeaseMonths), "months");
    add("occupants", positive(details.occupants), "count");
    add("budget", positive(details.budget), "money");
    add("monthlyRent", positive(details.monthlyRent), "money");
    add("propertyType", text(details.propertyType, 80), "text");
  } else if (kind === "travel_booking") {
    add("visitDate", text(details.requestedDate, 10), "date");
    add("visitTime", text(details.requestedTime, 5), "time");
    add("guests", positive(details.guests), "count");
    if (positive(details.children)) {
      add("adults", positive(details.adults), "count");
      add("children", positive(details.children), "count");
    }
    add("packageName", text(details.packageName, 120), "text");
    add("departurePoint", text(details.departurePoint, 300), "text");
    add("quotedAmount", positive(details.quotedAmount), "money");
  } else {
    add("scheduledDate", text(details.scheduledDate, 10), "date");
    add("scheduledTime", text(details.scheduledTime, 5), "time");
    add("quantity", positive(details.quantity), "count");
    add("totalAmount", positive(details.totalAmount), "money");
    add("paymentMethod", text(details.paymentMethod, 40), "payment");
  }
  if (kind !== "service_booking") {
    const contact = text(details.preferredContact, 20);
    if (contact && contact !== "phone") add("preferredContact", contact, "text");
    add("wechat", text(details.wechat, 128), "text");
    add("whatsapp", text(details.whatsapp, 40), "text");
  }
  add("customerNote", text(description ?? details.notes, 2000), "text");
  return facts;
}

export function partnerOrderActions(kind: PartnerOrderKind, status: string, details: Details): PartnerOrderAction[] {
  if (kind === "food_delivery") return [];
  if (kind === "travel_booking") {
    // Mirrors travelBookingService.partnerAction: confirm/reject a request, complete/cancel a confirmed booking.
    const stage = text(details.travelBookingStage, 40) || "requested";
    if (stage === "requested" && ["new", "assigned", "reviewing"].includes(status)) return ["accept", "reject"];
    if (stage === "confirmed") return ["complete", "cancel"];
    return [];
  }
  // Mirrors the transitions table of PATCH /api/service-requests/[id]/status.
  if (["new", "reviewing", "assigned"].includes(status)) return ["accept", "reject"];
  if (status === "accepted") return ["start", "cancel"];
  if (status === "in_progress" || status === "waiting_customer") return ["complete", "cancel"];
  return [];
}

export function describePartnerOrder(row: { moduleCode: string | null | undefined; status: string; details: unknown; description?: string | null }): PartnerOrderPresentation {
  const details = (row.details && typeof row.details === "object" ? row.details : {}) as Details;
  const orderKind = partnerOrderKind(row.moduleCode);
  return { orderKind, orderFacts: partnerOrderFacts(orderKind, details, row.description), partnerActions: partnerOrderActions(orderKind, row.status, details) };
}

/** Title of the "new order" push/alert the partner receives (partner apps default to Vietnamese). */
export function newOrderAlertTitle(kind: PartnerOrderKind): string {
  if (kind === "housing_inquiry") return "🏠 Có yêu cầu thuê nhà mới";
  if (kind === "travel_booking") return "🧭 Có yêu cầu đặt tour mới";
  if (kind === "service_booking") return "🔔 Có đơn dịch vụ mới";
  return "🔔 Có đơn hàng mới";
}
