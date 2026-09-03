export const dynamic="force-dynamic";
function backend(){return process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_BACKEND_URL||"http://localhost:3000"}
export async function POST(request:NextRequest){try{const token=request.cookies.get("zx_access_v2")?.value;const response=await fetch(`${backend()}/api/observability/events`,{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(await request.json()),cache:"no-store"});return Response.json(await response.json(),{status:response.status})}catch{return Response.json({ok:false,error:{message:"Backend unavailable"}},{status:503})}}
import {NextRequest} from "next/server";
