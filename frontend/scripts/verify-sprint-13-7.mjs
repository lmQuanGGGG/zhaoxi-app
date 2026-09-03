import fs from "node:fs";
const checks={
 "apps/partner/app/PartnerWorkspaceNav.tsx":["zx-partner-tabs","Quản lý đơn hàng / dịch vụ"],
 "apps/partner/app/PartnerOrderAlerts.tsx":["estimatedMinutes","[10,15,20,25,30]","estimatedMinutes"],
 "apps/customer/app/CustomerOrderAlerts.tsx":["platform-notifications","in_progress","completed"],
 "apps/customer/app/order/[id]/page.tsx":["estimatedCompletionAt","Đang tìm người giao hàng"],
 "SPRINT_13_7.md":["Automatic completion"]
};
for(const[file,patterns]of Object.entries(checks)){if(!fs.existsSync(file))throw new Error(`Missing ${file}`);const text=fs.readFileSync(file,"utf8");for(const p of patterns)if(!text.includes(p))throw new Error(`Missing ${p} in ${file}`)}
console.log("Sprint 13.7 live order acceptance and automatic completion structure is valid.");
