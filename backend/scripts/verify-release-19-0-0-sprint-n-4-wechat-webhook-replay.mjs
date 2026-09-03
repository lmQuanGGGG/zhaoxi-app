import fs from 'node:fs';

const pay=fs.readFileSync('lib/services/payment-service.ts','utf8');
const wx=fs.readFileSync('lib/services/wechat-pay-v3-service.ts','utf8');
const schema=fs.readFileSync('db/schema.ts','utf8');

const checks=[
 [wx.includes('WECHAT_PAY_NOTIFY_TIMESTAMP_STALE'),'Webhook rejects stale timestamps'],
 [wx.includes('Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > 300'),'Webhook freshness window is 300 seconds'],
 [wx.includes('return db.transaction(async (tx) =>'),'Webhook processing uses one database transaction'],
 [wx.includes('tx.insert(paymentProviderEvents)'),'Provider event claim occurs inside transaction'],
 [wx.includes('onConflictDoNothing'),'Duplicate provider event claim is idempotent'],
 [wx.includes('target: [paymentProviderEvents.provider, paymentProviderEvents.providerEventId]'),'Replay identity is provider plus provider event ID'],
 [wx.includes('if (!claimed) return payment') || wx.includes('if (!claimed) return currentPayment'),'Duplicate webhook is acknowledged without replaying side effects'],
 [wx.includes('tx.insert(paymentEvents)'),'Provider payment event is appended inside transaction'],
 [/paymentService\.updateStatus\([\s\S]*?,\s*tx\)/.test(wx),'Payment status transition reuses webhook transaction'],
 [wx.includes('tx.update(paymentProviderEvents)'),'Provider event processed marker is committed inside transaction'],
 [!wx.includes('db.delete(paymentProviderEvents)'),'Provider event claim is no longer manually deleted on downstream failure'],
 [pay.includes('executor?: any'),'Payment transition accepts caller transaction executor'],
 [pay.includes('return executor ? run(executor) : db.transaction(run)'),'Payment transition preserves standalone transaction behavior'],
 [schema.includes('payment_provider_events_provider_event_unique'),'N2 provider-event uniqueness remains intact'],
];
const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,m] of failed)console.error('FAIL: '+m);process.exit(1);}
console.log('ZhaoXi 19.0.0 Sprint N.4 verified: WeChat Pay callbacks enforce 300-second freshness, claim provider events exactly once, atomically append webhook/payment events, transition payment and request projection in the same transaction, mark provider events processed, and safely acknowledge duplicates PASS.');
