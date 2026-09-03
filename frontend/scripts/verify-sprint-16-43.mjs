import fs from"node:fs";
const req=["SPRINT_16_42.md","SPRINT_16_43.md","apps/admin/app/HousingModerationPanel.tsx","apps/admin/app/HousingOversightPanel.tsx","apps/admin/app/api/admin-housing-listings/route.ts","apps/admin/app/api/admin-housing-listings/[id]/route.ts","apps/partner/app/housing-inventory/HousingInventoryManager.tsx","apps/customer/app/_components/HousingBrowser.tsx","apps/customer/app/housing/[id]/HousingListingDetail.tsx"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.43.0")throw new Error("Platform version must be 16.43.0");
for(const x of["verify:16.43","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const admin=fs.readFileSync("apps/admin/app/HousingModerationPanel.tsx","utf8");
for(const m of["qualityScore","qualityIssues","admin-housing-listings",'act(row,"verify")','act(row,"hide")','act(row,"restore")'])
 if(!admin.includes(m))throw new Error(`Missing Admin moderation UI marker ${m}`);
const oversight=fs.readFileSync("apps/admin/app/HousingOversightPanel.tsx","utf8");if(!oversight.includes("<HousingModerationPanel/>"))throw new Error("Housing moderation panel not mounted");
const partner=fs.readFileSync("apps/partner/app/housing-inventory/HousingInventoryManager.tsx","utf8");for(const m of["adminVerified","adminHidden","moderationStatus"])if(!partner.includes(m))throw new Error(`Partner moderation marker missing ${m}`);
const customer=fs.readFileSync("apps/customer/app/_components/HousingBrowser.tsx","utf8");if(!customer.includes("adminVerified")||!customer.includes("t.verified"))throw new Error("Customer Verified badge/prioritization missing");
const detail=fs.readFileSync("apps/customer/app/housing/[id]/HousingListingDetail.tsx","utf8");if(!detail.includes("m.adminVerified===true"))throw new Error("Housing Detail Verified gate missing");
for(const f of["apps/admin/app/HousingModerationPanel.tsx","apps/partner/app/housing-inventory/HousingInventoryManager.tsx","apps/customer/app/_components/HousingBrowser.tsx"]){const text=fs.readFileSync(f,"utf8");for(const bad of["Kiểm duyệt · Moderation","平台认证 · Verified","ZhaoXi xác thực · Verified"])if(text.includes(bad))throw new Error(`Single-language violation ${f}: ${bad}`)}
console.log("Sprint 16.43 Platform Housing Admin Listing Moderation & Marketplace Quality Control structure is valid.");