export type ApiError = { message:string; code?:string; details?:unknown };
export type ApiEnvelope<T> = { ok:true; data:T } | { ok:false; error:ApiError };
export function json<T>(data:T, init:ResponseInit={}){const headers=new Headers(init.headers);headers.set("content-type","application/json; charset=utf-8");headers.set("cache-control","no-store");return Response.json(data,{...init,headers});}
export function success<T>(data:T,init:ResponseInit={}){return json<ApiEnvelope<T>>({ok:true,data},init);}
export function failure(message:string,status=400,details?:unknown,code?:string){return json<ApiEnvelope<never>>({ok:false,error:{message,details,code}},{status});}
