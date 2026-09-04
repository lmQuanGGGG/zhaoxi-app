import "dotenv/config";
import postgres from "postgres";
import { autoTranslateServiceTranslations } from "../lib/services/auto-translate.ts";

const organizationId = "fb48f611-f0c0-470b-8129-18979d0d05cf";
const sql = postgres(process.env.POSTGRES_URL || process.env.DATABASE_URL, { prepare: false });

try {
  const items = await sql`
    select s.id, t.name, coalesce(t.summary, '') as summary
    from services s join service_translations t on t.service_id = s.id
    where s.organization_id = ${organizationId} and t.locale = 'vi-VN'
    order by s.code
  `;
  let cursor = 0;
  const workers = Array.from({ length: 4 }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      const translations = await autoTranslateServiceTranslations({
        "vi-VN": { name: item.name, summary: item.summary, description: item.summary },
      });
      for (const locale of ["zh-CN", "zh-TW", "en-US"]) {
        const value = translations[locale];
        if (!value?.name?.trim()) continue;
        await sql`
          insert into service_translations (service_id, locale, name, summary, description)
          values (${item.id}, ${locale}, ${value.name.trim()}, ${value.summary?.trim() || null}, ${value.description?.trim() || null})
          on conflict (service_id, locale) do update set name = excluded.name, summary = excluded.summary, description = excluded.description
        `;
      }
    }
  });
  await Promise.all(workers);
  console.log(JSON.stringify({ organizationId, translated: items.length }));
} finally {
  await sql.end();
}
