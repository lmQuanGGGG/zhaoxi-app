import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); dotenv.config();

const raw=process.env.ZHAOXI_RUNTIME_BASE_URL||process.env.ZHAOXI_BACKEND_PUBLIC_URL||process.env.WECHAT_AUTH_CALLBACK_ORIGIN;
if(!raw) throw new Error("Set ZHAOXI_RUNTIME_BASE_URL or ZHAOXI_BACKEND_PUBLIC_URL to the deployed Backend origin.");
const base=raw.replace(/\/$/,"");
const response=await fetch(`${base}/api/integration/runtime`,{headers:{"cache-control":"no-cache"},signal:AbortSignal.timeout(15000)});
const payload=await response.json().catch(()=>null);
if(!response.ok||!payload?.ready){
  console.error(JSON.stringify(payload,null,2));
  throw new Error(`Sprint 16.12 runtime validation failed with HTTP ${response.status}`);
}
console.log("Sprint 16.12 deployed Backend runtime validation passed.");
console.log(JSON.stringify({release:payload.release,stage:payload.stage,ready:payload.ready,runtime:payload.runtime},null,2));
