import { failure, success } from "@/lib/core/api-response";
import { paymentService } from "@/lib/services/payment-service";
import { mayAccessPayment, requireSession } from "@/lib/security/route-authorization";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireSession(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const access = await mayAccessPayment(gate.session, id);
  if (!access.exists || !access.allowed) return failure("Payment not found.", 404, undefined, "PAYMENT_NOT_FOUND");
  try { const data = await paymentService.byId(id); return data ? success(data) : failure("Payment not found.", 404, undefined, "PAYMENT_NOT_FOUND"); }
  catch (error) { console.error(error); return failure("Unable to load payment.", 500, undefined, "PAYMENT_LOAD_FAILED"); }
}
