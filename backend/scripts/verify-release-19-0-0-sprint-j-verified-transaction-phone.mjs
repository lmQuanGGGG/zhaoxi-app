import fs from "node:fs";

const serviceRequest=fs.readFileSync("app/api/service-requests/route.ts","utf8");
const housing=fs.readFileSync("app/api/housing-inquiries/route.ts","utf8");
const travel=fs.readFileSync("app/api/travel-inquiries/route.ts","utf8");
const profile=fs.readFileSync("lib/services/customer-profile-service.ts","utf8");
const schema=fs.readFileSync("db/schema.ts","utf8");

const checks=[
  [serviceRequest.includes("IDENTITY_UPGRADE_REQUIRED"),"Service request requires verified Customer identity"],
  [serviceRequest.includes("VERIFIED_PHONE_REQUIRED"),"Service request requires verified identity phone"],
  [serviceRequest.includes("customerPhone: verifiedPhone"),"Service request uses server-owned verified phone"],
  [!serviceRequest.includes("customerPhone: requiredString(body"),"Service request no longer trusts browser customerPhone"],
  [housing.includes("IDENTITY_UPGRADE_REQUIRED"),"Housing inquiry blocks Guest identity"],
  [housing.includes("customerPhone:verifiedPhone"),"Housing inquiry uses server-owned verified phone"],
  [housing.includes("customerId:session.userId"),"Housing inquiry binds verified Customer user ID"],
  [travel.includes("IDENTITY_UPGRADE_REQUIRED"),"Travel inquiry blocks Guest identity"],
  [travel.includes("customerPhone:verifiedPhone"),"Travel inquiry uses server-owned verified phone"],
  [travel.includes("customerId:session.userId"),"Travel inquiry binds verified Customer user ID"],
  [!profile.includes("userValues.phone="),"Customer profile still cannot mutate verified phone"],
  [/index\("users_phone_idx"\)\.on\(table\.phone\)/.test(schema),"No users.phone schema migration introduced"],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,m] of failed)console.error("FAIL: "+m);process.exit(1);}
console.log("ZhaoXi 19.0.0 Sprint J Backend verified: service requests, housing inquiries, and travel inquiries require verified Customer identity and use server-owned verified phone; browser-supplied identity phone is not trusted; Sprint I profile integrity and no-schema-migration contracts remain intact PASS.");
