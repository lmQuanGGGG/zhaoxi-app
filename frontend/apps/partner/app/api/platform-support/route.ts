export const runtime="edge";
async function safeJsonResponse(res:Response){try{const text=await res.text();return Response.json(JSON.parse(text),{status:res.status});}catch{return Response.json({ok:false,error:{code:"UPSTREAM_UNAVAILABLE",upstreamStatus:res.status}},{status:res.status>=400?res.status:502});}}
import {NextRequest} from "next/server";
export const dynamic="force-dynamic";
const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");
export async function GET(request:NextRequest){const access=request.cookies.get("zx_access_v2")?.value||"";const r=await fetch(`${backend()}/api/support?${request.nextUrl.searchParams.toString()}`,{cache:"no-store",headers:access?{authorization:`Bearer ${access}`}:{}});return safeJsonResponse(r);}
export async function POST(request:NextRequest){const access=request.cookies.get("zx_access_v2")?.value||"";const r=await fetch(`${backend()}/api/support`,{method:"POST",headers:{"content-type":"application/json",...(access?{authorization:`Bearer ${access}`}:{})},body:await request.text(),cache:"no-store"});return safeJsonResponse(r);}
