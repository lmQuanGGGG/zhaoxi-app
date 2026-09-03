import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-backend.vercel.app";
export async function GET(request:NextRequest){
  const params=new URLSearchParams(request.nextUrl.searchParams);
  try{const response=await fetch(`${backend()}/api/marketplace/recommendations?${params.toString()}`,{cache:"no-store",headers:{"cache-control":"no-cache"}});return Response.json(await response.json(),{status:response.status,headers:{"cache-control":"no-store"}})}
  catch{return Response.json({ok:false,data:[]},{status:200,headers:{"cache-control":"no-store"}})}
}
