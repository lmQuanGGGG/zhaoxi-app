import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { paymentEvents, paymentTransactions, serviceRequestStatusHistory, serviceRequests } from "@/db/schema";
import { failure, success } from "@/lib/core/api-response";
import { mayAccessPayment, requireSession } from "@/lib/security/route-authorization";
import { partnerWebPushService } from "@/lib/services/partner-web-push-service";
import { after } from "next/server";

export const dynamic = "force-dynamic";

// This is deliberately a report, not a payment confirmation. A customer can
// report a transfer, but only the partner who owns the receiving account can
// verify it and accept the food order.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireSession(request, ["customer"]);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const access = await mayAccessPayment(gate.session, id);
  if (!access.exists || !access.allowed) return failure("Payment not found.", 404, undefined, "PAYMENT_NOT_FOUND");
  const db = getDb();
  const payment = (await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id)).limit(1))[0];
  if (!payment) return failure("Payment not found.", 404, undefined, "PAYMENT_NOT_FOUND");
  if (payment.method !== "bank_transfer" || payment.status !== "awaiting_payment") return failure("This payment cannot be reported.", 409, undefined, "PAYMENT_REPORT_INVALID");
  const order = (await db.select().from(serviceRequests).where(eq(serviceRequests.id, payment.requestId)).limit(1))[0];
  if (!order || order.customerId !== gate.session.userId) return failure("Order not found.", 404, undefined, "REQUEST_NOT_FOUND");
  const details = (order.details || {}) as Record<string, unknown>;
  const now = new Date();
  const alreadyReported = Boolean(details.paymentCustomerReportedAt);
  if (!alreadyReported) {
    const nextDetails = { ...details, paymentCustomerReportedAt: now.toISOString(), paymentVerificationStatus: "customer_reported" };
    await db.transaction(async (tx) => {
      await tx.update(paymentTransactions).set({ metadata: { ...(payment.metadata || {}), customerReportedAt: now.toISOString(), customerReportedBy: gate.session.userId }, updatedAt: now }).where(and(eq(paymentTransactions.id, id), eq(paymentTransactions.status, "awaiting_payment")));
      await tx.update(serviceRequests).set({ details: nextDetails, updatedAt: now }).where(eq(serviceRequests.id, order.id));
      await tx.insert(paymentEvents).values({ paymentId: id, eventType: "PAYMENT_CUSTOMER_REPORTED", payload: { customerId: gate.session.userId, requestCode: order.requestCode, amount: payment.amount, currency: payment.currency } });
      await tx.insert(serviceRequestStatusHistory).values({ requestId: order.id, fromStatus: order.status, toStatus: order.status, changedByUserId: gate.session.userId, note: "CUSTOMER_REPORTED_BANK_TRANSFER_PAYMENT" });
    });
    if (order.assignedOrganizationId) {
      const organizationId = order.assignedOrganizationId;
      after(async () => {
        try { await partnerWebPushService.sendPaymentReported(organizationId, { id: order.id, requestCode: order.requestCode, customerName: order.customerName, amount: String(payment.amount), currency: payment.currency }); }
        catch (error) { console.error("partner payment report push failed", error); }
      });
    }
  }
  return success({ reported: true, alreadyReported, requestId: order.id });
}
