import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app";
export async function POST(request:NextRequest){
  try{
    const response=await fetch(`${backend()}/api/auth/wechat/session`,{method:"POST",headers:{"content-type":"application/json"},body:await request.text(),cache:"no-store",signal:AbortSignal.timeout(10000)});
    return Response.json(await response.json(),{status:response.status,headers:{"cache-control":"no-store"}});
  }catch{return Response.json({ok:false,error:{message:"Backend unavailable",code:"BACKEND_UNAVAILABLE"}},{status:503});}
}
