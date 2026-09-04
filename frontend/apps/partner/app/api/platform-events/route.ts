import { NextResponse as EdgeNextResponse } from "next/server";
export const runtime="edge";
export const dynamic="force-dynamic";
function backend(){return process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_BACKEND_URL||"http://localhost:3000"}
export async function POST(request:NextRequest){try{const token=request.cookies.get("zx_access_v2")?.value;const body=await request.json().catch(()=>({}));const response=await fetch(`${backend()}/api/observability/events`,{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body),cache:"no-store"});const payload=await response.json().catch(()=>null);return EdgeNextResponse.json(payload||{ok:true},{status:response.status})}catch{return EdgeNextResponse.json({ok:false,error:{message:"Backend unavailable"}},{status:503})}}
import {NextRequest} from "next/server";
