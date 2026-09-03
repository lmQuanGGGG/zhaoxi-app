import { and, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { deliveryJobs, driverProfiles, modules, organizations, paymentTransactions, serviceRequests, services, supportConversations } from "@/db/schema";

type RowDetails = Record<string, unknown>;
const terminal = new Set(["completed", "cancelled", "rejected"]);
const cancelled = new Set(["cancelled", "rejected"]);
function numberFrom(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function dayKey(date: Date) { return date.toISOString().slice(0, 10); }

export class AnalyticsService {
  async overview(input: { organizationId?: string; days?: number } = {}) {
    const db = getDb();
    const days = Math.max(1, Math.min(365, Number(input.days || 30)));
    const since = new Date(Date.now() - days * 86400000);
    const requestWhere = input.organizationId
      ? and(eq(serviceRequests.assignedOrganizationId, input.organizationId), gte(serviceRequests.createdAt, since))
      : gte(serviceRequests.createdAt, since);
    const requests = await db.select().from(serviceRequests).where(requestWhere);
    const requestIds = new Set(requests.map((row) => row.id));
    const allModules = await db.select().from(modules);
    const moduleMap = new Map(allModules.map((row) => [row.id, { code: row.code, name: row.code }]));

    const allPayments = await db.select().from(paymentTransactions).where(gte(paymentTransactions.createdAt, since));
    const payments = allPayments.filter((row) => requestIds.has(row.requestId));
    const allDeliveries = await db.select().from(deliveryJobs).where(gte(deliveryJobs.createdAt, since));
    const deliveries = allDeliveries.filter((row) => requestIds.has(row.requestId));

    const partnerRows = input.organizationId
      ? await db.select().from(organizations).where(eq(organizations.id, input.organizationId))
      : await db.select().from(organizations).where(eq(organizations.status, "active"));
    const serviceRows = input.organizationId
      ? await db.select().from(services).where(eq(services.organizationId, input.organizationId))
      : await db.select().from(services);
    const drivers = await db.select().from(driverProfiles);
    const support = input.organizationId
      ? await db.select().from(supportConversations).where(eq(supportConversations.organizationId, input.organizationId))
      : await db.select().from(supportConversations);

    const statusCount = new Map<string, number>();
    const moduleMetrics = new Map<string, { code:string; name:string; orders:number; completed:number; cancelled:number; gmv:number }>();
    const daily = new Map<string, { date:string; orders:number; completed:number; gmv:number }>();
    let gmv = 0;
    for (const row of requests) {
      statusCount.set(row.status, (statusCount.get(row.status) || 0) + 1);
      const details = (row.details || {}) as RowDetails;
      const total = numberFrom(details.totalAmount ?? details.itemSubtotal ?? 0);
      gmv += total;
      const mod = moduleMap.get(row.moduleId) || { code: "other", name: "other" };
      const metric = moduleMetrics.get(mod.code) || { code: mod.code, name: mod.name, orders:0, completed:0, cancelled:0, gmv:0 };
      metric.orders += 1; metric.gmv += total;
      if (row.status === "completed") metric.completed += 1;
      if (cancelled.has(row.status)) metric.cancelled += 1;
      moduleMetrics.set(mod.code, metric);
      const key = dayKey(row.createdAt);
      const d = daily.get(key) || { date:key, orders:0, completed:0, gmv:0 };
      d.orders += 1; d.gmv += total; if (row.status === "completed") d.completed += 1;
      daily.set(key, d);
    }

    const paymentMap = new Map<string, { status:string; count:number; amount:number }>();
    let collectedRevenue = 0;
    for (const row of payments) {
      const item = paymentMap.get(row.status) || { status:row.status, count:0, amount:0 };
      const amount = numberFrom(row.amount); item.count += 1; item.amount += amount; paymentMap.set(row.status, item);
      if (["paid", "cash_collected"].includes(row.status)) collectedRevenue += amount;
    }
    const deliveryMap = new Map<string, number>();
    for (const row of deliveries) deliveryMap.set(row.status, (deliveryMap.get(row.status) || 0) + 1);

    const completed = requests.filter((r) => r.status === "completed").length;
    const cancelledCount = requests.filter((r) => cancelled.has(r.status)).length;
    const active = requests.filter((r) => !terminal.has(r.status)).length;
    return {
      generatedAt: new Date().toISOString(), scope: input.organizationId ? "organization" : "platform",
      organizationId: input.organizationId, periodDays: days,
      totals: {
        orders: requests.length, completed, active, cancelled: cancelledCount,
        completionRate: requests.length ? completed / requests.length * 100 : 0,
        gmv, collectedRevenue,
        partners: partnerRows.length, services: serviceRows.filter((r) => r.isEnabled).length,
        drivers: drivers.length, activeDrivers: drivers.filter((r) => r.status !== "offline").length,
        deliveries: deliveries.length, delivered: deliveries.filter((r) => r.status === "delivered").length,
        openSupport: support.filter((r) => r.status === "open" || r.status === "human_queue").length,
      },
      modules: [...moduleMetrics.values()].sort((a,b) => b.orders - a.orders),
      orderStatus: [...statusCount.entries()].map(([status,count]) => ({status,count})).sort((a,b)=>b.count-a.count),
      paymentStatus: [...paymentMap.values()].sort((a,b)=>b.count-a.count),
      deliveryStatus: [...deliveryMap.entries()].map(([status,count])=>({status,count})).sort((a,b)=>b.count-a.count),
      daily: [...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)),
    };
  }
}
export const analyticsService = new AnalyticsService();
