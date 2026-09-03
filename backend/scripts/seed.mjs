import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Missing PostgreSQL connection environment variable.");
const sql = postgres(url, { max: 1, prepare: false });

const languages = [
  ["zh-CN", "Simplified Chinese", "简体中文", true, 1],
  ["zh-TW", "Traditional Chinese", "繁體中文", false, 2],
  ["vi-VN", "Vietnamese", "Tiếng Việt", false, 3],
  ["en-US", "English", "English", false, 4],
];
const moduleData = [
  ["food", "🍜", "/food", 1, false, ["外卖订餐", "外賣訂餐", "Đặt món", "Food delivery"]],
  ["housing", "🏠", "/housing", 2, false, ["岘港租房", "峴港租房", "Thuê nhà Đà Nẵng", "Da Nang housing"]],
  ["visa", "🛂", "/visa", 3, false, ["护照签证", "護照簽證", "Hộ chiếu và thị thực", "Passport and visa"]],
  ["car-rental", "🚗", "/car-rental", 4, false, ["租车服务", "租車服務", "Thuê xe", "Car rental"]],
  ["translation", "🗣️", "/translation", 5, false, ["翻译服务", "翻譯服務", "Phiên dịch", "Interpretation"]],
  ["travel", "🏝️", "/travel", 6, false, ["旅游服务", "旅遊服務", "Du lịch", "Travel"]],
  ["payment", "💳", "/payment", 7, false, ["支付服务", "支付服務", "Thanh toán", "Payments"]],
  ["community", "👥", "/community", 8, false, ["华人社区", "華人社區", "Cộng đồng Người Hoa", "Chinese community"]],
  ["market", "🛍️", "/market", 9, false, ["华人商城", "華人商城", "Chợ Người Hoa", "Chinese market"]],
  ["emergency", "🆘", "/emergency", 10, true, ["紧急帮助", "緊急幫助", "Hỗ trợ khẩn cấp", "Emergency help"]],
];
const locales = ["zh-CN", "zh-TW", "vi-VN", "en-US"];
const organizations = [
  ["ZX-FOOD-001", "restaurant", "川渝老火锅", "正宗川渝火锅与中餐", "0905123001", "123 Nguyễn Văn Linh, Hải Châu, Đà Nẵng", { rating: 4.8, verified: true, latitude: 16.054407, longitude: 108.202164 }],
  ["ZX-LIFE-001", "life-service", "赵喜生活服务中心", "为在岘港生活的华人提供一站式服务", "0905123002", "Đà Nẵng", { rating: 4.9, verified: true, latitude: 16.06778, longitude: 108.22083 }],
  ["ZX-TRAVEL-001", "travel", "岘港华旅", "中文旅游、接送机与包车服务", "0905123003", "Sơn Trà, Đà Nẵng", { rating: 4.8, verified: true, latitude: 16.07101, longitude: 108.23031 }],
  ["ZX-HOME-001", "real-estate", "安居岘港", "公寓、别墅与长期租房服务", "0905123004", "Ngũ Hành Sơn, Đà Nẵng", { rating: 4.7, verified: true, latitude: 16.04792, longitude: 108.24365 }],
];
const services = [
  ["food", "ZX-FOOD-001", "food-hotpot", "经典牛肉火锅", "經典牛肉火鍋", "Lẩu bò Tứ Xuyên", "Classic beef hotpot", "正宗川味，适合2–4人", "228000", "🍲"],
  ["food", "ZX-FOOD-001", "food-seafood", "海鲜套餐", "海鮮套餐", "Set hải sản", "Seafood set", "岘港新鲜海鲜套餐", "398000", "🦞"],
  ["food", "ZX-FOOD-001", "food-dumpling", "手工水饺", "手工水餃", "Sủi cảo thủ công", "Handmade dumplings", "每日现包手工水饺", "98000", "🥟"],
  ["housing", "ZX-HOME-001", "housing-beach-apartment", "美溪海滩公寓", "美溪海灘公寓", "Căn hộ gần biển Mỹ Khê", "My Khe beach apartment", "一房公寓，步行到海滩", "12000000", "🏢"],
  ["visa", "ZX-LIFE-001", "visa-extension", "越南签证延期", "越南簽證延期", "Gia hạn thị thực Việt Nam", "Vietnam visa extension", "材料检查、翻译与办理进度跟踪", "1500000", "🛂"],
  ["car-rental", "ZX-TRAVEL-001", "car-airport", "机场接送", "機場接送", "Đón tiễn sân bay", "Airport transfer", "中文司机，准时接送", "250000", "🚙"],
  ["translation", "ZX-LIFE-001", "translation-hourly", "中文越南语陪同翻译", "中文越南語陪同翻譯", "Phiên dịch Trung–Việt theo giờ", "Chinese–Vietnamese interpreter", "商务、医院、办证陪同", "350000", "🗣️"],
  ["travel", "ZX-TRAVEL-001", "travel-ba-na", "巴拿山一日游", "巴拿山一日遊", "Tour Bà Nà Hills 1 ngày", "Ba Na Hills day tour", "中文导游与往返接送", "1350000", "🏝️"],
  ["payment", "ZX-LIFE-001", "payment-assistance", "本地支付协助", "本地支付協助", "Hỗ trợ thanh toán địa phương", "Local payment assistance", "协助了解越南本地支付方式", null, "💳"],
  ["community", "ZX-LIFE-001", "community-events", "岘港华人活动", "峴港華人活動", "Sự kiện cộng đồng người Hoa", "Chinese community events", "活动信息与报名协助", null, "👥"],
  ["market", "ZX-LIFE-001", "market-delivery", "华人商品配送", "華人商品配送", "Giao hàng sản phẩm Trung Hoa", "Chinese goods delivery", "调味品、日用品与特色商品", "50000", "🛍️"],
  ["emergency", "ZX-LIFE-001", "emergency-interpreter", "紧急中文协助", "緊急中文協助", "Hỗ trợ khẩn cấp bằng tiếng Trung", "Emergency Chinese assistance", "医院、公安与紧急联络协助", null, "🆘"],
];

try {
  for (const [code, name, nativeName, isDefault, sortOrder] of languages) {
    await sql`INSERT INTO languages (code, name, native_name, is_default, sort_order)
      VALUES (${code}, ${name}, ${nativeName}, ${isDefault}, ${sortOrder}) ON CONFLICT (code) DO NOTHING`;
  }
  const [city] = await sql`INSERT INTO cities (code, country_code, name_vi, name_zh_cn, name_zh_tw, name_en, timezone)
    VALUES ('da-nang', 'VN', 'Đà Nẵng', '岘港', '峴港', 'Da Nang', 'Asia/Ho_Chi_Minh')
    ON CONFLICT (code) DO UPDATE SET name_vi=EXCLUDED.name_vi RETURNING id`;

  const moduleIds = new Map();
  for (const [code, icon, route, sortOrder, emergency, names] of moduleData) {
    const [row] = await sql`INSERT INTO modules (code, icon, route, sort_order, is_emergency)
      VALUES (${code}, ${icon}, ${route}, ${sortOrder}, ${emergency})
      ON CONFLICT (code) DO UPDATE SET icon=EXCLUDED.icon, route=EXCLUDED.route, sort_order=EXCLUDED.sort_order
      RETURNING id`;
    moduleIds.set(code, row.id);
    for (let i = 0; i < locales.length; i++) {
      await sql`INSERT INTO module_translations (module_id, locale, name)
        VALUES (${row.id}, ${locales[i]}, ${names[i]})
        ON CONFLICT (module_id, locale) DO UPDATE SET name=EXCLUDED.name`;
    }
  }

  const organizationIds = new Map();
  for (const [code, type, name, description, phone, address, metadata] of organizations) {
    const [row] = await sql`INSERT INTO organizations (code, type, name, description, phone, city_id, address_text, status, metadata)
      VALUES (${code}, ${type}, ${name}, ${description}, ${phone}, ${city.id}, ${address}, 'active', ${JSON.stringify(metadata)}::jsonb)
      ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, phone=EXCLUDED.phone, address_text=EXCLUDED.address_text, status='active', metadata=EXCLUDED.metadata
      RETURNING id`;
    organizationIds.set(code, row.id);
  }

  for (const [moduleCode, organizationCode, code, zhCn, zhTw, vi, en, summaryZh, priceFrom, emoji] of services) {
    const [row] = await sql`INSERT INTO services (module_id, organization_id, code, price_from, currency, is_enabled, metadata)
      VALUES (${moduleIds.get(moduleCode)}, ${organizationIds.get(organizationCode)}, ${code}, ${priceFrom}, 'VND', true, ${JSON.stringify({ emoji, featured: true })}::jsonb)
      ON CONFLICT (code) DO UPDATE SET module_id=EXCLUDED.module_id, organization_id=EXCLUDED.organization_id, price_from=EXCLUDED.price_from, is_enabled=true, metadata=EXCLUDED.metadata
      RETURNING id`;
    const translations = [
      ["zh-CN", zhCn, summaryZh], ["zh-TW", zhTw, summaryZh], ["vi-VN", vi, vi], ["en-US", en, en],
    ];
    for (const [locale, name, summary] of translations) {
      await sql`INSERT INTO service_translations (service_id, locale, name, summary, description)
        VALUES (${row.id}, ${locale}, ${name}, ${summary}, ${summary})
        ON CONFLICT (service_id, locale) DO UPDATE SET name=EXCLUDED.name, summary=EXCLUDED.summary, description=EXCLUDED.description`;
    }
  }
  console.log("ZhaoXi Sprint 12.2.1 seed completed.");
} finally {
  await sql.end();
}
