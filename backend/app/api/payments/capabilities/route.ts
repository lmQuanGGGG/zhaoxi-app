import { success } from "@/lib/core/api-response";
import { paymentService } from "@/lib/services/payment-service";
export const dynamic = "force-dynamic";
export async function GET(){ return success(paymentService.capabilities()); }
