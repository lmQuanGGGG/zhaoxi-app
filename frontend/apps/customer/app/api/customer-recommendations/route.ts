import {NextRequest} from "next/server";
export const dynamic="force-dynamic";
const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");
export async function GET(request:NextRequest){
  const token=request.cookies.get("zx_access_v2")?.value;
  const headers:Record<string,string>=token?{authorization:`Bearer ${token}`}:{};
  const params=new URLSearchParams();
  for(const key of ["locale","limit","offset"]){const value=request.nextUrl.searchParams.get(key);if(value)params.set(key,value)}
  try{
    const response=await fetch(`${backend()}/api/customer-recommendations?${params}`,{headers,cache:"no-store"});
    return Response.json(await response.json(),{status:response.status,headers:{"cache-control":"no-store"}});
  }catch{
    return Response.json({ok:false,data:[],personalized:false,error:{code:"RECOMMENDATIONS_UNAVAILABLE"}},{status:503});
  }
}
