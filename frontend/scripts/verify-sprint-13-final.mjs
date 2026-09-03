import fs from 'node:fs';

const checks = [
  ['apps/partner/app/StoreManager.tsx', ['bannerPreview', 'toggleItemAvailability', 'isAvailable', 'latestItems', 'ItemImage']],
  ['apps/customer/app/_components/ServiceBrowser.tsx', ['soldOut', 'isAvailable', 'window.setInterval', "cache-control"]],
  ['apps/customer/app/api/platform-services/route.ts', ['vercel-cdn-cache-control', 'no-store']],
];

for (const [file, needles] of checks) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) throw new Error(`${file} missing ${needle}`);
  }
}
console.log('Sprint 13.0 final banner, media sync and menu availability structure is valid.');
