// Store alerts reaching the ZhaoXi host app (mini app `zhaoxi.partner`) next to the standalone Partner app:
// registration with the host token, payload marker, one alert per device, removed members and host sign-out.
// Runs only against a throwaway local Postgres: TEST_DATABASE_URL=postgres://...@localhost:PORT/db
import assert from "node:assert/strict";
import { after as afterAll, before, beforeEach, describe, it } from "node:test";

const testUrl = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(testUrl);
if (isLocal) {
  process.env.DATABASE_URL = testUrl;
  delete process.env.POSTGRES_URL;
}

type ExpoMessage = { to: string; title: string; channelId: string; data: Record<string, unknown> };

describe("partner push to the ZhaoXi host app", { skip: isLocal ? false : "set TEST_DATABASE_URL to a local Postgres" }, () => {
  const sent: ExpoMessage[] = [];
  const realFetch = globalThis.fetch;
  const runId = crypto.randomUUID().slice(0, 8);
  const hostToken = `ExponentPushToken[host${runId}]`;
  const partnerAppToken = `ExponentPushToken[partner${runId}]`;
  const staffToken = `ExponentPushToken[staff${runId}]`;
  const idfv = `IDFV-${runId}`;
  let sql: import("postgres").Sql;
  let orgId = "";
  let ownerId = "";
  let ownerCustomerSession = "";
  let ownerPartnerSession = "";
  let staffPartnerSession = "";
  let strangerSession = "";

  const call = (token: string, method: string, body: Record<string, unknown>) =>
    new Request("http://localhost/api/partner-push/mobile", { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  const tokensFor = (orderId: string) => sent.filter((m) => m.data.orderId === orderId).map((m) => m.to).sort();
  const devices = () => sql`select expo_push_token, user_id, device_id from partner_mobile_push_devices where organization_id = ${orgId} order by expo_push_token`;

  before(async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith("https://exp.host/")) {
        const messages = JSON.parse(String(init?.body)) as ExpoMessage[];
        sent.push(...messages);
        return new Response(JSON.stringify({ data: messages.map(() => ({ status: "ok" })) }), { status: 200 });
      }
      return realFetch(input, init);
    }) as typeof fetch;
    const postgres = (await import("postgres")).default;
    sql = postgres(testUrl, { max: 1, onnotice: () => undefined });
    const { sessionService } = await import("@/lib/services/session-service");
    await sql`insert into languages (code, name, native_name) values ('zh-CN','Chinese','中文'), ('vi-VN','Vietnamese','Tiếng Việt') on conflict do nothing`;
    const phone = (prefix: string) => prefix + runId.replace(/\D/g, "").padEnd(7, "3").slice(0, 7);
    const [owner] = await sql`insert into users (nickname, phone) values ('Chủ gian hàng', ${phone("+8492")}) returning id`;
    const [staff] = await sql`insert into users (nickname, phone) values ('Nhân viên', ${phone("+8493")}) returning id`;
    const [stranger] = await sql`insert into users (nickname, phone) values ('Người lạ', ${phone("+8494")}) returning id`;
    const [org] = await sql`insert into organizations (code, type, name, status) values (${"ZX-PUSH-" + runId}, 'restaurant', 'Gian hàng push', 'active') returning id`;
    orgId = org.id;
    ownerId = owner.id;
    await sql`insert into organization_members (organization_id, user_id, role, is_active) values (${orgId}, ${owner.id}, 'owner', true), (${orgId}, ${staff.id}, 'staff', true)`;
    ownerCustomerSession = (await sessionService.issue({ userId: owner.id, role: "customer" })).accessToken;
    ownerPartnerSession = (await sessionService.issue({ userId: owner.id, role: "partner", organizationId: orgId })).accessToken;
    staffPartnerSession = (await sessionService.issue({ userId: staff.id, role: "partner", organizationId: orgId })).accessToken;
    strangerSession = (await sessionService.issue({ userId: stranger.id, role: "customer" })).accessToken;
  });

  beforeEach(() => {
    sent.length = 0;
  });

  afterAll(async () => {
    globalThis.fetch = realFetch;
    await sql?.end();
  });

  it("the mini app registers the host token with the partner session (existing API) and the staff phone registers too", async () => {
    const { POST } = await import("@/app/api/partner-push/mobile/route");
    // Standalone Partner app on the owner's iPhone, earlier.
    assert.equal((await POST(call(ownerPartnerSession, "POST", { organizationId: orgId, expoPushToken: partnerAppToken, platform: "ios", deviceId: idfv }))).status, 200);
    await sql`update partner_mobile_push_devices set updated_at = now() - interval '1 hour' where expo_push_token = ${partnerAppToken}`;
    // Mini app inside ZhaoXi on the same iPhone: host token, same identifierForVendor.
    assert.equal((await POST(call(ownerPartnerSession, "POST", { organizationId: orgId, expoPushToken: hostToken, platform: "ios", deviceId: idfv }))).status, 200);
    // Registering again (mini app reopened) never duplicates the device.
    assert.equal((await POST(call(ownerPartnerSession, "POST", { organizationId: orgId, expoPushToken: hostToken, platform: "ios", deviceId: idfv }))).status, 200);
    assert.equal((await POST(call(staffPartnerSession, "POST", { organizationId: orgId, expoPushToken: staffToken, platform: "android", deviceId: `android-${runId}` }))).status, 200);
    // A customer session cannot register store alerts.
    assert.equal((await POST(call(ownerCustomerSession, "POST", { organizationId: orgId, expoPushToken: `ExponentPushToken[x${runId}]`, platform: "ios" }))).status, 401);
    assert.equal((await devices()).length, 3);
  });

  it("new order: one alert per device (the app opened last), tagged with the mini app id, old fields kept", async () => {
    const { partnerWebPushService } = await import("@/lib/services/partner-web-push-service");
    const orderId = crypto.randomUUID();
    await partnerWebPushService.sendNewOrder(orgId, { id: orderId, requestCode: "ZX-1", customerName: "Khách", moduleCode: "food" });
    assert.deepEqual(tokensFor(orderId), [hostToken, staffToken].sort());
    const toHost = sent.find((m) => m.to === hostToken)!;
    assert.equal(toHost.channelId, "new-orders");
    assert.equal(toHost.title, "🔔 Gian hàng push · Có đơn hàng mới");
    assert.deepEqual(toHost.data, { orderId, kind: "new_order", moduleCode: "food", screen: "orders", miniappId: "zhaoxi.partner", organizationId: orgId, organizationName: "Gian hàng push" });
  });

  it("chat message: same targets, `screen: messages` + mini app id", async () => {
    const { partnerOrderMessagePushService } = await import("@/lib/services/partner-order-message-push-service");
    const orderId = crypto.randomUUID();
    await partnerOrderMessagePushService.send(orgId, { requestId: orderId, title: "Tin nhắn", body: "Xin chào" });
    assert.deepEqual(tokensFor(orderId), [hostToken, staffToken].sort());
    const toHost = sent.find((m) => m.to === hostToken)!;
    assert.equal(toHost.title, "Gian hàng push · Tin nhắn");
    assert.deepEqual(toHost.data, { orderId, kind: "order_message", screen: "messages", miniappId: "zhaoxi.partner", organizationId: orgId, organizationName: "Gian hàng push" });
  });

  it("an owner of several stores gets every store's orders, whichever store the device registered under", async () => {
    // Second store owned by the same owner only: its alerts reach the owner's devices (registered under the
    // first store) and not the staff, who is not a member there.
    const [second] = await sql`insert into organizations (code, type, name, status) values (${"ZX-PUSH2-" + runId}, 'car-rental', 'ZhaoXi Car Đà Nẵng', 'active') returning id`;
    await sql`insert into organization_members (organization_id, user_id, role, is_active) values (${second.id}, ${ownerId}, 'owner', true)`;
    const { partnerWebPushService } = await import("@/lib/services/partner-web-push-service");
    const orderId = crypto.randomUUID();
    await partnerWebPushService.sendNewOrder(second.id, { id: orderId, requestCode: "ZX-CAR-1", customerName: "Khách", moduleCode: "car-rental" });
    assert.deepEqual(tokensFor(orderId), [hostToken], "one alert for the owner's iPhone, none for the staff");
    const message = sent.find((m) => m.data.orderId === orderId)!;
    assert.equal(message.title, "🔔 ZhaoXi Car Đà Nẵng · Có đơn dịch vụ mới");
    assert.equal(message.data.organizationId, second.id);
    assert.equal(message.data.organizationName, "ZhaoXi Car Đà Nẵng");
    // Registration never moves the device: still one row, under the store it was registered with.
    assert.equal((await sql`select count(*)::int as n from partner_mobile_push_devices where expo_push_token = ${hostToken}`)[0].n, 1);
  });

  it("owner reopens the standalone Partner app: that app gets the alert instead of ZhaoXi", async () => {
    const { POST } = await import("@/app/api/partner-push/mobile/route");
    await POST(call(ownerPartnerSession, "POST", { organizationId: orgId, expoPushToken: partnerAppToken, platform: "ios", deviceId: idfv }));
    const { partnerWebPushService } = await import("@/lib/services/partner-web-push-service");
    const orderId = crypto.randomUUID();
    await partnerWebPushService.sendPaymentReported(orgId, { id: orderId, requestCode: "ZX-2", customerName: "Khách", amount: "100000", currency: "VND" });
    assert.deepEqual(tokensFor(orderId), [partnerAppToken, staffToken].sort());
  });

  it("a member removed from the store stops receiving alerts even though the phone never unregistered", async () => {
    await sql`update organization_members set is_active = false where organization_id = ${orgId} and user_id <> ${ownerId}`;
    const { partnerWebPushService } = await import("@/lib/services/partner-web-push-service");
    const orderId = crypto.randomUUID();
    await partnerWebPushService.sendNewOrder(orgId, { id: orderId, requestCode: "ZX-3", customerName: "Khách" });
    assert.deepEqual(tokensFor(orderId), [partnerAppToken]);
  });

  it("host sign-out releases its own token with the customer session; partner sessions still only remove their own rows", async () => {
    const { DELETE } = await import("@/app/api/partner-push/mobile/route");
    // Staff's partner session cannot remove the owner's registration.
    assert.equal((await DELETE(call(staffPartnerSession, "DELETE", { expoPushToken: hostToken }))).status, 200);
    assert.ok((await devices()).some((d) => d.expo_push_token === hostToken));
    // Malformed token from a host session: rejected, nothing removed.
    assert.equal((await DELETE(call(ownerCustomerSession, "DELETE", { expoPushToken: "nope" }))).status, 422);
    // The host (customer session) releases the device token it handed to the mini app.
    assert.equal((await DELETE(call(ownerCustomerSession, "DELETE", { expoPushToken: hostToken }))).status, 200);
    assert.ok(!(await devices()).some((d) => d.expo_push_token === hostToken));
    // Anonymous calls are refused.
    const anonymous = new Request("http://localhost/api/partner-push/mobile", { method: "DELETE", body: JSON.stringify({ expoPushToken: partnerAppToken }) });
    assert.equal((await DELETE(anonymous)).status, 401);
    // Releasing a token that is no longer there is a no-op (retry after offline sign-out).
    assert.equal((await DELETE(call(strangerSession, "DELETE", { expoPushToken: hostToken }))).status, 200);
    assert.ok((await devices()).some((d) => d.expo_push_token === partnerAppToken), "the standalone app keeps its own registration");
  });
});
