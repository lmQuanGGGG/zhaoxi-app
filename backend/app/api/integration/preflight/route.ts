import { success } from "@/lib/core/api-response";
import { integrationPreflightService } from "@/lib/services/integration-preflight-service";
export const dynamic = "force-dynamic";
export async function GET() {
  return success(await integrationPreflightService.inspect(), { headers: { "cache-control": "no-store" } });
}
