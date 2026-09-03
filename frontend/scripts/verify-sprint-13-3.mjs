import fs from "node:fs";
const required=[
  "apps/partner/app/api/media/upload/route.ts",
  "apps/customer/app/restaurant/[organizationId]/page.tsx",
  "apps/customer/app/restaurant/[organizationId]/RestaurantDetail.tsx",
  "apps/customer/app/_components/ServiceBrowser.tsx",
  "apps/customer/app/api/platform-services/route.ts"
];
for(const file of required){if(!fs.existsSync(file)){console.error(`Missing ${file}`);process.exit(1)}}
const upload=fs.readFileSync(required[0],"utf8");
if(!upload.includes("PUBLIC_MEDIA_READ_WRITE_TOKEN")||!upload.includes('access: "public"')){console.error("Public media upload is not configured.");process.exit(1)}
const browser=fs.readFileSync(required[3],"utf8");
if(!browser.includes("slice(0,2)")||!browser.includes("/restaurant/")){console.error("Restaurant preview flow is incomplete.");process.exit(1)}
console.log("Sprint 13.3 Public Media and Restaurant Experience structure is valid.");
