import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");
const ACCESS_COOKIE="zx_access_v2",REFRESH_COOKIE="zx_refresh_v2";
const options=(maxAge:number)=>({httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge});

async function payload(response:Response){try{return JSON.parse(await response.text())}catch{return {ok:false,error:{message:"Backend returned an invalid response"}}}}
async function refresh(request:NextRequest){const token=request.cookies.get(REFRESH_COOKIE)?.value;if(!token)return null;const response=await fetch(`${backend()}/api/auth/session/refresh`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({refreshToken:token}),cache:"no-store"});const data=await payload(response);return response.ok&&data?.ok?data.data:null}
function respond(data:unknown,status:number,session?:any){const response=NextResponse.json(data,{status});if(session?.accessToken)response.cookies.set(ACCESS_COOKIE,String(session.accessToken),options(15*60));if(session?.refreshToken){const expires=Date.parse(String(session.session?.refreshExpiresAt||""));response.cookies.set(REFRESH_COOKIE,String(session.refreshToken),options(Number.isFinite(expires)?Math.max(60,Math.floor((expires-Date.now())/1000)):86400))}return response}

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const{id}=await params;
  const submit=(access?:string)=>fetch(`${backend()}/api/payments/${encodeURIComponent(id)}/report`,{method:"POST",headers:access?{authorization:`Bearer ${access}`}:{},cache:"no-store"});
  try{
    let response=await submit(request.cookies.get(ACCESS_COOKIE)?.value);
    if(response.status!==401)return respond(await payload(response),response.status);
    const session=await refresh(request);
    if(!session?.accessToken)return respond(await payload(response),response.status);
    response=await submit(String(session.accessToken));
    return respond(await payload(response),response.status,session);
  }catch{return NextResponse.json({ok:false,error:{message:"Backend unavailable"}},{status:503})}
}
