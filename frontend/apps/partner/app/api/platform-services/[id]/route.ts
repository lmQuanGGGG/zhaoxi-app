import { NextRequest } from "next/server";
export const dynamic="force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app";
function auth(request:NextRequest):Record<string,string>{const token=request.cookies.get("zx_access_v2")?.value;return token?{authorization:`Bearer ${token}`}:{}}
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){try{const {id}=await context.params;const response=await fetch(`${backend()}/api/services/${encodeURIComponent(id)}`,{method:"PATCH",headers:{"content-type":"application/json",...auth(request)},body:await request.text(),cache:"no-store"});const payload=await response.json().catch(()=>null);return Response.json(payload||{ok:false,error:{code:"SERVICE_UPDATE_FAILED"}},{status:response.status})}catch{return Response.json({ok:false,error:{code:"SERVICE_UPDATE_UNAVAILABLE"}},{status:503})}}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try{
    const { id } = await context.params;
    const organizationId = request.nextUrl.searchParams.get("organizationId") || "";
    const response = await fetch(`${backend()}/api/services/${encodeURIComponent(id)}?organizationId=${encodeURIComponent(organizationId)}`, {
      method: "DELETE",
      headers: auth(request),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    return Response.json(payload || { ok: false, error: { code: "SERVICE_DELETE_FAILED" } }, { status: response.status });
  }catch{
    return Response.json({ ok: false, error: { code: "SERVICE_DELETE_UNAVAILABLE" } }, { status: 503 });
  }
}
