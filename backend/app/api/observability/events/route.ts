import { NextRequest } from "next/server";
import { observabilityService } from "@/lib/services/observability-service";
import { success, failure } from "@/lib/core/api-response";
import { requireSession } from "@/lib/security/route-authorization";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){try{const gate=await requireSession(request,["admin"]);if(!gate.ok)return gate.response;return success(await observabilityService.recent({hours:Number(request.nextUrl.searchParams.get("hours")||24),app:request.nextUrl.searchParams.get("app")||undefined,severity:request.nextUrl.searchParams.get("severity")||undefined,limit:Number(request.nextUrl.searchParams.get("limit")||100)}))}catch(error){console.error(error);return failure("Unable to load runtime events.",500,undefined,"OBSERVABILITY_LOAD_FAILED")}}
export async function POST(request:NextRequest){try{const gate=await requireSession(request);if(!gate.ok)return gate.response;const body=await request.json();return success(await observabilityService.capture({...body,userId:gate.session.userId,role:gate.session.role,userAgent:body?.userAgent||request.headers.get("user-agent")||undefined}),{status:201})}catch(error){console.error(error);return failure("Unable to capture runtime event.",500,undefined,"OBSERVABILITY_CAPTURE_FAILED")}}
