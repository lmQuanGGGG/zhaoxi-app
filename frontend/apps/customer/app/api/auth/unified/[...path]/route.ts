import { NextRequest, NextResponse } from "next/server";
export const dynamic="force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-backend.vercel.app";
const ACCESS_COOKIE="zx_access_v2"; const REFRESH_COOKIE="zx_refresh_v2"; const TRUSTED_COOKIE="zx_trusted_device_v1";
function cookieOptions(maxAge:number){return {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge};}
async function jsonBody(request:NextRequest){try{return await request.json();}catch{return {};}}
async function responsePayload(response:Response){
 try{return await response.json();}
 catch{return {ok:false,error:{code:"AUTH_BACKEND_INVALID_RESPONSE",message:"Authentication service returned an invalid response."}};}
}
async function upstream(path:string,method:string,body?:unknown,access?:string){return fetch(`${backend()}/api/auth/${path}`,{method,headers:{...(body!==undefined?{"content-type":"application/json"}:{}),...(access?{authorization:`Bearer ${access}`}:{})},body:body!==undefined?JSON.stringify(body):undefined,cache:"no-store",signal:AbortSignal.timeout(10000)});}
function clearAuthCookies(response:NextResponse){response.cookies.set(ACCESS_COOKIE,"",cookieOptions(0));response.cookies.set(REFRESH_COOKIE,"",cookieOptions(0));}
function setAuthCookies(response:NextResponse,data:any){if(data?.accessToken)response.cookies.set(ACCESS_COOKIE,String(data.accessToken),cookieOptions(15*60));if(data?.refreshToken){const expires=Date.parse(String(data?.session?.refreshExpiresAt||""));const maxAge=Number.isFinite(expires)?Math.max(60,Math.floor((expires-Date.now())/1000)):24*60*60;response.cookies.set(REFRESH_COOKIE,String(data.refreshToken),cookieOptions(maxAge));}}
async function refreshWithCookie(request:NextRequest){const refreshToken=request.cookies.get(REFRESH_COOKIE)?.value;if(!refreshToken)return null;const r=await upstream("session/refresh","POST",{refreshToken});const payload=await r.json();if(!r.ok||!payload?.ok)return null;return payload.data;}
async function handle(request:NextRequest,context:{params:Promise<{path:string[]}>}){
 const {path:parts}=await context.params;const path=(parts||[]).join("/");if(!(path.startsWith("session/")||path.startsWith("qr/")||path.startsWith("identity/")||path==="guest/bootstrap"||path==="admin/card"))return NextResponse.json({ok:false,error:{message:"Unsupported auth route",code:"AUTH_ROUTE_NOT_FOUND"}},{status:404});
 const method=request.method; let access=request.cookies.get(ACCESS_COOKIE)?.value||""; let body=method==="POST"?await jsonBody(request):undefined;
 if(path==="session/refresh"||path==="session/logout")body={...(body as any||{}),refreshToken:request.cookies.get(REFRESH_COOKIE)?.value||""};
 if(path==="guest/bootstrap")body={...(body as any||{}),trustedDeviceToken:request.cookies.get(TRUSTED_COOKIE)?.value||undefined};
 let r=await upstream(path,method,body,access); let payload=await responsePayload(r);
 if(r.status===401 && ((method==="GET"&&(path==="session/me"||path==="session/devices"))||path.startsWith("identity/otp/"))){const refreshed=await refreshWithCookie(request);if(refreshed){access=String(refreshed.accessToken||"");r=await upstream(path,method,method==="POST"?body:undefined,access);payload=await responsePayload(r);const response=NextResponse.json(payload,{status:r.status,headers:{"cache-control":"no-store"}});setAuthCookies(response,refreshed);if(path==="identity/otp/verify"&&payload?.ok){const verified=NextResponse.json({ok:true,data:payload.data.session},{status:r.status,headers:{"cache-control":"no-store"}});setAuthCookies(verified,payload.data);if(payload.data?.trustedDeviceToken)verified.cookies.set(TRUSTED_COOKIE,String(payload.data.trustedDeviceToken),cookieOptions(180*24*60*60));return verified;}return response;}}
 if(path==="session/exchange"||path==="qr/exchange"||path==="guest/bootstrap"||path==="admin/card"||path==="session/refresh"||path==="identity/otp/verify"||path==="identity/pin/login"||path==="identity/account/login"){const response=NextResponse.json(payload?.ok?{ok:true,data:{...payload.data.session,needsProfileCompletion:payload.data.needsProfileCompletion,isNewUser:payload.data.isNewUser}}:payload,{status:r.status,headers:{"cache-control":"no-store"}});if(payload?.ok)setAuthCookies(response,payload.data);if(payload.data?.trustedDeviceToken)response.cookies.set(TRUSTED_COOKIE,String(payload.data.trustedDeviceToken),cookieOptions(180*24*60*60));return response;}
 const response=NextResponse.json(payload,{status:r.status,headers:{"cache-control":"no-store"}});if(path==="session/logout"||path==="session/logout-all")clearAuthCookies(response);return response;
}
export async function GET(request:NextRequest,context:{params:Promise<{path:string[]}>}){return handle(request,context);}
export async function POST(request:NextRequest,context:{params:Promise<{path:string[]}>}){return handle(request,context);}
