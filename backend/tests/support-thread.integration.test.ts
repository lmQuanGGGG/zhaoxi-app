// End-to-end check of the ZhaoXi support conversation: the customer opens it from the app,
// the admin Support Desk sees and answers it, the reply is pushed and lands in the customer's Messages.
// Runs only against a throwaway local Postgres: TEST_DATABASE_URL=postgres://...@localhost:PORT/db
import assert from "node:assert/strict";
import { after as afterAll, before, describe, it } from "node:test";

const testUrl = process.env.TEST_DATABASE_URL || "";
const isLocal = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(testUrl);
if (isLocal) {
  process.env.DATABASE_URL = testUrl;
  delete process.env.POSTGRES_URL;
}

type ExpoMessage = { to: string; title: string; body: string; data: { url: string; threadId: string } };
type Json = Record<string, unknown>;
type Envelope<T> = { data: T };
type ThreadSummary = { id: string; kind: string; title: string; unreadCount: number; lastMessage: string };

describe("ZhaoXi support conversation", { skip: isLocal ? false : "set TEST_DATABASE_URL to a local Postgres" }, () => {
  const pushes: ExpoMessage[] = [];
  const realFetch = globalThis.fetch;
  const runId = crypto.randomUUID().slice(0, 8);
  let sql: import("postgres").Sql;
  let customerToken = "";
  let otherToken = "";
  let adminToken = "";
  let threadId = "";

  const call = (token: string, method: string, url: string, body?: Json) =>
    new Request(`http://localhost${url}`, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const read = async <T>(response: Response) => ((await response.json()) as Envelope<T>).data;
  const routes = {
    messages: () => import("@/app/api/customer-messages/route"),
    thread: () => import("@/app/api/customer-messages/[threadId]/route"),
    desk: () => import("@/app/api/admin-support-desk/route"),
    deskThread: () => import("@/app/api/admin-support-desk/[threadId]/route"),
  };
  const params = <T extends Json>(value: T) => ({ params: Promise.resolve(value) });

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
    const digits = runId.replace(/\D/g, "");
    const [customer] = await sql`insert into users (nickname, phone) values ('Khách hỗ trợ', ${"+8492" + digits.padEnd(7, "1").slice(0, 7)}) returning id`;
    const [other] = await sql`insert into users (nickname, phone) values ('Khách khác', ${"+8493" + digits.padEnd(7, "2").slice(0, 7)}) returning id`;
    const [admin] = await sql`insert into users (nickname, phone) values ('Admin trực', ${"+8494" + digits.padEnd(7, "3").slice(0, 7)}) returning id`;
    await sql`insert into user_roles (user_id, role, is_active) values (${admin.id}, 'admin', true)`;
    await sql`insert into customer_mobile_push_devices (user_id, expo_push_token, platform, locale) values (${customer.id}, ${`ExponentPushToken[support-${runId}]`}, 'ios', 'vi-VN')`;
    customerToken = (await sessionService.issue({ userId: customer.id, role: "customer" })).accessToken;
    otherToken = (await sessionService.issue({ userId: other.id, role: "customer" })).accessToken;
    adminToken = (await sessionService.issue({ userId: admin.id, role: "admin" })).accessToken;
  });

  afterAll(async () => {
    globalThis.fetch = realFetch;
    await sql?.end();
  });

  it("rejects an empty message and requires a customer session", async () => {
    const { POST } = await routes.messages();
    assert.equal((await POST(call(customerToken, "POST", "/api/customer-messages", { message: "   " }))).status, 422);
    assert.equal((await POST(call(adminToken, "POST", "/api/customer-messages", { message: "Xin chào" }))).status, 401);
  });

  it("opens a thread from the message alone, titled by its first line", async () => {
    const { POST } = await routes.messages();
    const response = await POST(call(customerToken, "POST", "/api/customer-messages", { message: "Không đặt được phòng\nỨng dụng báo lỗi khi thanh toán" }));
    assert.equal(response.status, 201);
    const created = await read<{ id: string; thread: { id: string; subject: string } }>(response);
    assert.equal(created.id, `support:${created.thread.id}`, "id is the full chat thread id");
    assert.equal(created.thread.subject, "Không đặt được phòng");
    threadId = created.id;
  });

  it("keeps a subject passed by the screen that sent the customer", async () => {
    const { POST } = await routes.messages();
    const created = await read<{ thread: { subject: string } }>(await POST(call(customerToken, "POST", "/api/customer-messages", { subject: "Mã đơn ZX-1", message: "Đơn giao trễ" })));
    assert.equal(created.thread.subject, "Mã đơn ZX-1");
  });

  it("the returned id opens the chat, and only for its owner", async () => {
    const { GET } = await routes.thread();
    const response = await GET(call(customerToken, "GET", `/api/customer-messages/${threadId}`), params({ threadId }));
    assert.equal(response.status, 200);
    const chat = await read<{ thread: { kind: string; title: string }; messages: Array<{ senderRole: string; body: string }> }>(response);
    assert.equal(chat.thread.kind, "support");
    assert.deepEqual(chat.messages.map((m) => m.senderRole), ["customer"]);
    assert.equal((await GET(call(otherToken, "GET", `/api/customer-messages/${threadId}`), params({ threadId }))).status, 404);
  });

  it("shows up unread in the admin Support Desk", async () => {
    const { GET } = await routes.desk();
    const queue = await read<{ threads: Array<{ id: string; unreadCount: number; customer: { name: string } }> }>(await GET(call(adminToken, "GET", "/api/admin-support-desk")));
    const row = queue.threads.find((t) => `support:${t.id}` === threadId);
    assert.ok(row, "thread is in the admin queue");
    assert.equal(row.unreadCount, 1);
    assert.equal(row.customer.name, "Khách hỗ trợ");
  });

  it("an admin reply is pushed and lands unread in the customer's Messages", async () => {
    const id = threadId.slice("support:".length);
    const { POST } = await routes.deskThread();
    assert.equal((await POST(call(adminToken, "POST", `/api/admin-support-desk/${id}`, { message: "ZhaoXi đã kiểm tra, bạn thử lại nhé" }), params({ threadId: id }))).status, 201);

    for (let i = 0; i < 50 && !pushes.length; i++) await new Promise((resolve) => setTimeout(resolve, 20));
    const push = pushes.find((p) => p.data.threadId === threadId);
    assert.ok(push, "customer device got a push");
    assert.equal(push.body, "ZhaoXi đã kiểm tra, bạn thử lại nhé");
    assert.equal(push.data.url, `/messages/${threadId}`);

    const { GET } = await routes.messages();
    const inbox = await read<{ threads: ThreadSummary[] }>(await GET(call(customerToken, "GET", "/api/customer-messages?locale=vi-VN")));
    const row = inbox.threads.find((t) => t.id === threadId);
    assert.ok(row);
    assert.equal(row.kind, "support");
    assert.equal(row.unreadCount, 1);
    assert.equal(row.lastMessage, "ZhaoXi đã kiểm tra, bạn thử lại nhé");
  });

  it("reading clears the badge and the customer can answer back", async () => {
    const { PATCH, POST } = await routes.thread();
    assert.equal((await PATCH(call(customerToken, "PATCH", `/api/customer-messages/${threadId}`, {}), params({ threadId }))).status, 200);
    assert.equal((await POST(call(customerToken, "POST", `/api/customer-messages/${threadId}`, { message: "Đã được rồi, cảm ơn" }), params({ threadId }))).status, 201);

    const { GET } = await routes.messages();
    const inbox = await read<{ threads: ThreadSummary[] }>(await GET(call(customerToken, "GET", "/api/customer-messages?locale=vi-VN")));
    const row = inbox.threads.find((t) => t.id === threadId);
    assert.equal(row?.unreadCount, 0);
    assert.equal(row?.lastMessage, "Đã được rồi, cảm ơn");
  });
});
