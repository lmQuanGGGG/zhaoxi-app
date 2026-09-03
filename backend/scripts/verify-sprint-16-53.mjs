import fs from"node:fs";
const req=["SPRINT_16_52.md","SPRINT_16_53.md","lib/services/payment-provider-runtime-service.ts","lib/services/partner-payment-gateway-service.ts","app/api/admin-payment-provider-runtime/route.ts","app/api/partner-payment-provider-runtime/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.53.0")throw new Error("Backend version must be 16.53.0");
for(const x of["verify:16.53","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const rt=fs.readFileSync("lib/services/payment-provider-runtime-service.ts","utf8");
for(const m of['"closed"|"open"|"half_open"',"FAILURE_THRESHOLD=3","OPEN_MS=5*60*1000","consecutiveFailures","circuit_opened","half_open_probe","paymentProviderRuntime","directToPartner:true"])
 if(!rt.includes(m))throw new Error(`Missing runtime marker ${m}`);
const g=fs.readFileSync("lib/services/partner-payment-gateway-service.ts","utf8");
for(const m of["fallbackGateway","FALLBACK_GATEWAY_MUST_DIFFER","paymentProviderRuntimeService.canExecute","paymentProviderRuntimeService.success","paymentProviderRuntimeService.failure","fallbackUsed","primaryProvider","PARTNER_PAYMENT_METHOD_UNAVAILABLE","partnerOwnedFallbackOnly:true"])
 if(!g.includes(m))throw new Error(`Missing failover marker ${m}`);
if(g.includes("platformHoldsFunds:true"))throw new Error("Platform funds invariant violated");
console.log("Sprint 16.53 Backend Payment Provider Adapter Runtime, Health Check & Failover Guard structure is valid.");