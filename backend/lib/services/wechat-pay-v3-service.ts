import crypto from "node:crypto";
import QRCode from "qrcode";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { paymentEvents, paymentProviderEvents, paymentTransactions } from "@/db/schema";
import { paymentService } from "@/lib/services/payment-service";

const WECHAT_API_ORIGIN = "https://api.mch.weixin.qq.com";

type WeChatConfig = {
  appId: string;
  mchId: string;
  merchantSerialNo: string;
  privateKey: string;
  apiV3Key: string;
  platformPublicKey: string;
  platformKeyId: string;
  notifyUrl: string;
};

type WeChatNotification = {
  id?: string;
  event_type?: string;
  resource?: { algorithm?: string; ciphertext?: string; nonce?: string; associated_data?: string };
};

type DecryptedTransaction = {
  appid?: string;
  mchid?: string;
  out_trade_no?: string;
  transaction_id?: string;
  attach?: string;
  trade_state?: string;
  amount?: { total?: number; currency?: string };
  success_time?: string;
};

function env(name: string) { return (process.env[name] || "").trim(); }
function pem(value: string) { return value.replace(/\\n/g, "\n").trim(); }
function publicOrigin() { return env("ZHAOXI_BACKEND_PUBLIC_URL") || env("WECHAT_AUTH_CALLBACK_ORIGIN") || "https://zhaoxi-app-puce.vercel.app"; }

export function weChatPayConfig(): WeChatConfig | null {
  const config: WeChatConfig = {
    appId: env("WECHAT_PAY_APP_ID"),
    mchId: env("WECHAT_PAY_MCH_ID"),
    merchantSerialNo: env("WECHAT_PAY_MERCHANT_SERIAL_NO"),
    privateKey: pem(env("WECHAT_PAY_PRIVATE_KEY")),
    apiV3Key: env("WECHAT_PAY_API_V3_KEY"),
    platformPublicKey: pem(env("WECHAT_PAY_PLATFORM_PUBLIC_KEY")),
    platformKeyId: env("WECHAT_PAY_PLATFORM_KEY_ID"),
    notifyUrl: env("WECHAT_PAY_NOTIFY_URL") || `${publicOrigin()}/api/payments/wechat/notify`,
  };
  if (!config.appId || !config.mchId || !config.merchantSerialNo || !config.privateKey || !config.apiV3Key || !config.platformPublicKey || !config.platformKeyId || !config.notifyUrl) return null;
  if (Buffer.byteLength(config.apiV3Key, "utf8") !== 32) return null;
  return config;
}

function nonce() { return crypto.randomBytes(16).toString("hex"); }
function merchantOrderNo(paymentId: string) { return `ZX${paymentId.replaceAll("-", "").slice(0, 30)}`; }
function sign(message: string, privateKey: string) { return crypto.sign("RSA-SHA256", Buffer.from(message), privateKey).toString("base64"); }
function verify(message: string, signature: string, publicKey: string) {
  return crypto.verify("RSA-SHA256", Buffer.from(message), publicKey, Buffer.from(signature, "base64"));
}

function authorization(method: string, path: string, body: string, config: WeChatConfig) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = nonce();
  const message = `${method}\n${path}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = sign(message, config.privateKey);
  return `WECHATPAY2-SHA256-RSA2048 mchid=\"${config.mchId}\",nonce_str=\"${nonceStr}\",timestamp=\"${timestamp}\",serial_no=\"${config.merchantSerialNo}\",signature=\"${signature}\"`;
}

function verifyWechatResponse(response: Response, body: string, config: WeChatConfig) {
  const timestamp = response.headers.get("wechatpay-timestamp") || "";
  const nonceStr = response.headers.get("wechatpay-nonce") || "";
  const signature = response.headers.get("wechatpay-signature") || "";
  const serial = response.headers.get("wechatpay-serial") || "";
  if (!timestamp || !nonceStr || !signature) throw new Error("WECHAT_PAY_RESPONSE_SIGNATURE_MISSING");
  if (serial && serial !== config.platformKeyId) throw new Error("WECHAT_PAY_PLATFORM_KEY_MISMATCH");
  if (!verify(`${timestamp}\n${nonceStr}\n${body}\n`, signature, config.platformPublicKey)) throw new Error("WECHAT_PAY_RESPONSE_SIGNATURE_INVALID");
}

function verifyNotification(request: Request, body: string, config: WeChatConfig) {
  const timestamp = request.headers.get("wechatpay-timestamp") || "";
  const nonceStr = request.headers.get("wechatpay-nonce") || "";
  const signature = request.headers.get("wechatpay-signature") || "";
  const serial = request.headers.get("wechatpay-serial") || "";
  if (!timestamp || !nonceStr || !signature) throw new Error("WECHAT_PAY_NOTIFY_SIGNATURE_MISSING");
  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) throw new Error("WECHAT_PAY_NOTIFY_TIMESTAMP_INVALID");
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > 300) throw new Error("WECHAT_PAY_NOTIFY_TIMESTAMP_STALE");
  if (serial && serial !== config.platformKeyId) throw new Error("WECHAT_PAY_PLATFORM_KEY_MISMATCH");
  if (!verify(`${timestamp}\n${nonceStr}\n${body}\n`, signature, config.platformPublicKey)) throw new Error("WECHAT_PAY_NOTIFY_SIGNATURE_INVALID");
  return { timestamp, nonceStr };
}

function decryptResource(resource: NonNullable<WeChatNotification["resource"]>, config: WeChatConfig): DecryptedTransaction {
  if (resource.algorithm !== "AEAD_AES_256_GCM" || !resource.ciphertext || !resource.nonce) throw new Error("WECHAT_PAY_RESOURCE_INVALID");
  const encrypted = Buffer.from(resource.ciphertext, "base64");
  if (encrypted.length < 17) throw new Error("WECHAT_PAY_RESOURCE_INVALID");
  const ciphertext = encrypted.subarray(0, encrypted.length - 16);
  const tag = encrypted.subarray(encrypted.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(config.apiV3Key, "utf8"), Buffer.from(resource.nonce, "utf8"));
  decipher.setAuthTag(tag);
  decipher.setAAD(Buffer.from(resource.associated_data || "", "utf8"));
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as DecryptedTransaction;
}

function assertWeChatTransactionIdentity(transaction: Record<string, any>, payment: any, config: WeChatConfig, expectedOutTradeNo: string) {
  const appId = String(transaction.appid || "");
  const mchId = String(transaction.mchid || "");
  const outTradeNo = String(transaction.out_trade_no || "");
  const attach = String(transaction.attach || "");
  const currency = String(transaction.amount?.currency || "").toUpperCase();
  const total = Number(transaction.amount?.total);
  const expectedFen = Math.round(Number(payment.amount) * 100);
  if (!appId || appId !== config.appId) throw new Error("WECHAT_PAY_APP_ID_MISMATCH");
  if (!mchId || mchId !== config.mchId) throw new Error("WECHAT_PAY_MCH_ID_MISMATCH");
  if (!outTradeNo || outTradeNo !== expectedOutTradeNo) throw new Error("WECHAT_PAY_OUT_TRADE_NO_MISMATCH");
  if (!attach || attach !== payment.id) throw new Error("WECHAT_PAY_ATTACH_MISMATCH");
  if (!Number.isSafeInteger(total) || total !== expectedFen) throw new Error("WECHAT_PAY_AMOUNT_MISMATCH");
  if (currency !== "CNY" || String(payment.currency).toUpperCase() !== "CNY") throw new Error("WECHAT_PAY_CURRENCY_MISMATCH");
  const transactionId = String(transaction.transaction_id || "");
  const tradeState = String(transaction.trade_state || "UNKNOWN");
  if (tradeState === "SUCCESS" && !transactionId) throw new Error("WECHAT_PAY_TRANSACTION_ID_MISSING");
  return { transactionId, tradeState };
}

function assertProviderTransactionIdConsistency(checkout: Record<string, any>, transactionId: string) {
  const existing = String(checkout.providerTransactionId || "");
  if (existing && transactionId && existing !== transactionId) throw new Error("WECHAT_PAY_TRANSACTION_ID_MISMATCH");
}

type WeChatTerminalPaymentStatus = "paid" | "failed" | "cancelled" | "refunded";

function weChatTerminalPaymentStatus(tradeState: string): WeChatTerminalPaymentStatus | null {
  switch (String(tradeState || "").toUpperCase()) {
    case "SUCCESS": return "paid";
    case "CLOSED":
    case "REVOKED": return "cancelled";
    case "PAYERROR": return "failed";
    case "REFUND": return "refunded";
    default: return null;
  }
}

function weChatTerminalTransitionAllowed(currentStatus: string, next: WeChatTerminalPaymentStatus) {
  if (currentStatus === next) return true;
  if (next === "paid") return currentStatus === "pending" || currentStatus === "awaiting_payment";
  if (next === "failed" || next === "cancelled") return currentStatus === "pending" || currentStatus === "awaiting_payment";
  if (next === "refunded") return currentStatus === "paid";
  return false;
}

function weChatTerminalStateDominates(currentStatus: string, next: WeChatTerminalPaymentStatus) {
  if (currentStatus === "refunded") return true;
  if (currentStatus === "paid" && (next === "failed" || next === "cancelled")) return true;
  return currentStatus === next;
}

const WECHAT_CHECKOUT_LEASE_TIMEOUT_MS = 2 * 60_000;
const WECHAT_RECOVERY_BACKOFF_MS = 15_000;

function timestampMs(value: unknown) {
  const ms = Date.parse(String(value || ""));
  return Number.isFinite(ms) ? ms : 0;
}

function checkoutLeaseExpired(checkout: Record<string, any>) {
  const value = checkout.mode === "native_v3_recovering" ? checkout.recoveryStartedAt : checkout.claimStartedAt;
  const startedAt = timestampMs(value);
  return startedAt > 0 && Date.now() - startedAt >= WECHAT_CHECKOUT_LEASE_TIMEOUT_MS;
}

function recoveryBackoffActive(checkout: Record<string, any>) {
  const checkedAt = timestampMs(checkout.recoveryCheckedAt);
  return checkedAt > 0 && Date.now() - checkedAt < WECHAT_RECOVERY_BACKOFF_MS;
}

async function queryNativeOrderByOutTradeNo(outTradeNo: string, config: WeChatConfig) {
  const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(config.mchId)}`;
  const response = await fetch(`${WECHAT_API_ORIGIN}${path}`, {
    method: "GET",
    headers: { Authorization: authorization("GET", path, "", config), Accept: "application/json", "User-Agent": "ZhaoXi/14.5" },
    cache: "no-store",
  });
  const responseText = await response.text();
  if (response.ok) {
    verifyWechatResponse(response, responseText, config);
    return { found: true as const, status: response.status, body: JSON.parse(responseText) as Record<string, any> };
  }
  let errorBody: Record<string, any> = {};
  try { errorBody = JSON.parse(responseText) as Record<string, any>; } catch {}
  const code = String(errorBody.code || "");
  if (response.status === 404 || code === "ORDER_NOT_EXIST") return { found: false as const, status: response.status, body: errorBody };
  throw new Error(`WECHAT_PAY_QUERY_FAILED_${response.status}_${code || "UNKNOWN"}`);
}

export class WeChatPayV3Service {
  configured() { return Boolean(weChatPayConfig()); }

  async recoverNativeCheckout(paymentId: string) {
    const config = weChatPayConfig();
    if (!config) throw new Error("WECHAT_PAY_CONFIGURATION_REQUIRED");
    const db = getDb();
    const payment = await paymentService.byId(paymentId);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.method !== "wechat_pay") throw new Error("PAYMENT_METHOD_NOT_WECHAT");
    if (payment.status === "paid") return payment;
    const checkout = (payment.checkoutPayload || {}) as Record<string, any>;
    const staleCreating = checkout.mode === "native_v3_creating" && checkoutLeaseExpired(checkout);
    const staleRecovering = checkout.mode === "native_v3_recovering" && checkoutLeaseExpired(checkout);
    if (checkout.mode === "native_v3_creating" && !staleCreating) throw new Error("WECHAT_PAY_CHECKOUT_IN_PROGRESS");
    if (checkout.mode === "native_v3_recovering" && !staleRecovering) throw new Error("WECHAT_PAY_RECOVERY_IN_PROGRESS");
    const recoverable = staleCreating || staleRecovering || checkout.mode === "native_v3_create_uncertain" || checkout.mode === "native_v3_recovery_pending";
    if (!recoverable) return payment;
    if (checkout.mode === "native_v3_recovery_pending" && recoveryBackoffActive(checkout)) throw new Error("WECHAT_PAY_RECOVERY_BACKOFF");
    const outTradeNo = String(payment.providerReference || checkout.outTradeNo || "");
    if (!outTradeNo) throw new Error("WECHAT_PAY_OUT_TRADE_NO_MISSING");
    const recoveryToken = crypto.randomUUID();
    const recoveryStartedAt = new Date().toISOString();
    const [claimed] = await db.update(paymentTransactions).set({
      checkoutPayload: { ...checkout, mode: "native_v3_recovering", recoveryToken, recoveryStartedAt, outTradeNo },
      updatedAt: new Date(),
    }).where(and(eq(paymentTransactions.id, payment.id), eq(paymentTransactions.updatedAt, payment.updatedAt))).returning();
    if (!claimed) throw new Error("WECHAT_PAY_RECOVERY_CONFLICT");
    const claimedCheckout = (claimed.checkoutPayload || {}) as Record<string, any>;
    let query;
    try {
      query = await queryNativeOrderByOutTradeNo(outTradeNo, config);
    } catch (error) {
      await db.transaction(async (tx) => {
        const [released] = await tx.update(paymentTransactions).set({
          checkoutPayload: { ...claimedCheckout, mode: "native_v3_recovery_pending", recoveryCheckedAt: new Date().toISOString(), recoveryError: error instanceof Error ? error.message : String(error), outTradeNo },
          updatedAt: new Date(),
        }).where(and(eq(paymentTransactions.id, claimed.id), eq(paymentTransactions.updatedAt, claimed.updatedAt))).returning();
        if (!released) throw new Error("WECHAT_PAY_RECOVERY_CONFLICT");
        await tx.insert(paymentEvents).values({ paymentId: claimed.id, eventType: "WECHAT_NATIVE_RECOVERY_QUERY_FAILED", payload: { outTradeNo, recoveryToken, error: error instanceof Error ? error.message : String(error) } });
      });
      throw error;
    }
    if (!query.found) {
      return db.transaction(async (tx) => {
        const [updated] = await tx.update(paymentTransactions).set({
          checkoutPayload: { ...claimedCheckout, mode: "native_v3_ready", recoveryResult: "order_not_found", recoveryCheckedAt: new Date().toISOString(), recoveredAt: new Date().toISOString(), outTradeNo },
          updatedAt: new Date(),
        }).where(and(eq(paymentTransactions.id, claimed.id), eq(paymentTransactions.updatedAt, claimed.updatedAt))).returning();
        if (!updated) throw new Error("WECHAT_PAY_RECOVERY_CONFLICT");
        await tx.insert(paymentEvents).values({ paymentId: payment.id, eventType: "WECHAT_NATIVE_RECOVERY_ORDER_NOT_FOUND", payload: { outTradeNo } });
        return updated;
      });
    }
    const identity = assertWeChatTransactionIdentity(query.body, claimed, config, outTradeNo);
    const tradeState = identity.tradeState;
    const transactionId = identity.transactionId || undefined;
    assertProviderTransactionIdConsistency(claimedCheckout, identity.transactionId);
    const terminalStatus = weChatTerminalPaymentStatus(tradeState);
    if (terminalStatus) {
      return db.transaction(async (tx) => {
        const current = (await tx.select().from(paymentTransactions).where(eq(paymentTransactions.id, claimed.id)).limit(1))[0];
        if (!current) throw new Error("PAYMENT_NOT_FOUND");
        const currentCheckout = (current.checkoutPayload || {}) as Record<string, any>;
        assertProviderTransactionIdConsistency(currentCheckout, identity.transactionId);
        if (weChatTerminalStateDominates(current.status, terminalStatus)) {
          await tx.insert(paymentEvents).values({ paymentId: current.id, eventType: "WECHAT_NATIVE_RECOVERY_TERMINAL_IGNORED", payload: { outTradeNo, tradeState, terminalStatus, currentStatus: current.status, transactionId, recoveryToken } });
          return current;
        }
        if (!weChatTerminalTransitionAllowed(current.status, terminalStatus)) {
          await tx.insert(paymentEvents).values({ paymentId: current.id, eventType: "WECHAT_NATIVE_RECOVERY_TERMINAL_CONFLICT", payload: { outTradeNo, tradeState, terminalStatus, currentStatus: current.status, transactionId, recoveryToken } });
          throw new Error("WECHAT_PAY_TERMINAL_STATE_CONFLICT");
        }
        const result = await paymentService.updateStatus(current.id, terminalStatus, "wechat_pay:recovery", { outTradeNo, providerTransactionId: transactionId, tradeState, recoveryToken }, tx);
        await tx.update(paymentTransactions).set({
          checkoutPayload: { ...currentCheckout, mode: `native_v3_recovered_${terminalStatus}`, recoveryTradeState: tradeState, recoveryCheckedAt: new Date().toISOString(), recoveredAt: new Date().toISOString(), outTradeNo, providerTransactionId: transactionId },
          updatedAt: new Date(),
        }).where(eq(paymentTransactions.id, current.id));
        await tx.insert(paymentEvents).values({ paymentId: current.id, eventType: `WECHAT_NATIVE_RECOVERY_${terminalStatus.toUpperCase()}`, payload: { outTradeNo, tradeState, transactionId, recoveryToken } });
        return result;
      });
    }
    return db.transaction(async (tx) => {
      const [updated] = await tx.update(paymentTransactions).set({
        checkoutPayload: { ...claimedCheckout, mode: "native_v3_recovery_pending", recoveryTradeState: tradeState, recoveryCheckedAt: new Date().toISOString(), outTradeNo },
        updatedAt: new Date(),
      }).where(and(eq(paymentTransactions.id, claimed.id), eq(paymentTransactions.updatedAt, claimed.updatedAt))).returning();
      if (!updated) throw new Error("WECHAT_PAY_RECOVERY_CONFLICT");
      await tx.insert(paymentEvents).values({ paymentId: claimed.id, eventType: "WECHAT_NATIVE_RECOVERY_PROVIDER_STATE", payload: { outTradeNo, tradeState, transactionId } });
      return updated;
    });
  }

  async createNativeCheckout(paymentId: string) {
    const config = weChatPayConfig();
    if (!config) throw new Error("WECHAT_PAY_CONFIGURATION_REQUIRED");
    const db = getDb();
    const payment = await paymentService.byId(paymentId);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.method !== "wechat_pay") throw new Error("PAYMENT_METHOD_NOT_WECHAT");
    if (payment.status === "paid") return payment;
    if (String(payment.currency).toUpperCase() !== "CNY") throw new Error("WECHAT_PAY_CNY_REQUIRED");
    const amountTotal = Math.round(Number(payment.amount) * 100);
    if (!Number.isSafeInteger(amountTotal) || amountTotal <= 0) throw new Error("WECHAT_PAY_AMOUNT_INVALID");
    const previousPayload = (payment.checkoutPayload || {}) as Record<string, unknown>;
    if (previousPayload.mode === "native" && typeof previousPayload.codeUrl === "string") return payment;
    if (previousPayload.mode === "native_v3_creating") {
      if (checkoutLeaseExpired(previousPayload)) return this.recoverNativeCheckout(payment.id);
      throw new Error("WECHAT_PAY_CHECKOUT_IN_PROGRESS");
    }
    if (previousPayload.mode === "native_v3_recovering") {
      if (checkoutLeaseExpired(previousPayload)) return this.recoverNativeCheckout(payment.id);
      throw new Error("WECHAT_PAY_RECOVERY_IN_PROGRESS");
    }
    if (previousPayload.mode === "native_v3_create_uncertain" || previousPayload.mode === "native_v3_recovery_pending") return this.recoverNativeCheckout(payment.id);
    const outTradeNo = payment.providerReference || merchantOrderNo(payment.id);
    const claimToken = crypto.randomUUID();
    const claimStartedAt = new Date().toISOString();
    const [claimed] = await db.update(paymentTransactions).set({
      providerReference: outTradeNo,
      checkoutPayload: { ...previousPayload, mode: "native_v3_creating", claimToken, claimStartedAt },
      updatedAt: new Date(),
    }).where(and(
      eq(paymentTransactions.id, payment.id),
      eq(paymentTransactions.status, payment.status),
      eq(paymentTransactions.updatedAt, payment.updatedAt),
    )).returning();
    if (!claimed) {
      const current = await paymentService.byId(payment.id);
      if (!current) throw new Error("PAYMENT_NOT_FOUND");
      const currentPayload = (current.checkoutPayload || {}) as Record<string, unknown>;
      if (currentPayload.mode === "native" && typeof currentPayload.codeUrl === "string") return current;
      throw new Error("WECHAT_PAY_CHECKOUT_IN_PROGRESS");
    }
    const path = "/v3/pay/transactions/native";
    const body = JSON.stringify({
      appid: config.appId,
      mchid: config.mchId,
      description: `ZhaoXi ${String((claimed.metadata || {}).requestCode || claimed.requestId)}`.slice(0, 127),
      out_trade_no: outTradeNo,
      notify_url: config.notifyUrl,
      attach: claimed.id,
      amount: { total: amountTotal, currency: "CNY" },
    });
    let response: Response;
    try {
      response = await fetch(`${WECHAT_API_ORIGIN}${path}`, {
        method: "POST",
        headers: { Authorization: authorization("POST", path, body, config), Accept: "application/json", "Content-Type": "application/json", "User-Agent": "ZhaoXi/14.5" },
        body,
        cache: "no-store",
      });
    } catch (error) {
      await db.transaction(async (tx) => {
        const [uncertain] = await tx.update(paymentTransactions).set({
          checkoutPayload: { ...previousPayload, mode: "native_v3_create_uncertain", outTradeNo, lastClaimToken: claimToken, uncertainAt: new Date().toISOString() },
          updatedAt: new Date(),
        }).where(and(eq(paymentTransactions.id, claimed.id), eq(paymentTransactions.providerReference, outTradeNo), eq(paymentTransactions.updatedAt, claimed.updatedAt))).returning();
        if (!uncertain) throw new Error("WECHAT_PAY_CHECKOUT_CLAIM_LOST");
        await tx.insert(paymentEvents).values({ paymentId: claimed.id, eventType: "WECHAT_NATIVE_CREATE_UNCERTAIN", payload: { outTradeNo, claimToken, error: error instanceof Error ? error.message : String(error) } });
      });
      throw error;
    }
    const responseText = await response.text();
    if (response.status >= 500) {
      await db.transaction(async (tx) => {
        const [uncertain] = await tx.update(paymentTransactions).set({
          checkoutPayload: { ...previousPayload, mode: "native_v3_create_uncertain", outTradeNo, lastClaimToken: claimToken, uncertainAt: new Date().toISOString(), responseStatus: response.status },
          updatedAt: new Date(),
        }).where(and(eq(paymentTransactions.id, claimed.id), eq(paymentTransactions.providerReference, outTradeNo), eq(paymentTransactions.updatedAt, claimed.updatedAt))).returning();
        if (!uncertain) throw new Error("WECHAT_PAY_CHECKOUT_CLAIM_LOST");
        await tx.insert(paymentEvents).values({ paymentId: claimed.id, eventType: "WECHAT_NATIVE_CREATE_UNCERTAIN", payload: { outTradeNo, claimToken, responseStatus: response.status, body: responseText.slice(0, 1500) } });
      });
      throw new Error(`WECHAT_PAY_CREATE_UNCERTAIN_${response.status}`);
    }
    if (!response.ok) {
      await db.transaction(async (tx) => {
        await tx.insert(paymentEvents).values({ paymentId: claimed.id, eventType: "WECHAT_NATIVE_CREATE_FAILED", payload: { status: response.status, body: responseText.slice(0, 1500), outTradeNo, claimToken } });
        const [failed] = await tx.update(paymentTransactions).set({
          checkoutPayload: { ...previousPayload, mode: "native_v3_create_failed", outTradeNo, lastClaimToken: claimToken, failedAt: new Date().toISOString(), responseStatus: response.status },
          updatedAt: new Date(),
        }).where(and(eq(paymentTransactions.id, claimed.id), eq(paymentTransactions.providerReference, outTradeNo), eq(paymentTransactions.updatedAt, claimed.updatedAt))).returning();
        if (!failed) throw new Error("WECHAT_PAY_CHECKOUT_CLAIM_LOST");
      });
      throw new Error(`WECHAT_PAY_CREATE_FAILED_${response.status}`);
    }
    verifyWechatResponse(response, responseText, config);
    const result = JSON.parse(responseText) as { code_url?: string };
    if (!result.code_url) throw new Error("WECHAT_PAY_CODE_URL_MISSING");
    const qrDataUrl = await QRCode.toDataURL(result.code_url, { width: 360, margin: 2, errorCorrectionLevel: "M" });
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    const checkoutPayload = { ...previousPayload, mode: "native", codeUrl: result.code_url, qrDataUrl, createdAt: new Date().toISOString(), expiresAt: expiresAt.toISOString(), outTradeNo };
    return db.transaction(async (tx) => {
      const [updated] = await tx.update(paymentTransactions).set({ providerReference: outTradeNo, checkoutPayload, expiresAt, updatedAt: new Date() }).where(and(eq(paymentTransactions.id, claimed.id), eq(paymentTransactions.providerReference, outTradeNo), eq(paymentTransactions.updatedAt, claimed.updatedAt))).returning();
      if (!updated) {
        const current = (await tx.select().from(paymentTransactions).where(eq(paymentTransactions.id, claimed.id)).limit(1))[0];
        if (current?.status === "paid") return current;
        throw new Error("WECHAT_PAY_CHECKOUT_CLAIM_LOST");
      }
      await tx.insert(paymentEvents).values({ paymentId: claimed.id, eventType: "WECHAT_NATIVE_CREATED", payload: { outTradeNo, expiresAt: expiresAt.toISOString(), claimToken } });
      return updated;
    });
  }

  async handleNotification(request: Request, rawBody: string) {
    const config = weChatPayConfig();
    if (!config) throw new Error("WECHAT_PAY_CONFIGURATION_REQUIRED");
    const signatureMetadata = verifyNotification(request, rawBody, config);
    const notification = JSON.parse(rawBody) as WeChatNotification;
    if (!notification.id) throw new Error("WECHAT_PAY_NOTIFICATION_ID_MISSING");
    if (!notification.resource) throw new Error("WECHAT_PAY_RESOURCE_MISSING");
    const transaction = decryptResource(notification.resource, config);
    if (transaction.mchid && transaction.mchid !== config.mchId) throw new Error("WECHAT_PAY_MCH_ID_MISMATCH");
    if (transaction.appid && transaction.appid !== config.appId) throw new Error("WECHAT_PAY_APP_ID_MISMATCH");
    const outTradeNo = String(transaction.out_trade_no || "");
    if (!outTradeNo) throw new Error("WECHAT_PAY_OUT_TRADE_NO_MISSING");
    const db = getDb();
    const payment = (await db.select().from(paymentTransactions).where(eq(paymentTransactions.providerReference, outTradeNo)).limit(1))[0];
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    const providerEventId = String(notification.id);
    const eventType = `WECHAT_${String(notification.event_type || transaction.trade_state || "NOTIFY")}`;
    return db.transaction(async (tx) => {
      const currentPayment = (await tx.select().from(paymentTransactions).where(eq(paymentTransactions.id, payment.id)).limit(1))[0];
      if (!currentPayment) throw new Error("PAYMENT_NOT_FOUND");
      const identity = assertWeChatTransactionIdentity(transaction as Record<string, any>, currentPayment, config, outTradeNo);
      const currentCheckout = (currentPayment.checkoutPayload || {}) as Record<string, any>;
      assertProviderTransactionIdConsistency(currentCheckout, identity.transactionId);
      const [claimed] = await tx.insert(paymentProviderEvents).values({
        provider: "wechat_pay",
        providerEventId,
        paymentId: currentPayment.id,
        providerTransactionId: identity.transactionId || null,
        eventType,
        payloadHash,
        signatureTimestamp: signatureMetadata.timestamp,
        signatureNonce: signatureMetadata.nonceStr,
        metadata: { outTradeNo, tradeState: transaction.trade_state, successTime: transaction.success_time },
      }).onConflictDoNothing({
        target: [paymentProviderEvents.provider, paymentProviderEvents.providerEventId],
      }).returning();
      if (!claimed) return currentPayment;
      await tx.insert(paymentEvents).values({
        paymentId: currentPayment.id,
        eventType,
        payload: { notificationId: providerEventId, transactionId: identity.transactionId || undefined, tradeState: transaction.trade_state, successTime: transaction.success_time, payloadHash },
      });
      let result = currentPayment;
      let paymentSnapshot = currentPayment;
      let checkoutSnapshot = currentCheckout;
      if (identity.transactionId && !String(checkoutSnapshot.providerTransactionId || "")) {
        const [identityBound] = await tx.update(paymentTransactions).set({
          checkoutPayload: { ...checkoutSnapshot, providerTransactionId: identity.transactionId },
          updatedAt: new Date(),
        }).where(and(eq(paymentTransactions.id, paymentSnapshot.id), eq(paymentTransactions.updatedAt, paymentSnapshot.updatedAt))).returning();
        if (!identityBound) throw new Error("WECHAT_PAY_TRANSACTION_ID_BIND_CONFLICT");
        paymentSnapshot = identityBound;
        checkoutSnapshot = (identityBound.checkoutPayload || {}) as Record<string, any>;
        result = identityBound;
      }
      const terminalStatus = weChatTerminalPaymentStatus(String(transaction.trade_state || ""));
      if (terminalStatus) {
        if (weChatTerminalStateDominates(paymentSnapshot.status, terminalStatus)) {
          await tx.insert(paymentEvents).values({
            paymentId: paymentSnapshot.id,
            eventType: "WECHAT_WEBHOOK_TERMINAL_IGNORED",
            payload: { providerEventId, outTradeNo, tradeState: transaction.trade_state, terminalStatus, currentStatus: paymentSnapshot.status, transactionId: identity.transactionId || undefined },
          });
        } else {
          if (!weChatTerminalTransitionAllowed(paymentSnapshot.status, terminalStatus)) {
            await tx.insert(paymentEvents).values({
              paymentId: paymentSnapshot.id,
              eventType: "WECHAT_WEBHOOK_TERMINAL_CONFLICT",
              payload: { providerEventId, outTradeNo, tradeState: transaction.trade_state, terminalStatus, currentStatus: paymentSnapshot.status, transactionId: identity.transactionId || undefined },
            });
            throw new Error("WECHAT_PAY_TERMINAL_STATE_CONFLICT");
          }
          result = await paymentService.updateStatus(paymentSnapshot.id, terminalStatus, "wechat_pay:webhook", { providerTransactionId: identity.transactionId || undefined, successTime: transaction.success_time, providerEventId, tradeState: transaction.trade_state }, tx);
          const resultCheckout = (result.checkoutPayload || checkoutSnapshot) as Record<string, any>;
          const [terminalBound] = await tx.update(paymentTransactions).set({
            checkoutPayload: { ...resultCheckout, mode: `native_v3_webhook_${terminalStatus}`, providerTransactionId: identity.transactionId || resultCheckout.providerTransactionId || undefined, webhookTradeState: transaction.trade_state, webhookProcessedAt: new Date().toISOString() },
            updatedAt: new Date(),
          }).where(and(eq(paymentTransactions.id, result.id), eq(paymentTransactions.status, terminalStatus))).returning();
          if (!terminalBound) throw new Error("WECHAT_PAY_WEBHOOK_TERMINAL_BIND_CONFLICT");
          result = terminalBound;
          await tx.insert(paymentEvents).values({
            paymentId: result.id,
            eventType: `WECHAT_WEBHOOK_${terminalStatus.toUpperCase()}`,
            payload: { providerEventId, outTradeNo, tradeState: transaction.trade_state, terminalStatus, transactionId: identity.transactionId || undefined, successTime: transaction.success_time },
          });
        }
      }
      await tx.update(paymentProviderEvents).set({ processedAt: new Date() }).where(eq(paymentProviderEvents.id, claimed.id));
      return result;
    });
  }
}

export const weChatPayV3Service = new WeChatPayV3Service();
