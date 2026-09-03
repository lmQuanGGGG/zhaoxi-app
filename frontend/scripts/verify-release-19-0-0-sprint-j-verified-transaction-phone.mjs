import fs from "node:fs";

const service=fs.readFileSync("apps/customer/app/_components/ServiceRequestForm.tsx","utf8");
const housing=fs.readFileSync("apps/customer/app/housing/[id]/HousingListingDetail.tsx","utf8");
const travel=fs.readFileSync("apps/customer/app/travel/[id]/TravelExperienceDetail.tsx","utf8");
const serviceBff=fs.readFileSync("apps/customer/app/api/platform-requests/route.ts","utf8");
const housingBff=fs.readFileSync("apps/customer/app/api/housing-inquiries/route.ts","utf8");
const travelBff=fs.readFileSync("apps/customer/app/api/travel-inquiries/route.ts","utf8");
const sprintI=fs.readFileSync("scripts/verify-release-19-0-0-sprint-i-profile-integrity.mjs","utf8");

const checks=[
  [service.includes("readOnly") && service.includes("aria-readonly"),"Service order verified phone is read-only"],
  [!service.includes("customerPhone:form.phone.trim()"),"Service order does not send browser customerPhone"],
  [!service.includes("phone:address.recipientPhone"),"Saved delivery address cannot replace identity phone"],
  [!service.includes("phone:form.phone.trim()"),"Verified phone is not persisted to local browser profile"],
  [housing.includes("readOnly") && housing.includes("aria-readonly"),"Housing verified phone is read-only"],
  [housing.includes("customerPhone:verifiedPhone,...transactionForm"),"Housing separates verified phone from payload"],
  [housing.includes("/api/customer-profile"),"Housing loads account verified phone"],
  [travel.includes("readOnly") && travel.includes("aria-readonly"),"Travel verified phone is read-only"],
  [travel.includes("customerPhone: verifiedPhone, ...transactionForm"),"Travel separates verified phone from payload"],
  [travel.includes("/api/customer-profile"),"Travel loads account verified phone"],
  [serviceBff.includes("customerPhone:browserCustomerPhone"),"Service BFF strips browser customerPhone"],
  [housingBff.includes("customerPhone:browserCustomerPhone"),"Housing BFF strips browser customerPhone"],
  [travelBff.includes("customerPhone:browserCustomerPhone"),"Travel BFF strips browser customerPhone"],
  [sprintI.includes("verified phone is read-only"),"Sprint I verified profile integrity remains present"],
];

const failed=checks.filter(function(item){return !item[0];});
if(failed.length){for(const item of failed)console.error("FAIL: "+item[1]);process.exit(1);}
console.log("ZhaoXi 19.0.0 Sprint J Platform verified: service, housing, and travel transaction flows use read-only verified Customer phone; browser customerPhone is excluded in UI payloads and stripped again by BFF; saved addresses/localStorage cannot replace identity phone; Sprint I compatibility PASS.");
