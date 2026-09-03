import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const payment=read("packages/payment/package.json");
const apps=["apps/customer/package.json","apps/partner/package.json","apps/admin/package.json"].map(read);
if(payment.version!=="14.5.0") throw new Error(`Expected @zhaoxi/payment 14.5.0, got ${payment.version}`);
for(const app of apps){ const v=app.dependencies?.["@zhaoxi/payment"]; if(v!==payment.version) throw new Error(`${app.name} expects @zhaoxi/payment ${v}, local workspace is ${payment.version}`); }
console.log("Sprint 14.5.1 payment workspace versions are aligned and valid.");
