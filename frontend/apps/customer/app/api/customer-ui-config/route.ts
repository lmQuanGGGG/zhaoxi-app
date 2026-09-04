import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");
export async function GET(){
  try{const r=await fetch(`${backend()}/api/customer-ui-config`,{cache:"no-store",signal:AbortSignal.timeout(10000)});const j=await r.json();return NextResponse.json(j,{status:r.status,headers:{"cache-control":"no-store"}})}
  catch{return NextResponse.json({ok:false,error:{code:"CUSTOMER_UI_UNAVAILABLE"}},{status:503})}
}
