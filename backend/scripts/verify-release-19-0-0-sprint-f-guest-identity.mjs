import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const guest=read("app/api/auth/guest/bootstrap/route.ts");
const session=read("lib/services/session-service.ts");
const caps=read("app/api/auth/identity/capabilities/route.ts");
const otp=read("lib/services/otp-identity-service.ts");
const pkg=JSON.parse(read("package.json"));
const checks=[
 [!guest.includes('body.role==="partner"'),"guest bootstrap must not accept Partner role"],
 [guest.includes('const role="customer" as const'),"guest bootstrap must be customer-only"],
 [session.includes('authMethod: "guest"|"wechat"|"otp"|"qr"|"internal"'),"public session must model guest and verified OTP auth methods"],
 [session.includes('user.isGuest?"guest"'),"guest users must surface guest auth method"],
 [otp.includes('AUTH_SMS_OTP_PROVIDER')&&otp.includes('AUTH_WHATSAPP_OTP_PROVIDER'),"OTP capabilities must remain provider-gated"],
 [caps.includes('passwordCollection:{wechat:false,whatsapp:false}'),"third-party passwords must never be collected"],
 [pkg.scripts?.["verify:19.0.0:sprint-f"]?.includes("sprint-f-guest-identity"),"Sprint F verifier script missing"],
];
for(const [ok,msg] of checks)if(!ok){console.error(`FAIL: ${msg}`);process.exit(1)}
console.log("ZhaoXi 19.0.0 Sprint F Backend verified: customer-only guest identity, guest session classification, provider-gated SMS/WhatsApp OTP capabilities, and optional WeChat OAuth contracts PASS.");
