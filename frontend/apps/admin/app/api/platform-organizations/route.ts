import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app";
export async function GET(request:NextRequest){
  const params=new URLSearchParams(request.nextUrl.searchParams);
  if(!params.has("status")) params.set("status","active");
  const response=await fetch(`${backend()}/api/organizations?${params.toString()}`,{cache:"no-store"});
  return Response.json(await response.json(),{status:response.status});
}
