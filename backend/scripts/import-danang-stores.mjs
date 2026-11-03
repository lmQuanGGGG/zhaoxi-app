import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

// One real ZhaoXi store per service module (visa, travel, car rental, ...),
// read from scripts/data/danang-stores/<module>.json. Prices follow researched
// Đà Nẵng market / official rates (sources kept in each file). Photos are
// free-licensed Unsplash images, credited in metadata.photoSources and labelled
// illustrative. Idempotent: stores and products are upserted by code.
//
// OWNER_PHONE=+849xxxxxxxx makes that existing account the owner of every store.
// HIDE_DEMO=1 unpublishes the seed demo services of the placeholder stores.

const databaseUrl = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("POSTGRES_URL or DATABASE_URL is required.");

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "data", "danang-stores");
const catalogs = readdirSync(dataDir).filter((file) => file.endsWith(".json")).sort()
  .map((file) => JSON.parse(readFileSync(join(dataDir, file), "utf8")));

const LOCALES = ["vi-VN", "en-US", "zh-CN", "zh-TW"];
const DEMO_ORGS = ["ZX-LIFE-001", "ZX-TRAVEL-001", "ZX-HOME-001"];
const note = {
  "vi-VN": "Ảnh minh họa. Giá tham khảo; ZhaoXi xác nhận lịch, chi phí cuối cùng và giấy tờ cần thiết khi bạn gửi yêu cầu.",
  "en-US": "Illustrative photos. Indicative price; ZhaoXi confirms the schedule, final cost and required documents when you send a request.",
  "zh-CN": "图片仅供参考。价格为参考价；提交需求后，ZhaoXi 会确认时间、最终费用及所需材料。",
  "zh-TW": "圖片僅供參考。價格為參考價；提交需求後，ZhaoXi 會確認時間、最終費用及所需文件。",
};

function validate(catalog) {
  const where = catalog.module || "?";
  if (!catalog.org?.code || !catalog.org?.name) throw new Error(`${where}: org.code and org.name are required`);
  if (!Array.isArray(catalog.items) || !catalog.items.length) throw new Error(`${where}: items are required`);
  for (const item of catalog.items) {
    if (!item.code) throw new Error(`${where}: item without code`);
    for (const locale of LOCALES) {
      const [name] = item.t?.[locale] || [];
      if (!name) throw new Error(`${where}/${item.code}: missing ${locale} name`);
    }
  }
}
catalogs.forEach(validate);

const sql = postgres(databaseUrl, { prepare: false, max: 1 });

try {
  const [city] = await sql`select id from cities where code = 'da-nang' limit 1`;
  let owner;
  if (process.env.OWNER_PHONE) {
    const digits = process.env.OWNER_PHONE.replace(/\D/g, "").replace(/^0/, "84");
    [owner] = await sql`select id from users where regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = ${digits} limit 1`;
    if (!owner) throw new Error(`No account with phone ${process.env.OWNER_PHONE}.`);
  }

  const now = new Date().toISOString();
  const summary = [];
  for (const catalog of catalogs) {
    const [module] = await sql`select id from modules where code = ${catalog.module} and is_enabled = true limit 1`;
    if (!module) throw new Error(`Module ${catalog.module} is unavailable.`);
    const { org } = catalog;
    const orgMeta = {
      latitude: org.latitude ?? null,
      longitude: org.longitude ?? null,
      verified: false,
      ...(org.bannerUrl ? { bannerUrls: [org.bannerUrl] } : {}),
      photoCredit: "Unsplash",
    };
    const [store] = await sql`
      insert into organizations (code, type, name, description, city_id, address_text, status, metadata, updated_at)
      values (${org.code}, ${org.type || catalog.module}, ${org.name}, ${org.description || null}, ${city?.id ?? null}, ${org.addressText || "Đà Nẵng"}, 'active', ${sql.json(orgMeta)}, now())
      on conflict (code) do update set
        type = excluded.type,
        name = excluded.name,
        description = excluded.description,
        city_id = excluded.city_id,
        address_text = excluded.address_text,
        status = 'active',
        metadata = organizations.metadata || excluded.metadata,
        updated_at = now()
      returning id
    `;

    if (owner) {
      const [member] = await sql`select 1 from organization_members where organization_id = ${store.id} and user_id = ${owner.id}`;
      if (member) await sql`update organization_members set role = 'owner', is_active = true where organization_id = ${store.id} and user_id = ${owner.id}`;
      else await sql`insert into organization_members (organization_id, user_id, role, is_active) values (${store.id}, ${owner.id}, 'owner', true)`;
    }

    for (const item of catalog.items) {
      const photos = [item.imageUrl, ...(item.galleryUrls || [])].filter(Boolean);
      const metadata = {
        ...(item.meta || {}),
        ...(photos.length ? { imageUrl: photos[0], galleryUrls: [...new Set(photos)] } : {}),
        photoCredit: "Unsplash (ảnh minh họa)",
        photoSources: item.photoSources || [],
        isAvailable: true,
        syncStatus: "published",
        ...(catalog.module === "travel" ? { travelInventoryUpdatedAt: now } : { inventoryUpdatedAt: now }),
      };
      const [service] = await sql`
        insert into services (module_id, organization_id, code, price_from, currency, is_enabled, metadata, updated_at)
        values (${module.id}, ${store.id}, ${item.code}, ${item.price ?? null}, 'VND', true, ${sql.json({ ...metadata, publishedAt: now })}, now())
        on conflict (code) do update set
          module_id = excluded.module_id,
          organization_id = excluded.organization_id,
          price_from = excluded.price_from,
          is_enabled = true,
          metadata = (services.metadata || excluded.metadata) || jsonb_build_object('publishedAt', coalesce(services.metadata->'publishedAt', excluded.metadata->'publishedAt')),
          updated_at = now()
        returning id
      `;
      for (const locale of LOCALES) {
        const [name, short, description] = item.t[locale];
        await sql`
          insert into service_translations (service_id, locale, name, summary, description)
          values (${service.id}, ${locale}, ${name}, ${short || null}, ${[description, note[locale]].filter(Boolean).join("\n\n")})
          on conflict (service_id, locale) do update set
            name = excluded.name,
            summary = excluded.summary,
            description = excluded.description
        `;
      }
    }
    summary.push({ module: catalog.module, store: org.name, products: catalog.items.length });
  }

  if (process.env.HIDE_DEMO === "1") {
    const hidden = await sql`
      update services set is_enabled = false, updated_at = now()
      where organization_id in (select id from organizations where code in ${sql(DEMO_ORGS)})
        and is_enabled = true
      returning code
    `;
    summary.push({ hiddenDemoServices: hidden.map((row) => row.code) });
  }

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await sql.end();
}
