"use client";
import Link from "next/link";
import {useEffect,useState} from "react";

type Audit={id:string;actorType:string;area:string;action:string;targetType?:string|null;targetId?:string|null;createdAt:string};
type Incident={id:string;policyKey:string;severity:string;status:string;message:string;createdAt:string};
type Guard={id:string;app:string;enabled:boolean;warningMaxPercent:number;criticalFallbackPercent:number;currentPercent:number;accessMode:string};
type Data={
 status:"healthy"|"warning"|"critical";ready:boolean;publicReady:boolean;
 health:{metrics:{runtimeErrors:number;criticalErrors:number;requests:number;failedOrders:number;orderFailureRate:number;payments:number;failedPayments:number;paymentFailureRate:number;deliveries:number;delivered:number;openSupport:number};alerts:Array<{level:string;code:string;message:string}>};
 release:{candidate:string;channel:string};
 summary:{openIncidents:number;criticalIncidents:number;activeKillSwitches:number;qaCriticalPassed:number;qaCriticalTotal:number;auditEvents:number};
 runtime:Array<{app:string;rolloutPercent:number;maintenanceEnabled:boolean}>;
 guards:Guard[];incidents:Incident[];audit:Audit[];timestamp:string;
};

const statusCard={healthy:{bg:"#ecfdf5",fg:"#166534",label:"✅ HEALTHY"},warning:{bg:"#fff7ed",fg:"#9a3412",label:"⚠️ WARNING"},critical:{bg:"#fff1f2",fg:"#991b1b",label:"🚨 CRITICAL"}} as const;

export default function CommandCenter(){
 const[data,setData]=useState<Data|null>(null);const[error,setError]=useState("");const[loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);try{const r=await fetch("/api/platform-command-center",{cache:"no-store"});const x=await r.json();if(!r.ok||!x?.ok)throw new Error(x?.error?.code||"COMMAND_CENTER_FAILED");setData(x.data);setError("")}catch(e){setError(e instanceof Error?e.message:"COMMAND_CENTER_FAILED")}finally{setLoading(false)}};
 useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),30000);return()=>window.clearInterval(timer)},[]);
 const c=data?statusCard[data.status]:statusCard.warning;
 return <main style={{width:"min(100%,620px)",margin:"0 auto",minHeight:"100dvh",padding:18,background:"#f5f7fa",fontFamily:"Inter,Arial,sans-serif"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><Link href="/" style={{textDecoration:"none",color:"#64748b"}}>← Admin</Link><button disabled={loading} onClick={()=>void load()} style={{border:0,borderRadius:11,padding:"8px 11px",background:"#fff",fontWeight:800}}>↻ Refresh</button></div>
  <h1 style={{fontSize:25,marginBottom:4}}>Operations Command Center</h1><p style={{marginTop:0,color:"#64748b"}}>Release · Health · Incidents · Rollout · QA · Audit</p>
  {error&&<div style={{padding:12,borderRadius:12,background:"#fff1f2",color:"#be123c",marginBottom:12}}>{error}</div>}
  {data&&<>
   <section style={{padding:17,borderRadius:20,background:c.bg,color:c.fg,marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b>{c.label}</b><b>{data.release.candidate}</b></div><small style={{display:"block",marginTop:6}}>Core {data.ready?"READY":"BLOCKED"} · Public {data.publicReady?"READY":"FROZEN"} · {data.release.channel.toUpperCase()}</small></section>
   <section style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginBottom:12}}>
    {[
      ["Open incidents",data.summary.openIncidents],["Critical incidents",data.summary.criticalIncidents],
      ["Runtime errors",data.health.metrics.runtimeErrors],["Order fail",`${data.health.metrics.orderFailureRate}%`],
      ["Payment fail",`${data.health.metrics.paymentFailureRate}%`],["Support open",data.health.metrics.openSupport],
      ["QA critical",`${data.summary.qaCriticalPassed}/${data.summary.qaCriticalTotal}`],["Kill switches",data.summary.activeKillSwitches]
    ].map(([label,value])=><div key={String(label)} style={{padding:12,borderRadius:14,background:"#fff",border:"1px solid #e5e7eb"}}><small style={{display:"block",color:"#64748b"}}>{label}</small><b style={{fontSize:20}}>{value}</b></div>)}
   </section>

   <section style={{padding:15,borderRadius:17,background:"#fff",border:"1px solid #e5e7eb",marginBottom:12}}><b>Public exposure</b><div style={{display:"grid",gap:8,marginTop:10}}>{data.runtime.length===0?<small style={{color:"#64748b"}}>No apps currently in PUBLIC.</small>:data.runtime.map(r=><div key={r.app} style={{display:"flex",justifyContent:"space-between",gap:8}}><span>{r.app}</span><b>{r.rolloutPercent}%{r.maintenanceEnabled?" · MAINTENANCE":""}</b></div>)}</div></section>

   <section style={{padding:15,borderRadius:17,background:"#fff",border:"1px solid #e5e7eb",marginBottom:12}}><b>Rollout Guards</b><div style={{display:"grid",gap:8,marginTop:10}}>{data.guards.map(g=><div key={g.id} style={{padding:10,borderRadius:11,background:"#f8fafc"}}><div style={{display:"flex",justifyContent:"space-between"}}><b>{g.app}</b><span>{g.enabled?"ON":"OFF"}</span></div><small style={{color:"#64748b"}}>Current {g.currentPercent}% · Warning max {g.warningMaxPercent}% · Critical fallback {g.criticalFallbackPercent}%</small></div>)}</div></section>

   <section style={{padding:15,borderRadius:17,background:"#fff",border:"1px solid #e5e7eb",marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between"}}><b>Active Incidents</b><Link href="/release-alerts" style={{textDecoration:"none",color:"#b45309",fontWeight:800}}>Manage →</Link></div><div style={{display:"grid",gap:8,marginTop:10}}>{data.incidents.length===0?<small style={{color:"#64748b"}}>No open incidents.</small>:data.incidents.map(i=><div key={i.id} style={{padding:10,borderRadius:11,background:i.severity==="critical"?"#fff1f2":"#fff7ed"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b>{i.policyKey}</b><span style={{fontSize:11,fontWeight:900}}>{i.severity.toUpperCase()} · {i.status}</span></div><small style={{display:"block",marginTop:4}}>{i.message}</small></div>)}</div></section>

   <section style={{padding:15,borderRadius:17,background:"#fff",border:"1px solid #e5e7eb",marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between"}}><b>Operations Audit Timeline</b><span style={{fontSize:11,color:"#64748b"}}>latest {data.audit.length}</span></div><div style={{display:"grid",gap:8,marginTop:10}}>{data.audit.length===0?<small style={{color:"#64748b"}}>Audit trail starts with operations after Sprint 16.9 migration.</small>:data.audit.map(a=><div key={a.id} style={{display:"grid",gridTemplateColumns:"8px 1fr",gap:9}}><div style={{width:8,height:8,borderRadius:"50%",background:a.actorType==="system"?"#f59e0b":"#07c160",marginTop:5}}/><div><b style={{fontSize:12}}>{a.action}</b><small style={{display:"block",color:"#64748b"}}>{a.area}{a.targetId?` · ${a.targetId}`:""} · {new Date(a.createdAt).toLocaleString()}</small></div></div>)}</div></section>

   <section style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
    <Link href="/release-center" style={{padding:12,borderRadius:12,background:"#111827",color:"#fff",textAlign:"center",textDecoration:"none",fontWeight:800}}>Release Center</Link>
    <Link href="/launch-control" style={{padding:12,borderRadius:12,background:"#fff",color:"#475569",textAlign:"center",textDecoration:"none",fontWeight:800}}>Launch Control</Link>
    <Link href="/feature-flags" style={{padding:12,borderRadius:12,background:"#fff",color:"#475569",textAlign:"center",textDecoration:"none",fontWeight:800}}>Feature Flags</Link>
    <Link href="/ui-acceptance" style={{padding:12,borderRadius:12,background:"#fff",color:"#475569",textAlign:"center",textDecoration:"none",fontWeight:800}}>UI Acceptance</Link>
   </section>
   <small style={{display:"block",marginTop:14,textAlign:"center",color:"#94a3b8"}}>Auto refresh 30s · {new Date(data.timestamp).toLocaleString()}</small>
  </>}
 </main>
}