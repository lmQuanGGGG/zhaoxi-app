"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";

type AuditEvent={
 id:string;actorType:string;actorUserId?:string|null;action:string;resourceType:string;resourceId?:string|null;app?:string|null;
 beforeState?:Record<string,unknown>|null;afterState?:Record<string,unknown>|null;metadata?:Record<string,unknown>;createdAt:string;
};
const apps=["all","customer","partner","admin"];
const resourceTypes=["all","runtime_control","feature_flag","release","incident","rollout_guard_policy"];

function shortId(v?:string|null){return v?v.slice(0,8):"—"}
function summarize(state?:Record<string,unknown>|null){
 if(!state)return "";
 const preferred=["accessMode","publicRolloutPercent","enabled","killSwitch","rolloutPercent","status","warningMaxPercent","criticalFallbackPercent"];
 const parts=preferred.filter(k=>state[k]!==undefined).map(k=>`${k}=${String(state[k])}`);
 if(parts.length)return parts.join(" · ");
 return Object.entries(state).slice(0,4).map(([k,v])=>`${k}=${typeof v==="object"?"…":String(v)}`).join(" · ");
}
export default function AuditLogPage(){
 const[rows,setRows]=useState<AuditEvent[]>([]);const[app,setApp]=useState("all");const[resource,setResource]=useState("all");const[hours,setHours]=useState(168);const[loading,setLoading]=useState(false);const[error,setError]=useState("");
 const load=async()=>{setLoading(true);setError("");try{const q=new URLSearchParams({hours:String(hours),limit:"200"});if(app!=="all")q.set("app",app);if(resource!=="all")q.set("resourceType",resource);const r=await fetch(`/api/platform-release-audit?${q.toString()}`,{cache:"no-store"});const x=await r.json();if(!r.ok||!x?.ok)throw new Error(x?.error?.code||"AUDIT_LOAD_FAILED");setRows(x.data||[])}catch(e){setError(e instanceof Error?e.message:"AUDIT_LOAD_FAILED")}finally{setLoading(false)}};
 useEffect(()=>{void load()},[app,resource,hours]);
 const systemCount=useMemo(()=>rows.filter(x=>x.actorType==="system").length,[rows]);
 return <main style={{width:"min(100%,680px)",margin:"0 auto",minHeight:"100dvh",padding:18,background:"#f5f7fa",fontFamily:"Inter,Arial,sans-serif"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><Link href="/release-center" style={{textDecoration:"none",color:"#64748b"}}>← Release Center</Link><button onClick={()=>void load()} disabled={loading} style={{border:0,borderRadius:11,padding:"8px 11px",background:"#fff",fontWeight:800}}>↻ Refresh</button></div>
  <h1 style={{fontSize:24,marginBottom:4}}>Release Audit Log</h1><p style={{color:"#64748b",marginTop:0}}>Ai thay đổi gì · trước/sau · thao tác Admin hay hệ thống tự động.</p>
  <section style={{padding:14,borderRadius:16,background:"#fff",border:"1px solid #e5e7eb",marginBottom:12}}><div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:7}}><select value={app} onChange={e=>setApp(e.target.value)} style={{padding:9,border:"1px solid #dbe3dd",borderRadius:9}}>{apps.map(x=><option key={x} value={x}>{x==="all"?"All apps":x}</option>)}</select><select value={resource} onChange={e=>setResource(e.target.value)} style={{padding:9,border:"1px solid #dbe3dd",borderRadius:9}}>{resourceTypes.map(x=><option key={x} value={x}>{x==="all"?"All resources":x}</option>)}</select><select value={hours} onChange={e=>setHours(Number(e.target.value))} style={{padding:9,border:"1px solid #dbe3dd",borderRadius:9}}><option value={24}>24h</option><option value={168}>7 days</option><option value={720}>30 days</option><option value={2160}>90 days</option></select></div><small style={{display:"block",marginTop:9,color:"#64748b"}}>{rows.length} events · {systemCount} automatic system actions</small></section>
  {error&&<div style={{padding:12,borderRadius:12,background:"#fff1f2",color:"#be123c",marginBottom:12}}>{error}</div>}
  <div style={{display:"grid",gap:9}}>{rows.length===0&&!loading?<div style={{padding:18,borderRadius:16,background:"#fff",color:"#64748b",textAlign:"center"}}>No audit events in this window.</div>:rows.map(row=><article key={row.id} style={{padding:14,borderRadius:16,background:"#fff",border:"1px solid #e5e7eb"}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}><div><b style={{fontSize:14}}>{row.action}</b><small style={{display:"block",marginTop:3,color:"#64748b"}}>{row.resourceType}{row.app?` · ${row.app}`:""}{row.resourceId?` · ${shortId(row.resourceId)}`:""}</small></div><span style={{fontSize:11,fontWeight:900,padding:"5px 8px",borderRadius:999,background:row.actorType==="system"?"#ede9fe":"#e0f2fe",color:row.actorType==="system"?"#6d28d9":"#0369a1"}}>{row.actorType==="system"?"SYSTEM":`ADMIN ${shortId(row.actorUserId)}`}</span></div>
   {(row.beforeState||row.afterState)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginTop:10}}><div style={{padding:9,borderRadius:10,background:"#f8fafc"}}><small style={{display:"block",color:"#64748b"}}>Before</small><code style={{fontSize:11,whiteSpace:"normal",wordBreak:"break-word"}}>{summarize(row.beforeState)||"—"}</code></div><div style={{padding:9,borderRadius:10,background:"#f0fdf4"}}><small style={{display:"block",color:"#64748b"}}>After</small><code style={{fontSize:11,whiteSpace:"normal",wordBreak:"break-word"}}>{summarize(row.afterState)||"—"}</code></div></div>}
   {row.metadata&&Object.keys(row.metadata).length>0&&<details style={{marginTop:9}}><summary style={{fontSize:12,color:"#64748b",cursor:"pointer"}}>Metadata</summary><pre style={{fontSize:10,whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#f8fafc",padding:9,borderRadius:9}}>{JSON.stringify(row.metadata,null,2)}</pre></details>}
   <small style={{display:"block",marginTop:9,color:"#94a3b8"}}>{new Date(row.createdAt).toLocaleString()}</small>
  </article>)}</div>
 </main>
}
