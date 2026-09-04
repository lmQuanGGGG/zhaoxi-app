import { NextResponse as EdgeNextResponse } from "next/server";
export const runtime="edge";
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");
export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  for (const key of ["audience", "codes", "organizationId", "locale"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) params.set(key, value);
  }
  try {
    const token = request.cookies.get("zx_access_v2")?.value;
    const response = await fetch(`${backend()}/api/notifications?${params}`, { headers: token ? { authorization: `Bearer ${token}` } : {}, cache: "no-store" });
    const payload = await response.json().catch(() => null);
    return EdgeNextResponse.json(payload || { ok: true, data: [] }, { status: response.status });
  } catch {
    return EdgeNextResponse.json({ ok: false, data: [], alerts: [], error: { message: "Backend unavailable" } }, { status: 503 });
  }
}
