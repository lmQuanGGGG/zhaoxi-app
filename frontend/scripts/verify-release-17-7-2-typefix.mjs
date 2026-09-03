import fs from"node:fs";
const f="apps/admin/app/auth/admin-qr/page.tsx";
if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const s=fs.readFileSync(f,"utf8");
if(!s.includes("useState<string>(t.checking)"))throw new Error("Admin QR message state is not explicitly typed as string");
for(const x of["setMsg(t.success)","setMsg(t.invalid)"])if(!s.includes(x))throw new Error(`Missing ${x}`);
console.log("ZhaoXi 17.7.2 Admin QR TypeScript TYPEFIX is valid.");
