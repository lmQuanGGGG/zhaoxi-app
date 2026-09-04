import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { modules, organizations, services, serviceTranslations } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { localeFromRequest } from "@/lib/locale";
import { requireSession, mayManageOrganization } from "@/lib/security/route-authorization";

export const dynamic = "force-dynamic";
const LOCALES = ["zh-CN", "zh-TW", "vi-VN", "en-US"] as const;

type ServiceInput = {
  organizationId?: string;
  moduleCode?: string;
  code?: string;
  price?: number | string;
  currency?: string;
  isEnabled?: boolean;
  metadata?: Record<string, unknown>;
  translations?: Partial<Record<(typeof LOCALES)[number], { name?: string; summary?: string; description?: string }>>;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const moduleCode = url.searchParams.get("module");
    const organizationId = url.searchParams.get("organizationId");
    const locale = localeFromRequest(request);
    const includeDrafts = url.searchParams.get("includeDrafts") === "1" && Boolean(organizationId);
    if (includeDrafts) {
      const gate = await requireSession(request, ["admin", "partner"]);
      if (!gate.ok) return gate.response;
      if (!organizationId || !(await mayManageOrganization(gate.session, organizationId))) {
        return errorResponse("Organization not found.", 404);
      }
    }
    const filters = includeDrafts ? [] : [eq(services.isEnabled, true)];
    if (moduleCode) filters.push(eq(modules.code, moduleCode));
    if (organizationId) filters.push(eq(services.organizationId, organizationId));

    const rows = await getDb().select({
      id: services.id, code: services.code, moduleCode: modules.code, priceFrom: services.priceFrom, isEnabled: services.isEnabled,
      currency: services.currency, metadata: services.metadata, organizationId: organizations.id,
      organizationCode: organizations.code, organizationName: organizations.name,
      organizationAddress: organizations.addressText, organizationMetadata: organizations.metadata,
      name: serviceTranslations.name, summary: serviceTranslations.summary, description: serviceTranslations.description,
    }).from(services)
      .innerJoin(modules, eq(services.moduleId, modules.id))
      .leftJoin(organizations, eq(services.organizationId, organizations.id))
      .leftJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, locale)))
      .where(and(...filters)).orderBy(asc(services.createdAt));

    const missingIds = rows.filter((row) => !row.name).map((row) => row.id);
    if (missingIds.length) {
      const fallbacks = await getDb().select({
        serviceId: serviceTranslations.serviceId,
        locale: serviceTranslations.locale,
        name: serviceTranslations.name,
        summary: serviceTranslations.summary,
        description: serviceTranslations.description,
      }).from(serviceTranslations).where(inArray(serviceTranslations.serviceId, missingIds));
      const priority = [locale, "zh-CN", "vi-VN", "en-US", "zh-TW"];
      for (const row of rows) {
        if (row.name) continue;
        const candidates = fallbacks.filter((item) => item.serviceId === row.id);
        const fallback = candidates.sort((a, b) => priority.indexOf(a.locale) - priority.indexOf(b.locale))[0];
        if (fallback) {
          row.name = fallback.name;
          row.summary = fallback.summary;
          row.description = fallback.description;
        }
      }
    }

    for (const row of rows) {
      const orgMeta = (row.organizationMetadata as Record<string, unknown> | null) || {};
      const localizedOrg = (orgMeta.localizedNames as Record<string, string> | undefined)?.[locale];
      if (localizedOrg) {
        row.organizationName = localizedOrg;
      }
    }
    return json({ ok: true, locale, module: moduleCode, data: rows });
  } catch (error) { console.error(error); return errorResponse("Unable to load services.", 500); }
}

export async function POST(request: Request) {
  try {
    const gate = await requireSession(request, ["admin", "partner"]);
    if (!gate.ok) return gate.response;
    const body = await request.json() as ServiceInput;
    if (!body.organizationId || !body.moduleCode) return errorResponse("organizationId and moduleCode are required.", 400);
    if (!(await mayManageOrganization(gate.session, body.organizationId))) return errorResponse("Organization not found.", 404);
    const db = getDb();
    const [org] = await db.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, body.organizationId), eq(organizations.status, "active"))).limit(1);
    const [module] = await db.select({ id: modules.id }).from(modules).where(and(eq(modules.code, body.moduleCode), eq(modules.isEnabled, true))).limit(1);
    if (!org || !module) return errorResponse("Active organization or module not found.", 404);
    const code = (body.code || `ZX-SVC-${Date.now()}`).trim().slice(0, 80);
    const [created] = await db.insert(services).values({
      moduleId: module.id, organizationId: org.id, code,
      priceFrom: String(Math.max(0, Number(body.price || 0))), currency: body.currency || "VND",
      isEnabled: body.isEnabled ?? true, metadata: body.metadata || {},
    }).returning();
    const firstTranslation = Object.values(body.translations || {}).find((value) => value?.name?.trim());
    for (const locale of LOCALES) {
      const value = body.translations?.[locale] || firstTranslation;
      if (!value?.name?.trim()) continue;
      await db.insert(serviceTranslations).values({ serviceId: created.id, locale, name: value.name.trim(), summary: value.summary?.trim(), description: value.description?.trim() });
    }
    return json({ ok: true, data: created }, { status: 201 });
  } catch (error) { console.error(error); return errorResponse("Unable to create service.", 500); }
}
