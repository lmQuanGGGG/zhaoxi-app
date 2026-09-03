import crypto from "node:crypto";
import path from "node:path";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { phoneOtpRegistrations, userRoles, users } from "@/db/schema";
import type { PublicAuthSession } from "@/lib/services/session-service";
import { sessionService } from "@/lib/services/session-service";
import { trustedDeviceService } from "@/lib/services/trusted-device-service";

// China credentials must never replace Global credentials: +86 is sent through
// Unimatrix China, while every other calling code continues through Global.
const chinaEnv=(()=>{try{return dotenv.parse(readFileSync(path.resolve(process.cwd(),".env.unimatrix-china.local")))}catch{return {}}})();

export type OtpChannel = "sms" | "whatsapp";
export const OTP_ADAPTER_CONTRACT = "zhaoxi-otp-adapter-v1";

type LocalOtpChallenge = {
  id: string;
  channel: OtpChannel;
  phone: string;
  userId: string;
  codeHash: string;
  expiresAt: number;
  resendAfter: number;
  attempts: number;
};

type SupabaseOtpChallenge = {
  channel: OtpChannel;
  phone: string;
  userId: string;
  expiresAt: number;
};

type UnimatrixOtpChallenge = {
  channel: "sms";
  phone: string;
  userId: string;
  expiresAt: number;
};

const localOtpChallenges = new Map<string, LocalOtpChallenge>();

class OtpIdentityError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function genericProviderConfig(channel: OtpChannel) {
  const prefix =
    channel === "sms"
      ? "AUTH_SMS_OTP_PROVIDER"
      : "AUTH_WHATSAPP_OTP_PROVIDER";

  const url = process.env[`${prefix}_URL`]?.trim();
  const token = process.env[`${prefix}_TOKEN`]?.trim();

  return url && token ? { url, token } : null;
}

function smsProviderMode() {
  return process.env.AUTH_SMS_OTP_PROVIDER?.trim().toLowerCase() || "";
}

function unimatrixConfig(phone?: string) {
  if (smsProviderMode() !== "unimatrix") return null;

  const isChina=phone?.startsWith("+86")===true;
  const accessKeyId = (isChina?chinaEnv.UNIMTX_ACCESS_KEY_ID:process.env.UNIMTX_ACCESS_KEY_ID)?.trim();
  const accessKeySecret = (isChina?chinaEnv.UNIMTX_ACCESS_KEY_SECRET:process.env.UNIMTX_ACCESS_KEY_SECRET)?.trim();
  const challengeSecret = process.env.AUTH_OTP_CHALLENGE_SECRET?.trim();
  const baseUrl = ((isChina?chinaEnv.UNIMTX_API_BASE_URL:process.env.UNIMTX_API_BASE_URL)?.trim() || (isChina?"https://api-cn.unimtx.com":"https://api.unimtx.com")).replace(/\/$/, "");
  const smsSignature = (isChina?chinaEnv.UNIMTX_CHINA_SMS_SIGNATURE||chinaEnv.UNIMTX_SMS_SIGNATURE:process.env.UNIMTX_SMS_SIGNATURE)?.trim();

  return accessKeyId && accessKeySecret && challengeSecret
    ? { accessKeyId, accessKeySecret, challengeSecret, smsSignature, baseUrl }
    : null;
}

/**
 * Supabase Auth owns delivery and validation of the actual SMS code.  We only
 * sign a short-lived challenge binding it to the ZhaoXi guest session, so the
 * code cannot be used to promote a different account.
 */
function supabaseConfig() {
  if (smsProviderMode() !== "supabase") return null;

  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const apiKey = (
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
  )?.trim();
  const challengeSecret = process.env.AUTH_OTP_CHALLENGE_SECRET?.trim();

  return url && apiKey && challengeSecret ? { url, apiKey, challengeSecret } : null;
}

function encodeSupabaseChallenge(challenge: SupabaseOtpChallenge) {
  const config = supabaseConfig();
  if (!config) {
    throw new OtpIdentityError(
      "OTP_PROVIDER_NOT_CONFIGURED",
      503,
      "Supabase SMS OTP is not configured.",
    );
  }

  const payload = Buffer.from(JSON.stringify(challenge)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", config.challengeSecret)
    .update(payload)
    .digest("base64url");

  return `sb1.${payload}.${signature}`;
}

function decodeSupabaseChallenge(value: string) {
  const config = supabaseConfig();
  const [version, payload, signature, extra] = value.split(".");

  if (!config || version !== "sb1" || !payload || !signature || extra) {
    throw new OtpIdentityError(
      "OTP_CHALLENGE_INVALID",
      422,
      "OTP challenge is invalid.",
    );
  }

  const expected = crypto
    .createHmac("sha256", config.challengeSecret)
    .update(payload)
    .digest("base64url");
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);

  if (
    actualBytes.length !== expectedBytes.length ||
    !crypto.timingSafeEqual(actualBytes, expectedBytes)
  ) {
    throw new OtpIdentityError(
      "OTP_CHALLENGE_INVALID",
      422,
      "OTP challenge is invalid.",
    );
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      decoded?.channel !== "sms" ||
      typeof decoded.phone !== "string" ||
      typeof decoded.userId !== "string" ||
      !Number.isFinite(decoded.expiresAt)
    ) {
      throw new Error("Invalid challenge payload");
    }
    return decoded as SupabaseOtpChallenge;
  } catch {
    throw new OtpIdentityError(
      "OTP_CHALLENGE_INVALID",
      422,
      "OTP challenge is invalid.",
    );
  }
}

async function startSupabaseOtp(phone: string, userId: string) {
  const config = supabaseConfig();
  if (!config) {
    throw new OtpIdentityError(
      "OTP_PROVIDER_NOT_CONFIGURED",
      503,
      "Supabase SMS OTP is not configured.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${config.url}/auth/v1/otp`, {
      method: "POST",
      headers: {
        apikey: config.apiKey,
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ phone, create_user: true }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new OtpIdentityError(
      "OTP_PROVIDER_UNAVAILABLE",
      503,
      "Supabase SMS OTP is unavailable.",
    );
  }

  if (!response.ok) {
    throw new OtpIdentityError(
      "SUPABASE_OTP_START_FAILED",
      response.status >= 400 && response.status < 500 ? response.status : 502,
      "Supabase could not send the SMS OTP.",
    );
  }

  return {
    challengeId: encodeSupabaseChallenge({
      channel: "sms",
      phone,
      userId,
      expiresAt: Date.now() + 5 * 60 * 1000,
    }),
    expiresInSeconds: 300,
    resendAfterSeconds: 45,
  };
}

async function verifySupabaseOtp(
  challengeId: string,
  code: string,
  phone: string,
  userId: string,
) {
  const config = supabaseConfig();
  const challenge = decodeSupabaseChallenge(challengeId);

  if (
    !config ||
    challenge.phone !== phone ||
    challenge.userId !== userId ||
    challenge.expiresAt < Date.now()
  ) {
    throw new OtpIdentityError(
      "OTP_INVALID_OR_EXPIRED",
      401,
      "OTP is invalid or expired.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${config.url}/auth/v1/verify`, {
      method: "POST",
      headers: {
        apikey: config.apiKey,
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ type: "sms", phone, token: code }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new OtpIdentityError(
      "OTP_PROVIDER_UNAVAILABLE",
      503,
      "Supabase SMS OTP is unavailable.",
    );
  }

  const data = (await response.json().catch(() => null)) as any;
  if (!response.ok || !data?.access_token) {
    throw new OtpIdentityError(
      "OTP_INVALID_OR_EXPIRED",
      response.status >= 400 && response.status < 500 ? response.status : 502,
      "OTP is invalid or expired.",
    );
  }

  return { verified: true };
}

function encodeUnimatrixChallenge(challenge: UnimatrixOtpChallenge) {
  const config = unimatrixConfig();
  if (!config) {
    throw new OtpIdentityError(
      "OTP_PROVIDER_NOT_CONFIGURED",
      503,
      "Unimatrix SMS OTP is not configured.",
    );
  }

  const payload = Buffer.from(JSON.stringify(challenge)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", config.challengeSecret)
    .update(payload)
    .digest("base64url");

  return `um1.${payload}.${signature}`;
}

function decodeUnimatrixChallenge(value: string) {
  const config = unimatrixConfig();
  const [version, payload, signature, extra] = value.split(".");

  if (!config || version !== "um1" || !payload || !signature || extra) {
    throw new OtpIdentityError(
      "OTP_CHALLENGE_INVALID",
      422,
      "OTP challenge is invalid.",
    );
  }

  const expected = crypto
    .createHmac("sha256", config.challengeSecret)
    .update(payload)
    .digest("base64url");
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);

  if (
    actualBytes.length !== expectedBytes.length ||
    !crypto.timingSafeEqual(actualBytes, expectedBytes)
  ) {
    throw new OtpIdentityError(
      "OTP_CHALLENGE_INVALID",
      422,
      "OTP challenge is invalid.",
    );
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      decoded?.channel !== "sms" ||
      typeof decoded.phone !== "string" ||
      typeof decoded.userId !== "string" ||
      !Number.isFinite(decoded.expiresAt)
    ) {
      throw new Error("Invalid challenge payload");
    }
    return decoded as UnimatrixOtpChallenge;
  } catch {
    throw new OtpIdentityError(
      "OTP_CHALLENGE_INVALID",
      422,
      "OTP challenge is invalid.",
    );
  }
}

function unimatrixUrl(action: "otp.send" | "otp.verify",phone?:string) {
  const config = unimatrixConfig(phone);
  if (!config) {
    throw new OtpIdentityError(
      "OTP_PROVIDER_NOT_CONFIGURED",
      503,
      "Unimatrix SMS OTP is not configured.",
    );
  }

  const params = new URLSearchParams({
    action,
    accessKeyId: config.accessKeyId,
    algorithm: "hmac-sha256",
    timestamp: String(Date.now()),
    nonce: crypto.randomBytes(18).toString("hex"),
  });
  const signingText = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  params.set(
    "signature",
    crypto
      .createHmac("sha256", config.accessKeySecret)
      .update(signingText)
      .digest("base64"),
  );

  return `${config.baseUrl}/?${params.toString()}`;
}

async function callUnimatrix(
  action: "otp.send" | "otp.verify",
  body: Record<string, unknown>,
  phone?: string,
) {
  let response: Response;
  try {
    response = await fetch(unimatrixUrl(action,phone), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new OtpIdentityError(
      "OTP_PROVIDER_UNAVAILABLE",
      503,
      "Unimatrix SMS OTP is unavailable.",
    );
  }

  const payload = (await response.json().catch(() => null)) as any;
  if (!response.ok || String(payload?.code) !== "0") {
    console.error("Unimatrix API Error Response:", {
      status: response.status,
      payload,
      action
    });
    throw new OtpIdentityError(
      `UNIMATRIX_${String(payload?.code || "REJECTED")}`,
      response.status >= 400 && response.status < 500 ? response.status : 502,
      "Unimatrix rejected the OTP request.",
    );
  }

  return payload?.data ?? {};
}

async function startUnimatrixOtp(phone: string, userId: string) {
  const config = unimatrixConfig(phone);
  if (!config) {
    throw new OtpIdentityError(
      "OTP_PROVIDER_NOT_CONFIGURED",
      503,
      "Unimatrix SMS OTP is not configured.",
    );
  }
  if (phone.startsWith("+86") && !config?.smsSignature) {
    throw new OtpIdentityError(
      "UNIMATRIX_CHINA_SIGNATURE_REQUIRED",
      422,
      "A pre-approved China SMS signature is required for +86 OTP delivery.",
    );
  }
  const data = await callUnimatrix("otp.send", {
    to: phone,
    digits: 6,
    intent: "zhaoxi_registration",
    channel: "sms",
    ttl: 300,
    ...(phone.startsWith("+86") ? { signature: config.smsSignature } : {}),
  },phone);

  return {
    challengeId: encodeUnimatrixChallenge({
      channel: "sms",
      phone,
      userId,
      expiresAt: Date.now() + 5 * 60 * 1000,
    }),
    providerMessageId: typeof data?.id === "string" ? data.id : undefined,
    expiresInSeconds: 300,
    resendAfterSeconds: 300,
  };
}

async function verifyUnimatrixOtp(
  challengeId: string,
  code: string,
  phone: string,
  userId: string,
) {
  const challenge = decodeUnimatrixChallenge(challengeId);
  if (
    challenge.phone !== phone ||
    challenge.userId !== userId ||
    challenge.expiresAt < Date.now()
  ) {
    throw new OtpIdentityError(
      "OTP_INVALID_OR_EXPIRED",
      401,
      "OTP is invalid or expired.",
    );
  }

  const data = await callUnimatrix("otp.verify", {
    to: phone,
    code,
    intent: "zhaoxi_registration",
    ttl: 300,
  },phone);

  return { verified: data?.valid === true };
}

async function reserveOneTimeUnimatrixOtp(phone: string, userId: string) {
  const db = getDb();
  const existingUsers = await db
    .select({ id: users.id, isGuest: users.isGuest })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (existingUsers.some((user) => !user.isGuest)) {
    throw new OtpIdentityError(
      "PHONE_ALREADY_REGISTERED",
      409,
      "This phone number is already registered.",
    );
  }

  const reserved = await db
    .insert(phoneOtpRegistrations)
    .values({ phone, userId, provider: "unimatrix" })
    .onConflictDoNothing()
    .returning({ phone: phoneOtpRegistrations.phone });

  if (!reserved[0]) {
    throw new OtpIdentityError(
      "OTP_ALREADY_SENT",
      409,
      "An OTP has already been sent to this phone number.",
    );
  }
}

async function releaseOneTimeUnimatrixOtp(phone: string, userId: string) {
  const db = getDb();
  await db
    .delete(phoneOtpRegistrations)
    .where(
      and(
        eq(phoneOtpRegistrations.phone, phone),
        eq(phoneOtpRegistrations.userId, userId),
        isNull(phoneOtpRegistrations.verifiedAt),
      ),
    );
}

async function saveUnimatrixProviderMessage(
  phone: string,
  userId: string,
  providerMessageId: string | undefined,
) {
  if (!providerMessageId) return;

  const db = getDb();
  await db
    .update(phoneOtpRegistrations)
    .set({ providerMessageId })
    .where(
      and(
        eq(phoneOtpRegistrations.phone, phone),
        eq(phoneOtpRegistrations.userId, userId),
      ),
    );
}

async function assertUnimatrixOtpReservation(phone: string, userId: string) {
  const db = getDb();
  const registration = await db
    .select({ userId: phoneOtpRegistrations.userId, verifiedAt: phoneOtpRegistrations.verifiedAt })
    .from(phoneOtpRegistrations)
    .where(eq(phoneOtpRegistrations.phone, phone))
    .limit(1);

  if (
    registration[0]?.userId !== userId ||
    registration[0]?.verifiedAt !== null
  ) {
    throw new OtpIdentityError(
      "OTP_INVALID_OR_EXPIRED",
      401,
      "OTP is invalid or expired.",
    );
  }
}

async function finalizeUnimatrixOtpRegistration(phone: string, userId: string) {
  const db = getDb();
  const updated = await db
    .update(phoneOtpRegistrations)
    .set({ verifiedAt: new Date() })
    .where(
      and(
        eq(phoneOtpRegistrations.phone, phone),
        eq(phoneOtpRegistrations.userId, userId),
        isNull(phoneOtpRegistrations.verifiedAt),
      ),
    )
    .returning({ phone: phoneOtpRegistrations.phone });

  if (!updated[0]) {
    throw new OtpIdentityError(
      "OTP_INVALID_OR_EXPIRED",
      401,
      "OTP is invalid or expired.",
    );
  }
}

function esmsConfig() {
  if (smsProviderMode() !== "esms") return null;

  const apiKey = process.env.ESMS_API_KEY?.trim();
  const secretKey = process.env.ESMS_SECRET_KEY?.trim();

  if (!apiKey || !secretKey) return null;

  return {
    apiKey,
    secretKey,
    brandname: process.env.ESMS_BRANDNAME?.trim() || "",
    smsType: process.env.ESMS_SMS_TYPE?.trim() || "2",
    sandbox: process.env.ESMS_SANDBOX?.trim() === "1" ? "1" : "0",
  };
}

function normalizePhone(value: unknown) {
  const phone = String(value || "").replace(/[\s()-]/g, "");

  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new OtpIdentityError(
      "PHONE_INVALID",
      422,
      "Phone must use international E.164 format, for example +84901234567.",
    );
  }

  return phone;
}

function esmsPhone(phone: string) {
  if (phone.startsWith("+84")) {
    return `0${phone.slice(3)}`;
  }

  return phone.replace(/^\+/, "");
}

function normalizeChannel(value: unknown): OtpChannel {
  if (value === "sms" || value === "whatsapp") return value;

  throw new OtpIdentityError(
    "OTP_CHANNEL_INVALID",
    422,
    "Unsupported OTP channel.",
  );
}

function boundedNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const n = Number(value);

  return Number.isFinite(n)
    ? Math.min(max, Math.max(min, Math.floor(n)))
    : fallback;
}

function hashOtp(challengeId: string, code: string) {
  return crypto
    .createHash("sha256")
    .update(`${challengeId}:${code}`)
    .digest("hex");
}

function cleanupLocalChallenges() {
  const now = Date.now();

  for (const [id, challenge] of localOtpChallenges) {
    if (challenge.expiresAt < now) {
      localOtpChallenges.delete(id);
    }
  }
}

async function callGenericProvider(
  channel: OtpChannel,
  body: Record<string, unknown>,
) {
  const config = genericProviderConfig(channel);

  if (!config) {
    throw new OtpIdentityError(
      "OTP_PROVIDER_NOT_CONFIGURED",
      503,
      "OTP provider is not configured.",
    );
  }

  let response: Response;

  try {
    response = await fetch(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.token}`,
        "x-zhaoxi-otp-contract": OTP_ADAPTER_CONTRACT,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new OtpIdentityError(
      "OTP_PROVIDER_UNAVAILABLE",
      503,
      "OTP provider is unavailable.",
    );
  }

  const payload = (await response.json().catch(() => null)) as any;

  if (!response.ok || payload?.ok === false) {
    const code = String(
      payload?.error?.code ||
        payload?.code ||
        "OTP_PROVIDER_REJECTED",
    );

    throw new OtpIdentityError(
      code,
      response.status >= 400 && response.status < 600
        ? response.status
        : 502,
      "OTP provider rejected the request.",
    );
  }

  return payload?.data ?? payload ?? {};
}

async function startEsmsOtp(
  phone: string,
  userId: string,
  channel: OtpChannel,
) {
  const config = esmsConfig();

  if (!config) {
    throw new OtpIdentityError(
      "OTP_PROVIDER_NOT_CONFIGURED",
      503,
      "eSMS provider is not configured.",
    );
  }

  cleanupLocalChallenges();

  const challengeId = crypto.randomUUID();
  const code = String(crypto.randomInt(100000, 1000000));
  const requestId = crypto.randomUUID();

  const content = config.brandname.toLowerCase() === "baotrixemay"
    ? `${code} la ma xac minh dang ky Baotrixemay cua ban`
    : `${code} la ma xac minh ZhaoXi cua ban`;

  let response: Response;

  try {
    response = await fetch(
      "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ApiKey: config.apiKey,
          SecretKey: config.secretKey,
          Phone: esmsPhone(phone),
          Content: content,
          ...(config.brandname ? { Brandname: config.brandname } : {}),
          SmsType: config.smsType,
          IsUnicode: "0",
          Sandbox: config.sandbox,
          RequestId: requestId,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    throw new OtpIdentityError(
      "OTP_PROVIDER_UNAVAILABLE",
      503,
      "eSMS provider is unavailable.",
    );
  }

  const payload = (await response.json().catch(() => null)) as any;

  if (!response.ok || String(payload?.CodeResult || "") !== "100") {
    throw new OtpIdentityError(
      `ESMS_${String(payload?.CodeResult || "REJECTED")}`,
      502,
      "eSMS rejected the OTP request.",
    );
  }

  const expiresInSeconds = 300;
  const resendAfterSeconds = 45;

  localOtpChallenges.set(challengeId, {
    id: challengeId,
    channel,
    phone,
    userId,
    codeHash: hashOtp(challengeId, code),
    expiresAt: Date.now() + expiresInSeconds * 1000,
    resendAfter: Date.now() + resendAfterSeconds * 1000,
    attempts: 0,
  });

  return {
    challengeId,
    expiresInSeconds,
    resendAfterSeconds,
  };
}

function verifyLocalOtp(
  challengeId: string,
  code: string,
  phone: string,
  userId: string,
  channel: OtpChannel,
) {
  cleanupLocalChallenges();

  const challenge = localOtpChallenges.get(challengeId);

  if (!challenge) {
    throw new OtpIdentityError(
      "OTP_INVALID_OR_EXPIRED",
      401,
      "OTP is invalid or expired.",
    );
  }

  if (
    challenge.phone !== phone ||
    challenge.userId !== userId ||
    challenge.channel !== channel
  ) {
    throw new OtpIdentityError(
      "OTP_INVALID_OR_EXPIRED",
      401,
      "OTP is invalid or expired.",
    );
  }

  if (challenge.expiresAt < Date.now()) {
    localOtpChallenges.delete(challengeId);

    throw new OtpIdentityError(
      "OTP_INVALID_OR_EXPIRED",
      401,
      "OTP is invalid or expired.",
    );
  }

  challenge.attempts += 1;

  if (challenge.attempts > 6) {
    localOtpChallenges.delete(challengeId);

    throw new OtpIdentityError(
      "OTP_ATTEMPTS_EXCEEDED",
      429,
      "Too many OTP attempts.",
    );
  }

  const candidate = Buffer.from(hashOtp(challengeId, code));
  const expected = Buffer.from(challenge.codeHash);

  if (
    candidate.length !== expected.length ||
    !crypto.timingSafeEqual(candidate, expected)
  ) {
    throw new OtpIdentityError(
      "OTP_INVALID_OR_EXPIRED",
      401,
      "OTP is invalid or expired.",
    );
  }

  localOtpChallenges.delete(challengeId);

  return { verified: true };
}

function requireGuestIdentity(session: PublicAuthSession | null) {
  if (!session) {
    throw new OtpIdentityError(
      "AUTH_REQUIRED",
      401,
      "Authentication is required.",
    );
  }

  if (session.role !== "customer" && session.role !== "partner") {
    throw new OtpIdentityError(
      "IDENTITY_SESSION_REQUIRED",
      403,
      "A Customer or Partner session is required.",
    );
  }

  if (session.authMethod !== "guest") {
    throw new OtpIdentityError(
      "IDENTITY_ALREADY_VERIFIED",
      409,
      "Identity is already verified.",
    );
  }

  return session;
}

export class OtpIdentityService {
  capabilities() {
    return {
      sms: Boolean(unimatrixConfig() || unimatrixConfig("+86") || supabaseConfig() || esmsConfig() || genericProviderConfig("sms")),
      whatsapp: Boolean(genericProviderConfig("whatsapp")),
      contract: OTP_ADAPTER_CONTRACT,
    };
  }

  async start(session: PublicAuthSession | null, input: any) {
    const current = requireGuestIdentity(session);
    const channel = normalizeChannel(input?.channel);
    const phone = normalizePhone(input?.phone);
    const locale = String(input?.locale || "vi-VN").slice(0, 10);

    // Vietnam uses the configured domestic eSMS route so delivery is a real
    // carrier SMS, while China remains on the China-specific Unimatrix route.
    const useVietnamEsms = channel === "sms" && phone.startsWith("+84") && Boolean(esmsConfig());
    const useUnimatrix = channel === "sms" && !useVietnamEsms && Boolean(unimatrixConfig(phone));
    if (useUnimatrix) {
      await reserveOneTimeUnimatrixOtp(phone, current.userId);
    }

    let data: any;
    try {
      data =
        useUnimatrix
          ? await startUnimatrixOtp(phone, current.userId)
          : useVietnamEsms
            ? await startEsmsOtp(phone, current.userId, channel)
          : channel === "sms" && supabaseConfig()
            ? await startSupabaseOtp(phone, current.userId)
            : channel === "sms" && esmsConfig()
              ? await startEsmsOtp(phone, current.userId, channel)
              : await callGenericProvider(channel, {
                action: "start",
                channel,
                phone,
                locale,
                purpose: "identity_upgrade",
                userId: current.userId,
                requestId: crypto.randomUUID(),
              });
    } catch (error) {
      // A network timeout is ambiguous: Unimatrix may already have accepted
      // the send. Keep the reservation in that case so a retry cannot bill
      // the same phone twice. A provider rejection is safe to release.
      if (
        useUnimatrix &&
        !(
          error instanceof OtpIdentityError &&
          error.code === "OTP_PROVIDER_UNAVAILABLE"
        )
      ) {
        await releaseOneTimeUnimatrixOtp(phone, current.userId);
      }
      throw error;
    }

    if (useUnimatrix) {
      await saveUnimatrixProviderMessage(
        phone,
        current.userId,
        typeof data?.providerMessageId === "string"
          ? data.providerMessageId
          : undefined,
      );
    }

    const challengeId = String(data?.challengeId || "").trim();

    if (!challengeId) {
      throw new OtpIdentityError(
        "OTP_PROVIDER_CONTRACT_INVALID",
        502,
        "OTP provider did not return a challenge ID.",
      );
    }

    return {
      channel,
      phone,
      maskedPhone: `${phone
        .slice(0, Math.max(3, phone.length - 4))
        .replace(/\d/g, "•")}${phone.slice(-4)}`,
      challengeId,
      expiresInSeconds: boundedNumber(
        data?.expiresInSeconds,
        300,
        60,
        600,
      ),
      resendAfterSeconds: boundedNumber(
        data?.resendAfterSeconds,
        45,
        15,
        useUnimatrix ? 300 : 120,
      ),
      resendAllowed: !useUnimatrix,
    };
  }

  async verify(session: PublicAuthSession | null, input: any) {
    const current = requireGuestIdentity(session);
    const channel = normalizeChannel(input?.channel);
    const phone = normalizePhone(input?.phone);
    const challengeId = String(input?.challengeId || "").trim();
    const code = String(input?.code || "").trim();

    if (challengeId.length < 8 || challengeId.length > 300) {
      throw new OtpIdentityError(
        "OTP_CHALLENGE_INVALID",
        422,
        "OTP challenge is invalid.",
      );
    }

    if (!/^\d{4,8}$/.test(code)) {
      throw new OtpIdentityError(
        "OTP_CODE_INVALID",
        422,
        "OTP code must contain 4 to 8 digits.",
      );
    }

    const useVietnamEsms = channel === "sms" && phone.startsWith("+84") && Boolean(esmsConfig());
    const useUnimatrix = channel === "sms" && !useVietnamEsms && Boolean(unimatrixConfig(phone));
    if (useUnimatrix) {
      await assertUnimatrixOtpReservation(phone, current.userId);
    }

    const data =
      useUnimatrix
        ? await verifyUnimatrixOtp(challengeId, code, phone, current.userId)
        : useVietnamEsms
          ? verifyLocalOtp(
            challengeId,
            code,
            phone,
            current.userId,
            channel,
          )
        : channel === "sms" && supabaseConfig()
          ? await verifySupabaseOtp(
              challengeId,
              code,
              phone,
              current.userId,
            )
          : channel === "sms" && esmsConfig()
            ? verifyLocalOtp(
              challengeId,
              code,
              phone,
              current.userId,
              channel,
            )
            : await callGenericProvider(channel, {
              action: "verify",
              channel,
              phone,
              challengeId,
              code,
              purpose: "identity_upgrade",
              userId: current.userId,
              requestId: crypto.randomUUID(),
            });

    if (data?.verified !== true) {
      throw new OtpIdentityError(
        "OTP_INVALID_OR_EXPIRED",
        401,
        "OTP is invalid or expired.",
      );
    }

    if (useUnimatrix) {
      await finalizeUnimatrixOtpRegistration(phone, current.userId);
    }

    const db = getDb();

    const samePhone = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(20);

    const persistent = samePhone.find(
      (user) => !user.isGuest && user.id !== current.userId,
    );

    let targetUserId = current.userId;
    let trustedDeviceToken: string | undefined;

    if (persistent) {
      targetUserId = persistent.id;

      await db
        .insert(userRoles)
        .values({
          userId: targetUserId,
          role: current.role,
          isActive: true,
        })
        .onConflictDoNothing();

      trustedDeviceToken = (
        await trustedDeviceService.createForUser(targetUserId)
      ).raw;
    } else {
      await db
        .update(users)
        .set({
          phone,
          isGuest: false,
          guestExpiresAt: null,
          profileCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, current.userId));

      await trustedDeviceService.promoteUser(current.userId);
    }

    await sessionService.revokeDevice(
      current.userId,
      current.sessionId,
    );

    const issued = await sessionService.issue({
      userId: targetUserId,
      role: current.role,
    });

    return {
      ...issued,
      session: issued.session,
      trustedDeviceToken,
      identityUpgraded: true,
      channel,
    };
  }
}

export const otpIdentityService = new OtpIdentityService();
export { OtpIdentityError };
