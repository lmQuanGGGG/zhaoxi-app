import fs from "node:fs";

const auth = fs.readFileSync("packages/auth/src/index.tsx", "utf8");

const checks = [
  [
    auth.includes('if (!session || session.role !== role) return role==="customer"?<PhoneEntryStep role="customer"'),
    "Customer uses phone-first entry when no valid session"
  ],
  [
    auth.includes(':<LoginStep role={role} locale={locale} onDone={finishGuestEntry} />') ||
      auth.includes(':<LoginStep role={role} locale={locale} onDone={finishGuestEntry}/>'),
    "non-Customer roles remain authentication-gated"
  ],
  [
    auth.includes('<ZhaoXiQrLogin role={role} locale={locale} onDone={onDone}/>'),
    "legacy QR login component remains wired for non-Customer compatibility"
  ],
  [
    auth.includes('QR Đối tác chỉ có thể được xác nhận bởi thiết bị ZhaoXi đã tin cậy và đã có quyền Đối tác.'),
    "Vietnamese partner QR denial is localized"
  ],
  [
    auth.includes('t.qrCreateFailed') && auth.includes('t.qrExchangeFailed'),
    "QR errors are locale-pure"
  ],
  [
    auth.includes('exchangeCode.current=String(j.data.exchangeCode||"")'),
    "Sprint D browser-held exchange secret preserved"
  ],
  [
    auth.includes('data-unified-top-bar="18.3.3"'),
    "existing UI baseline preserved"
  ],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, message] of failed) console.error(`FAIL: ${message}`);
  process.exit(1);
}

console.log(
  "ZhaoXi 19.0.0 Sprint E Platform regression verified: Customer phone-first entry, protected non-Customer authentication gates, locale-pure QR fallback, and Sprint D exchange compatibility PASS."
);
