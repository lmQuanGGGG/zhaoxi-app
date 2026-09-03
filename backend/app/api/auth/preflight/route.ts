import { success } from "@/lib/core/api-response";
import { authPreflightService } from "@/lib/services/auth-preflight-service";
export const dynamic = "force-dynamic";
export async function GET() {
  return success(await authPreflightService.inspect(), { headers: { "cache-control": "no-store" } });
}
