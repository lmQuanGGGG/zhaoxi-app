import { NextRequest } from "next/server";
export const dynamic="force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-backend.vercel.app";
function auth(request:NextRequest):Record<string,string>{const token=request.cookies.get("zx_access_v2")?.value;return token?{authorization:`Bearer ${token}`}:{}}
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){const {id}=await context.params;const response=await fetch(`${backend()}/api/services/${encodeURIComponent(id)}`,{method:"PATCH",headers:{"content-type":"application/json",...auth(request)},body:await request.text(),cache:"no-store"});return Response.json(await response.json(),{status:response.status})}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const organizationId = request.nextUrl.searchParams.get("organizationId") || "";
  const response = await fetch(`${backend()}/api/services/${encodeURIComponent(id)}?organizationId=${encodeURIComponent(organizationId)}`, {
    method: "DELETE",
    headers: auth(request),
    cache: "no-store",
  });
  return Response.json(await response.json(), { status: response.status });
}
