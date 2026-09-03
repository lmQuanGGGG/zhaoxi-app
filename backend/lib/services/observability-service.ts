import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { runtimeEvents } from "@/db/schema";

const APPS = new Set(["customer","partner","admin","driver","backend"]);
const LEVELS = new Set(["info","warning","error","critical"]);
function clean(value: unknown, max=2000) { return String(value ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0,max); }
function safeMetadata(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, unknown> = {};
  for (const [key,value] of Object.entries(input as Record<string,unknown>).slice(0,20)) {
    if (/token|secret|password|authorization|cookie/i.test(key)) continue;
    out[key.slice(0,80)] = typeof value === "string" ? value.slice(0,500) : value;
  }
  return out;
}

export class ObservabilityService {
  async capture(input: Record<string, unknown>) {
    const appRaw=clean(input.app,24); const severityRaw=clean(input.severity,16);
    const [row] = await getDb().insert(runtimeEvents).values({
      app: APPS.has(appRaw) ? appRaw : "customer",
      environment: clean(input.environment || process.env.VERCEL_ENV || process.env.NODE_ENV || "production",24),
      severity: LEVELS.has(severityRaw) ? severityRaw : "error",
      eventType: clean(input.eventType || "runtime_error",64),
      message: clean(input.message || "Unknown runtime error",2000),
      digest: clean(input.digest,180) || null,
      route: clean(input.route,600) || null,
      release: clean(input.release || "15.1.0",40),
      userAgent: clean(input.userAgent,700) || null,
      metadata: safeMetadata(input.metadata),
    }).returning();
    return row;
  }
  async recent(input:{hours?:number; app?:string; severity?:string; limit?:number}={}) {
    const hours=Math.max(1,Math.min(720,Number(input.hours||24))); const since=new Date(Date.now()-hours*3600000);
    const conditions=[gte(runtimeEvents.createdAt,since)];
    if(input.app && APPS.has(input.app)) conditions.push(eq(runtimeEvents.app,input.app));
    if(input.severity && LEVELS.has(input.severity)) conditions.push(eq(runtimeEvents.severity,input.severity));
    return getDb().select().from(runtimeEvents).where(and(...conditions)).orderBy(desc(runtimeEvents.createdAt)).limit(Math.max(1,Math.min(200,Number(input.limit||100))));
  }
  async summary(hours=24) {
    const rows=await this.recent({hours,limit:200});
    const byApp=new Map<string,number>(), bySeverity=new Map<string,number>(), byType=new Map<string,number>();
    for(const row of rows){byApp.set(row.app,(byApp.get(row.app)||0)+1);bySeverity.set(row.severity,(bySeverity.get(row.severity)||0)+1);byType.set(row.eventType,(byType.get(row.eventType)||0)+1)}
    const unresolved=rows.filter(r=>!r.resolvedAt && ["error","critical"].includes(r.severity));
    return {generatedAt:new Date().toISOString(),hours,total:rows.length,unresolved:unresolved.length,critical:rows.filter(r=>r.severity==="critical").length,error:rows.filter(r=>r.severity==="error").length,byApp:[...byApp].map(([app,count])=>({app,count})),bySeverity:[...bySeverity].map(([severity,count])=>({severity,count})),byType:[...byType].map(([eventType,count])=>({eventType,count})),recent:rows.slice(0,20)};
  }
}
export const observabilityService=new ObservabilityService();
