import fs from"node:fs";
const req=["SPRINT_16_51.md","SPRINT_16_52.md","apps/partner/app/PartnerPaymentGatewaySettings.tsx","apps/partner/app/api/payment-provider-registry/route.ts","apps/partner/app/api/partner-payment-onboarding/route.ts","apps/admin/app/PaymentProviderHealthPanel.tsx","apps/admin/app/TravelOversightPanel.tsx","apps/admin/app/api/admin-payment-provider-health/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.52.0")throw new Error("Platform version must be 16.52.0");
for(const x of["verify:16.52","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const partner=fs.readFileSync("apps/partner/app/PartnerPaymentGatewaySettings.tsx","utf8");
for(const m of["payment-provider-registry","selected.capabilities","selected.requires","ZX_PARTNER_GATEWAY_","onboarding"])
 if(!partner.includes(m))throw new Error(`Missing Partner onboarding UI ${m}`);
const admin=fs.readFileSync("apps/admin/app/PaymentProviderHealthPanel.tsx","utf8");
for(const m of["admin-payment-provider-health","capabilities","providerId"])if(!admin.includes(m))throw new Error(`Missing Admin Provider Health UI ${m}`);
const travel=fs.readFileSync("apps/admin/app/TravelOversightPanel.tsx","utf8");if(!travel.includes("<PaymentProviderHealthPanel/>"))throw new Error("Provider Health panel not mounted");
console.log("Sprint 16.52 Platform Payment Provider Registry, Capability Matrix & Partner Gateway Onboarding structure is valid.");