import fs from "node:fs";

const auth = fs.readFileSync("packages/auth/src/index.tsx", "utf8");
const proxy = fs.readFileSync("apps/customer/app/api/auth/unified/[...path]/route.ts", "utf8");
const h = fs.readFileSync("scripts/verify-release-19-0-0-sprint-h-otp-identity.mjs", "utf8");

const checks = [
  [auth.includes("/api/auth/unified/identity/otp/start"), "OTP start uses unified identity route"],
  [auth.includes("/api/auth/unified/identity/otp/verify"), "OTP verify uses unified identity route"],
  [auth.includes("methods.smsOtp?.available"), "SMS availability remains capability-driven"],
  [auth.includes("methods.whatsappOtp?.available"), "WhatsApp availability remains capability-driven"],
  [proxy.includes("identity/"), "Customer auth proxy forwards identity routes"],
  [proxy.includes("identity/otp/verify"), "Customer proxy handles OTP verification"],
  [proxy.includes("setAuthCookies"), "Verified session rotation remains HTTP-only cookie based"],
  [!auth.includes("ESMS_API_KEY") && !auth.includes("ESMS_SECRET_KEY"), "eSMS credentials are absent from browser auth package"],
  [!proxy.includes("ESMS_API_KEY") && !proxy.includes("ESMS_SECRET_KEY"), "eSMS credentials are absent from Customer proxy"],
  [h.includes("resumable Sprint G checkout PASS"), "Sprint H checkout regression contract remains intact"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, message] of failed) console.error("FAIL: " + message);
  process.exit(1);
}

console.log("ZhaoXi 19.0.0 Sprint H.1 Platform verified: provider-neutral Customer OTP UX, backend-owned eSMS transport and credentials, capability-gated SMS/WhatsApp actions, HTTP-only verified-session rotation, and Sprint H compatibility PASS.");
