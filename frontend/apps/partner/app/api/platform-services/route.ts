import { NextRequest } from "next/server";
export const dynamic="force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-backend.vercel.app";
function auth(request:NextRequest):Record<string,string>{const token=request.cookies.get("zx_access_v2")?.value;return token?{authorization:`Bearer ${token}`}:{}}
export async function GET(request:NextRequest){const params=new URLSearchParams(request.nextUrl.searchParams);const response=await fetch(`${backend()}/api/services?${params}`,{headers:auth(request),cache:"no-store"});return Response.json(await response.json(),{status:response.status})}
export async function POST(request:NextRequest){const response=await fetch(`${backend()}/api/services`,{method:"POST",headers:{"content-type":"application/json",...auth(request)},body:await request.text(),cache:"no-store"});return Response.json(await response.json(),{status:response.status})}
