import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");
export async function GET(){
  try{
    const response=await fetch(`${backend()}/api/auth/preflight`,{cache:"no-store",headers:{"cache-control":"no-cache"},signal:AbortSignal.timeout(10000)});
    const payload=(await response.json().catch(()=>null))||{ok:false};
    return NextResponse.json(payload,{status:response.status,headers:{"cache-control":"no-store"}});
  }catch{
    return NextResponse.json({ok:false,error:{message:"Backend unavailable",code:"BACKEND_UNAVAILABLE"}},{status:503,headers:{"cache-control":"no-store"}});
  }
}
