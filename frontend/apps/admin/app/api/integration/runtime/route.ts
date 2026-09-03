import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-backend.vercel.app";
export async function GET(){
  try{
    const response=await fetch(`${backend()}/api/integration/runtime`,{cache:"no-store",headers:{"cache-control":"no-cache"},signal:AbortSignal.timeout(10000)});
    const payload=await response.json();
    return NextResponse.json({...payload,platformApp:"admin",platformRelease:"16.12"},{status:response.status,headers:{"cache-control":"no-store"}});
  }catch{
    return NextResponse.json({ready:false,platformApp:"admin",platformRelease:"16.12",error:{message:"Backend runtime gate unavailable",code:"BACKEND_RUNTIME_UNAVAILABLE"}},{status:503,headers:{"cache-control":"no-store"}});
  }
}
