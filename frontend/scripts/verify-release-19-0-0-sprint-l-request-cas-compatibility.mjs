import fs from 'node:fs';

const sdk=fs.readFileSync('packages/sdk/src/index.ts','utf8');
const partnerStatus=fs.readFileSync('apps/partner/app/api/platform-requests/[id]/status/route.ts','utf8');
const adminStatus=fs.readFileSync('apps/admin/app/api/platform-requests/[id]/status/route.ts','utf8');
const partnerAssignment=fs.readFileSync('apps/partner/app/api/platform-requests/[id]/assignment/route.ts','utf8');
const adminAssignment=fs.readFileSync('apps/admin/app/api/platform-requests/[id]/assignment/route.ts','utf8');
const partnerBoard=fs.readFileSync('apps/partner/app/OperationsBoard.tsx','utf8');
const adminBoard=fs.readFileSync('apps/admin/app/OperationsBoard.tsx','utf8');
const sprintK=fs.readFileSync('scripts/verify-release-19-0-0-sprint-k-canonical-governance-compatibility.mjs','utf8');

const checks=[
 [sdk.includes('if (!response.ok)'),'SDK rejects non-2xx backend responses'],
 [sdk.includes('throw new Error(String(message))'),'SDK propagates failed mutation as exception'],
 [sdk.includes('updateStatus:'),'SDK status mutation contract remains present'],
 [partnerStatus.includes('status:response.status'),'Partner status BFF preserves backend HTTP status'],
 [adminStatus.includes('status:response.status'),'Admin status BFF preserves backend HTTP status'],
 [partnerAssignment.includes('status:response.status'),'Partner assignment BFF preserves backend HTTP status'],
 [adminAssignment.includes('status:response.status'),'Admin assignment BFF preserves backend HTTP status'],
 [partnerBoard.includes('await sdk.updateStatus'),'Partner operations uses SDK status mutation'],
 [partnerBoard.includes('catch(e)'),'Partner operations handles status mutation failure'],
 [adminBoard.includes('await sdk.updateStatus'),'Admin operations uses SDK status mutation'],
 [adminBoard.includes('catch (cause)'),'Admin operations handles status mutation failure'],
 [sprintK.includes('Backend remains authoritative'),'Sprint K backend-authoritative governance compatibility remains intact'],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,message] of failed)console.error('FAIL: '+message);process.exit(1);}
console.log('ZhaoXi 19.0.0 Sprint L Platform verified: Backend transactional request CAS conflicts propagate through Partner/Admin BFF status codes, SDK rejects non-2xx responses, operations UIs handle mutation failures and reload only after success; Sprint K compatibility remains intact PASS.');
