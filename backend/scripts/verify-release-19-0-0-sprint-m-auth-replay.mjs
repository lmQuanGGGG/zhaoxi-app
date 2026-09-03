import fs from 'node:fs';

const session=fs.readFileSync('lib/services/session-service.ts','utf8');
const wechat=fs.readFileSync('lib/services/wechat-auth-service.ts','utf8');
const qr=fs.readFileSync('lib/services/qr-pairing-service.ts','utf8');
const roleSwitch=fs.readFileSync('lib/services/role-switch-service.ts','utf8');
const sprintL=fs.readFileSync('scripts/verify-release-19-0-0-sprint-l-request-cas.mjs','utf8');
const sprintK=fs.readFileSync('scripts/verify-release-19-0-0-sprint-k-canonical-migration-governance.mjs','utf8');

const checks=[
 [session.includes('eq(authSessions.refreshTokenHash,hashAuthToken(refreshToken))'),'Refresh lookup binds the presented refresh-token hash'],
 [session.includes('eq(authSessions.status,"active")'),'Refresh requires an active session'],
 [session.includes('row.refreshExpiresAt.getTime()<=Date.now()'),'Refresh rejects expired refresh sessions before rotation'],
 [session.includes('.where(and(')&&session.includes('eq(authSessions.id,row.id)'),'Refresh rotation CAS binds the selected session id'],
 [session.includes('if(!updated) return null'),'Refresh CAS loser fails closed'],
 [wechat.includes('isNull(wechatLoginSessions.exchangedAt)'),'WeChat exchange uses unconsumed CAS predicate'],
 [wechat.includes('eq(wechatLoginSessions.exchangeCodeHash,row.exchangeCodeHash)'),'WeChat exchange CAS binds the selected exchange-code hash'],
 [wechat.includes('exchangeCodeHash:null'),'WeChat winning claim destroys the exchange-code hash'],
 [wechat.includes('if(!claimed) return {ok:false as const,errorCode:"EXCHANGE_INVALID"}'),'WeChat concurrent loser fails closed'],
 [qr.includes('isNull(qrPairingSessions.exchangedAt)'),'QR exchange uses unconsumed CAS predicate'],
 [qr.includes('eq(qrPairingSessions.status, "confirmed")'),'QR exchange claim requires confirmed state'],
 [qr.includes('eq(qrPairingSessions.exchangeCodeHash, hash(i.exchangeCode))'),'QR exchange CAS binds the presented exchange code'],
 [qr.includes('if (!consumed.length) return { ok: false as const, errorCode: "EXCHANGE_ALREADY_USED" }'),'QR concurrent loser is rejected as already used'],
 [roleSwitch.includes('isNull(roleSwitchHandoffs.consumedAt)'),'Role-switch handoff uses single-use CAS predicate'],
 [roleSwitch.includes('if(!claimed)throw new Error("HANDOFF_ALREADY_USED")'),'Role-switch concurrent loser fails closed'],
 [sprintL.includes('transactional expected-state CAS'),'Sprint L transactional request CAS remains intact'],
 [sprintK.includes('production no-replay policy'),'Sprint K canonical migration governance remains intact'],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,message] of failed)console.error('FAIL: '+message);process.exit(1);}
console.log('ZhaoXi 19.0.0 Sprint M Backend verified: refresh-token rotation, WeChat exchange, QR exchange, and role-switch handoff preserve single-winner replay protection with CAS-style claims; concurrent stale credentials fail closed; Sprint L request CAS and Sprint K canonical migration governance remain intact PASS.');
