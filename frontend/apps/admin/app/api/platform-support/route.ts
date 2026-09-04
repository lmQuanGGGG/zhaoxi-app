import {NextRequest} from "next/server";
export const dynamic="force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app";
export async function GET(request:NextRequest){const access=request.cookies.get("zx_access_v2")?.value||"";const r=await fetch(`${backend()}/api/support?${request.nextUrl.searchParams.toString()}`,{cache:"no-store",headers:access?{authorization:`Bearer ${access}`}:{}});return Response.json(await r.json(),{status:r.status});}
export async function POST(request:NextRequest){const access=request.cookies.get("zx_access_v2")?.value||"";const r=await fetch(`${backend()}/api/support`,{method:"POST",headers:{"content-type":"application/json",...(access?{authorization:`Bearer ${access}`}:{})},body:await request.text(),cache:"no-store"});return Response.json(await r.json(),{status:r.status});}
