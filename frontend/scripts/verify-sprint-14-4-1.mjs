import fs from 'node:fs';

const checks = [
  ['apps/admin/app/OperationsBoard.tsx', 'Boolean(row.details.paymentStatus) &&'],
  ['apps/customer/app/order/[id]/page.tsx', 'Boolean(details.paymentStatus)&&'],
  ['apps/partner/app/OperationsBoard.tsx', 'Boolean(d.paymentStatus)&&'],
];

for (const [file, marker] of checks) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes(marker)) throw new Error(`Missing safe paymentStatus guard in ${file}`);
}

console.log('Sprint 14.4.1 payment JSX type-safety hotfix is valid.');
