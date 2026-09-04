import { NextRequest } from "next/server";
export const dynamic="force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app";
export async function GET(request:NextRequest){
  try {
    const params=new URLSearchParams(request.nextUrl.searchParams);
    const token=request.cookies.get("zx_access_v2")?.value;
    const response=await fetch(`${backend()}/api/analytics/overview?${params.toString()}`,{headers:token?{authorization:`Bearer ${token}`}:{},cache:"no-store"});
    const payload = await response.json().catch(() => null);
    return Response.json(payload || { ok: false, error: { code: "ANALYTICS_UNAVAILABLE" } }, { status: response.status });
  } catch {
    return Response.json({ ok: false, error: { code: "ANALYTICS_UNAVAILABLE" } }, { status: 503 });
  }
}
