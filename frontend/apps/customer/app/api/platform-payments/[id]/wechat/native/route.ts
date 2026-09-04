import { NextRequest } from "next/server";
export const dynamic="force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app";
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
  const {id}=await context.params;
  try{
    const token=request.cookies.get("zx_access_v2")?.value;
    const response=await fetch(`${backend()}/api/payments/${encodeURIComponent(id)}/wechat/native`,{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},cache:"no-store"});
    return Response.json(await response.json(),{status:response.status});
  }catch{return Response.json({ok:false,error:{message:"Backend unavailable"}},{status:503})}
}
