import {NextRequest} from "next/server";
export const dynamic="force-dynamic";
const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");
export async function GET(request:NextRequest){
  const params=new URLSearchParams(request.nextUrl.searchParams);
  params.set("scope","operations");
  if(!params.has("locale"))params.set("locale","zh-CN");
  const token=request.cookies.get("zx_access_v2")?.value;
  const headers:Record<string,string>={};if(token)headers.authorization=`Bearer ${token}`;
  try{
    const response=await fetch(`${backend()}/api/service-requests?${params.toString()}`,{headers,cache:"no-store"});
    const payload=await response.json().catch(()=>null);
    return Response.json(payload||{ok:true,data:[]},{status:response.status});
  }
  catch{return Response.json({ok:false,data:[],error:{code:"PARTNER_ORDERS_UNAVAILABLE"}},{status:503})}
}
