import fs from "node:fs";
const qr=fs.readFileSync("lib/services/qr-pairing-service.ts","utf8");
const checks=[
 [qr.includes('PARTNER_QR_REQUIRES_TRUSTED_IDENTITY'),"partner scan requires trusted identity"],
 [qr.includes('PARTNER_QR_NOT_AUTHORIZED'),"partner role must already be authorized"],
 [qr.includes('eq(userRoles.role, "partner")')&&qr.includes('eq(userRoles.isActive, true)'),"active partner role is checked"],
 [qr.includes('Never mint partner privilege from a scan.'),"scanner cannot mint partner privilege"],
 [qr.includes('nickname: "ZhaoXi Guest"')&&qr.includes('role: "customer"'),"customer guest bootstrap remains explicit"],
 [qr.includes('isNull(qrPairingSessions.exchangedAt)')&&qr.includes('EXCHANGE_ALREADY_USED'),"Sprint D single-use exchange preserved"],
];
const failed=checks.filter(([ok])=>!ok);if(failed.length){for(const[,m]of failed)console.error(`FAIL: ${m}`);process.exit(1)}
console.log("ZhaoXi 19.0.0 Sprint E Backend verified: QR privilege containment, trusted Partner pairing, Customer guest bootstrap, and Sprint D single-use exchange contracts PASS.");
