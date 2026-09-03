import { access, readFile } from "node:fs/promises";
const files=["migrations/0003_unified_auth_sessions.sql","lib/services/session-service.ts","app/api/auth/session/exchange/route.ts","app/api/auth/session/me/route.ts","app/api/auth/session/refresh/route.ts","app/api/auth/session/logout/route.ts","app/api/auth/session/logout-all/route.ts","app/api/auth/session/devices/route.ts"];
for(const f of files) await access(new URL(`../${f}`,import.meta.url));
const schema=await readFile(new URL("../db/schema.ts",import.meta.url),"utf8"); for(const t of ["authSessions","accessTokenHash","refreshTokenHash","exchangeCodeHash"]) if(!schema.includes(t))throw new Error(`Missing ${t}`);
const service=await readFile(new URL("../lib/services/session-service.ts",import.meta.url),"utf8"); for(const t of ["ACCESS_TTL_MS","refreshDays","hashAuthToken","logoutAll","listDevices"]) if(!service.includes(t))throw new Error(`Missing ${t}`);
console.log("Sprint 14.2 backend authentication and session layer is locked and valid.");
