import { NextResponse as EdgeNextResponse } from "next/server";
export const runtime="edge";
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){
  try {
    const {id}=await context.params;
    const token=request.cookies.get("zx_access_v2")?.value;
    const response=await fetch(`${backend()}/api/service-requests/${id}/assignment`,{method:"PATCH",headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},body:await request.text(),cache:"no-store"});
    const payload = await response.json().catch(() => null);
    return EdgeNextResponse.json(payload || { ok: false, error: { code: "ASSIGNMENT_UPDATE_FAILED" } }, { status: response.status });
  } catch {
    return EdgeNextResponse.json({ ok: false, error: { code: "ASSIGNMENT_UPDATE_UNAVAILABLE" } }, { status: 503 });
  }
}
