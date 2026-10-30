export type ApiError = { message:string; code?:string; details?:unknown };
export type ApiEnvelope<T> = { ok:true; data:T } | { ok:false; error:ApiError };
export function json<T>(data:T, init:ResponseInit={}){const headers=new Headers(init.headers);headers.set("content-type","application/json; charset=utf-8");if(!headers.has("cache-control"))headers.set("cache-control","no-store");return Response.json(data,{...init,headers});}
// For public responses that do not depend on the caller: the Vercel CDN keeps
// them for sMaxAge seconds, then serves the stale copy while it refetches.
export function publicCacheHeaders(sMaxAge:number, staleWhileRevalidate=sMaxAge*10){return {"cache-control":`public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`};}
export function success<T>(data:T,init:ResponseInit={}){return json<ApiEnvelope<T>>({ok:true,data},init);}
export function failure(message:string,status=400,details?:unknown,code?:string){return json<ApiEnvelope<never>>({ok:false,error:{message,details,code}},{status});}
