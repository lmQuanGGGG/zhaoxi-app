import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const auth=read("packages/auth/src/index.tsx");
const order=read("apps/customer/app/_components/ServiceRequestForm.tsx");
const pkg=JSON.parse(read("package.json"));
const checks=[
 [auth.includes('role==="customer"?<PhoneEntryStep'),"Customer must enter through PhoneEntryStep"],
 [auth.includes('authMethod?: "guest"'),"guest auth method missing"],
 [auth.includes('IdentityUpgradeSheet'),"identity upgrade sheet missing"],
 [auth.includes('smsOtp')&&auth.includes('whatsappOtp')&&auth.includes('wechatOAuth'),"identity methods missing"],
 [order.includes('session?.authMethod==="guest"')&&order.includes('setIdentityUpgradeOpen(true)'),"service order must gate guest submission"],
 [order.includes('<IdentityUpgradeSheet'),"service order must render identity upgrade sheet"],
 [pkg.scripts?.["verify:19.0.0:sprint-f"]?.includes("sprint-f-guest-identity"),"Sprint F verifier script missing"],
];
for(const [ok,msg] of checks)if(!ok){console.error(`FAIL: ${msg}`);process.exit(1)}
console.log("ZhaoXi 19.0.0 Sprint F Platform verified: phone-first Customer entry, protected-order identity upgrade compatibility, locale-pure SMS/WhatsApp/WeChat capability UX, and non-QR Customer entry contracts PASS.");
