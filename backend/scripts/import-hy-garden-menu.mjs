import postgres from "postgres";

const databaseUrl = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("POSTGRES_URL or DATABASE_URL is required.");

const sql = postgres(databaseUrl, { prepare: false, max: 1 });

const menu = [
  ["A1", "Cà phê đen nóng/đá", 25000, "Cà phê truyền thống & Ý"],
  ["A2", "Cà phê sữa nóng/đá", 28000, "Cà phê truyền thống & Ý"],
  ["A3", "Bạc xỉu nóng/đá", 35000, "Cà phê truyền thống & Ý"],
  ["A4", "Cà phê muối", 40000, "Cà phê truyền thống & Ý"],
  ["A5", "Cà phê trứng", 40000, "Cà phê truyền thống & Ý"],
  ["A6", "Cà phê dừa", 45000, "Cà phê truyền thống & Ý"],
  ["A7", "Cà phê đá xay", 45000, "Cà phê truyền thống & Ý"],
  ["A8", "Espresso nóng/đá", 30000, "Cà phê truyền thống & Ý"],
  ["A9", "Latte nóng/đá", 45000, "Cà phê truyền thống & Ý"],
  ["A10", "Cappuccino nóng/đá", 45000, "Cà phê truyền thống & Ý"],
  ["A11", "Americano", 40000, "Cà phê truyền thống & Ý"],
  ["A12", "Americano dừa", 55000, "Cà phê truyền thống & Ý"],
  ["A13", "Cà phê V60", 65000, "Cà phê truyền thống & Ý"],
  ["A14", "Magenta Espresso", 45000, "Cà phê truyền thống & Ý"],
  ["A15", "Cold Brew vải", 45000, "Cà phê truyền thống & Ý"],
  ["A16", "Cold Brew ổi hồng", 45000, "Cà phê truyền thống & Ý"],
  ["A17", "Cold Brew cam vàng", 45000, "Cà phê truyền thống & Ý"],
  ["B1", "Nước ép dưa hấu", 40000, "Nước ép trái cây"],
  ["B2", "Nước cam ép", 40000, "Nước ép trái cây"],
  ["B3", "Nước ép thơm", 40000, "Nước ép trái cây"],
  ["C1", "Sinh tố xoài", 45000, "Sinh tố & đá xay"],
  ["C2", "Sữa chua xoài", 45000, "Sinh tố & đá xay"],
  ["C3", "Sữa chua đào", 45000, "Sinh tố & đá xay"],
  ["C4", "Sinh tố bơ", 45000, "Sinh tố & đá xay"],
  ["C5", "Bơ già dừa non", 45000, "Sinh tố & đá xay"],
  ["C6", "Sô-cô-la đá xay", 45000, "Sinh tố & đá xay"],
  ["C7", "Matcha đá xay", 45000, "Sinh tố & đá xay"],
  ["C8", "Matcha latte", 45000, "Sinh tố & đá xay"],
  ["D1", "Trà đào cam sả", 45000, "Trà"],
  ["D2", "Trà vải", 45000, "Trà"],
  ["D3", "Trà xoài chanh dây", 45000, "Trà"],
  ["D5", "Trà gừng thảo mộc nóng", 45000, "Trà"],
  ["F1", "Cacao nóng/đá", 45000, "Thức uống khác"],
  ["F2", "Matcha nóng/đá", 45000, "Thức uống khác"],
];

// Keep storefront copy in the same database table the Customer API queries.
// A service is fetched again for the active locale, not translated in-browser.
const localizedNames = Object.fromEntries([
  ["A1", ["Hot/Iced Black Coffee", "黑咖啡（热/冰）"]], ["A2", ["Hot/Iced Vietnamese Milk Coffee", "越式炼乳咖啡（热/冰）"]],
  ["A3", ["Hot/Iced White Coffee", "越式白咖啡（热/冰）"]], ["A4", ["Salt Coffee", "海盐咖啡"]], ["A5", ["Egg Coffee", "鸡蛋咖啡"]],
  ["A6", ["Coconut Coffee", "椰子咖啡"]], ["A7", ["Coffee Frappe", "咖啡冰沙"]], ["A8", ["Hot/Iced Espresso", "浓缩咖啡（热/冰）"]],
  ["A9", ["Hot/Iced Latte", "拿铁（热/冰）"]], ["A10", ["Hot/Iced Cappuccino", "卡布奇诺（热/冰）"]], ["A11", ["Americano", "美式咖啡"]],
  ["A12", ["Coconut Americano", "椰子美式"]], ["A13", ["V60 Pour-over Coffee", "V60 手冲咖啡"]], ["A14", ["Magenta Espresso", "Magenta 浓缩咖啡"]],
  ["A15", ["Lychee Cold Brew", "荔枝冷萃咖啡"]], ["A16", ["Pink Guava Cold Brew", "粉红番石榴冷萃"]], ["A17", ["Orange Cold Brew", "橙香冷萃咖啡"]],
  ["B1", ["Watermelon Juice", "西瓜汁"]], ["B2", ["Fresh Orange Juice", "鲜榨橙汁"]], ["B3", ["Pineapple Juice", "菠萝汁"]],
  ["C1", ["Mango Smoothie", "芒果冰沙"]], ["C2", ["Mango Yogurt", "芒果酸奶"]], ["C3", ["Peach Yogurt", "蜜桃酸奶"]],
  ["C4", ["Avocado Smoothie", "牛油果冰沙"]], ["C5", ["Avocado & Young Coconut", "牛油果椰青"]], ["C6", ["Chocolate Frappe", "巧克力冰沙"]],
  ["C7", ["Matcha Frappe", "抹茶冰沙"]], ["C8", ["Matcha Latte", "抹茶拿铁"]], ["D1", ["Peach Orange Lemongrass Tea", "蜜桃香橙香茅茶"]],
  ["D2", ["Lychee Tea", "荔枝茶"]], ["D3", ["Mango Passion Fruit Tea", "芒果百香果茶"]], ["D5", ["Hot Herbal Ginger Tea", "热姜草本茶"]],
  ["F1", ["Hot/Iced Cocoa", "可可（热/冰）"]], ["F2", ["Hot/Iced Matcha", "抹茶（热/冰）"]],
]);

// Product photos are deployed with the backend, so the marketplace can use
// them from any ZhaoXi application (Partner, Customer, or Admin).
const photoCodes = new Set([
  "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A9", "A10", "A11", "A12", "A13", "A14",
  "B1", "B2", "B3", "C1", "C6", "C7", "D1", "D2", "D3", "D5", "F1", "F2",
]);

try {
  const [organization] = await sql`
    select id, name from organizations
    where lower(name) = lower('Hỷ Garden Coffee')
    limit 1
  `;
  if (!organization) throw new Error("Hỷ Garden Coffee organization was not found.");

  const [foodModule] = await sql`
    select id from modules where code = 'food' and is_enabled = true limit 1
  `;
  if (!foodModule) throw new Error("The food module is unavailable.");

  for (const [menuCode, name, price, category] of menu) {
    const code = `hy-garden-${menuCode.toLowerCase()}`;
    const imageUrl = photoCodes.has(menuCode)
      ? `https://zhaoxi-app-puce.vercel.app/uploads/hy-garden/${menuCode.toLowerCase()}.png`
      : undefined;
    const [service] = await sql`
      insert into services (module_id, organization_id, code, price_from, currency, is_enabled, metadata, updated_at)
      values (${foodModule.id}, ${organization.id}, ${code}, ${price}, 'VND', true,
        ${sql.json({ menuCode, category, catalog: "hy-garden", ...(imageUrl ? { imageUrl } : {}) })}, now())
      on conflict (code) do update set
        price_from = excluded.price_from,
        currency = excluded.currency,
        is_enabled = true,
        metadata = services.metadata || excluded.metadata,
        updated_at = now()
      returning id
    `;
    await sql`
      insert into service_translations (service_id, locale, name, summary, description)
      values (${service.id}, 'vi-VN', ${name}, ${category}, ${name})
      on conflict (service_id, locale) do update set
        name = excluded.name,
        summary = excluded.summary,
        description = excluded.description
    `;
    const [englishName, chineseName] = localizedNames[menuCode] || [name, name];
    for (const [locale, localizedName] of [["en-US", englishName], ["zh-CN", chineseName], ["zh-TW", chineseName]]) {
      await sql`
        insert into service_translations (service_id, locale, name, summary, description)
        values (${service.id}, ${locale}, ${localizedName}, ${category}, ${localizedName})
        on conflict (service_id, locale) do update set
          name = excluded.name,
          summary = excluded.summary,
          description = excluded.description
      `;
    }
  }

  console.log(JSON.stringify({ organization: organization.name, imported: menu.length }));
} finally {
  await sql.end();
}
