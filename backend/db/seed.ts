import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { cities, languages, modules, moduleTranslations } from "./schema";
import { languageSeed, moduleSeed } from "./seed-data";

async function main() {
  const db = getDb();
  await db.insert(languages).values([...languageSeed]).onConflictDoNothing();

  await db
    .insert(cities)
    .values({
      code: "da-nang",
      nameVi: "Đà Nẵng",
      nameZhCn: "岘港",
      nameZhTw: "峴港",
      nameEn: "Da Nang",
      timezone: "Asia/Ho_Chi_Minh",
    })
    .onConflictDoNothing();

  for (const item of moduleSeed) {
    const [existing] = await db.select({ id: modules.id }).from(modules).where(eq(modules.code, item.code)).limit(1);
    let moduleId = existing?.id;
    if (!moduleId) {
      const [created] = await db
        .insert(modules)
        .values({
          code: item.code,
          icon: item.icon,
          route: item.route,
          sortOrder: item.sortOrder,
          isEmergency: "isEmergency" in item ? item.isEmergency : false,
        })
        .returning({ id: modules.id });
      moduleId = created.id;
    }

    const translations = Object.entries(item.names).map(([locale, name]) => ({ moduleId, locale, name }));
    await db.insert(moduleTranslations).values(translations).onConflictDoNothing();
  }

  console.log("ZhaoXi seed completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
