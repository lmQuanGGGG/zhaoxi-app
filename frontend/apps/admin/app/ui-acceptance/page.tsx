"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
type Status="pending"|"passed"|"failed"|"blocked"|"needs_review";
type Item={id:string;itemKey:string;app:string;category:string;title:string;route?:string|null;priority:string;status:Status;notes?:string|null;evidenceUrl?:string|null;reviewedAt?:string|null};
type Payload={items:Item[];summary:{total:number;pending:number;passed:number;failed:number;blocked:number;needs_review:number;criticalTotal:number;criticalPassed:number;criticalReady:boolean}};
const appLabels:Record<string,string>={all:"Shared",customer:"Customer",partner:"Partner",admin:"Admin"};
const statusLabels:Record<Status,string>={pending:"Pending",passed:"Passed",failed:"Failed",blocked:"Blocked",needs_review:"Needs review"};
const statusBg:Record<Status,string>={pending:"#f8fafc",passed:"#ecfdf5",failed:"#fff1f2",blocked:"#fff7ed",needs_review:"#eff6ff"};
const statusColor:Record<Status,string>={pending:"#475569",passed:"#166534",failed:"#991b1b",blocked:"#9a3412",needs_review:"#1d4ed8"};

export default function UiAcceptancePage(){
 const[data,setData]=useState<Payload|null>(null);
 const[app,setApp]=useState("all-items");
 const[busy,setBusy]=useState<string|null>(null);
 const[error,setError]=useState("");
 const load=async()=>{try{const r=await fetch("/api/platform-ui-acceptance",{cache:"no-store"});const x=await r.json();if(!r.ok||!x?.ok)throw new Error(x?.error?.code||"UI_ACCEPTANCE_LOAD_FAILED");setData(x.data);setError("")}catch(e){setError(e instanceof Error?e.message:"UI_ACCEPTANCE_LOAD_FAILED")}};
 useEffect(()=>{void load()},[]);
 const items=useMemo(()=>data?.items.filter(x=>app==="all-items"||x.app===app)||[],[data,app]);
 async function patch(item:Item,body:Partial<Item>){setBusy(item.id);try{const r=await fetch(`/api/platform-ui-acceptance/${item.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const x=await r.json();if(!r.ok||!x?.ok)throw new Error(x?.error?.code||"UI_ACCEPTANCE_UPDATE_FAILED");await load()}catch(e){setError(e instanceof Error?e.message:"UI_ACCEPTANCE_UPDATE_FAILED")}finally{setBusy(null)}}
 return <main style={{width:"min(100%,640px)",margin:"0 auto",minHeight:"100dvh",padding:18,background:"#f5f7fa",fontFamily:"Inter,Arial,sans-serif"}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><Link href="/release-center" style={{textDecoration:"none",color:"#64748b"}}>← Release Center</Link><button onClick={()=>void load()} style={{border:0,borderRadius:11,padding:"8px 11px",background:"#fff",fontWeight:800}}>↻ Refresh</button></div>
  <h1 style={{fontSize:24,marginBottom:4}}>UI/UX Acceptance Center</h1><p style={{color:"#64748b",marginTop:0}}>Build xanh ≠ giao diện đã được duyệt. Các mục Critical chưa Passed sẽ khóa nút mở Customer PUBLIC trong Release Center.</p>
  {error&&<div style={{padding:12,borderRadius:12,background:"#fff1f2",color:"#be123c",marginBottom:12}}>{error}</div>}
  {data&&<><section style={{padding:16,borderRadius:18,background:data.summary.criticalReady?"#ecfdf5":"#fff7ed",border:`1px solid ${data.summary.criticalReady?"#bbf7d0":"#fed7aa"}`,marginBottom:14}}><b>{data.summary.criticalReady?"✅ Critical UI checks passed":"⚠️ Critical UI checks still pending"}</b><p style={{margin:"6px 0 0",color:"#64748b"}}>Critical {data.summary.criticalPassed}/{data.summary.criticalTotal} · Passed {data.summary.passed}/{data.summary.total} · Failed {data.summary.failed} · Blocked {data.summary.blocked}</p></section>
  <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:8}}>{["all-items","all","customer","partner","admin"].map(a=><button key={a} onClick={()=>setApp(a)} style={{border:0,borderRadius:999,padding:"8px 11px",whiteSpace:"nowrap",background:app===a?"#111827":"#fff",color:app===a?"#fff":"#475569",fontWeight:800}}>{a==="all-items"?"All":appLabels[a]}</button>)}</div>
  <div style={{display:"grid",gap:10}}>{items.map(item=><article key={item.id} style={{padding:14,borderRadius:16,background:"#fff",border:item.priority==="critical"?"1px solid #fecaca":"1px solid #e5e7eb"}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}><div><small style={{color:"#64748b"}}>{appLabels[item.app]} · {item.category} · {item.priority}</small><h3 style={{fontSize:15,margin:"5px 0"}}>{item.title}</h3>{item.route&&<code style={{fontSize:11,color:"#64748b"}}>{item.route}</code>}</div><span style={{fontSize:11,fontWeight:900,padding:"6px 8px",borderRadius:999,background:statusBg[item.status],color:statusColor[item.status]}}>{statusLabels[item.status]}</span></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginTop:11}}>{(["passed","failed","blocked","needs_review","pending"] as Status[]).map(st=><button key={st} disabled={busy!==null} onClick={()=>void patch(item,{status:st})} title={statusLabels[st]} style={{border:0,borderRadius:9,padding:"7px 4px",fontSize:11,background:item.status===st?statusBg[st]:"#f8fafc",color:item.status===st?statusColor[st]:"#64748b",fontWeight:800}}>{st==="passed"?"✓":st==="failed"?"✕":st==="blocked"?"!":st==="needs_review"?"?":"…"}</button>)}</div>
   <textarea defaultValue={item.notes||""} placeholder="Ghi chú lỗi / những gì cần chỉnh" onBlur={e=>{if(e.target.value!==(item.notes||""))void patch(item,{notes:e.target.value})}} style={{width:"100%",marginTop:9,minHeight:54,padding:9,border:"1px solid #e2e8f0",borderRadius:9,fontSize:12}}/>
  </article>)}</div></>}
 </main>
}
