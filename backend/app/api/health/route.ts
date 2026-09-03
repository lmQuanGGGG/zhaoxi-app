import { healthService } from "@/lib/services/health-service";
export const dynamic = "force-dynamic";
export async function GET() {
  const database = await healthService.checkDatabase();
  const ok = database.ok;
  return Response.json({
    ok,
    status: ok ? "healthy" : "degraded",
    service: "zhaoxi-backend",
    product: "ZhaoXi",
    release: { version:"19.0.0", channel:"beta", architecture:"security-containment-19.0" },
    dependencies: { database },
    capabilities: healthService.configuration(),
    timestamp: new Date().toISOString(),
  }, { status: ok ? 200 : 503, headers:{ "cache-control":"no-store" } });
}

