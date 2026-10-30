import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { modules, moduleTranslations } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { publicCacheHeaders } from "@/lib/core/api-response";
import { localeFromRequest } from "@/lib/locale";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const locale = localeFromRequest(request);
    const rows = await getDb()
      .select({
        id: modules.id,
        code: modules.code,
        icon: modules.icon,
        route: modules.route,
        sortOrder: modules.sortOrder,
        isEmergency: modules.isEmergency,
        name: moduleTranslations.name,
        shortName: moduleTranslations.shortName,
        description: moduleTranslations.description,
      })
      .from(modules)
      .leftJoin(
        moduleTranslations,
        and(eq(moduleTranslations.moduleId, modules.id), eq(moduleTranslations.locale, locale)),
      )
      .where(eq(modules.isEnabled, true))
      .orderBy(asc(modules.sortOrder));

    // Modules change only through admin releases; let the CDN serve them.
    return json({ ok: true, locale, data: rows }, { headers: publicCacheHeaders(300, 3600) });
  } catch (error) {
    console.error(error);
    return errorResponse("Unable to load modules.", 500);
  }
}
