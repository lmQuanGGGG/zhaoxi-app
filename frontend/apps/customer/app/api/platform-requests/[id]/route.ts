import {NextRequest} from "next/server";
export const dynamic="force-dynamic";

const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app";

export async function GET(request:NextRequest,context:{params:Promise<{id:string}>}){
  const{id}=await context.params;
  const locale=request.nextUrl.searchParams.get("locale")||"zh-CN";
  const token=request.cookies.get("zx_access_v2")?.value;
  const headers:Record<string,string>=token?{authorization:`Bearer ${token}`}:{};
  try{
    const response=await fetch(`${backend()}/api/service-requests/${encodeURIComponent(id)}?locale=${encodeURIComponent(locale)}`,{
      headers,
      cache:"no-store",
    });
    return Response.json(await response.json(),{status:response.status});
  }catch{
    return Response.json({ok:false,error:{message:"Backend unavailable"}},{status:503});
  }
}
