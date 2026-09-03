import { authenticatedSession } from "@/lib/auth-request";
import { failure, success } from "@/lib/core/api-response";
import { customerPinService, CustomerPinError } from "@/lib/services/customer-pin-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    return success(await customerPinService.set(await authenticatedSession(request), body.pin));
  } catch (error) {
    if (error instanceof CustomerPinError) return failure(error.message, error.status, undefined, error.code);
    console.error(error);
    return failure("Unable to save PIN.", 500, undefined, "PIN_SET_FAILED");
  }
}
