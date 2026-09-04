import "dotenv/config";
import postgres from "postgres";

const organizationId = "fb48f611-f0c0-470b-8129-18979d0d05cf";

// These are brand/menu names, not phrases that should be machine translated.
// They were transcribed from TASTING's supplied menu artwork.
const teaNames = {
  G1: ["Thanh Thanh Ngọa Sơn", "青青糯山", "青青糯山", "Green Mountain Milk Tea"],
  G2: ["Mộng Hè Dưa Lưới", "夏梦玫瑰", "夏夢玫瑰", "Summer Melon Dream Milk Tea"],
  G3: ["Bá Nha Tuyết Huyền", "伯牙绝弦", "伯牙絕弦", "Bo Ya Oolong Milk Tea"],
  G4: ["Hồng Trà Kem Sữa", "白雾红尘", "白霧紅塵", "Cream Black Tea Milk Tea"],
  G5: ["Lan Quế Hương", "桂馥兰香", "桂馥蘭香", "Osmanthus Orchid Milk Tea"],
  G6: ["Tình Thời Xuân Sơn", "醒时春山", "醒時春山", "Spring Mountain Milk Tea"],
  G7: ["Ô Long Hoa Điền", "花田乌龙", "花田烏龍", "Flower Field Oolong Milk Tea"],
  G8: ["Sơn Dã Chi Tử", "山野栀子", "山野梔子", "Wild Gardenia Milk Tea"],
  G9: ["Vạn Tượng Xuân Hòa", "万象春和", "萬象春和", "Spring Harmony Milk Tea"],
  G10: ["Vạn Lý Mộc Lan", "万里木兰", "萬里木蘭", "Magnolia Milk Tea"],
  G11: ["Sơn Trà Tầm Hương", "寻香茶", "尋香茶", "Mountain Camellia Milk Tea"],
  G12: ["Nhất Kỳ Hồng Trần", "一骑红尘", "一騎紅塵", "Red Dust Milk Tea"],
  H1: ["Tỉnh Xuân Sơn", "醒春山", "醒春山", "Spring Mountain Tea"],
  H2: ["Chước Hồng Bào", "酌红袍", "酌紅袍", "Da Hong Pao Tea"],
  H3: ["Mộc Lan Từ", "木兰辞", "木蘭辭", "Magnolia Tea"],
  H4: ["Dã Chi Tử", "野栀子", "野梔子", "Wild Gardenia Tea"],
  H5: ["Chiết Quế Lệnh", "折桂令", "折桂令", "Osmanthus Tea"],
  H6: ["Hoa Điền Ô", "花田乌", "花田烏", "Flower Field Oolong Tea"],
  H7: ["Mộng Mai Lung", "梦玫瑰", "夢玫瑰", "Melon Dream Tea"],
  H8: ["Vạn Tượng Xuân Hòa", "万象春", "萬象春", "Spring Harmony Tea"],
  H9: ["Sơn Trà Quán", "山茶君", "山茶君", "Mountain Camellia Tea"],
  H10: ["Vân Trung Lục", "云中绿", "雲中綠", "Cloud Green Tea"],
  I1: ["Túy Hồng Trần", "醉红尘", "醉紅塵", "Drunken Red Tea"],
  I2: ["Thiên Phong Thúy", "千峰翠", "千峰翠", "Emerald Thousand Peaks Tea"],
  I3: ["Thất Lý Hương", "七里香", "七里香", "Seven Mile Lemon Tea"],
  I4: ["Hổ Phách Quang", "琥珀光", "琥珀光", "Amber Glow Fruit Tea"],
  I5: ["Chi Hương Chanh", "栀香柠", "梔香檸", "Gardenia Lemon Tea"],
  J1: ["Quế Tử Phiêu Hương", "桂子飘飘", "桂子飄飄", "Osmanthus Snow Top Tea"],
  J2: ["Đào Đào Mùa Xuân", "春日桃桃", "春日桃桃", "Spring Peach Snow Top Tea"],
  J3: ["Quan Sơn Mộc Lan", "关山木兰", "關山木蘭", "Magnolia Snow Top Tea"],
};

const localeIndex = { "vi-VN": 0, "zh-CN": 1, "zh-TW": 2, "en-US": 3 };
const sql = postgres(process.env.POSTGRES_URL || process.env.DATABASE_URL, { prepare: false });

try {
  const rows = await sql`
    select s.id, s.code, t.locale, t.name, t.summary, t.description
    from services s join service_translations t on t.service_id = s.id
    where s.organization_id = ${organizationId}
    order by s.code, t.locale
  `;

  const updates = rows.map((row) => {
    const displayCode = row.code.replace(/^TASTING-/, "");
    const menuCode = displayCode.replace(/^COMBO-/, "");
    const verifiedName = teaNames[menuCode]?.[localeIndex[row.locale]];
    const unprefixedName = (verifiedName || row.name).replace(/^(?:COMBO-[A-Z]\d+|[A-Z]\d+)\s*·\s*/, "");
    return { serviceId: row.id, locale: row.locale, name: `${displayCode} · ${unprefixedName}` };
  });
  await sql`
    update service_translations as translations
    set name = updates.name
    from jsonb_to_recordset(${sql.json(updates)}) as updates(service_id uuid, locale text, name text)
    where translations.service_id = updates.service_id and translations.locale = updates.locale
  `;
  console.log(JSON.stringify({ organizationId, updated: rows.length, verifiedTeaNames: Object.keys(teaNames).length }));
} finally {
  await sql.end();
}
