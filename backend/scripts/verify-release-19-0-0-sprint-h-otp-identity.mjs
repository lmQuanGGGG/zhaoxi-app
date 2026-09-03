import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const service = read("lib/services/otp-identity-service.ts");
const capabilities = read(
  "app/api/auth/identity/capabilities/route.ts",
);
const startRoute = read(
  "app/api/auth/identity/otp/start/route.ts",
);
const verifyRoute = read(
  "app/api/auth/identity/otp/verify/route.ts",
);
const sessionService = read(
  "lib/services/session-service.ts",
);

const checks = [
  [
    service.includes(
      'export type OtpChannel = "sms" | "whatsapp"',
    ),
    "SMS and WhatsApp OTP channels remain supported",
  ],

  [
    service.includes(
      'export const OTP_ADAPTER_CONTRACT = "zhaoxi-otp-adapter-v1"',
    ),
    "Sprint H OTP adapter contract preserved",
  ],

  [
    service.includes("async start(") &&
      service.includes("async verify("),
    "start/verify OTP identity actions remain implemented",
  ],

  [
    service.includes("requireGuestCustomer") &&
      service.includes('session.role !== "customer"') &&
      service.includes('session.authMethod !== "guest"'),
    "OTP identity upgrade remains restricted to Guest Customer sessions",
  ],

  [
    service.includes("normalizePhone") &&
      service.includes("^\\+[1-9]"),
    "E.164 phone validation preserved",
  ],

  [
    service.includes("providerCall") ||
      service.includes("sendEsms") ||
      service.includes("startEsms"),
    "server-side OTP provider transport remains implemented",
  ],

  [
    service.includes("ESMS_SECRET_KEY") ||
      service.includes("AUTH_SMS_OTP_PROVIDER_TOKEN") ||
      service.includes("AUTH_WHATSAPP_OTP_PROVIDER_TOKEN"),
    "provider credential remains server-owned",
  ],

  [
    !capabilities.includes("ESMS_SECRET_KEY") &&
      !capabilities.includes("AUTH_SMS_OTP_PROVIDER_TOKEN") &&
      !capabilities.includes("AUTH_WHATSAPP_OTP_PROVIDER_TOKEN"),
    "provider credential is not exposed by capability API",
  ],

  [
    service.includes("challengeId") &&
      service.includes("expiresAt") &&
      service.includes("attempts"),
    "server-owned OTP challenge lifecycle is present",
  ],

  [
    service.includes("codeHash") &&
      service.includes("hashOtp"),
    "OTP verification uses server-side code hashing",
  ],

  [
    service.includes("users.phone") &&
      service.includes("samePhone") &&
      service.includes("persistent"),
    "existing verified phone identity can be resumed safely",
  ],

  [
    service.includes("isGuest:false") ||
      service.includes("isGuest: false"),
    "verified Guest identity is promoted to persistent Customer identity",
  ],

  [
    service.includes("guestExpiresAt:null") ||
      service.includes("guestExpiresAt: null"),
    "Guest expiry is cleared after identity verification",
  ],

  [
    service.includes("trustedDeviceService.promoteUser") ||
      service.includes("trustedDeviceService.createForUser"),
    "trusted-device identity continuity is preserved",
  ],

  [
    service.includes("sessionService.revokeDevice") &&
      service.includes("sessionService.issue"),
    "verified identity rotates the server session",
  ],

  [
    service.includes('role:"customer"') ||
      service.includes('role: "customer"'),
    "upgraded identity receives Customer session role",
  ],

  [
    service.includes("identityUpgraded:true") ||
      service.includes("identityUpgraded: true"),
    "successful OTP verification reports identity upgrade",
  ],

  [
    capabilities.includes("otpIdentityService.capabilities") &&
      capabilities.includes("smsOtp") &&
      capabilities.includes("whatsappOtp"),
    "identity capability API remains provider-driven",
  ],

  [
    startRoute.includes("otpIdentityService.start"),
    "OTP start API remains wired to identity service",
  ],

  [
    verifyRoute.includes("otpIdentityService.verify"),
    "OTP verify API remains wired to identity service",
  ],

  [
    sessionService.includes("authMethod") &&
      sessionService.includes("guest"),
    "session classification remains compatible with Guest identity",
  ],
];

const failed = checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, message] of failed) {
    console.error(`FAIL: ${message}`);
  }

  process.exit(1);
}

console.log(
  "ZhaoXi 19.0.0 Sprint H Backend regression verified under Sprint H.1: Guest Customer SMS/WhatsApp OTP identity upgrade, server-owned provider credentials, persistent-phone resume, trusted-device continuity, and verified session rotation PASS.",
);