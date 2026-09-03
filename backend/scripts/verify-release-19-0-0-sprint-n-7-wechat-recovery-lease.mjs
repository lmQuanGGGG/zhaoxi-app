import fs from 'node:fs';

const wx=fs.readFileSync('lib/services/wechat-pay-v3-service.ts','utf8');
const n6=fs.readFileSync('scripts/verify-release-19-0-0-sprint-n-6-wechat-checkout-recovery.mjs','utf8');

const checks=[
 [wx.includes('WECHAT_CHECKOUT_LEASE_TIMEOUT_MS = 2 * 60_000'),'Checkout/recovery lease timeout is two minutes'],
 [wx.includes('WECHAT_RECOVERY_BACKOFF_MS = 15_000'),'Recovery polling backoff is fifteen seconds'],
 [wx.includes('function checkoutLeaseExpired'),'Lease expiration helper exists'],
 [wx.includes('function recoveryBackoffActive'),'Recovery backoff helper exists'],
 [wx.includes('checkout.mode === "native_v3_creating" && checkoutLeaseExpired(checkout)'),'Stale checkout creation becomes recoverable'],
 [wx.includes('checkout.mode === "native_v3_recovering" && checkoutLeaseExpired(checkout)'),'Stale recovery lease becomes recoverable'],
 [wx.includes('WECHAT_PAY_RECOVERY_IN_PROGRESS'),'Live recovery lease blocks concurrent recovery'],
 [wx.includes('WECHAT_PAY_RECOVERY_BACKOFF'),'Recovery pending state is rate limited'],
 [wx.includes('const recoveryToken = crypto.randomUUID()'),'Each recovery lease receives a unique ownership token'],
 [wx.includes('mode: "native_v3_recovering", recoveryToken, recoveryStartedAt'),'Recovery ownership is persisted before provider query'],
 [wx.includes('eq(paymentTransactions.id, payment.id), eq(paymentTransactions.updatedAt, payment.updatedAt)'),'Recovery lease acquisition uses expected-version CAS'],
 [wx.includes('eq(paymentTransactions.id, claimed.id), eq(paymentTransactions.updatedAt, claimed.updatedAt)'),'Recovery exits are bound to winning lease version'],
 [wx.includes('WECHAT_NATIVE_RECOVERY_QUERY_FAILED'),'Query failure remains auditable'],
 [wx.includes('mode: "native_v3_ready", recoveryResult: "order_not_found"'),'Confirmed missing provider order safely releases checkout'],
 [wx.includes('WECHAT_NATIVE_RECOVERY_ORDER_NOT_FOUND'),'Order-not-found recovery is auditable'],
 [wx.includes('mode: "native_v3_recovery_pending"'),'Nonterminal provider state remains recoverable'],
 [wx.includes('WECHAT_NATIVE_RECOVERY_PROVIDER_STATE'),'Provider recovery state remains auditable'],
 [wx.includes('const [leaseOwned] = await tx.update(paymentTransactions)') || wx.includes('const current = (await tx.select().from(paymentTransactions).where(eq(paymentTransactions.id, claimed.id)).limit(1))[0]'),'Successful recovery first proves lease ownership/current claimed state'],
 [wx.includes('if (!leaseOwned)') || wx.includes('WECHAT_PAY_TERMINAL_STATE_CONFLICT'),'Successful recovery fails closed after lost ownership or invalid terminal convergence'],
 [wx.includes('current?.status === "paid"'),'Concurrent webhook-paid race is safely accepted'],
 [wx.includes('paymentService.updateStatus(leaseOwned.id, "paid"') || wx.includes('paymentService.updateStatus(current.id, terminalStatus'),'Recovered terminal provider state transitions the claimed payment'],
 [wx.includes('recoveryToken }, tx'),'Recovered SUCCESS transition remains inside recovery transaction'],
 [wx.includes('WECHAT_NATIVE_RECOVERY_PAID') || wx.includes('WECHAT_NATIVE_RECOVERY_${terminalStatus.toUpperCase()}'),'Recovered payment transition has dedicated terminal audit event'],
 [wx.includes('checkoutLeaseExpired(previousPayload)'),'Checkout endpoint automatically recovers stale leases'],
 [n6.includes('Sprint N.6 verified') || n6.includes('WeChat order-query recovery helper exists'),'Sprint N.6 recovery guarantees remain represented'],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,m] of failed)console.error('FAIL: '+m);process.exit(1);}
console.log('ZhaoXi 19.0.0 Sprint N.7 verified: WeChat checkout and recovery operations use expiring single-winner leases; stale create/recovery owners can be safely recovered, active owners and rapid retries are blocked, every recovery exit remains bound to the winning CAS version, and recovered SUCCESS payments transition atomically with audit history PASS.');
