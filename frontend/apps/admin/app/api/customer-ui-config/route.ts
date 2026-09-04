import {NextRequest,NextResponse} from "next/server";
export const dynamic="force-dynamic";
const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");
async function forward(request:NextRequest,method:"GET"|"PATCH"){
  const token=request.cookies.get("zx_access_v2")?.value||"";
  const body=method==="PATCH"?await request.text():undefined;
  try{const r=await fetch(`${backend()}/api/customer-ui-config`,{method,headers:{...(body?{"content-type":"application/json"}:{}),...(token?{authorization:`Bearer ${token}`}:{})},body,cache:"no-store",signal:AbortSignal.timeout(10000)});const j=await r.json();return NextResponse.json(j,{status:r.status,headers:{"cache-control":"no-store"}})}
  catch{return NextResponse.json({ok:false,error:{code:"CUSTOMER_UI_UNAVAILABLE"}},{status:503})}
}
export async function GET(r:NextRequest){return forward(r,"GET")}
export async function PATCH(r:NextRequest){return forward(r,"PATCH")}
