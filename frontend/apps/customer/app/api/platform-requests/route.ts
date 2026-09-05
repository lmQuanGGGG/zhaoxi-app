import {NextRequest} from "next/server";
export const dynamic="force-dynamic";

const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");

function authHeaders(request:NextRequest):Record<string,string>{
  const token=request.cookies.get("zx_access_v2")?.value;
  return token?{authorization:`Bearer ${token}`}:{};
}

export async function GET(request:NextRequest){
  const params=new URLSearchParams();
  for(const key of ["codes","phone","locale","mine"]){
    const value=request.nextUrl.searchParams.get(key);
    if(value)params.set(key,value);
  }
  try{
    const response=await fetch(`${backend()}/api/service-requests?${params}`,{
      headers:authHeaders(request),
      cache:"no-store",
    });
    return Response.json(await response.json(),{status:response.status});
  }catch{
    return Response.json({ok:false,data:[],error:{message:"Backend unavailable"}},{status:503});
  }
}

export async function POST(request:NextRequest){
  try{
    const payload=await request.json();
    const headers:Record<string,string>={
      "content-type":"application/json",
      ...authHeaders(request),
    };
    const response=await fetch(`${backend()}/api/service-requests`,{
      method:"POST",
      headers,
      body:JSON.stringify(payload),
      cache:"no-store",
    });
    return Response.json(await response.json(),{status:response.status});
  }catch{
    return Response.json({ok:false,error:{message:"Backend unavailable"}},{status:503});
  }
}
