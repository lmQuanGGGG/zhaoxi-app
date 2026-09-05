import { NextResponse as EdgeNextResponse } from "next/server";
import {NextRequest} from "next/server";
export const runtime="edge";
export const dynamic="force-dynamic";
const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");
const ACCESS_COOKIE="zx_access_v2",REFRESH_COOKIE="zx_refresh_v2";
const cookieOptions=(maxAge:number)=>({httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge});
async function safeJsonResponse(res:Response,refreshed?:any){try{const text=await res.text();const response=EdgeNextResponse.json(JSON.parse(text),{status:res.status});if(refreshed?.accessToken)response.cookies.set(ACCESS_COOKIE,String(refreshed.accessToken),cookieOptions(15*60));if(refreshed?.refreshToken){const expires=Date.parse(String(refreshed?.session?.refreshExpiresAt||""));response.cookies.set(REFRESH_COOKIE,String(refreshed.refreshToken),cookieOptions(Number.isFinite(expires)?Math.max(60,Math.floor((expires-Date.now())/1000)):86400))}return response}catch{return EdgeNextResponse.json({ok:false,error:{code:"UPSTREAM_UNAVAILABLE",upstreamStatus:res.status}},{status:res.status>=400?res.status:502});}}
async function patchFulfillment(id:string,body:string,access?:string){return fetch(`${backend()}/api/partner-fulfillment/${encodeURIComponent(id)}`,{method:"PATCH",headers:{"content-type":"application/json",...(access?{authorization:`Bearer ${access}`}:{})},body,cache:"no-store"});}
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;const body=await request.text();const access=request.cookies.get(ACCESS_COOKIE)?.value;
 try{
  let upstream=await patchFulfillment(id,body,access);
  if(upstream.status!==401)return safeJsonResponse(upstream);
  const refreshToken=request.cookies.get(REFRESH_COOKIE)?.value;
  if(!refreshToken)return safeJsonResponse(upstream);
  const refreshedResponse=await fetch(`${backend()}/api/auth/session/refresh`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({refreshToken}),cache:"no-store"});
  const refreshedPayload=await refreshedResponse.json().catch(()=>null);
  if(!refreshedResponse.ok||!refreshedPayload?.ok)return safeJsonResponse(upstream);
  const refreshed=refreshedPayload.data;
  upstream=await patchFulfillment(id,body,String(refreshed?.accessToken||""));
  return safeJsonResponse(upstream,refreshed);
 }catch{return EdgeNextResponse.json({ok:false,error:{code:"FULFILLMENT_UNAVAILABLE"}},{status:503})}
}
