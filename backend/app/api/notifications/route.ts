import { and, desc, eq, inArray, lt } from "drizzle-orm";
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
import { housingAppointmentReminderService } from "@/lib/services/housing-appointment-reminder-service";
import { travelReminderService } from "@/lib/services/travel-reminder-service";
import { paymentNotificationAutomationService } from "@/lib/services/payment-notification-automation-service";
import { mayManageOrganization, requireSession } from "@/lib/security/route-authorization";

export const dynamic = "force-dynamic";

type Audience = "customer" | "partner" | "admin";

export async function GET(request: Request) {
  try {
    const gate = await requireSession(request, ["customer", "partner", "admin"]);
    if (!gate.ok) return gate.response;
    await completeExpiredOrders();
    await housingAppointmentReminderService.evaluate();
    await travelReminderService.evaluate();
    await paymentNotificationAutomationService.evaluate();
    const url = new URL(request.url);
    const locale = localeFromRequest(request);
    const audience = (url.searchParams.get("audience") || "customer") as Audience;
    const organizationId = url.searchParams.get("organizationId")?.trim();
    const codes = (url.searchParams.get("codes") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 30);

    if (!new Set<Audience>(["customer", "partner", "admin"]).has(audience)) {
      return errorResponse("Unsupported notification audience.", 422);
    }
    if (gate.session.role !== audience) return errorResponse("Notification scope denied.", 403);
    if (audience === "partner" && (!organizationId || !(await mayManageOrganization(gate.session, organizationId)))) {
      return errorResponse("Organization not found.", 404);
    }
    if (audience === "customer" && !codes.length) return json({ ok: true, data: [], alerts: [] });
    if (audience === "partner" && !organizationId) return json({ ok: true, data: [], alerts: [] });

    const filters = [];
    if (audience === "customer") filters.push(and(eq(serviceRequests.customerId, gate.session.userId), inArray(serviceRequests.requestCode, codes))!);
    if (audience === "partner" && organizationId) filters.push(eq(serviceRequests.assignedOrganizationId, organizationId));

    const rows = await getDb()
      .select({
        id: serviceRequestStatusHistory.id,
        requestId: serviceRequests.id,
        requestCode: serviceRequests.requestCode,
        status: serviceRequestStatusHistory.toStatus,
        note: serviceRequestStatusHistory.note,
        createdAt: serviceRequestStatusHistory.createdAt,
        customerName: serviceRequests.customerName,
        title: serviceRequests.title,
        moduleName: moduleTranslations.name,
        serviceName: serviceTranslations.name,
        organizationName: organizations.name,
      })
      .from(serviceRequestStatusHistory)
      .innerJoin(serviceRequests, eq(serviceRequestStatusHistory.requestId, serviceRequests.id))
      .innerJoin(modules, eq(serviceRequests.moduleId, modules.id))
      .leftJoin(moduleTranslations, and(eq(moduleTranslations.moduleId, modules.id), eq(moduleTranslations.locale, locale)))
      .leftJoin(services, eq(serviceRequests.serviceId, services.id))
      .leftJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, locale)))
      .leftJoin(organizations, eq(serviceRequests.assignedOrganizationId, organizations.id))
      .where(filters.length ? (filters.length === 1 ? filters[0] : and(...filters)) : undefined)
      .orderBy(desc(serviceRequestStatusHistory.createdAt))
      .limit(audience === "admin" ? 100 : 50);

    const alerts = audience === "admin"
      ? await getDb()
          .select({
            id: serviceRequests.id,
            requestCode: serviceRequests.requestCode,
            status: serviceRequests.status,
            customerName: serviceRequests.customerName,
            title: serviceRequests.title,
            createdAt: serviceRequests.createdAt,
          })
          .from(serviceRequests)
          .where(and(inArray(serviceRequests.status, ["new", "reviewing", "assigned"]), lt(serviceRequests.createdAt, new Date(Date.now() - 10 * 60 * 1000))))
          .orderBy(desc(serviceRequests.createdAt))
          .limit(30)
      : [];

    const uniqueMap = new Map<string,(typeof rows)[number]>();
    for (const row of rows) {
      const housingEvent = String(row.note || "").startsWith("HOUSING_MESSAGE:") || String(row.note || "").startsWith("HOUSING_APPOINTMENT_REMINDER:");
      const travelEvent = String(row.note || "").startsWith("TRAVEL_MESSAGE:") || String(row.note || "").startsWith("TRAVEL_DEPARTURE_REMINDER:");
      const paymentEvent = String(row.note || "").startsWith("PAYMENT_") || String(row.note || "").startsWith("TRAVEL_PARTNER_PAYMENT_");
      const key = housingEvent ? `housing:${row.id}` : travelEvent ? `travel:${row.id}` : paymentEvent ? `payment:${row.id}` : `${row.requestId}:${row.status}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key,row);
    }
    const uniqueRows = Array.from(uniqueMap.values());
    return json({ ok: true, data: uniqueRows, alerts });
  } catch (error) {
    console.error(error);
    return errorResponse("Unable to load notifications.", 500);
  }
}
