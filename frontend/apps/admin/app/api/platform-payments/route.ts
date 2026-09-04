import { NextRequest } from "next/server";
export const dynamic="force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app";
function auth(request:NextRequest):Record<string,string>{const token=request.cookies.get("zx_access_v2")?.value;return token?{authorization:`Bearer ${token}`}:{}}
export async function GET(request:NextRequest){try{const response=await fetch(`${backend()}/api/payments?${new URLSearchParams(request.nextUrl.searchParams)}`,{headers:auth(request),cache:"no-store"});return Response.json(await response.json(),{status:response.status})}catch{return Response.json({ok:false,error:{message:"Backend unavailable"}},{status:503})}}
export async function POST(request:NextRequest){try{const response=await fetch(`${backend()}/api/payments`,{method:"POST",headers:{"content-type":"application/json",...auth(request)},body:JSON.stringify(await request.json()),cache:"no-store"});return Response.json(await response.json(),{status:response.status})}catch{return Response.json({ok:false,error:{message:"Backend unavailable"}},{status:503})}}
