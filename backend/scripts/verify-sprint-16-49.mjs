import fs from"node:fs";
const req=["SPRINT_16_48.md","SPRINT_16_49.md","lib/services/travel-platform-fee-service.ts","lib/services/travel-booking-service.ts","app/api/admin-travel-fees/route.ts","app/api/admin-travel-fees/[organizationId]/route.ts","app/api/admin-travel-fees/bookings/[requestId]/route.ts","app/api/partner-travel-fees/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.49.0")throw new Error("Backend version must be 16.49.0");
for(const x of["verify:16.49","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const fee=fs.readFileSync("lib/services/travel-platform-fee-service.ts","utf8");
for(const m of["travelPlatformFeePolicy","percentageBps","fixedPerBooking","minimumFee","maximumFee","directPaymentToPartner","platformFeeDue","platformFeePaid","travel_platform_fee_policy","travel_platform_fee_ledger"])
 if(!fee.includes(m))throw new Error(`Missing Travel platform fee marker ${m}`);
const booking=fs.readFileSync("lib/services/travel-booking-service.ts","utf8");
for(const m of["paymentRouting:\"direct_to_partner\"","platformDoesNotHoldCustomerFunds:true","travelPlatformFeeSnapshot","travelPlatformFeeStatus:platformFee>0?\"accrued\":\"not_due\"","feeAmount>0?\"due\":\"not_due\"","\"void\""])
 if(!booking.includes(m))throw new Error(`Missing direct-to-Partner booking finance marker ${m}`);
console.log("Sprint 16.49 Backend Direct-to-Partner Payment Readiness & Platform Usage Fee Foundation structure is valid.");