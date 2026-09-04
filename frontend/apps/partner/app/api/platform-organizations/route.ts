export const runtime="edge";
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");
export async function GET(request:NextRequest){
  try {
    const params=new URLSearchParams(request.nextUrl.searchParams);
    if(!params.has("status")) params.set("status","active");
    const response=await fetch(`${backend()}/api/organizations?${params.toString()}`,{cache:"no-store"});
    const payload = await response.json().catch(() => null);
    return Response.json(payload || { ok: true, data: [] }, { status: response.status });
  } catch {
    return Response.json({ ok: false, data: [], error: { code: "ORGANIZATIONS_UNAVAILABLE" } }, { status: 503 });
  }
}
