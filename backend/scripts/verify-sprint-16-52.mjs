import fs from"node:fs";
const req=["SPRINT_16_51.md","SPRINT_16_52.md","lib/services/payment-provider-registry-service.ts","lib/services/partner-payment-gateway-service.ts","app/api/payment-provider-registry/route.ts","app/api/partner-payment-onboarding/route.ts","app/api/admin-payment-provider-health/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.52.0")throw new Error("Backend version must be 16.52.0");
for(const x of["verify:16.52","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const r=fs.readFileSync("lib/services/payment-provider-registry-service.ts","utf8");
for(const m of["partner_checkout_link","partner_qr","custom_api","qr:boolean","redirect:boolean","query:boolean","close:boolean","refund:boolean","webhook:boolean","reconciliation:boolean","onboarding(","directToPartner:true","platformHoldsFunds:false"])
 if(!r.includes(m))throw new Error(`Missing Provider Registry marker ${m}`);
const g=fs.readFileSync("lib/services/partner-payment-gateway-service.ts","utf8");
for(const m of["paymentProviderRegistryService.get","paymentProviderRegistryService.onboarding","PARTNER_GATEWAY_ONBOARDING_INCOMPLETE","capabilities","onboardingSteps"])
 if(!g.includes(m))throw new Error(`Gateway Registry integration missing ${m}`);
const admin=fs.readFileSync("app/api/admin-payment-provider-health/route.ts","utf8");if(!admin.includes('role!=="admin"'))throw new Error("Admin provider health authorization missing");
console.log("Sprint 16.52 Backend Payment Provider Registry, Capability Matrix & Partner Gateway Onboarding structure is valid.");