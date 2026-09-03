import {existsSync,readFileSync} from 'node:fs';
const required=['packages/cart/src/index.ts','apps/customer/app/cart/page.tsx','.github/workflows/monorepo-ci.yml','packages/media/src/index.ts'];
for(const file of required)if(!existsSync(file))throw new Error(`Missing ${file}`);
const pkg=JSON.parse(readFileSync('package.json','utf8'));if(!pkg.scripts?.['build:all'])throw new Error('Missing build:all');
console.log('Sprint 13.2 Marketplace Professional and CI structure is valid.');
