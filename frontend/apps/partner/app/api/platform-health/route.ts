export const dynamic = "force-dynamic";

const backend = () => process.env.ZHAOXI_BACKEND_URL || process.env.NEXT_PUBLIC_ZHAOXI_API_URL || "https://zhaoxi-app-puce.vercel.app";

export async function GET() {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${backend()}/api/health`, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);
    const payload = await response.json().catch(() => ({ ok:false }));
    return Response.json({
      ok: response.ok && Boolean(payload?.ok),
      app: "zhaoxi-platform",
      backendLatencyMs: Date.now() - started,
      backend: payload,
      timestamp: new Date().toISOString(),
    }, { status: response.ok ? 200 : 503, headers: { "cache-control":"no-store" } });
  } catch {
    return Response.json({
      ok:false,
      app:"zhaoxi-platform",
      backendLatencyMs: Date.now() - started,
      error:"BACKEND_UNAVAILABLE",
      timestamp:new Date().toISOString(),
    }, { status:503, headers:{ "cache-control":"no-store" } });
  }
}
