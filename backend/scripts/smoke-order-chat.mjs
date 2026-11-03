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

// ---- Photos -------------------------------------------------------------
const jpeg = (size = 2048) => { const b = new Uint8Array(size); b.set([0xff, 0xd8, 0xff, 0xe0]); b[size - 2] = 0xff; b[size - 1] = 0xd9; return b; };
const heic = () => { const b = new Uint8Array(64); b.set([0, 0, 0, 24]); b.set([...Buffer.from("ftypheic")], 4); return b; };
async function upload(token, path, bytes, extra = {}) {
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: "image/jpeg" }), "photo.jpg");
  for (const [k, v] of Object.entries(extra)) form.set(k, String(v));
  const r = await fetch(BASE + path, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
  return { status: r.status, body: await r.json().catch(() => null) };
}
const cmUp = (id) => `${cm(id)}/attachments`;
const pUp = (id) => `/api/partner-order-chats/${id}/attachments`;
async function fetchPhoto(token, url) {
  const r = await fetch(BASE + url, { headers: { authorization: `Bearer ${token}` } });
  return { status: r.status, type: r.headers.get("content-type"), cache: r.headers.get("cache-control"), bytes: new Uint8Array(await r.arrayBuffer()) };
}
r = await upload("tok-ca", cmUp(R1), jpeg(), { width: 1200, height: 900 });
check("customer uploads a photo", r.status === 201 && r.body.data.url === `/api/order-chat-attachments/${r.body.data.id}` && r.body.data.width === 1200 && r.body.data.mimeType === "image/jpeg", r);
const p1 = r.body?.data;
r = await upload("tok-ca", cmUp(R1), heic());
check("HEIC is rejected with a clear code", r.status === 415 && r.body.error.code === "IMAGE_HEIC_UNSUPPORTED", r);
r = await upload("tok-ca", cmUp(R1), new TextEncoder().encode("not an image at all"));
check("non-image is rejected", r.status === 415 && r.body.error.code === "IMAGE_TYPE_UNSUPPORTED", r);
r = await upload("tok-ca", cmUp(R1), jpeg(2 * 1024 * 1024 + 10));
check("photo over 2MB is rejected", r.status === 413, r);
r = await upload("tok-cb", cmUp(R1), jpeg());
check("other customer cannot upload into the chat", r.status === 404, r);
r = await upload("tok-ca", `/api/customer-messages/${encodeURIComponent("support:x")}/attachments`, jpeg());
check("photos only in order chats", r.status === 404, r);
let f = await fetchPhoto("tok-ca", p1.url);
check("uploader can preview an unsent photo", f.status === 200 && f.type === "image/jpeg" && f.bytes.length === 2048 && f.cache.startsWith("private"), f.status);
f = await fetchPhoto("tok-pa", p1.url);
check("store cannot see a photo before it is sent", f.status === 404, f.status);
const more = [];
for (let i = 0; i < 5; i++) more.push((await upload("tok-ca", cmUp(R1), jpeg(1024 + i))).body.data.id);
r = await call("tok-ca", "POST", cm(R1), { message: "", attachmentIds: [p1.id, ...more] });
check("more than 5 photos is a 400", r.status === 400 && r.body.error.code === "ATTACHMENT_LIMIT", r);
r = await call("tok-ca", "POST", cm(R1), { message: "", attachmentIds: [] });
check("no text and no photo is rejected", r.status === 422, r);
r = await call("tok-ca", "POST", cm(R1), { message: "", attachmentIds: [p1.id, more[0]], clientMessageId: "cli-photo-0001" });
check("photo-only message with 2 photos", r.status === 201 && r.body.data.body === "" && r.body.data.attachments.length === 2, r);
const photoMsg = r.body?.data;
r = await call("tok-ca", "POST", cm(R1), { message: "", attachmentIds: [p1.id, more[0]], clientMessageId: "cli-photo-0001" });
check("retried photo send returns the same message", r.status === 201 && r.body.data.id === photoMsg.id && r.body.data.attachments.length === 2, r);
r = await call("tok-ca", "POST", cm(R1), { message: "again", attachmentIds: [p1.id] });
check("an already sent photo cannot be reused", r.status === 422 && r.body.error.code === "ATTACHMENT_INVALID", r);
r = await call("tok-cb", "POST", cm(R3), { message: "steal", attachmentIds: [more[1]] });
check("someone else's upload cannot be attached", r.status === 422 && r.body.error.code === "ATTACHMENT_INVALID", r);
r = await call("tok-ca", "GET", `/api/customer-messages?locale=vi-VN`);
check("inbox preview says [Ảnh]", r.body.data.threads.find((x) => x.id === "order:" + R1).lastMessage === "[Ảnh]", r);
r = await call("tok-pa", "GET", `/api/partner-order-chats/${R1}`);
const seen = r.body?.data?.messages?.find((m) => m.id === photoMsg.id);
check("store thread lists the photos", r.status === 200 && seen?.attachments.length === 2, r);
f = await fetchPhoto("tok-pa", photoMsg.attachments[0].url);
check("store can open a sent photo", f.status === 200 && f.bytes.length === 2048, f.status);
f = await fetchPhoto("tok-pb", photoMsg.attachments[0].url);
check("other store cannot open the photo", f.status === 404, f.status);
f = await fetchPhoto("tok-cb", photoMsg.attachments[0].url);
check("other customer cannot open the photo", f.status === 404, f.status);
f = await fetchPhoto("tok-ca", "/api/order-chat-attachments/00000000-0000-0000-0000-00000000dead");
check("unknown photo is 404", f.status === 404, f.status);
r = await upload("tok-pa", pUp(R1), jpeg(4096), { organizationId: ORG_A });
check("store uploads a photo", r.status === 201, r);
r = await call("tok-pa", "POST", `/api/partner-order-chats/${R1}`, { message: "Ảnh món đã đóng gói", attachmentIds: [r.body.data.id] });
check("store sends text + photo", r.status === 201 && r.body.data.attachments.length === 1 && r.body.data.body === "Ảnh món đã đóng gói", r);
f = await fetchPhoto("tok-ca", r.body.data.attachments[0].url);
check("customer opens the store's photo", f.status === 200 && f.bytes.length === 4096, f.status);
r = await upload("tok-pb", pUp(R1), jpeg(), { organizationId: ORG_B });
check("other store cannot upload into the chat", r.status === 404, r);

console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
process.exit(failures ? 1 : 0);
