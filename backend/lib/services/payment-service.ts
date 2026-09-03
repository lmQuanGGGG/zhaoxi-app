import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { paymentEvents, paymentTransactions, serviceRequests } from "@/db/schema";

export type PaymentMethod = "cash_on_delivery" | "bank_transfer" | "wechat_pay";
export type PaymentStatus = "pending" | "awaiting_payment" | "cash_due" | "paid" | "cash_collected" | "failed" | "cancelled" | "refunded";

const allowedMethods = new Set<PaymentMethod>(["cash_on_delivery", "bank_transfer", "wechat_pay"]);
const allowedTransitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending:["awaiting_payment","cash_due","paid","failed","cancelled"],
  awaiting_payment:["paid","failed","cancelled"],
  cash_due:["cash_collected","cancelled"],
  paid:["refunded"],
  cash_collected:["refunded"],
  failed:[], cancelled:[], refunded:[],
};

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
function wechatConfigured() {
  return Boolean(
    process.env.WECHAT_PAY_MCH_ID &&
    process.env.WECHAT_PAY_APP_ID &&
    process.env.WECHAT_PAY_MERCHANT_SERIAL_NO &&
    process.env.WECHAT_PAY_PRIVATE_KEY &&
    process.env.WECHAT_PAY_API_V3_KEY &&
    process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY &&
    process.env.WECHAT_PAY_PLATFORM_KEY_ID
  );
}

export class PaymentService {
  capabilities() {
    return {
      cashOnDelivery: true,
      bankTransfer: Boolean(process.env.ZHAOXI_BANK_ACCOUNT_NUMBER),
      wechatPay: wechatConfigured(),
      wechatPayMode: wechatConfigured() ? "native_v3" : "configuration_required",
      wechatPayCurrency: "CNY",
    };
  }

  async ensureForRequest(requestId: string, requestedMethod?: string) {
    const db = getDb();
    const request = (await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId)).limit(1))[0];
    if (!request) throw new Error("REQUEST_NOT_FOUND");
    const details = (request.details || {}) as Record<string, unknown>;
    const rawMethod = String(requestedMethod || details.paymentMethod || "cash_on_delivery") as PaymentMethod;
    const method: PaymentMethod = allowedMethods.has(rawMethod) ? rawMethod : "cash_on_delivery";
    const key = `request:${request.id}:method:${method}`;
    const amount = money(details.totalAmount);
    const currency = typeof details.currency === "string" && details.currency.length === 3 ? details.currency.toUpperCase() : "VND";
    const status: PaymentStatus = method === "cash_on_delivery" ? "cash_due" : "awaiting_payment";
    const checkoutPayload: Record<string, unknown> = {};
    if (method === "wechat_pay") {
      checkoutPayload.configured = wechatConfigured();
      checkoutPayload.mode = wechatConfigured() ? "native_v3_ready" : "configuration_required";
    }
    if (method === "bank_transfer") {
      checkoutPayload.bankName = process.env.ZHAOXI_BANK_NAME || undefined;
      checkoutPayload.accountNumber = process.env.ZHAOXI_BANK_ACCOUNT_NUMBER || undefined;
      checkoutPayload.accountName = process.env.ZHAOXI_BANK_ACCOUNT_NAME || undefined;
      checkoutPayload.transferContent = request.requestCode;
    }
    return db.transaction(async (tx) => {
      const rows = await tx.insert(paymentTransactions).values({
        requestId: request.id,
        method,
        provider: method === "wechat_pay" ? "wechat_pay" : method === "bank_transfer" ? "bank" : "zhaoxi_cod",
        status,
        amount: String(amount),
        currency,
        idempotencyKey: key,
        checkoutPayload,
        metadata: { requestCode: request.requestCode },
      }).onConflictDoNothing({ target: paymentTransactions.idempotencyKey }).returning();
      const payment = rows[0] || (await tx.select().from(paymentTransactions).where(eq(paymentTransactions.idempotencyKey, key)).limit(1))[0];
      if (!payment) throw new Error("PAYMENT_IDEMPOTENCY_RESOLUTION_FAILED");
      if (!rows[0]) return payment;
      await tx.insert(paymentEvents).values({ paymentId: payment.id, eventType: "PAYMENT_CREATED", payload: { method, status, requestCode: request.requestCode } });
      await tx.update(serviceRequests).set({
        details: { ...details, paymentId: payment.id, paymentMethod: method, paymentStatus: status },
        updatedAt: new Date(),
      }).where(eq(serviceRequests.id, request.id));
      return payment;
    });
  }

  async forRequest(requestId: string) {
    return getDb().select().from(paymentTransactions).where(eq(paymentTransactions.requestId, requestId)).orderBy(desc(paymentTransactions.createdAt));
  }

  async byId(id: string) {
    return (await getDb().select().from(paymentTransactions).where(eq(paymentTransactions.id, id)).limit(1))[0] || null;
  }

  async updateStatus(id: string, next: PaymentStatus, actor: string, payload: Record<string, unknown> = {}, executor?: any) {
    const db = getDb();
    const current = await this.byId(id);
    if (!current) throw new Error("PAYMENT_NOT_FOUND");
    const from = current.status as PaymentStatus;
    if (!allowedTransitions[from]?.includes(next)) throw new Error("INVALID_PAYMENT_TRANSITION");
    const now = new Date();
    const patch: any = { status: next, updatedAt: now };
    if (next === "paid" || next === "cash_collected") patch.paidAt = now;
    if (next === "failed") patch.failedAt = now;
    const run = async (tx: any) => {
      const [updated] = await tx
        .update(paymentTransactions)
        .set(patch)
        .where(and(eq(paymentTransactions.id, id), eq(paymentTransactions.status, current.status)))
        .returning();

      if (!updated) throw new Error("PAYMENT_CONFLICT");

      await tx.insert(paymentEvents).values({
        paymentId: id,
        eventType: `PAYMENT_${next.toUpperCase()}`,
        payload: { actor, ...payload },
      });

      const request = (await tx
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, current.requestId))
        .limit(1))[0];

      if (request) {
        const details = (request.details || {}) as Record<string, unknown>;
        await tx
          .update(serviceRequests)
          .set({
            details: { ...details, paymentStatus: next, paymentUpdatedAt: now.toISOString() },
            updatedAt: now,
          })
          .where(eq(serviceRequests.id, request.id));
      }

      return updated;
    };

    return executor ? run(executor) : db.transaction(run);
  }
}
export const paymentService = new PaymentService();
