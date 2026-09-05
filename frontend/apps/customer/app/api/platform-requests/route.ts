import {NextRequest, NextResponse} from "next/server";
export const dynamic="force-dynamic";

const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");
const ACCESS_COOKIE="zx_access_v2",REFRESH_COOKIE="zx_refresh_v2";
const cookieOptions=(maxAge:number)=>({httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge});

async function responsePayload(response:Response){try{return JSON.parse(await response.text())}catch{return {ok:false,error:{code:"BACKEND_INVALID_RESPONSE"}}}}
function withRefreshedSession(data:unknown,status:number,refreshed?:any){const response=NextResponse.json(data,{status});if(refreshed?.accessToken)response.cookies.set(ACCESS_COOKIE,String(refreshed.accessToken),cookieOptions(15*60));if(refreshed?.refreshToken){const expires=Date.parse(String(refreshed.session?.refreshExpiresAt||""));response.cookies.set(REFRESH_COOKIE,String(refreshed.refreshToken),cookieOptions(Number.isFinite(expires)?Math.max(60,Math.floor((expires-Date.now())/1000)):86400))}return response}
async function refreshSession(request:NextRequest){const refreshToken=request.cookies.get(REFRESH_COOKIE)?.value;if(!refreshToken)return null;const response=await fetch(`${backend()}/api/auth/session/refresh`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({refreshToken}),cache:"no-store"});const data=await responsePayload(response);return response.ok&&data?.ok?data.data:null}

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
    const body=await request.text();
    const submit=(access?:string)=>fetch(`${backend()}/api/service-requests`,{method:"POST",headers:{"content-type":"application/json",...(access?{authorization:`Bearer ${access}`}:{})},body,cache:"no-store"});
    let response=await submit(request.cookies.get(ACCESS_COOKIE)?.value);
    if(response.status!==401)return withRefreshedSession(await responsePayload(response),response.status);
    const refreshed=await refreshSession(request);
    if(!refreshed?.accessToken)return withRefreshedSession(await responsePayload(response),response.status);
    response=await submit(String(refreshed.accessToken));
    return withRefreshedSession(await responsePayload(response),response.status,refreshed);
  }catch{
    return Response.json({ok:false,error:{message:"Backend unavailable"}},{status:503});
  }
}
