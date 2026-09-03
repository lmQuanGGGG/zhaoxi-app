import fs from "node:fs";

const targets = [
  "apps/admin/app/api/platform-beta-access/admin/route.ts",
  "apps/admin/app/api/platform-beta-access/admin/invites/[id]/route.ts",
];

for (const file of targets) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes("Record<string, string>")) {
    throw new Error(`${file} must type request headers as Record<string, string>`);
  }
  if (source.includes('authorization?: undefined')) {
    throw new Error(`${file} still contains an optional undefined authorization header`);
  }
}

console.log("Sprint 15.3.1 Admin beta-access proxy header typing hotfix is valid.");
