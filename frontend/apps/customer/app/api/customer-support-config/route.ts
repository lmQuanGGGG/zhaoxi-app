import {NextResponse} from "next/server";export const dynamic="force-dynamic";
const backend=()=>process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app";
export async function GET(){try{const r=await fetch(`${backend()}/api/customer-support-config`,{cache:"no-store",signal:AbortSignal.timeout(10000)});return NextResponse.json(await r.json(),{status:r.status,headers:{"cache-control":"no-store"}})}catch{return NextResponse.json({ok:false,error:{code:"SUPPORT_CONFIG_UNAVAILABLE"}},{status:503})}}
