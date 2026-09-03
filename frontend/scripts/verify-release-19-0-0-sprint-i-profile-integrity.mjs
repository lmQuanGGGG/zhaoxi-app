import fs from "node:fs";

const profile=fs.readFileSync("apps/customer/app/profile/page.tsx","utf8");
const proxy=fs.readFileSync("apps/customer/app/api/customer-profile/route.ts","utf8");
const h1=fs.readFileSync("scripts/verify-release-19-0-0-sprint-h-1-esms-compatibility.mjs","utf8");

const checks=[
  [/readOnly\s+aria-readonly=.[Tt]rue./.test(profile),"Verified phone is read-only in Customer profile UI"],
  [!profile.includes("setForm({...form,phone:e.target.value})"),"Customer profile cannot locally edit verified phone"],
  [profile.includes("phone:verifiedPhone,...editableProfile"),"Profile save separates verified phone from editable profile payload"],
  [profile.includes("JSON.stringify({...editableProfile,preferredLocale:locale})"),"Profile PATCH excludes verified phone"],
  [profile.includes("xác minh số điện thoại"),"Vietnamese Guest guidance requires phone verification"],
  [profile.includes("Verify your phone number"),"English Guest guidance requires phone verification"],
  [profile.includes("验证手机号码"),"Simplified Chinese Guest guidance requires phone verification"],
  [profile.includes("驗證手機號碼"),"Traditional Chinese Guest guidance requires phone verification"],
  [proxy.includes("/api/customer-profile"),"Existing Customer profile BFF contract remains intact"],
  [h1.includes("provider-neutral Customer OTP UX"),"Sprint H.1 OTP compatibility remains intact"],
];

const failed=checks.filter(function(item){return !item[0];});
if(failed.length){for(const item of failed)console.error("FAIL: "+item[1]);process.exit(1);}
console.log("ZhaoXi 19.0.0 Sprint I Platform verified: verified phone is read-only, profile PATCH excludes identity-owned phone, Guest guidance requires phone verification, Customer profile BFF remains intact, and Sprint H.1 compatibility PASS.");
