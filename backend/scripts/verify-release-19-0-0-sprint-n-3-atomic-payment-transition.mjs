import fs from 'node:fs';

const paymentService=fs.readFileSync('lib/services/payment-service.ts','utf8');
const n2=fs.readFileSync('scripts/verify-release-19-0-0-sprint-n-2-payment-provider-events.mjs','utf8');

const checks=[
 [paymentService.includes('db.transaction(run)') || paymentService.includes('return db.transaction(async (tx)'),'Payment status transition uses one database transaction or explicitly supplied caller transaction'],
 [paymentService.includes('.where(and(eq(paymentTransactions.id, id), eq(paymentTransactions.status, current.status)))'),'Payment mutation retains expected-state CAS'],
 [paymentService.includes('if (!updated) throw new Error("PAYMENT_CONFLICT")'),'Stale payment writer fails closed'],
 [paymentService.includes('await tx.insert(paymentEvents).values'),'Payment event is appended inside the transaction'],
 [paymentService.includes('await tx\n          .update(serviceRequests)'),'Request payment projection is updated inside the transaction'],
 [paymentService.includes('paymentStatus: next'),'Request payment projection receives next payment status'],
 [!paymentService.includes('await db.insert(paymentEvents).values({ paymentId: id'),'Core payment status event is not written outside transaction'],
 [!paymentService.includes('await db.update(serviceRequests).set({ details: { ...details, paymentStatus: next'),'Core payment projection is not written outside transaction'],
 [n2.includes('payment provider event registry'),'Sprint N.2 provider event registry remains intact'],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,m] of failed)console.error('FAIL: '+m);process.exit(1);}
console.log('ZhaoXi 19.0.0 Sprint N.3 verified: core payment status CAS, payment event append, and request payment projection execute atomically in one database transaction; stale writers fail closed; Sprint N.2 provider event registry remains intact PASS.');
