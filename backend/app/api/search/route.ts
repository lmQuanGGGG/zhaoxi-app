import { and, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db";
import { moduleTranslations, modules, organizations, services, serviceTranslations } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { localeFromRequest } from "@/lib/locale";
export const dynamic = "force-dynamic";

function serviceHref(moduleCode: string, serviceId: string, organizationId?: string | null) {
  if (moduleCode === "food" && organizationId) return `/restaurant/${organizationId}`;
  return `/service/${serviceId}`;
}
function image(metadata?: Record<string, unknown> | null, organizationMetadata?: Record<string, unknown> | null) {
  if (metadata && typeof metadata.imageUrl === "string" && metadata.imageUrl) return metadata.imageUrl;
  const banners = organizationMetadata && Array.isArray(organizationMetadata.bannerUrls) ? organizationMetadata.bannerUrls : [];
  if (typeof banners[0] === "string" && banners[0]) return banners[0];
  if (organizationMetadata && typeof organizationMetadata.logoUrl === "string") return organizationMetadata.logoUrl;
  return undefined;
}
function rank(query: string, ...values: Array<string | null | undefined>) {
  const q = query.toLocaleLowerCase();
  let score = 0;
  for (const raw of values) {
    const value = (raw || "").toLocaleLowerCase();
    if (!value) continue;
    if (value === q) score += 120;
    else if (value.startsWith(q)) score += 70;
    else if (value.includes(q)) score += 35;
  }
  return score;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "").trim();
    const locale = localeFromRequest(request);
    if (query.length < 2) return json({ ok: true, locale, query, data: [] });
    const pattern = `%${query}%`;
    const db = getDb();

    const serviceRows = await db.select({
      id: services.id, moduleCode: modules.code, moduleName: moduleTranslations.name,
      name: serviceTranslations.name, summary: serviceTranslations.summary,
      priceFrom: services.priceFrom, currency: services.currency, metadata: services.metadata,
      organizationId: organizations.id, organizationName: organizations.name, organizationMetadata: organizations.metadata,
    }).from(services)
      .innerJoin(modules, eq(services.moduleId, modules.id))
      .leftJoin(organizations, eq(services.organizationId, organizations.id))
      .leftJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, locale)))
      .leftJoin(moduleTranslations, and(eq(moduleTranslations.moduleId, modules.id), eq(moduleTranslations.locale, locale)))
      .where(and(eq(services.isEnabled, true), or(
        ilike(serviceTranslations.name, pattern), ilike(serviceTranslations.summary, pattern),
        ilike(organizations.name, pattern), ilike(moduleTranslations.name, pattern),
      ))).limit(40);

    const organizationRows = await db.select({
      id: organizations.id, name: organizations.name, description: organizations.description,
      addressText: organizations.addressText, metadata: organizations.metadata,
    }).from(organizations).where(and(eq(organizations.status, "active"), or(
      ilike(organizations.name, pattern), ilike(organizations.description, pattern), ilike(organizations.addressText, pattern),
    ))).limit(20);

    const moduleRows = await db.select({ code: modules.code, name: moduleTranslations.name, description: moduleTranslations.description })
      .from(modules).leftJoin(moduleTranslations, and(eq(moduleTranslations.moduleId, modules.id), eq(moduleTranslations.locale, locale)))
      .where(and(eq(modules.isEnabled, true), or(ilike(moduleTranslations.name, pattern), ilike(moduleTranslations.description, pattern), ilike(modules.code, pattern)))).limit(20);

    const orgModules = new Map<string, string>();
    for (const row of serviceRows) if (row.organizationId && !orgModules.has(row.organizationId)) orgModules.set(row.organizationId, row.moduleCode);

    const data = [
      ...serviceRows.map((row) => ({
        kind: "service" as const, id: row.id, moduleCode: row.moduleCode, moduleName: row.moduleName,
        name: row.name || row.organizationName || row.moduleName || row.moduleCode, summary: row.summary,
        organizationId: row.organizationId, organizationName: row.organizationName, priceFrom: row.priceFrom, currency: row.currency,
        imageUrl: image(row.metadata, row.organizationMetadata), href: serviceHref(row.moduleCode, row.id, row.organizationId),
        score: rank(query, row.name, row.organizationName, row.moduleName, row.summary),
      })),
      ...organizationRows.map((row) => {
        const moduleCode = orgModules.get(row.id) || "market";
        return { kind: "organization" as const, id: row.id, moduleCode, moduleName: null, name: row.name, summary: row.description || row.addressText,
          organizationId: row.id, organizationName: row.name, priceFrom: null, currency: "VND", imageUrl: image(null, row.metadata),
          href: moduleCode === "food" ? `/restaurant/${row.id}` : `/services/${moduleCode}`, score: rank(query, row.name, row.description, row.addressText) + 10 };
      }),
      ...moduleRows.map((row) => ({ kind: "module" as const, id: `module:${row.code}`, moduleCode: row.code, moduleName: row.name,
        name: row.name || row.code, summary: row.description, organizationId: null, organizationName: null, priceFrom: null, currency: "VND",
        imageUrl: undefined, href: `/services/${row.code}`, score: rank(query, row.name, row.description, row.code) })),
    ].sort((a, b) => b.score - a.score).slice(0, 50);

    return json({ ok: true, locale, query, data }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error(error);
    return errorResponse("Unable to search ZhaoXi marketplace.", 500);
  }
}
