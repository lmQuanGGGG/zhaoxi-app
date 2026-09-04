import "dotenv/config";
import postgres from "postgres";

const organizationId = "fb48f611-f0c0-470b-8129-18979d0d05cf";
const baseUrl = "https://zhaoxi-customer-ten.vercel.app/tasting-menu";
const jpg = new Set([19, 21, 30, 38]);
const image = (number) => `${baseUrl}/tasting-${String(number).padStart(3, "0")}.${jpg.has(number) ? "jpg" : "png"}`;
const item = (code, name, price, asset, category, summary = category) => ({ code, name, price, asset, category, summary });

const burgers = [
  item("A1", "Burger đùi gà tiêu xanh", 68000, 29, "Burger"), item("A2", "Burger thanh cua gà rán", 73000, 39, "Burger"),
  item("A3", "Burger vịt quay thì là", 73000, 36, "Burger"), item("A4", "Burger gà dứa", 73000, 37, "Burger"),
  item("A5", "Burger gà cay", 68000, 33, "Burger"), item("A6", "Burger đôi gà & tôm", 68000, 28, "Burger"),
  item("A7", "Burger bò thanh đào", 73000, 34, "Burger"), item("A8", "Burger bò trứng", 73000, 32, "Burger"),
  item("A9", "Burger bacon trứng", 68000, 35, "Burger"), item("A10", "Burger gà Orleans", 68000, 31, "Burger"),
  item("A11", "Cuốn gà Mexico", 68000, 30, "Burger"), item("A12", "Cuốn gà Bắc Kinh cổ truyền", 68000, 38, "Burger"),
];
const snacks = [
  item("B1", "Đùi cánh gà cay nhẹ", 39000, 21, "Đồ ăn vặt"), item("B2", "Đùi gà đôi nhổ cay nhẹ", 45000, 19, "Đồ ăn vặt"),
  item("B3", "Cánh gà đôi nhỏ cay nhẹ", 45000, 17, "Đồ ăn vặt"), item("B4", "Gà miếng Nugget", 45000, 13, "Đồ ăn vặt"),
  item("B5", "Gà viên muối tiêu", 39000, 18, "Đồ ăn vặt"), item("B6", "Cánh gà nướng Orleans", 45000, 22, "Đồ ăn vặt"),
  item("B7", "Combo đùi nhỏ & 8 miếng mini drumstick", 160000, 12, "Đồ ăn vặt"), item("B9", "Khoanh mực chiên giòn", 45000, 8, "Đồ ăn vặt"),
  item("B10", "Mực chiên giòn", 45000, 15, "Đồ ăn vặt"), item("B11", "Viên tôm chiên", 39000, 11, "Đồ ăn vặt"),
  item("B12", "Khoai tây chiên", 39000, 14, "Đồ ăn vặt"), item("B13", "Gà nhọn tê cay", 45000, 20, "Đồ ăn vặt"),
  item("B14", "Cánh gà nướng cháy", 45000, 9, "Đồ ăn vặt"), item("B15", "Cổ gà nướng tê", 25000, 16, "Đồ ăn vặt"),
];
const chicken = [
  item("C1", "Gà nguyên con chiên giòn", 220000, 27, "Gà đặc biệt"), item("C2", "Gà nửa con chiên giòn", 115000, 25, "Gà đặc biệt"),
  item("C3", "Gà nguyên con sốt bí truyền", 220000, 26, "Gà đặc biệt"), item("C4", "Đùi gà đốt nóng lửa", 50000, 23, "Gà đặc biệt"),
  item("C5", "Đùi gà góc tư chiên giòn", 50000, 24, "Gà đặc biệt"),
];
const combos = [
  item("COMBO-A1", "Combo A1", 103000, 45, "Combo", "1 burger · khoai tây chiên · Coca"), item("COMBO-A2", "Combo A2", 103000, 46, "Combo", "1 burger · cánh nhỏ · Coca"),
  item("COMBO-B1", "Combo B1", 210000, 50, "Combo", "2 burger · khoai tây · nugget · 2 Coca"), item("COMBO-B2", "Combo B2", 210000, 47, "Combo", "2 burger · khoai tây · gà chiên · 2 Coca"),
  item("COMBO-C1", "Combo C1", 311000, 48, "Combo", "3 burger · khoai tây · cánh nhỏ · 3 Coca"), item("COMBO-C2", "Combo C2", 311000, 49, "Combo", "3 burger · khoai tây · nugget · 3 Coca"),
  item("COMBO-D1", "Combo D1", 538000, 52, "Combo", "3 burger · khoai tây · gà nguyên con · 6 Coca"), item("COMBO-D2", "Combo D2", 538000, 51, "Combo", "3 burger · khoai tây · gà nguyên con · khoanh mực · 6 Coca"),
];
const drinks = [
  item("D1", "Coca Cola", 15000, 45, "Đồ uống"), item("D2", "Bia Tiger", 30000, 52, "Đồ uống"),
  item("E1", "Sữa nóng TASTING", 39000, 1, "Nâng cấp đồ uống"), item("E2", "Nâng cấp trà sữa size L", 45000, 2, "Nâng cấp đồ uống"),
];
const toppings = [
  item("F1", "Topping gà đùi", 25000, 40, "Topping"), item("F2", "Topping trứng", 15000, 41, "Topping"),
  item("F3", "Topping tôm", 25000, 44, "Topping"), item("F4", "Topping bò", 30000, 43, "Topping"), item("F5", "Topping ba rọi", 25000, 42, "Topping"),
];
const tea = [
  ...["Thanh Thanh Ngọa Sơn","Mộng Hè Dưa Lưới","Bá Nha Tuyết Huyền","Hồng Trà Kem Sữa","Lan Quế Hương","Tình Thời Xuân Sơn","Ô Long Hoa Điền","Sơn Dã Chi Tử","Vạn Tượng Xuân Hòa","Vạn Lý Mộc Lan","Sơn Trà Tầm Hương","Nhất Kỳ Hồng Trần"].map((name, index) => item(`G${index + 1}`, name, 55000, index === 0 ? 4 : 5, "Trà sữa nguyên lá", "Size M 55K · Size L 65K")),
  ...["Tỉnh Xuân Sơn","Chước Hồng Bào","Mộc Lan Tử","Dã Chi Tử","Chiết Quế Lệnh","Hoa Điền Ô","Mộng Mai Lung","Vạn Tượng Xuân Hòa","Sơn Trà Quán","Vân Trung Lục"].map((name, index) => item(`H${index + 1}`, name, 50000, 6, "Trà thuần", "Size L 50K")),
  ...["Túy Hồng Trần","Thiên Phong Thúy","Thất Lý Hương","Hồ Phách Quang","Chi Hương Chanh"].map((name, index) => item(`I${index + 1}`, name, 55000, 3, "Trà trái cây", "Size L 55K")),
  ...["Quế Tử Phiêu Hương","Đào Đào Mùa Xuân","Quan Sơn Mộc Lan"].map((name, index) => item(`J${index + 1}`, name, 65000, 7, "Tuyết đỉnh thanh vân", "Size L 65K")),
];
const menu = [...combos, ...burgers, ...snacks, ...chicken, ...drinks, ...toppings, ...tea];

const sql = postgres(process.env.POSTGRES_URL || process.env.DATABASE_URL, { prepare: false });
try {
  const result = await sql.begin(async (tx) => {
    const [organization] = await tx`select id, name from organizations where id = ${organizationId} limit 1`;
    if (!organization || organization.name !== "TASTING HAMBURGER & MILK TEA") throw new Error("TASTING organization was not found");
    const [foodModule] = await tx`select id from modules where code = 'food' and is_enabled = true limit 1`;
    if (!foodModule) throw new Error("Food module was not found");
    const [before] = await tx`select count(*)::int as count from services where organization_id = ${organizationId} and module_id = ${foodModule.id}`;
    // Preserve completed/order-history rows. Their former menu item is being
    // replaced, so retain the order record but detach its obsolete service ID.
    await tx`update service_requests set service_id = null where service_id in (select id from services where organization_id = ${organizationId} and module_id = ${foodModule.id})`;
    await tx`delete from services where organization_id = ${organizationId} and module_id = ${foodModule.id}`;
    const payload = menu.map((entry) => ({ ...entry, image_url: image(entry.asset), pathname: `tasting-menu/tasting-${String(entry.asset).padStart(3, "0")}` }));
    await tx`
      with menu as (
        select * from jsonb_to_recordset(${tx.json(payload)})
        as x(code text, name text, price numeric, asset integer, category text, summary text, image_url text, pathname text)
      ), inserted as (
        insert into services (module_id, organization_id, code, price_from, currency, is_enabled, metadata)
        select ${foodModule.id}, ${organizationId}, 'TASTING-' || code, price, 'VND', true,
          jsonb_build_object('imageUrl', image_url, 'dishCategory', category, 'isAvailable', true, 'syncStatus', 'published', 'source', 'tasting-menu-2026-09', 'publishedAt', now())
        from menu returning id, code
      ), translated as (
        insert into service_translations (service_id, locale, name, summary, description)
        select inserted.id, locales.locale, menu.name, menu.summary, menu.summary
        from inserted join menu on inserted.code = 'TASTING-' || menu.code
        cross join (values ('vi-VN'), ('zh-CN'), ('zh-TW'), ('en-US')) as locales(locale)
      )
      insert into media_assets (organization_id, service_id, kind, blob_url, pathname, mime_type, sort_order, is_published, metadata)
      select ${organizationId}, inserted.id, 'product', menu.image_url, menu.pathname, 'image/*', 0, true, jsonb_build_object('source', 'tasting-menu-2026-09')
      from inserted join menu on inserted.code = 'TASTING-' || menu.code
    `;
    await tx`update organizations set metadata = coalesce(metadata, '{}'::jsonb) || ${tx.json({ catalogSyncedAt: new Date().toISOString(), menuSource: "tasting-menu-2026-09" })}, updated_at = now() where id = ${organizationId}`;
    return { removed: before.count, created: menu.length };
  });
  console.log(JSON.stringify({ organizationId, ...result }));
} finally {
  await sql.end();
}
