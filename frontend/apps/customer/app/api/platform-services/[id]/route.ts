import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
type Context={params:Promise<{id:string}>};
const backend = () => process.env.ZHAOXI_BACKEND_URL || process.env.NEXT_PUBLIC_ZHAOXI_API_URL || "https://zhaoxi-backend.vercel.app";
export async function GET(request:NextRequest, context:Context){
  const {id}=await context.params;
  const locale=request.nextUrl.searchParams.get("locale")||"zh-CN";
  try { const response=await fetch(`${backend()}/api/services/${encodeURIComponent(id)}?locale=${encodeURIComponent(locale)}`,{cache:"no-store"}); const data=await response.json(); return Response.json(data,{status:response.status}); }
  catch { return Response.json({ok:false,error:"Backend unavailable"},{status:503}); }
}
