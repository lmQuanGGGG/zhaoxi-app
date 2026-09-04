import { NextRequest, NextResponse } from "next/server";
export const runtime="edge";export const dynamic="force-dynamic";
const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app").replace(/\/+$/,""));
async function forward(request:NextRequest){const token=request.cookies.get("zx_access_v2")?.value;const headers:Record<string,string>={};if(token)headers.authorization=`Bearer ${token}`;if(request.method!=="GET")headers["content-type"]="application/json";const response=await fetch(`${backend()}/api/partner-push/subscription`,{method:request.method,headers,body:request.method==="GET"?undefined:await request.text(),cache:"no-store"});return NextResponse.json(await response.json().catch(()=>({ok:false})),{status:response.status});}
export const GET=forward;export const POST=forward;export const DELETE=forward;
