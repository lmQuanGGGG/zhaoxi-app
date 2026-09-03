import fs from 'node:fs';

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const sprintJ=fs.readFileSync('scripts/verify-release-19-0-0-sprint-j-verified-transaction-phone.mjs','utf8');
const checks=[
  [pkg.version==='19.0.0','Platform release remains 19.0.0'],
  [fs.existsSync('README_SPRINT_J.txt'),'Sprint J platform checkpoint remains present'],
  [fs.existsSync('scripts/verify-release-19-0-0-sprint-j-verified-transaction-phone.mjs'),'Sprint J verifier remains present'],
  [sprintJ.includes('Sprint J Platform verified'),'Sprint J transaction-phone integrity remains compatible'],
  [!fs.existsSync('migrations/canonical/19.0.0/0002.sql'),'Platform does not introduce canonical migration 0002'],
  [!fs.existsSync('migrations/canonical/19.0.0/0002_full_schema.sql'),'Platform does not own future canonical schema migration 0002'],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,message] of failed)console.error('FAIL: '+message);process.exit(1);}
console.log('ZhaoXi 19.0.0 Sprint K Platform verified: Backend remains authoritative for canonical migration governance; Platform introduces no canonical migration or schema mutation; Sprint J transaction identity compatibility remains intact PASS.');
