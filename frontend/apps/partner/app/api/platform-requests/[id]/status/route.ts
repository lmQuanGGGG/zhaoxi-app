import { NextRequest } from "next/server";
export const dynamic="force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app";
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){
  const {id}=await context.params;
  try{
    const payload=await request.json().catch(()=>({}));
    const token=request.cookies.get("zx_access_v2")?.value;
    const response=await fetch(`${backend()}/api/service-requests/${encodeURIComponent(id)}/status`,{method:"PATCH",headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(payload),cache:"no-store"});
    const result=await response.json().catch(()=>null);
    return Response.json(result||{ok:false,error:{code:"UPDATE_STATUS_FAILED"}},{status:response.status});
  }catch{return Response.json({ok:false,error:{code:"UPDATE_STATUS_UNAVAILABLE",message:"Backend unavailable"}},{status:503})}
}
