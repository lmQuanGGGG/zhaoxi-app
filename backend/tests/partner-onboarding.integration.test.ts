// Store sign-up for an account that already owns a store: it can send a second and a third
// application, Admin approval creates a new store owned by the same account, and the first store
// and its approved application are never rewritten. Also covers the older single-application clients.
// Runs only against a throwaway local Postgres: TEST_DATABASE_URL=postgres://...@localhost:PORT/db
import assert from "node:assert/strict";
import { after as afterAll, before, describe, it } from "node:test";

const testUrl = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(testUrl);
if (isLocal) {
  process.env.DATABASE_URL = testUrl;
  delete process.env.POSTGRES_URL;
}

type Json = Record<string, unknown>;
type Application = { id: string; role: string; status: string; businessName: string | null; reviewNote: string | null };
type Store = { id: string; name: string; code: string; type: string; applicationId: string | null };
type Status = { applications: Application[]; partnerOrganizations: Store[] };
type Envelope<T> = { ok: boolean; data: T; error?: { message?: string } };

describe("partner onboarding: one account, several stores", { skip: isLocal ? false : "set TEST_DATABASE_URL to a local Postgres" }, () => {
  const runId = crypto.randomUUID().slice(0, 8);
  let sql: import("postgres").Sql;
  let ownerToken = "";
  let otherToken = "";
  let adminToken = "";
  let ownerId = "";

  const call = (token: string, method: string, url: string, body?: Json) =>
    new Request(`http://localhost${url}`, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const routes = {
    submit: () => import("@/app/api/onboarding/submit/route"),
    status: () => import("@/app/api/onboarding/status/route"),
    review: () => import("@/app/api/onboarding/admin/[id]/route"),
  };
  const store = (name: string, extra: Json = {}) => ({ role: "partner", businessName: name, businessType: "food", displayName: "Chủ quán", phone: "0905123456", city: "Đà Nẵng", addressText: "15 Trưng Nữ Vương", ...extra });
  async function submit(token: string, body: Json) {
    const response = await (await routes.submit()).POST(call(token, "POST", "/api/onboarding/submit", body));
    return { status: response.status, body: (await response.json()) as Envelope<Application> };
  }
  async function status(token = ownerToken) {
    const response = await (await routes.status()).GET(call(token, "GET", "/api/onboarding/status"));
    return ((await response.json()) as Envelope<Status>).data;
  }
  async function review(id: string, decision: "approved" | "rejected", reviewNote?: string) {
    const response = await (await routes.review()).PATCH(call(adminToken, "PATCH", `/api/onboarding/admin/${id}`, { status: decision, reviewNote }), { params: Promise.resolve({ id }) });
    assert.equal(response.status, 200, await response.clone().text());
  }

  before(async () => {
    const postgres = (await import("postgres")).default;
    sql = postgres(testUrl, { max: 1, onnotice: () => undefined });
    const { sessionService } = await import("@/lib/services/session-service");
    await sql`insert into languages (code, name, native_name) values ('zh-CN','Chinese','中文'), ('vi-VN','Vietnamese','Tiếng Việt') on conflict do nothing`;
    const digits = runId.replace(/\D/g, "").padEnd(7, "4").slice(0, 7);
    const [owner] = await sql`insert into users (nickname, phone) values ('Chủ nhiều quán', ${"+8495" + digits}) returning id`;
    const [other] = await sql`insert into users (nickname, phone) values ('Người khác', ${"+8496" + digits}) returning id`;
    const [admin] = await sql`insert into users (nickname, phone) values ('Admin duyệt', ${"+8497" + digits}) returning id`;
    await sql`insert into user_roles (user_id, role, is_active) values (${admin.id}, 'admin', true)`;
    ownerId = owner.id;
    // The app opens /onboarding with a customer session of the owner, also when the account already runs a store.
    ownerToken = (await sessionService.issue({ userId: owner.id, role: "customer" })).accessToken;
    otherToken = (await sessionService.issue({ userId: other.id, role: "customer" })).accessToken;
    adminToken = (await sessionService.issue({ userId: admin.id, role: "admin" })).accessToken;
  });

  afterAll(async () => {
    await sql?.end({ timeout: 5 });
  });

  let first = "";
  let second = "";

  it("first store: apply, Admin approves, the store belongs to the account", async () => {
    const sent = await submit(ownerToken, store(`Quán Một ${runId}`));
    assert.equal(sent.status, 201);
    first = sent.body.data.id;
    await review(first, "approved");
    const now = await status();
    assert.equal(now.partnerOrganizations.length, 1);
    assert.equal(now.partnerOrganizations[0].name, `Quán Một ${runId}`);
    assert.equal(now.partnerOrganizations[0].applicationId, first);
  });

  it("an older client re-submitting without an id starts a new application instead of rewriting the approved one", async () => {
    const sent = await submit(ownerToken, store(`Quán Hai ${runId}`));
    assert.equal(sent.status, 201);
    second = sent.body.data.id;
    assert.notEqual(second, first);
    const apps = (await status()).applications;
    assert.equal(apps.find((a) => a.id === first)?.status, "approved");
    assert.equal(apps.find((a) => a.id === first)?.businessName, `Quán Một ${runId}`);
  });

  it("a rejected application is fixed in place by id, keeping one row", async () => {
    await review(second, "rejected", "Thiếu mã số thuế");
    assert.equal((await status()).applications.find((a) => a.id === second)?.reviewNote, "Thiếu mã số thuế");
    const fixed = await submit(ownerToken, store(`Quán Hai ${runId}`, { applicationId: second, notes: "Giấy phép KD / MST: 0401234567" }));
    assert.equal(fixed.status, 201);
    assert.equal(fixed.body.data.id, second);
    const apps = (await status()).applications.filter((a) => a.role === "partner");
    assert.equal(apps.length, 2);
    const row = apps.find((a) => a.id === second);
    assert.equal(row?.status, "submitted");
    assert.equal(row?.reviewNote, null);
  });

  it("approving the second application creates a second store and leaves the first untouched", async () => {
    await review(second, "approved");
    const { partnerOrganizations } = await status();
    assert.equal(partnerOrganizations.length, 2);
    const byApp = new Map(partnerOrganizations.map((o) => [o.applicationId, o]));
    assert.equal(byApp.get(first)?.name, `Quán Một ${runId}`);
    assert.equal(byApp.get(second)?.name, `Quán Hai ${runId}`);
    const owners = await sql`select count(*)::int as n from organization_members where user_id = ${ownerId} and role = 'owner' and is_active = true`;
    assert.equal(owners[0].n, 2);
    // Approving again does not duplicate the store.
    await review(second, "approved");
    assert.equal((await status()).partnerOrganizations.length, 2);
  });

  it("newApplication always starts another one; an approved application cannot be edited", async () => {
    const third = await submit(ownerToken, store(`Quán Ba ${runId}`, { newApplication: true }));
    assert.equal(third.status, 201);
    const fourth = await submit(ownerToken, store(`Quán Bốn ${runId}`, { newApplication: true }));
    assert.equal(fourth.status, 201);
    assert.notEqual(third.body.data.id, fourth.body.data.id);
    const locked = await submit(ownerToken, store("Đổi tên", { applicationId: first }));
    assert.equal(locked.status, 422);
    assert.match(String(locked.body.error?.message), /ONBOARDING_ALREADY_APPROVED/);
  });

  it("caps applications waiting for review", async () => {
    await submit(ownerToken, store(`Quán Năm ${runId}`, { newApplication: true }));
    const over = await submit(ownerToken, store(`Quán Sáu ${runId}`, { newApplication: true }));
    assert.equal(over.status, 422);
    assert.match(String(over.body.error?.message), /ONBOARDING_TOO_MANY_OPEN_APPLICATIONS/);
  });

  it("another account cannot touch these applications", async () => {
    const stolen = await submit(otherToken, store("Chiếm quyền", { applicationId: second }));
    assert.equal(stolen.status, 422);
    assert.match(String(stolen.body.error?.message), /ONBOARDING_NOT_FOUND/);
    assert.equal((await status(otherToken)).applications.length, 0);
  });

  it("customer onboarding stays one row per account", async () => {
    await submit(otherToken, { role: "customer", displayName: "A" });
    await submit(otherToken, { role: "customer", displayName: "B" });
    const apps = (await status(otherToken)).applications.filter((a) => a.role === "customer");
    assert.equal(apps.length, 1);
  });

  it("a partner application needs a store name", async () => {
    const empty = await submit(otherToken, { role: "partner", businessName: "  " });
    assert.equal(empty.status, 422);
    assert.match(String(empty.body.error?.message), /PARTNER_BUSINESS_NAME_REQUIRED/);
  });
});
