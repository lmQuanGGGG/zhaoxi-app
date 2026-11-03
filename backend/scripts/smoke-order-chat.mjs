// Order chat API smoke test. Runs against a LOCAL backend with fake data only:
//   1. createdb on a local Postgres, `drizzle-kit push` the schema into it,
//      then `psql -f scripts/smoke-order-chat.seed.sql`.
//   2. DATABASE_URL=<local> npx next dev -p 4011
//   3. node scripts/smoke-order-chat.mjs   (BASE=http://localhost:4011)
// Never point this at production: it creates users, orders and messages.
const BASE = process.env.BASE || "http://localhost:4011";
const R1 = "00000000-0000-0000-0000-000000000c01", R2 = "00000000-0000-0000-0000-000000000c02", R3 = "00000000-0000-0000-0000-000000000c03", R4 = "00000000-0000-0000-0000-000000000c04";
const ORG_A = "00000000-0000-0000-0000-00000000aaaa", ORG_B = "00000000-0000-0000-0000-00000000bbbb";
let failures = 0;
async function call(token, method, path, body) {
  const r = await fetch(BASE + path, { method, headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  return { status: r.status, body: j };
}
function check(name, cond, extra) { if (cond) console.log("✓", name); else { failures++; console.log("✗", name, JSON.stringify(extra)?.slice(0, 400)); } }
const cm = (id) => `/api/customer-messages/${encodeURIComponent("order:" + id)}`;

// Customer A: empty thread for own order
let r = await call("tok-ca", "GET", cm(R1));
check("customer reads own empty thread", r.status === 200 && r.body.data.messages.length === 0 && r.body.data.thread.title === "Quán Test A" && r.body.data.thread.canSend === true, r);
// Customer B cannot read A's order; partner token on customer route rejected
r = await call("tok-cb", "GET", cm(R1));
check("other customer gets 404", r.status === 404, r);
r = await call("tok-pa", "GET", cm(R1));
check("partner token rejected on customer route", r.status === 401, r);
// Send
r = await call("tok-ca", "POST", cm(R1), { message: "  Cho em thêm đũa nhé  ", clientMessageId: "cli-000000001" });
check("customer sends", r.status === 201 && r.body.data.body === "Cho em thêm đũa nhé" && r.body.data.senderRole === "customer", r);
const firstId = r.body?.data?.id;
r = await call("tok-ca", "POST", cm(R1), { message: "Cho em thêm đũa nhé", clientMessageId: "cli-000000001" });
check("retry with same clientMessageId is idempotent", r.status === 201 && r.body.data.id === firstId, r);
r = await call("tok-ca", "POST", cm(R1), { message: "   " });
check("empty message rejected", r.status === 422, r);
r = await call("tok-cb", "POST", cm(R1), { message: "hack" });
check("other customer cannot send", r.status === 422 || r.status === 404, r);
r = await call("tok-ca", "POST", cm(R4), { message: "no store" });
check("order without store cannot chat", r.status === 422 && r.body.error.code === "ORDER_CHAT_UNAVAILABLE", r);

// Partner A sees it unread
r = await call("tok-pa", "GET", `/api/partner-order-chats?summary=1`);
check("partner unread count = 1", r.status === 200 && r.body.data.unread === 1, r);
r = await call("tok-pa", "GET", `/api/partner-order-chats?organizationId=${ORG_A}`);
check("partner list shows thread", r.status === 200 && r.body.data.threads.length === 1 && r.body.data.threads[0].unreadCount === 1 && r.body.data.threads[0].title === "Khách A", r);
// Partner B: not a member of A, and order R1 not theirs
r = await call("tok-pb", "GET", `/api/partner-order-chats?organizationId=${ORG_A}`);
check("non-member partner forbidden", r.status === 403, r);
r = await call("tok-pb", "GET", `/api/partner-order-chats/${R1}`);
check("other store cannot read order chat", r.status === 404, r);
r = await call("tok-pb", "POST", `/api/partner-order-chats/${R1}`, { message: "x", organizationId: ORG_A });
check("other store cannot send via foreign org", r.status === 403, r);
r = await call("tok-ca", "GET", `/api/partner-order-chats/${R1}`);
check("customer token rejected on partner route", r.status === 403, r);
// Partner reads + replies
r = await call("tok-pa", "GET", `/api/partner-order-chats/${R1}`);
check("partner reads thread", r.status === 200 && r.body.data.messages.length === 1, r);
r = await call("tok-pa", "PATCH", `/api/partner-order-chats/${R1}`, {});
check("partner marks read", r.status === 200 && r.body.data.read === true, r);
r = await call("tok-pa", "GET", `/api/partner-order-chats?summary=1`);
check("partner unread back to 0", r.body?.data?.unread === 0, r);
r = await call("tok-pa", "POST", `/api/partner-order-chats/${R1}`, { message: "Dạ quán gửi thêm ạ" });
check("partner replies", r.status === 201 && r.body.data.senderRole === "partner", r);
// Customer inbox
r = await call("tok-ca", "GET", `/api/customer-messages?locale=vi-VN`);
const t = r.body?.data?.threads?.find((x) => x.id === "order:" + R1);
check("customer inbox has order thread with 1 unread", r.status === 200 && t && t.kind === "order" && t.unreadCount === 1 && t.lastMessage === "Dạ quán gửi thêm ạ", r);
r = await call("tok-ca", "GET", `/api/customer-unread-summary?locale=vi-VN`);
check("customer unread summary counts it", r.status === 200 && r.body.data.messages >= 1, r);
r = await call("tok-ca", "GET", cm(R1));
check("customer sees partner read cursor", r.body.data.messages.length === 2 && r.body.data.thread.counterpartReadAt, r);
r = await call("tok-ca", "PATCH", cm(R1), {});
check("customer marks read", r.status === 200, r);
r = await call("tok-ca", "GET", `/api/customer-messages?locale=vi-VN`);
check("customer unread now 0", r.body.data.threads.find((x) => x.id === "order:" + R1).unreadCount === 0, r);
// Non-food module (housing) works too, and Customer B's order is isolated
r = await call("tok-ca", "POST", cm(R2), { message: "Căn hộ còn trống không ạ?" });
check("housing order chat works", r.status === 201, r);
r = await call("tok-pb", "GET", `/api/partner-order-chats`);
check("housing store sees its thread only", r.status === 200 && r.body.data.threads.length === 1 && r.body.data.threads[0].requestId === R2, r);
r = await call("tok-pa", "GET", `/api/partner-order-chats`);
check("restaurant store does not see housing thread", r.body.data.threads.every((x) => x.requestId !== R2), r);
r = await call("tok-pa", "GET", `/api/partner-order-chats/not-a-uuid`);
check("bad id is 404", r.status === 404, r);
console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
process.exit(failures ? 1 : 0);
