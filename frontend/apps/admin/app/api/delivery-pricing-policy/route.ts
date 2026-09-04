import {NextRequest,NextResponse} from "next/server";export const dynamic="force-dynamic";
const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");
async function forward(r:NextRequest,method:"GET"|"PATCH"){
 const token=r.cookies.get("zx_access_v2")?.value||"";const body=method==="PATCH"?await r.text():undefined;
 const headers:Record<string,string>={};if(body)headers["content-type"]="application/json";if(token)headers.authorization=`Bearer ${token}`;
 try{const u=await fetch(`${backend()}/api/delivery-pricing-policy`,{method,headers,body,cache:"no-store",signal:AbortSignal.timeout(10000)});return NextResponse.json(await u.json(),{status:u.status,headers:{"cache-control":"no-store"}})}
 catch{return NextResponse.json({ok:false,error:{code:"DELIVERY_POLICY_UNAVAILABLE"}},{status:503})}
}
export async function GET(r:NextRequest){return forward(r,"GET")}
export async function PATCH(r:NextRequest){return forward(r,"PATCH")}
