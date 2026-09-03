import fs from "node:fs";
const required=[
"apps/partner/app/StoreManager.tsx",
"apps/partner/app/OperationsBoard.tsx",
"apps/customer/app/_components/ServiceBrowser.tsx",
"apps/partner/app/api/platform-services/[id]/route.ts"
];
for(const file of required){if(!fs.existsSync(file))throw new Error(`Missing ${file}`)}
const store=fs.readFileSync("apps/partner/app/StoreManager.tsx","utf8");
for(const token of ["deleteItem","modulePresentation","clearSession"]){if(!store.includes(token))throw new Error(`Missing ${token}`)}
console.log("Sprint 13.0 partner verticals and catalog synchronization structure is valid.");
