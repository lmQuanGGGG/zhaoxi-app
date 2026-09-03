import fs from "node:fs";

const checks = [
  ["apps/partner/app/StoreManager.tsx", ["const submitted", "created?.id", "imageUrl: submitted.image"]],
  ["apps/customer/app/_components/ServiceBrowser.tsx", ["fadeBannerLayer", "menu.slice(0, 2)", "viewRestaurant"]],
  ["apps/customer/app/restaurant/[organizationId]/RestaurantDetail.tsx", ["displayBanners", "fadeBannerLayerActive"]],
  ["apps/customer/app/services.module.css", ["professional cross-fade", "transition:opacity 1.15s"]],
  ["apps/admin/app/OperationsBoard.tsx", ["moduleFilter", "openGroup", "allModules"]],
];

for (const [file, needles] of checks) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  const content = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (!content.includes(needle)) throw new Error(`${file} missing ${needle}`);
  }
}

console.log("Sprint 13.4 media binding, fading banners and grouped admin transactions structure is valid.");
