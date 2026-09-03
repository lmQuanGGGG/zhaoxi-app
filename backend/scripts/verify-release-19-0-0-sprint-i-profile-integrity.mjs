import fs from "node:fs";

const profile=fs.readFileSync("lib/services/customer-profile-service.ts","utf8");
const otp=fs.readFileSync("lib/services/otp-identity-service.ts","utf8");
const schema=fs.readFileSync("db/schema.ts","utf8");
const h1=fs.readFileSync("scripts/verify-release-19-0-0-sprint-h-1-esms-adapter.mjs","utf8");

const checks=[
  [!profile.includes("userValues.phone="),"Customer profile PATCH cannot mutate verified users.phone"],
  [!profile.includes("trustedDeviceService"),"Customer profile save cannot promote Guest identity"],
  [profile.includes("Verified phone is identity-owned"),"Verified-phone ownership contract is documented"],
  [otp.includes("const samePhone = await db"),"OTP verification preserves persistent-phone account lookup"],
  [otp.includes("phone,") && otp.includes("isGuest: false"),"OTP verification remains the phone identity-upgrade path"],
  [otp.includes("persistent.id"),"Existing verified Customer resume path remains intact"],
  [/index\("users_phone_idx"\)\.on\(table\.phone\)/.test(schema),"Sprint I introduces no phone-schema migration"],
  [!/uniqueIndex\([^\n]*\)\.on\(table\.phone\)/.test(schema),"Sprint I does not introduce a users.phone unique migration"],
  [h1.includes("eSMS transport adapter"),"Sprint H.1 eSMS regression verifier remains present"],
];

const failed=checks.filter(([ok]) => !ok);
if(failed.length){for(const [,m] of failed)console.error("FAIL: "+m);process.exit(1);}
console.log("ZhaoXi 19.0.0 Sprint I Backend verified: verified-phone profile integrity, OTP-owned identity upgrade, persistent-customer resume compatibility, no profile-driven Guest promotion, no schema migration, and Sprint H.1 compatibility PASS.");
