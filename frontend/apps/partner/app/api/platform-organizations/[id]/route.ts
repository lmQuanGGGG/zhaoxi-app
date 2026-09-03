import { NextRequest } from "next/server";
export const dynamic="force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-backend.vercel.app";
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){const {id}=await context.params;const token=request.cookies.get("zx_access_v2")?.value;const response=await fetch(`${backend()}/api/organizations/${encodeURIComponent(id)}`,{method:"PATCH",headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},body:await request.text(),cache:"no-store"});return Response.json(await response.json(),{status:response.status})}
