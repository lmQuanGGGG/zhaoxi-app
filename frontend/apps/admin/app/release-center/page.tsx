"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import ReleaseHealthPanel from "./ReleaseHealthPanel";
import RolloutGuardPanel from "./RolloutGuardPanel";
type Check={key:string;label:string;ok:boolean;critical:boolean;publicBlocker?:boolean;detail:string};
type Control={app:string;configured:boolean;accessMode:string;publicRolloutPercent?:number;maintenanceEnabled:boolean};
type Report={ready:boolean;publicReady:boolean;releaseCandidate:string;architecture:string;channel:string;checks:Check[];controls:Control[];qa:{criticalReady:boolean;criticalPassed:number;criticalTotal:number;failed:number;blocked:number;pending:number;needsReview:number};summary:{criticalPassed:number;criticalTotal:number;optionalPassed:number;optionalTotal:number;featureFlags:number;publicApps:string[]};timestamp:string};
type Release={id:string;version:string;releaseCandidate:string;status:string;note?:string|null;createdAt:string;rolledBackAt?:string|null};

export default function ReleaseCenter(){
 const[data,setData]=useState<Report|null>(null);
 const[releases,setReleases]=useState<Release[]>([]);
 const[loading,setLoading]=useState(true);
 const[busy,setBusy]=useState<string|null>(null);
 const[error,setError]=useState("");
 const[note,setNote]=useState("");
 const load=async()=>{setLoading(true);setError("");try{const [a,b]=await Promise.all([fetch("/api/platform-release-readiness",{cache:"no-store"}),fetch("/api/platform-releases",{cache:"no-store"})]);const x=await a.json();const y=await b.json();if(!a.ok||!x?.ok)throw new Error(x?.error?.code||"READINESS_FAILED");setData(x.data);if(b.ok&&y?.ok)setReleases(y.data||[])}catch(e){setError(e instanceof Error?e.message:"READINESS_FAILED")}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 async function approve(openCustomerPublic:boolean){setBusy("approve");setError("");try{const r=await fetch("/api/platform-releases",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({note,openCustomerPublic})});const x=await r.json();if(!r.ok||!x?.ok)throw new Error(x?.error?.code||"RELEASE_APPROVAL_FAILED");setNote("");await load()}catch(e){setError(e instanceof Error?e.message:"RELEASE_APPROVAL_FAILED")}finally{setBusy(null)}}
 async function rollback(id:string){if(!window.confirm("Rollback Runtime Control and Feature Flags to this release snapshot?"))return;setBusy(id);setError("");try{const r=await fetch(`/api/platform-releases/${id}/rollback`,{method:"POST"});const x=await r.json();if(!r.ok||!x?.ok)throw new Error(x?.error?.code||"ROLLBACK_FAILED");await load()}catch(e){setError(e instanceof Error?e.message:"ROLLBACK_FAILED")}finally{setBusy(null)}}
 return <main style={{width:"min(100%,580px)",margin:"0 auto",minHeight:"100dvh",padding:18,background:"#f5f7fa",fontFamily:"Inter,Arial,sans-serif"}}>
  <Link href="/" style={{textDecoration:"none",color:"#64748b"}}>← Admin</Link><Link href="/command-center" style={{marginLeft:14,textDecoration:"none",color:"#0f766e",fontWeight:800}}>Command Center →</Link>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",margin:"16px 0"}}><div><h1 style={{margin:0,fontSize:24}}>Release Center</h1><p style={{margin:"5px 0 0",color:"#64748b"}}>Public Beta Go-Live & Rollback Guard</p></div><button onClick={()=>void load()} disabled={loading} style={{border:0,borderRadius:12,padding:"10px 12px",background:"#fff",fontWeight:800}}>↻ Check</button></div>
  {error&&<div style={{padding:12,borderRadius:12,background:"#fff1f2",color:"#be123c",marginBottom:12}}>{error}</div>}<ReleaseHealthPanel/><RolloutGuardPanel/>
  {data&&<>
   <section style={{padding:18,borderRadius:20,background:data.ready?"#ecfdf5":"#fff7ed",border:`1px solid ${data.ready?"#bbf7d0":"#fed7aa"}`,marginBottom:14}}>
    <div style={{fontSize:12,fontWeight:900,color:data.ready?"#166534":"#9a3412"}}>{data.releaseCandidate}</div>
    <h2 style={{margin:"6px 0"}}>{data.ready?"✅ CORE READY":"⚠️ CORE NOT READY"}</h2>
    <p style={{margin:0,color:"#64748b"}}>Critical {data.summary.criticalPassed}/{data.summary.criticalTotal} · Optional {data.summary.optionalPassed}/{data.summary.optionalTotal} · Flags {data.summary.featureFlags}</p>
   </section>
   <section style={{padding:16,borderRadius:18,background:data.publicReady?"#ecfdf5":"#fff7ed",border:`1px solid ${data.publicReady?"#bbf7d0":"#fed7aa"}`,marginBottom:14}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><div><b>{data.publicReady?"✅ PUBLIC QA GATE OPEN":"🔒 PUBLIC RELEASE FROZEN"}</b><small style={{display:"block",marginTop:4,color:"#64748b"}}>Critical UI {data.qa.criticalPassed}/{data.qa.criticalTotal} · Pending {data.qa.pending} · Failed {data.qa.failed} · Blocked {data.qa.blocked}</small></div><Link href="/ui-acceptance" style={{textDecoration:"none",borderRadius:10,padding:"8px 10px",background:"#fff",color:"#1d4ed8",fontWeight:800}}>Review UI →</Link></div>
   </section>
   <section style={{padding:16,borderRadius:18,background:"#fff",border:"1px solid #e5e7eb",marginBottom:14}}>
    <b>Release approval</b><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Release note (optional)" style={{width:"100%",minHeight:70,marginTop:10,padding:10,border:"1px solid #dbe3dd",borderRadius:10}}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
      <button disabled={!data.ready||busy!==null} onClick={()=>void approve(false)} style={{border:0,borderRadius:12,padding:11,background:"#e2e8f0",fontWeight:900}}>Approve RC</button>
      <button disabled={!data.publicReady||busy!==null} onClick={()=>void approve(true)} style={{border:0,borderRadius:12,padding:11,background:"#07c160",color:"#fff",fontWeight:900}}>Approve + Open Customer PUBLIC</button>
    </div>
   </section>
   <section style={{display:"grid",gap:9,marginBottom:14}}>{data.checks.map(c=><article key={c.key} style={{padding:14,borderRadius:16,background:"#fff",border:"1px solid #e5e7eb",display:"grid",gridTemplateColumns:"28px 1fr",gap:9}}><div style={{fontSize:20}}>{c.ok?"✅":c.critical?"❌":"⚠️"}</div><div><b>{c.label}</b><small style={{display:"block",color:"#64748b",marginTop:3}}>{c.detail} · {c.critical?"Critical":"Optional"}</small></div></article>)}</section>
   <section style={{padding:16,borderRadius:18,background:"#fff",border:"1px solid #e5e7eb",marginBottom:14}}><b>Application launch state</b><div style={{display:"grid",gap:8,marginTop:10}}>{data.controls.map(c=><div key={c.app} style={{display:"flex",justifyContent:"space-between",gap:8}}><span>{c.app}</span><span style={{fontWeight:800}}>{c.accessMode.toUpperCase()}{c.accessMode==="public"?` · ${c.publicRolloutPercent??100}%`:""}{c.maintenanceEnabled?" · MAINTENANCE":""}</span></div>)}</div><Link href="/launch-control" style={{display:"inline-block",marginTop:12,color:"#078343",fontWeight:800,textDecoration:"none"}}>Open Launch Control →</Link><Link href="/release-alerts" style={{display:"inline-block",marginTop:12,marginLeft:14,color:"#b45309",fontWeight:800,textDecoration:"none"}}>Open Alert Center →</Link><Link href="/ui-acceptance" style={{display:"inline-block",marginTop:12,marginLeft:14,color:"#1d4ed8",fontWeight:800,textDecoration:"none"}}>Open UI Acceptance →</Link><Link href="/audit-log" style={{display:"inline-block",marginTop:12,marginLeft:14,color:"#6d28d9",fontWeight:800,textDecoration:"none"}}>Open Audit Log →</Link><Link href="/command-center" style={{display:"inline-block",marginTop:12,marginLeft:14,color:"#0f766e",fontWeight:800,textDecoration:"none"}}>Open Command Center →</Link></section>
  </>}
  <section style={{padding:16,borderRadius:18,background:"#fff",border:"1px solid #e5e7eb"}}><b>Release history</b><div style={{display:"grid",gap:9,marginTop:10}}>{releases.length===0?<small style={{color:"#64748b"}}>No release approvals yet.</small>:releases.map(r=><div key={r.id} style={{padding:12,border:"1px solid #edf0ee",borderRadius:12}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b>{r.version}</b><span style={{fontSize:12,fontWeight:800}}>{r.status}</span></div><small style={{display:"block",color:"#64748b"}}>{r.releaseCandidate} · {new Date(r.createdAt).toLocaleString()}</small>{r.note&&<p style={{fontSize:13}}>{r.note}</p>}{r.status!=="rolled_back"&&<button disabled={busy!==null} onClick={()=>void rollback(r.id)} style={{marginTop:8,border:0,borderRadius:10,padding:"8px 10px",background:"#fff1f2",color:"#be123c",fontWeight:800}}>Rollback snapshot</button>}</div>)}</div></section>
 </main>
}