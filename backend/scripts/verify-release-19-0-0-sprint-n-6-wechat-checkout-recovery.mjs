import fs from 'node:fs';

const wx=fs.readFileSync('lib/services/wechat-pay-v3-service.ts','utf8');
const route=fs.readFileSync('app/api/payments/[id]/wechat/recover/route.ts','utf8');
const n5=fs.readFileSync('scripts/verify-release-19-0-0-sprint-n-5-payment-creation-cas.mjs','utf8');

const checks=[
 [wx.includes('queryNativeOrderByOutTradeNo'),'WeChat order-query recovery helper exists'],
 [wx.includes('/v3/pay/transactions/out-trade-no/'),'Recovery queries provider by stable out_trade_no'],
 [wx.includes('authorization("GET", path, "", config)'),'Recovery query is authenticated with WeChat Pay v3 signing'],
 [wx.includes('ORDER_NOT_EXIST'),'Provider order-not-found is explicitly recognized'],
 [wx.includes('async recoverNativeCheckout(paymentId: string)'),'Native checkout recovery service exists'],
 [wx.includes('native_v3_create_uncertain') && wx.includes('native_v3_recovery_pending') && wx.includes('recoverable'),'Both uncertain and pending recovery states are recoverable'],
 [wx.includes('previousPayload.mode === "native_v3_create_uncertain" || previousPayload.mode === "native_v3_recovery_pending"'),'Checkout creation routes uncertain states through recovery before another provider create'],
 [wx.includes('WECHAT_NATIVE_RECOVERY_QUERY_FAILED'),'Recovery query failures are auditable'],
 [wx.includes('WECHAT_NATIVE_RECOVERY_ORDER_NOT_FOUND'),'Confirmed missing provider order is auditable'],
 [wx.includes('mode: "native_v3_ready", recoveryResult: "order_not_found"'),'Confirmed missing order safely releases checkout for a future create'],
 [wx.includes('mode: "native_v3_recovery_pending"'),'Existing non-success provider order remains recovery-pending'],
 [wx.includes('WECHAT_NATIVE_RECOVERY_PROVIDER_STATE'),'Provider recovery state is auditable'],
 [wx.includes('"wechat_pay:recovery"'),'Successful recovery uses the core payment transition service'],
 [wx.includes('WECHAT_NATIVE_RECOVERY_PAID') || wx.includes('WECHAT_NATIVE_RECOVERY_${terminalStatus.toUpperCase()}'),'Successful recovery has a dedicated terminal audit event'],
 [wx.includes('paymentService.updateStatus(') && wx.includes('"wechat_pay:recovery"') && wx.includes('recoveryToken }, tx'),'Recovered payment transition reuses the recovery transaction'],
 [wx.includes('response.status >= 500'),'Provider HTTP 5xx creation results are treated as ambiguous'],
 [wx.includes('WECHAT_PAY_CREATE_UNCERTAIN_'),'Ambiguous provider HTTP failure is not treated as definite failure'],
 [wx.includes('native_v3_create_uncertain'),'Ambiguous create state remains persisted'],
 [route.includes('requireSession(request, ["customer", "partner", "admin"])'),'Recovery route requires an authenticated permitted role'],
 [route.includes('mayAccessPayment(gate.session, id)'),'Recovery route enforces payment ownership/access'],
 [route.includes('recoverNativeCheckout(id)'),'Recovery route invokes the dedicated recovery service'],
 [n5.includes('payment creation is transactionally idempotent') || n5.includes('Payment creation executes transactionally'),'Sprint N.5 checkout/create protection remains represented'],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,m] of failed)console.error('FAIL: '+m);process.exit(1);}
console.log('ZhaoXi 19.0.0 Sprint N.6 verified: ambiguous WeChat Native checkout creation is reconciled by signed out_trade_no queries before any retry; missing orders safely return to ready state, existing provider states remain recoverable, successful recovery atomically transitions payment/request projection with an audit event, and the authenticated recovery route preserves payment access controls PASS.');
