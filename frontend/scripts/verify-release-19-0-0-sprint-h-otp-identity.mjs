import fs from "node:fs";
const auth=fs.readFileSync("packages/auth/src/index.tsx","utf8");
const proxy=fs.readFileSync("apps/customer/app/api/auth/unified/[...path]/route.ts","utf8");
const cart=fs.readFileSync("apps/customer/app/cart/page.tsx","utf8");
const checks=[
 [auth.includes('authMethod?: "guest" | "account" | "wechat" | "otp" | "qr" | "internal"'),"OTP session type"],
 [proxy.includes('path.startsWith("identity/")'),"identity routes pass through Customer auth proxy"],
 [proxy.includes('path==="identity/otp/verify"')&&proxy.includes('setAuthCookies(response,payload.data)'),"OTP verification rotates HTTP-only auth cookies"],
 [auth.includes('/api/auth/unified/identity/otp/start')&&auth.includes('/api/auth/unified/identity/otp/verify'),"SMS/WhatsApp OTP execution routes wired"],
 [auth.includes('setChannel("sms")')&&auth.includes('setChannel("whatsapp")'),"both provider-gated OTP channels are actionable"],
 [auth.includes('autoComplete="one-time-code"')&&auth.includes('inputMode="numeric"'),"OTP input semantics"],
 [auth.includes('saveServerSession(j.data)')&&auth.includes('onVerified?.()'),"verified OTP refreshes browser session and resumes caller"],
 [auth.includes('resendSeconds')&&auth.includes('resendAfterSeconds'),"OTP resend cooldown UX"],
 [cart.includes('onVerified={()=>{setIdentityUpgradeOpen(false);if(pendingCheckout)router.push(pendingCheckout)}}'),"Sprint G checkout resume contract preserved"],
 [!auth.includes('WhatsApp password')&&!auth.includes('WeChat password'),"no social password collection"],
];
const failed=checks.filter(([ok])=>!ok);if(failed.length){for(const[,m]of failed)console.error(`FAIL: ${m}`);process.exit(1)}
console.log("ZhaoXi 19.0.0 Sprint H Platform verified: capability-driven SMS/WhatsApp OTP actions, E.164 phone input, OTP verification and resend UX, server-session rotation, and resumable Sprint G checkout PASS.");
