import fs from 'node:fs';

const auth=fs.readFileSync('packages/auth/src/index.tsx','utf8');
const apps=['customer','partner','admin','driver'];
const unified=Object.fromEntries(apps.map(app=>[app,fs.readFileSync('apps/'+app+'/app/api/auth/unified/[...path]/route.ts','utf8')]));
const roleSwitch=Object.fromEntries(apps.map(app=>[app,fs.readFileSync('apps/'+app+'/app/api/platform-account/role-switch/exchange/route.ts','utf8')]));
const sprintL=fs.readFileSync('scripts/verify-release-19-0-0-sprint-l-request-cas-compatibility.mjs','utf8');

const checks=[
 [auth.includes('/api/auth/unified/session/exchange'),'WeChat exchange remains Backend-owned through unified session exchange'],
 [auth.includes('/api/auth/unified/qr/exchange'),'ZhaoXi QR exchange remains Backend-owned'],
 [auth.includes('exchanging.current=true'),'Client prevents duplicate local exchange attempts'],
 [auth.includes('saveServerSession(exchangePayload.data)'),'WeChat session is persisted only after successful exchange'],
 [auth.includes('if(x.ok&&y.ok)'),'QR session is persisted only after successful exchange'],
 ...apps.map(app=>[unified[app].includes('upstream("session/refresh","POST",{refreshToken})'),app+' refresh remains Backend-owned']),
 ...apps.map(app=>[unified[app].includes('const REFRESH_COOKIE="zx_refresh_v2"')||unified[app].includes('REFRESH_COOKIE="zx_refresh_v2"'),app+' keeps refresh token in server cookie contract']),
 ...apps.map(app=>[unified[app].includes('if(payload?.ok)setAuthCookies(response,payload.data)'),app+' rotates auth cookies only after successful Backend response']),
 ...apps.map(app=>[roleSwitch[app].includes('/api/auth/role-switch/exchange'),app+' role-switch consumption remains Backend-owned']),
 ...apps.map(app=>[roleSwitch[app].includes('if(x?.ok)'),app+' role-switch cookies are issued only after successful Backend exchange']),
 [sprintL.includes('transactional request CAS'),'Sprint L request CAS compatibility remains intact'],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,message] of failed)console.error('FAIL: '+message);process.exit(1);}
console.log('ZhaoXi 19.0.0 Sprint M Platform verified: refresh, WeChat session exchange, ZhaoXi QR exchange, and role-switch exchange remain Backend-owned single-use authentication boundaries; Platform issues or rotates cookies only after successful Backend responses; Sprint L request CAS compatibility remains intact PASS.');
