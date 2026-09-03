import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  modules,
  moduleTranslations,
  organizations,
  serviceRequests,
  serviceRequestStatusHistory,
  services,
  serviceTranslations,
} from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { localeFromRequest } from "@/lib/locale";
import { completeExpiredOrders } from "@/lib/order-timers";
import { mayAccessRequest, requireSession } from "@/lib/security/route-authorization";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const gate = await requireSession(request);
    if (!gate.ok) return gate.response;
    const access = await mayAccessRequest(gate.session, id);
    if (!access.exists || !access.allowed) return errorResponse("Service request not found.", 404);
    await completeExpiredOrders();
    const locale = localeFromRequest(request);
    const db = getDb();
    const [requestRow] = await db
      .select({
        id: serviceRequests.id,
        requestCode: serviceRequests.requestCode,
        customerId: serviceRequests.customerId,
        status: serviceRequests.status,
        customerName: serviceRequests.customerName,
        customerPhone: serviceRequests.customerPhone,
        title: serviceRequests.title,
        description: serviceRequests.description,
        addressText: serviceRequests.addressText,
        latitude: serviceRequests.latitude,
        longitude: serviceRequests.longitude,
        details: serviceRequests.details,
        createdAt: serviceRequests.createdAt,
        updatedAt: serviceRequests.updatedAt,
        moduleCode: modules.code,
        moduleName: moduleTranslations.name,
        serviceId: services.id,
        serviceName: serviceTranslations.name,
        organizationName: organizations.name,
        organizationCode: organizations.code,
      })
      .from(serviceRequests)
      .innerJoin(modules, eq(serviceRequests.moduleId, modules.id))
      .leftJoin(moduleTranslations, and(eq(moduleTranslations.moduleId, modules.id), eq(moduleTranslations.locale, locale)))
      .leftJoin(services, eq(serviceRequests.serviceId, services.id))
      .leftJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, locale)))
      .leftJoin(organizations, eq(serviceRequests.assignedOrganizationId, organizations.id))
      .where(eq(serviceRequests.id, id))
      .limit(1);
    if (!requestRow) return errorResponse("Service request not found.", 404);
    const history = await db
      .select()
      .from(serviceRequestStatusHistory)
      .where(eq(serviceRequestStatusHistory.requestId, id))
      .orderBy(asc(serviceRequestStatusHistory.createdAt));
    return json({ ok: true, data: { ...requestRow, history } });
  } catch (error) {
    console.error(error);
    return errorResponse("Unable to load service request.", 500);
  }
}
