import { failure, success } from "@/lib/core/api-response";
import { paymentService, type PaymentStatus } from "@/lib/services/payment-service";
import { canUpdatePaymentStatus } from "@/lib/security/access-policy";
import { mayAccessPayment, requireSession } from "@/lib/security/route-authorization";
export const dynamic = "force-dynamic";
const allowed = new Set<PaymentStatus>(["paid","cash_collected","failed","cancelled","refunded"]);
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireSession(request, ["admin", "partner", "driver"]);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  try {
    const body = await request.json();
    const status = String(body?.status || "") as PaymentStatus;
    if (!allowed.has(status)) return failure("Invalid payment status.", 422, undefined, "INVALID_PAYMENT_STATUS");
    const access = await mayAccessPayment(gate.session, id);
    if (!access.exists || !canUpdatePaymentStatus(gate.session, access.allowed, status)) {
      return failure("Payment not found.", 404, undefined, "PAYMENT_NOT_FOUND");
    }
    const data = await paymentService.updateStatus(id, status, `${gate.session.role}:${gate.session.userId}`);
    return success(data);
  } catch (error) {
    console.error(error);
    const code = error instanceof Error ? error.message : "PAYMENT_UPDATE_FAILED";
    return failure(code === "PAYMENT_NOT_FOUND" ? "Payment not found." : "Unable to update payment.", code === "PAYMENT_NOT_FOUND" ? 404 : code === "INVALID_PAYMENT_TRANSITION" ? 409 : 500, undefined, code);
  }
}
