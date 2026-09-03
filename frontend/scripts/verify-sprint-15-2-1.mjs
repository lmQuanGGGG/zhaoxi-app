import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const fail = (message) => { console.error(`Sprint 15.2.1 verification failed: ${message}`); process.exit(1); };

const feedbackPkg = readJson('packages/feedback/package.json');
const feedbackExport = feedbackPkg?.exports?.['.'];
if (feedbackExport !== './index.tsx') fail(`@zhaoxi/feedback export must be ./index.tsx, got ${String(feedbackExport)}`);
if (!fs.existsSync(path.join(root, 'packages/feedback/index.tsx'))) fail('packages/feedback/index.tsx is missing');

for (const app of ['customer', 'partner', 'driver']) {
  const pkg = readJson(`apps/${app}/package.json`);
  if (!pkg.dependencies?.['@zhaoxi/feedback']) fail(`${app} is missing @zhaoxi/feedback dependency`);
  if (!fs.existsSync(path.join(root, `apps/${app}/app/feedback/page.tsx`))) fail(`${app} feedback page is missing`);
}

console.log('Sprint 15.2.1 feedback workspace export hotfix is valid.');
