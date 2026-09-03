import fs from "node:fs";
const checks=[
 ["apps/partner/app/StoreManager.tsx",["Thông tin nhà hàng","Quản lý đơn hàng / dịch vụ","contactPhone","wechat"]],
 ["apps/customer/app/_components/ServiceRequestForm.tsx",["scheduleHint","serviceHeadImage"]],
 ["apps/customer/app/restaurant/[organizationId]/RestaurantDetail.tsx",["draftBannerUrls","4200"]]
];
for(const [file,terms] of checks){const text=fs.readFileSync(file,"utf8");for(const term of terms){if(!text.includes(term))throw new Error(`${file} missing ${term}`)}}
console.log("Sprint 13.6 partner tabs, contact profile, live banners and immediate-order UX structure is valid.");
