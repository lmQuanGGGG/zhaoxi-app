import { failure, success } from "@/lib/core/api-response";
import { paymentService, type PaymentMethod } from "@/lib/services/payment-service";
import { mayAccessRequest, requireSession } from "@/lib/security/route-authorization";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const gate = await requireSession(request);
  if (!gate.ok) return gate.response;
  const requestId = new URL(request.url).searchParams.get("requestId")?.trim();
  if (!requestId) return failure("requestId is required.", 422, undefined, "REQUEST_ID_REQUIRED");
  const access = await mayAccessRequest(gate.session, requestId);
  if (!access.exists || !access.allowed) return failure("Order not found.", 404, undefined, "REQUEST_NOT_FOUND");
  try { return success(await paymentService.forRequest(requestId)); }
  catch (error) { console.error(error); return failure("Unable to load payments.", 500, undefined, "PAYMENTS_LOAD_FAILED"); }
}
export async function POST(request: Request) {
  try {
    const gate = await requireSession(request, ["customer", "partner", "admin"]);
    if (!gate.ok) return gate.response;
    const body = await request.json();
    const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";
    if (!requestId) return failure("requestId is required.", 422, undefined, "REQUEST_ID_REQUIRED");
    const access = await mayAccessRequest(gate.session, requestId);
    if (!access.exists || !access.allowed) return failure("Order not found.", 404, undefined, "REQUEST_NOT_FOUND");
    const data = await paymentService.ensureForRequest(requestId, body?.method as PaymentMethod | undefined);
    return success(data, { status: 201 });
  } catch (error) {
    console.error(error);
    const code = error instanceof Error ? error.message : "PAYMENT_CREATE_FAILED";
    return failure(code === "REQUEST_NOT_FOUND" ? "Order not found." : "Unable to create payment.", code === "REQUEST_NOT_FOUND" ? 404 : 500, undefined, code);
  }
}
