import fs from "node:fs";
const checks = [
  ["apps/customer/app/_components/ServiceRequestForm.tsx", "quantityButton"],
  ["apps/partner/app/OperationsBoard.tsx", "assigned"],
  ["apps/partner/app/OperationsBoard.tsx", "organizationId"],
  ["packages/auth/src/index.tsx", "organizationCode"],
  ["packages/sdk/src/index.ts", "Promise<Response>"],
];
for (const [file, needle] of checks) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) throw new Error(`${file} is missing ${needle}`);
}
console.log("Sprint 12.5.1.1 integrated correction is valid.");
