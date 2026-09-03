import { and, count, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { moduleTranslations, modules, organizations, serviceRequests, services, serviceTranslations } from "@/db/schema";

const FALLBACK: Record<string, { emoji: string; imageKey: string }> = {
  food: { emoji: "🍜", imageKey: "food" },
  travel: { emoji: "🏖️", imageKey: "travel" },
  "car-rental": { emoji: "🚙", imageKey: "car-rental" },
  housing: { emoji: "🏠", imageKey: "housing" },
  translation: { emoji: "🗣️", imageKey: "translation" },
  visa: { emoji: "🛂", imageKey: "visa" },
  payment: { emoji: "💳", imageKey: "payment" },
  market: { emoji: "🛍️", imageKey: "market" },
  community: { emoji: "👥", imageKey: "community" },
  emergency: { emoji: "🆘", imageKey: "emergency" },
};

function mediaUrl(serviceMetadata: Record<string, unknown> | null, orgMetadata: Record<string, unknown> | null) {
  const sm = serviceMetadata || {};
  const om = orgMetadata || {};
  if (typeof sm.imageUrl === "string" && sm.imageUrl) return sm.imageUrl;
  const banners = Array.isArray(om.bannerUrls) ? om.bannerUrls : [];
  if (typeof banners[0] === "string" && banners[0]) return banners[0];
  if (typeof om.logoUrl === "string" && om.logoUrl) return om.logoUrl;
  return undefined;
}
function href(moduleCode: string, serviceId?: string, organizationId?: string) {
  if (moduleCode === "food" && organizationId) return `/restaurant/${organizationId}`;
  if (serviceId) return `/service/${serviceId}`;
  return `/services/${moduleCode}`;
}
function newestBonus(date: Date) {
  const ageDays = Math.max(0, (Date.now() - date.getTime()) / 86400000);
  return ageDays <= 14 ? 55 : ageDays <= 30 ? 30 : ageDays <= 90 ? 10 : 0;
}

export type MarketplaceRecommendation = {
  id: string;
  kind: "partner_service" | "module_fallback";
  moduleCode: string;
  title: string;
  summary?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  priceFrom?: string | null;
  currency?: string;
  imageUrl?: string;
  imageKey: string;
  emoji: string;
  href: string;
  usageCount: number;
  isNew: boolean;
  score: number;
};

export class MarketplaceRecommendationService {
  async list(locale: string, limit = 12, offset = 0): Promise<MarketplaceRecommendation[]> {
    const db = getDb();
    const usageRows = await db.select({ serviceId: serviceRequests.serviceId, total: count(serviceRequests.id) })
      .from(serviceRequests).where(isNotNull(serviceRequests.serviceId)).groupBy(serviceRequests.serviceId);
    const usage = new Map(usageRows.map((row) => [row.serviceId || "", Number(row.total || 0)]));

    const rows = await db.select({
      id: services.id, moduleCode: modules.code, moduleName: moduleTranslations.name,
      serviceName: serviceTranslations.name, summary: serviceTranslations.summary,
      priceFrom: services.priceFrom, currency: services.currency, serviceMetadata: services.metadata,
      serviceCreatedAt: services.createdAt, organizationId: organizations.id,
      organizationName: organizations.name, organizationMetadata: organizations.metadata,
      organizationCreatedAt: organizations.createdAt,
    }).from(services)
      .innerJoin(modules, eq(services.moduleId, modules.id))
      .innerJoin(organizations, and(eq(services.organizationId, organizations.id), eq(organizations.status, "active")))
      .leftJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, locale)))
      .leftJoin(moduleTranslations, and(eq(moduleTranslations.moduleId, modules.id), eq(moduleTranslations.locale, locale)))
      .where(and(eq(services.isEnabled, true), eq(modules.isEnabled, true)));

    const candidates: MarketplaceRecommendation[] = rows.map((row) => {
      const used = usage.get(row.id) || 0;
      const recentDate = row.serviceCreatedAt > row.organizationCreatedAt ? row.serviceCreatedAt : row.organizationCreatedAt;
      const isNew = (Date.now() - recentDate.getTime()) <= 30 * 86400000;
      const fallback = FALLBACK[row.moduleCode] || { emoji: "✨", imageKey: "default" };
      return {
        id: row.id, kind: "partner_service", moduleCode: row.moduleCode,
        title: row.serviceName || row.organizationName || row.moduleName || row.moduleCode,
        summary: row.summary, organizationId: row.organizationId, organizationName: row.organizationName,
        priceFrom: row.priceFrom, currency: row.currency,
        imageUrl: mediaUrl(row.serviceMetadata, row.organizationMetadata), imageKey: fallback.imageKey,
        emoji: fallback.emoji, href: href(row.moduleCode, row.id, row.organizationId), usageCount: used, isNew,
        score: used * 100 + newestBonus(recentDate),
      };
    });

    candidates.sort((a, b) => b.score - a.score || b.usageCount - a.usageCount || a.title.localeCompare(b.title));

    // Keep the home feed diverse: take one item per module first, then fill with the remaining best items.
    const diverse: MarketplaceRecommendation[] = [];
    const usedIds = new Set<string>();
    const moduleCodes = [...new Set(candidates.map((item) => item.moduleCode))];
    for (const code of moduleCodes) {
      const item = candidates.find((candidate) => candidate.moduleCode === code && !usedIds.has(candidate.id));
      if (item) { diverse.push(item); usedIds.add(item.id); }
    }
    for (const item of candidates) if (!usedIds.has(item.id)) { diverse.push(item); usedIds.add(item.id); }

    // Modules without a registered partner stay discoverable with a category-specific visual fallback.
    const moduleRows = await db.select({ code: modules.code, name: moduleTranslations.name })
      .from(modules)
      .leftJoin(moduleTranslations, and(eq(moduleTranslations.moduleId, modules.id), eq(moduleTranslations.locale, locale)))
      .where(eq(modules.isEnabled, true));
    const partneredModules = new Set(candidates.map((item) => item.moduleCode));
    for (const module of moduleRows) {
      if (partneredModules.has(module.code)) continue;
      const fallback = FALLBACK[module.code] || { emoji: "✨", imageKey: "default" };
      diverse.push({
        id: `module:${module.code}`, kind: "module_fallback", moduleCode: module.code,
        title: module.name || module.code, summary: null, organizationId: null, organizationName: null,
        priceFrom: null, currency: "VND", imageKey: fallback.imageKey, emoji: fallback.emoji,
        href: `/services/${module.code}`, usageCount: 0, isNew: false, score: 0,
      });
    }

    const safeLimit = Math.max(1, Math.min(30, limit));
    const start = diverse.length ? Math.max(0, offset) % diverse.length : 0;
    const rotated = [...diverse.slice(start), ...diverse.slice(0, start)];
    return rotated.slice(0, safeLimit);
  }
}

export const marketplaceRecommendationService = new MarketplaceRecommendationService();
