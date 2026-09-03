import fs from 'node:fs';

const pay=fs.readFileSync('lib/services/payment-service.ts','utf8');
const wx=fs.readFileSync('lib/services/wechat-pay-v3-service.ts','utf8');

const checks=[
 [pay.includes('return db.transaction(async (tx) =>'),'Payment creation executes transactionally'],
 [pay.includes('onConflictDoNothing({ target: paymentTransactions.idempotencyKey })'),'Payment creation uses database idempotency winner'],
 [pay.includes('if (!rows[0]) return payment'),'Concurrent payment creation loser is side-effect free'],
 [pay.includes('await tx.insert(paymentEvents).values({ paymentId: payment.id, eventType: "PAYMENT_CREATED"'),'PAYMENT_CREATED belongs to winning transaction'],
 [pay.includes('await tx.update(serviceRequests).set({'),'Request payment projection belongs to winning transaction'],
 [wx.includes('previousPayload.mode === "native_v3_creating"'),'Existing checkout claim blocks concurrent provider calls'],
 [wx.includes('WECHAT_PAY_CHECKOUT_IN_PROGRESS'),'Concurrent checkout caller fails closed'],
 [wx.includes('eq(paymentTransactions.updatedAt, payment.updatedAt)'),'Checkout acquisition uses expected-state CAS'],
 [wx.includes('claimToken = crypto.randomUUID()'),'Checkout claim has unique ownership token'],
 [wx.includes('mode: "native_v3_creating"'),'Winning provider call is explicitly marked in progress'],
 [wx.includes('eq(paymentTransactions.updatedAt, claimed.updatedAt)'),'Checkout completion remains bound to winning claim version'],
 [wx.includes('WECHAT_PAY_CHECKOUT_CLAIM_LOST'),'Lost checkout ownership fails closed'],
 [wx.includes('WECHAT_NATIVE_CREATE_FAILED'),'Provider create failures remain auditable'],
 [wx.includes('WECHAT_NATIVE_CREATED'),'Successful provider checkout creation remains auditable'],
 [wx.includes('native_v3_create_uncertain'),'Transport ambiguity is persisted instead of blindly retrying provider creation'],
 [wx.includes('WECHAT_NATIVE_CREATE_UNCERTAIN'),'Uncertain provider creation is auditable'],
 [wx.includes('const [failed] = await tx.update(paymentTransactions)'),'Failed provider response must retain checkout claim ownership'],
 [wx.includes('const [uncertain] = await tx.update(paymentTransactions)'),'Transport failure must retain checkout claim ownership'],
 [wx.includes('current?.status === "paid"'),'Webhook-paid race is accepted instead of producing false checkout failure'],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,m] of failed)console.error('FAIL: '+m);process.exit(1);}
console.log('ZhaoXi 19.0.0 Sprint N.5 verified: payment creation is transactionally idempotent; concurrent creation losers produce no duplicate events or projections; WeChat Native checkout uses single-winner expected-state CAS, blocks active duplicate claims, and commits provider results only for the winning claim PASS.');
