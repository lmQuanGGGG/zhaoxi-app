import { failure, success } from "@/lib/core/api-response";
import { weChatPayV3Service } from "@/lib/services/wechat-pay-v3-service";
import { mayAccessPayment, requireSession } from "@/lib/security/route-authorization";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireSession(request, ["customer", "partner", "admin"]);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const access = await mayAccessPayment(gate.session, id);
  if (!access.exists || !access.allowed) return failure("Payment not found.", 404, undefined, "PAYMENT_NOT_FOUND");
  try { return success(await weChatPayV3Service.createNativeCheckout(id)); }
  catch (error) {
    console.error(error);
    const code = error instanceof Error ? error.message : "WECHAT_PAY_NATIVE_FAILED";
    const status = code === "PAYMENT_NOT_FOUND" ? 404 : code === "WECHAT_PAY_CONFIGURATION_REQUIRED" ? 503 : code === "WECHAT_PAY_CNY_REQUIRED" || code === "PAYMENT_METHOD_NOT_WECHAT" || code === "WECHAT_PAY_AMOUNT_INVALID" ? 422 : 502;
    return failure(code, status, undefined, code);
  }
}
