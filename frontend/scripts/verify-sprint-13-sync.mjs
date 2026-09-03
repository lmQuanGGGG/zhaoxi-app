import fs from "node:fs";
const file = fs.readFileSync("apps/partner/app/StoreManager.tsx", "utf8");
for (const token of ["bannerIndex", "confirmBanners", "syncServices", "includeDrafts=1", "catalogSyncedAt"]) {
  if (!file.includes(token)) throw new Error(`Missing ${token}`);
}
console.log("Sprint 13.0 banner preview and service synchronization structure is valid.");
