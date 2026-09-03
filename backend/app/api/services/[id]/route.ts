import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { modules, organizations, services, serviceTranslations } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { localeFromRequest } from "@/lib/locale";
import { mayManageOrganization, requireSession } from "@/lib/security/route-authorization";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const LOCALES = ["zh-CN", "zh-TW", "vi-VN", "en-US"] as const;
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params; const locale = localeFromRequest(request);
    const rows = await getDb().select({ id:services.id, code:services.code, moduleCode:modules.code, priceFrom:services.priceFrom, currency:services.currency, metadata:services.metadata, name:serviceTranslations.name, summary:serviceTranslations.summary, description:serviceTranslations.description,
      organization:{ id:organizations.id, code:organizations.code, name:organizations.name, description:organizations.description, phone:organizations.phone, address:organizations.addressText, metadata:organizations.metadata },
    }).from(services).innerJoin(modules,eq(services.moduleId,modules.id)).leftJoin(organizations,eq(services.organizationId,organizations.id)).leftJoin(serviceTranslations,and(eq(serviceTranslations.serviceId,services.id),eq(serviceTranslations.locale,locale))).where(and(eq(services.id,id),eq(services.isEnabled,true))).limit(1);
    if(!rows[0])return errorResponse("Service not found.",404); return json({ok:true,locale,data:rows[0]});
  } catch(error){console.error(error);return errorResponse("Unable to load service.",500)}
}
export async function PATCH(request: Request, context: Context) {
  try {
    const gate = await requireSession(request, ["admin", "partner"]);
    if (!gate.ok) return gate.response;
    const { id } = await context.params;
    const body = await request.json() as { organizationId?:string; price?:number|string; currency?:string; isEnabled?:boolean; metadata?:Record<string,unknown>; translations?:Partial<Record<(typeof LOCALES)[number],{name?:string;summary?:string;description?:string}>> };
    const db=getDb(); const [current]=await db.select().from(services).where(eq(services.id,id)).limit(1); if(!current)return errorResponse("Service not found.",404);
    if(!current.organizationId || !(await mayManageOrganization(gate.session,current.organizationId)))return errorResponse("Service not found.",404);
    if(body.organizationId&&body.organizationId!==current.organizationId)return errorResponse("Organization mismatch.",403);
    const [updated]=await db.update(services).set({priceFrom:body.price!==undefined?String(Math.max(0,Number(body.price))):current.priceFrom,currency:body.currency||current.currency,isEnabled:body.isEnabled??current.isEnabled,metadata:body.metadata?{...(current.metadata||{}),...body.metadata}:current.metadata,updatedAt:new Date()}).where(eq(services.id,id)).returning();
    for(const locale of LOCALES){const value=body.translations?.[locale];if(!value?.name?.trim())continue;await db.insert(serviceTranslations).values({serviceId:id,locale,name:value.name.trim(),summary:value.summary?.trim(),description:value.description?.trim()}).onConflictDoUpdate({target:[serviceTranslations.serviceId,serviceTranslations.locale],set:{name:value.name.trim(),summary:value.summary?.trim(),description:value.description?.trim()}})}
    return json({ok:true,data:updated});
  }catch(error){console.error(error);return errorResponse("Unable to update service.",500)}
}

export async function DELETE(request: Request, context: Context) {
  try {
    const gate = await requireSession(request, ["admin", "partner"]);
    if (!gate.ok) return gate.response;
    const { id } = await context.params;
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");
    const db = getDb();
    const [current] = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (!current) return errorResponse("Service not found.", 404);
    if (!current.organizationId || !(await mayManageOrganization(gate.session, current.organizationId))) return errorResponse("Service not found.", 404);
    if (!organizationId || organizationId !== current.organizationId) return errorResponse("Organization mismatch.", 403);
    const [updated] = await db.update(services).set({ isEnabled: false, updatedAt: new Date() }).where(eq(services.id, id)).returning();
    return json({ ok: true, data: updated });
  } catch (error) {
    console.error(error);
    return errorResponse("Unable to delete service.", 500);
  }
}
