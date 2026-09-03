import { NextResponse } from "next/server";
import { runtimeValidationService } from "@/lib/services/runtime-validation-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await runtimeValidationService.inspect();
  return NextResponse.json(payload, {
    status: payload.ready ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
