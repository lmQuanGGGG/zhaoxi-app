import { NextRequest } from "next/server";
import { observabilityService } from "@/lib/services/observability-service";
import { success, failure } from "@/lib/core/api-response";
import { requireSession } from "@/lib/security/route-authorization";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){try{const gate=await requireSession(request,["admin"]);if(!gate.ok)return gate.response;return success(await observabilityService.summary(Number(request.nextUrl.searchParams.get("hours")||24)))}catch(error){console.error(error);return failure("Unable to load incident summary.",500,undefined,"OBSERVABILITY_SUMMARY_FAILED")}}
