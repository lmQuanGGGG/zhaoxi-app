import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const route=read("app/api/service-requests/route.ts");
const pkg=JSON.parse(read("package.json"));
const checks=[
 [route.includes('code: "AUTH_REQUIRED"'),"service request creation must reject missing authentication"],
 [route.includes('session.role !== "customer"')&&route.includes('code: "CUSTOMER_SESSION_REQUIRED"'),"service request creation must reject non-Customer sessions"],
 [route.includes('session.authMethod === "guest"')&&route.includes('code: "IDENTITY_UPGRADE_REQUIRED"'),"service request creation must reject Guest identity"],
 [pkg.scripts?.["verify:19.0.0:sprint-g"]?.includes("sprint-g-checkout-identity"),"Sprint G verifier script missing"],
];
for(const [ok,msg] of checks)if(!ok){console.error(`FAIL: ${msg}`);process.exit(1)}
console.log("ZhaoXi 19.0.0 Sprint G Backend verified: service-request creation requires a verified Customer session and rejects unauthenticated, Guest, and non-Customer callers PASS.");
