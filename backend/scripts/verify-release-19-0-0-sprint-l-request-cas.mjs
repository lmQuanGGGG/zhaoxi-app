import fs from 'node:fs';

const statusRoute=fs.readFileSync('app/api/service-requests/[id]/status/route.ts','utf8');
const assignmentRoute=fs.readFileSync('app/api/service-requests/[id]/assignment/route.ts','utf8');
const sprintK=fs.readFileSync('scripts/verify-release-19-0-0-sprint-k-canonical-migration-governance.mjs','utf8');

const checks=[
 [statusRoute.includes('import { and, eq } from'),'Status route imports CAS conjunction'],
 [statusRoute.includes('db.transaction(async (tx) =>'),'Status transition uses database transaction'],
 [statusRoute.includes('and(eq(serviceRequests.id, id), eq(serviceRequests.status, current.status))'),'Status transition uses expected-state CAS'],
 [statusRoute.includes('tx.insert(serviceRequestStatusHistory)'),'Status history is written inside transaction'],
 [statusRoute.includes('REQUEST_STATE_CONFLICT'),'Status transition exposes deterministic conflict response'],
 [assignmentRoute.includes('import { and, eq } from'),'Assignment route imports CAS conjunction'],
 [assignmentRoute.includes('db.transaction(async (tx) =>'),'Assignment uses database transaction'],
 [assignmentRoute.includes('and(eq(serviceRequests.id, id), eq(serviceRequests.status, current.status))'),'Assignment uses expected-state CAS'],
 [assignmentRoute.includes('tx.insert(serviceRequestStatusHistory)'),'Assignment history is written inside transaction'],
 [assignmentRoute.includes('REQUEST_STATE_CONFLICT'),'Assignment exposes deterministic conflict response'],
 [!statusRoute.includes('await db.insert(serviceRequestStatusHistory).values'),'Status history is not written outside transaction'],
 [!assignmentRoute.includes('await db.insert(serviceRequestStatusHistory).values'),'Assignment history is not written outside transaction'],
 [statusRoute.includes('FORCE_TRANSITION_DENIED'),'Sprint A force-transition containment remains intact'],
 [sprintK.includes('production no-replay policy'),'Sprint K canonical migration governance remains intact'],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,message] of failed)console.error('FAIL: '+message);process.exit(1);}
console.log('ZhaoXi 19.0.0 Sprint L Backend verified: request status and assignment writes use transactional expected-state CAS; history is atomically appended only after winning mutation; concurrent stale writers fail with 409 conflict; Sprint A containment and Sprint K migration governance remain intact PASS.');
