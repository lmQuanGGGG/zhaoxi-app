// Dữ liệu thử cho mini app ZhaoXi Partner trong host (customer-mobile), CHỈ cho backend + Postgres cục bộ.
//
//   DATABASE_URL=postgres://<user>@localhost:<port>/<db> API_URL=http://127.0.0.1:3099 node scripts/seed-partner-miniapp-dev.mjs
//
// Tạo (hoặc dùng lại) tài khoản khách đăng nhập bằng tên + mật khẩu ở host, gắn làm chủ gian hàng
// ZX-FOOD-001 (seed.mjs) và thêm vài đơn đồ ăn đang chờ/đang làm/sẵn sàng để danh sách đơn có dữ liệu.
// Từ chối chạy khi DATABASE_URL hoặc API_URL không trỏ về máy này.
import postgres from "postgres";

const DEMO_USERNAME = process.env.DEMO_USERNAME || "partner.demo";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "partner-demo-2026";
// Tài khoản đối chứng: khách thường, không thấy mục "Quản lý gian hàng".
const PLAIN_USERNAME = "khach.thuong";
const PLAIN_PASSWORD = "khach-thuong-2026";
const ORG_CODE = "ZX-FOOD-001";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function assertLocal(name, value) {
  if (!value) throw new Error(`Thiếu ${name}`);
  const host = new URL(value).hostname;
  if (!LOCAL_HOSTS.has(host)) throw new Error(`${name} phải trỏ về localhost (đang là ${host}). Script này không chạy trên môi trường thật.`);
}

const databaseUrl = process.env.DATABASE_URL;
const apiUrl = (process.env.API_URL || "http://127.0.0.1:3099").replace(/\/+$/, "");
assertLocal("DATABASE_URL", databaseUrl);
assertLocal("API_URL", apiUrl);

// Đăng ký qua API để mật khẩu được băm đúng cách của backend; tài khoản đã có thì đăng nhập.
async function ensureAccount(username, password) {
  for (const mode of ["register", "login"]) {
    const response = await fetch(`${apiUrl}/api/auth/identity/account/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "customer", mode, username, password, locale: "vi-VN", deviceId: "seed-partner-miniapp", deviceName: "seed" }),
    });
    const body = await response.json().catch(() => null);
    if (response.ok && body?.ok) return body.data.session.userId;
    if (body?.error?.code !== "USERNAME_EXISTS") throw new Error(`Không tạo được tài khoản: ${JSON.stringify(body?.error || response.status)}`);
  }
  throw new Error("Không đăng nhập được tài khoản thử");
}

const ORDERS = [
  { code: "ZX-DEMO-1001", status: "new", stage: "assigned", item: "food-hotpot", quantity: 1, customer: "Lý Minh", provider: "grab", minutesAgo: 2 },
  { code: "ZX-DEMO-1002", status: "new", stage: "assigned", item: "food-dumpling", quantity: 3, customer: "Trần Thu Hà", provider: "green_sm", minutesAgo: 6 },
  { code: "ZX-DEMO-1003", status: "in_progress", stage: "preparing", item: "food-seafood", quantity: 1, customer: "王先生", provider: "green_sm", minutesAgo: 14 },
  { code: "ZX-DEMO-1004", status: "in_progress", stage: "ready_for_pickup", item: "food-hotpot", quantity: 2, customer: "Nguyễn Văn Nam", provider: "grab", minutesAgo: 27 },
];

const sql = postgres(databaseUrl, { max: 1, prepare: false });
try {
  const userId = await ensureAccount(DEMO_USERNAME, DEMO_PASSWORD);
  await ensureAccount(PLAIN_USERNAME, PLAIN_PASSWORD);
  const [org] = await sql`SELECT id, name FROM organizations WHERE code = ${ORG_CODE}`;
  if (!org) throw new Error(`Chưa có gian hàng ${ORG_CODE}: chạy scripts/seed.mjs trước`);
  await sql`UPDATE users SET nickname = 'Chủ quán Demo' WHERE id = ${userId} AND (nickname IS NULL OR nickname = '' OR nickname ILIKE '%guest%' OR nickname = 'Người dùng ZhaoXi')`;
  await sql`INSERT INTO organization_members (organization_id, user_id, role, is_active) VALUES (${org.id}, ${userId}, 'owner', true)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner', is_active = true`;

  const [food] = await sql`SELECT id FROM modules WHERE code = 'food'`;
  const [city] = await sql`SELECT id FROM cities WHERE code = 'da-nang'`;
  for (const order of ORDERS) {
    const [service] = await sql`SELECT s.id, s.price_from, t.name AS title FROM services s
      LEFT JOIN service_translations t ON t.service_id = s.id AND t.locale = 'vi-VN'
      WHERE s.code = ${order.item} LIMIT 1`;
    const unit = Number(service?.price_from || 100000);
    const subtotal = unit * order.quantity;
    const createdAt = new Date(Date.now() - order.minutesAgo * 60_000);
    const details = {
      quantity: order.quantity,
      items: [{ serviceId: service?.id, quantity: order.quantity, unitPrice: unit, subtotal, name: service?.title || order.item }],
      itemSubtotal: subtotal,
      deliveryGrossFee: 32000,
      deliverySubsidy: 10000,
      deliveryCustomerFee: 22000,
      totalAmount: subtotal + 22000,
      deliveryDistanceKm: 3.4,
      deliveryProvider: order.provider,
      deliveryProviderLabel: order.provider === "grab" ? "Grab" : "Xanh SM",
      deliveryFulfillmentMode: "external_manual",
      fulfillmentStage: order.stage,
      kitchenPriority: "normal",
      paymentMethod: "cash_on_delivery",
      paymentStatus: "pending",
      estimatedMinutes: order.stage === "assigned" ? 0 : 15,
      recipientPhone: "0905000111",
    };
    await sql`INSERT INTO service_requests (request_code, module_id, service_id, customer_id, assigned_organization_id, locale, customer_name, customer_phone, title, status, city_id, address_text, latitude, longitude, details, created_at, updated_at)
      VALUES (${order.code}, ${food.id}, ${service?.id ?? null}, ${userId}, ${org.id}, 'vi-VN', ${order.customer}, '0905000111', ${service?.title || order.item}, ${order.status}, ${city?.id ?? null},
        '45 Bạch Đằng, Hải Châu, Đà Nẵng', 16.0712, 108.2245, ${sql.json(details)}, ${createdAt}, ${createdAt})
      ON CONFLICT (request_code) DO UPDATE SET status = EXCLUDED.status, details = EXCLUDED.details, created_at = EXCLUDED.created_at, updated_at = EXCLUDED.updated_at`;
  }
  console.log(`Đã gắn ${DEMO_USERNAME} làm chủ ${org.name} (${ORG_CODE}), tạo ${ORDERS.length} đơn thử và tài khoản đối chứng ${PLAIN_USERNAME}.`);
} finally {
  await sql.end();
}
