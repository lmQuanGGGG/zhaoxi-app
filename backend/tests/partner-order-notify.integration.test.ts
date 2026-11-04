// End-to-end check that a customer order of every non-food module reaches the store owner:
// routed to the store, Expo push sent, listed for the partner and actionable.
// Runs only against a throwaway local Postgres: TEST_DATABASE_URL=postgres://...@localhost:PORT/db
import assert from "node:assert/strict";
import { after as afterAll, before, describe, it } from "node:test";

const testUrl = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(testUrl);
if (isLocal) {
  process.env.DATABASE_URL = testUrl;
  delete process.env.POSTGRES_URL;
}

type ExpoMessage = { to: string; title: string; body: string; data: { orderId: string; moduleCode: string | null } };
type Json = Record<string, unknown>;

describe("new orders of every module reach the store owner", { skip: isLocal ? false : "set TEST_DATABASE_URL to a local Postgres" }, () => {
  const pushes: ExpoMessage[] = [];
  const realFetch = globalThis.fetch;
  const runId = crypto.randomUUID().slice(0, 8);
  let sql: import("postgres").Sql;
  let customerToken = "";
  let partnerToken = "";
  let orgId = "";
  const serviceIds: Record<string, string> = {};

  async function waitForPush(orderId: string) {
    for (let i = 0; i < 50; i++) {
      const found = pushes.find((message) => message.data.orderId === orderId);
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.fail(`no push for ${orderId}`);
  }
  const call = (token: string, method: string, url: string, body?: Json) =>
    new Request(`http://localhost${url}`, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

  before(async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith("https://exp.host/")) {
        const messages = JSON.parse(String(init?.body)) as ExpoMessage[];
        pushes.push(...messages);
        return new Response(JSON.stringify({ data: messages.map(() => ({ status: "ok" })) }), { status: 200 });
      }
      return realFetch(input, init);
    }) as typeof fetch;

    const postgres = (await import("postgres")).default;
    sql = postgres(testUrl, { max: 1, onnotice: () => undefined });
    const { sessionService } = await import("@/lib/services/session-service");
    await sql`insert into languages (code, name, native_name) values ('zh-CN','Chinese','中文'), ('vi-VN','Vietnamese','Tiếng Việt') on conflict do nothing`;
    for (const code of ["housing", "travel", "visa", "car-rental"]) {
      await sql`insert into modules (code, route) values (${code}, ${"/" + code}) on conflict (code) do nothing`;
    }
    const [customer] = await sql`insert into users (nickname, phone) values ('Khách test', ${"+8490" + runId.replace(/\D/g, "").padEnd(7, "1").slice(0, 7)}) returning id`;
    const [owner] = await sql`insert into users (nickname, phone) values ('Chủ gian hàng', ${"+8491" + runId.replace(/\D/g, "").padEnd(7, "2").slice(0, 7)}) returning id`;
    const [org] = await sql`insert into organizations (code, type, name, status, address_text) values (${"ZX-TEST-" + runId}, 'visa-service', 'Gian hàng test', 'active', 'Hải Châu') returning id`;
    orgId = org.id;
    await sql`insert into organization_members (organization_id, user_id, role, is_active) values (${orgId}, ${owner.id}, 'owner', true)`;
    await sql`insert into partner_mobile_push_devices (user_id, organization_id, expo_push_token, platform) values (${owner.id}, ${orgId}, ${`ExponentPushToken[${runId}]`}, 'ios')`;
    const metadata: Record<string, Json> = {
      housing: { propertyAddress: "12 Bạch Đằng", district: "Hải Châu", bedrooms: 2, housingAvailabilityStatus: "available" },
      travel: { destination: "Bà Nà", departurePoint: "Khách sạn", startTimes: "07:30", maxGuests: 10, bookingNoticeHours: 0 },
      visa: {},
      "car-rental": {},
    };
    for (const code of Object.keys(metadata)) {
      const [service] = await sql`insert into services (module_id, organization_id, code, price_from, metadata)
        select id, ${orgId}, ${`${code}-${runId}`}, 1000000, ${sql.json(metadata[code] as never)} from modules where code = ${code} returning id`;
      serviceIds[code] = service.id;
    }
    customerToken = (await sessionService.issue({ userId: customer.id, role: "customer" })).accessToken;
    partnerToken = (await sessionService.issue({ userId: owner.id, role: "partner", organizationId: orgId })).accessToken;
  });

  afterAll(async () => {
    globalThis.fetch = realFetch;
    await sql?.end();
  });

  it("routes a visa order from the PWA checkout to the store, without the food pipeline", async () => {
    const { POST } = await import("@/app/api/service-requests/route");
    const response = await POST(call(customerToken, "POST", "/api/service-requests", {
      moduleCode: "visa", serviceId: serviceIds.visa, customerName: "Khách test", customerPhone: "+84900000001", title: "Gia hạn visa",
      addressText: "Hải Châu", details: { scheduledDate: "2026-11-20", quantity: 1, totalAmount: 1_000_000, deliveryFulfillmentMode: "external_manual", driverDispatchRequired: false },
    }));
    assert.equal(response.status, 201);
    const created = (await response.json()).data as { id: string; assignedOrganizationId: string; details: Json };
    assert.equal(created.assignedOrganizationId, orgId);
    assert.equal(created.details.deliveryFulfillmentMode, undefined);
    const push = await waitForPush(created.id);
    assert.equal(push.title, "🔔 Gian hàng test · Có đơn dịch vụ mới");
    assert.equal(push.data.moduleCode, "visa");
  });

  it("alerts the store owner about a housing inquiry", async () => {
    const { POST } = await import("@/app/api/housing-inquiries/route");
    const response = await POST(call(customerToken, "POST", "/api/housing-inquiries", {
      serviceId: serviceIds.housing, customerName: "Khách test", moveInDate: "2026-12-01", leaseMonths: 6, occupants: 2,
    }));
    assert.equal(response.status, 201);
    const created = (await response.json()).data as { id: string; assignedOrganizationId: string };
    assert.equal(created.assignedOrganizationId, orgId);
    assert.equal((await waitForPush(created.id)).title, "🏠 Gian hàng test · Có yêu cầu thuê nhà mới");
  });

  it("alerts the store owner about a tour booking", async () => {
    const { POST } = await import("@/app/api/travel-inquiries/route");
    const visitDate = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const response = await POST(call(customerToken, "POST", "/api/travel-inquiries", {
      serviceId: serviceIds.travel, customerName: "Khách test", visitDate, visitTime: "07:30", guests: 3, adults: 2, children: 1,
    }));
    assert.equal(response.status, 201);
    const created = (await response.json()).data as { id: string; assignedOrganizationId: string };
    assert.equal(created.assignedOrganizationId, orgId);
    assert.equal((await waitForPush(created.id)).title, "🧭 Gian hàng test · Có yêu cầu đặt tour mới");
  });

  it("lets the partner act on each kind through the right endpoint", async () => {
    const [visa] = await sql`select r.id from service_requests r join modules m on m.id = r.module_id where r.assigned_organization_id = ${orgId} and m.code = 'visa'`;
    const [tour] = await sql`select r.id from service_requests r join modules m on m.id = r.module_id where r.assigned_organization_id = ${orgId} and m.code = 'travel'`;
    const { PATCH: patchStatus } = await import("@/app/api/service-requests/[id]/status/route");
    const accepted = await patchStatus(call(partnerToken, "PATCH", `/api/service-requests/${visa.id}/status`, { status: "accepted" }), { params: Promise.resolve({ id: visa.id }) });
    assert.equal(accepted.status, 200);
    const blocked = await patchStatus(call(partnerToken, "PATCH", `/api/service-requests/${tour.id}/status`, { status: "accepted" }), { params: Promise.resolve({ id: tour.id }) });
    assert.equal(blocked.status, 409);
    assert.equal((await blocked.json()).error?.details?.code, "TRAVEL_BOOKING_ACTION_REQUIRED");
    const { PATCH: patchTravel } = await import("@/app/api/partner-travel-leads/[id]/route");
    const confirmed = await patchTravel(call(partnerToken, "PATCH", `/api/partner-travel-leads/${tour.id}`, { organizationId: orgId, action: "confirm" }), { params: Promise.resolve({ id: tour.id }) });
    assert.equal(confirmed.status, 200);
  });

  it("shows every order with its module facts in the partner feed", async () => {
    const { describePartnerOrder } = await import("@/lib/services/partner-order-presentation");
    const rows = await sql`select r.status, r.details, r.description, m.code as module_code from service_requests r join modules m on m.id = r.module_id where r.assigned_organization_id = ${orgId}`;
    const views = new Map(rows.map((row) => [row.module_code as string, describePartnerOrder({ moduleCode: row.module_code, status: row.status, details: row.details, description: row.description })]));
    assert.deepEqual([...views.keys()].sort(), ["housing", "travel", "visa"]);
    assert.deepEqual(views.get("visa")?.partnerActions, ["start", "cancel"]);
    assert.ok(views.get("housing")?.orderFacts.some((fact) => fact.key === "moveInDate" && fact.value === "2026-12-01"));
    assert.ok(views.get("travel")?.orderFacts.some((fact) => fact.key === "guests" && fact.value === 3));
    assert.deepEqual(views.get("travel")?.partnerActions, ["complete", "cancel"]);
    const notes = await sql`select h.note from service_request_status_history h join service_requests r on r.id = h.request_id where r.assigned_organization_id = ${orgId} and h.to_status = 'assigned'`;
    assert.equal(notes.length, 3, "each new order lands in the partner in-app notification feed");
  });
});
