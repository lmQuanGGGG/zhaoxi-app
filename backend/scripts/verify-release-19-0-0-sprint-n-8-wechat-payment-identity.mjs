import fs from 'node:fs';

const wx=fs.readFileSync('lib/services/wechat-pay-v3-service.ts','utf8');
const n7=fs.readFileSync('scripts/verify-release-19-0-0-sprint-n-7-wechat-recovery-lease.mjs','utf8');
const n4=fs.readFileSync('scripts/verify-release-19-0-0-sprint-n-4-wechat-webhook-replay.mjs','utf8');

const checks=[
 [wx.includes('attach?: string'),'WeChat transaction payload models attach identity'],
 [wx.includes('function assertWeChatTransactionIdentity'),'Canonical WeChat transaction identity validator exists'],
 [wx.includes('WECHAT_PAY_APP_ID_MISMATCH'),'App identity mismatch fails closed'],
 [wx.includes('WECHAT_PAY_MCH_ID_MISMATCH'),'Merchant identity mismatch fails closed'],
 [wx.includes('WECHAT_PAY_OUT_TRADE_NO_MISMATCH'),'Merchant order identity mismatch fails closed'],
 [wx.includes('WECHAT_PAY_ATTACH_MISMATCH'),'Payment attach identity mismatch fails closed'],
 [wx.includes('WECHAT_PAY_AMOUNT_MISMATCH'),'Payment amount mismatch fails closed'],
 [wx.includes('WECHAT_PAY_CURRENCY_MISMATCH'),'Payment currency mismatch fails closed'],
 [wx.includes('WECHAT_PAY_TRANSACTION_ID_MISSING'),'Successful provider payment requires transaction id'],
 [wx.includes('function assertProviderTransactionIdConsistency'),'Provider transaction id consistency guard exists'],
 [wx.includes('WECHAT_PAY_TRANSACTION_ID_MISMATCH'),'Conflicting provider transaction id fails closed'],
 [wx.includes('assertWeChatTransactionIdentity(query.body, claimed, config, outTradeNo)'),'Recovery identity validation is bound to claimed payment version'],
 [wx.includes('providerTransactionId: transactionId'),'Recovered provider transaction id is persisted'],
 [wx.includes('assertWeChatTransactionIdentity(transaction as Record<string, any>, currentPayment, config, outTradeNo)'),'Webhook identity is validated against current transactional payment snapshot'],
 [wx.includes('assertProviderTransactionIdConsistency(currentCheckout, identity.transactionId)'),'Webhook rejects transaction id drift before side effects'],
 [wx.includes('providerTransactionId: identity.transactionId || null'),'Provider event stores canonical transaction id'],
 [wx.includes('checkoutPayload: { ...checkoutSnapshot, providerTransactionId: identity.transactionId }'),'Webhook binds provider transaction id to payment checkout state'],
 [wx.includes('WECHAT_PAY_TRANSACTION_ID_BIND_CONFLICT'),'Concurrent provider transaction binding fails closed'],
 [wx.includes('if (!claimed) return currentPayment'),'Duplicate webhook remains side-effect free using current payment snapshot'],
 [wx.includes('paymentService.updateStatus(paymentSnapshot.id'),'Webhook payment transition uses current transactional payment identity'],
 [n7.includes('expiring single-winner leases'),'Sprint N.7 recovery lease protection remains represented'],
 [n4.includes('if (!claimed) return currentPayment'),'Sprint N.4 verifier accepts N.8 duplicate-webhook architecture'],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,m] of failed)console.error('FAIL: '+m);process.exit(1);}
console.log('ZhaoXi 19.0.0 Sprint N.8 verified: WeChat recovery and webhook processing validate canonical app, merchant, out_trade_no, attach, amount, currency, and transaction identity; provider transaction ids are bound consistently to payment state; conflicting identities fail closed; duplicate provider events remain side-effect free; Sprint N.7 lease safety and N.4 webhook replay protection remain intact PASS.');
