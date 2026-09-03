import fs from"node:fs";
const req=["SPRINT_16_49.md","SPRINT_16_50.md","lib/services/partner-payment-gateway-service.ts","app/api/partner-payment-gateway/route.ts","app/api/admin-partner-payment-gateways/route.ts","app/api/customer-travel-inquiries/[id]/payment/route.ts","app/api/partner-payment-webhook/[organizationId]/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.50.0")throw new Error("Backend version must be 16.50.0");
for(const x of["verify:16.50","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const s=fs.readFileSync("lib/services/partner-payment-gateway-service.ts","utf8");
for(const m of["partner_checkout_link","partner_qr","custom_api","ZX_PARTNER_GATEWAY_","platformHoldsFunds:false","directToPartner:true","createHmac","timingSafeEqual","partnerPaymentIntent","travelPaymentStatus","rawSecretsStored:false","{amount}","{requestCode}","{intentId}"])
 if(!s.includes(m))throw new Error(`Missing gateway marker ${m}`);
const partner=fs.readFileSync("app/api/partner-payment-gateway/route.ts","utf8");if(!partner.includes('role!=="partner"')||!partner.includes("partnerPaymentGatewayService.update"))throw new Error("Partner gateway ownership route missing");
const admin=fs.readFileSync("app/api/admin-partner-payment-gateways/route.ts","utf8");if(!admin.includes('role!=="admin"')||admin.includes("PATCH"))throw new Error("Admin gateway oversight must be read-only");
const payment=fs.readFileSync("app/api/customer-travel-inquiries/[id]/payment/route.ts","utf8");if(!payment.includes('role!=="customer"')||!payment.includes("createIntent")||!payment.includes("status("))throw new Error("Customer Partner-payment route missing");
const webhook=fs.readFileSync("app/api/partner-payment-webhook/[organizationId]/route.ts","utf8");if(!webhook.includes("x-zhaoxi-partner-signature")||!webhook.includes("partnerPaymentGatewayService.webhook"))throw new Error("Signed Partner webhook route missing");
console.log("Sprint 16.50 Backend Partner-owned Payment Gateway Integration Foundation structure is valid.");