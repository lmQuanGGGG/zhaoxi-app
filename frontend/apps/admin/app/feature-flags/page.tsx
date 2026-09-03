"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
type Flag={id:string;key:string;name:string;description?:string|null;enabled:boolean;killSwitch:boolean;channels:string[];roles:string[];rolloutPercent:number;updatedAt:string};
const channels=["stable","beta","canary"],roles=["customer","partner","admin"];
export default function FeatureFlagsPage(){
 const[rows,setRows]=useState<Flag[]>([]),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState("");
 const load=async()=>{try{const r=await fetch("/api/platform-feature-flags/admin",{cache:"no-store"});const x=await r.json();if(!r.ok)throw new Error(x?.error?.code||"LOAD_FAILED");setRows(x.data||[])}catch(e){setError(e instanceof Error?e.message:"LOAD_FAILED")}};
 useEffect(()=>{void load()},[]);
 async function patch(row:Flag,body:Partial<Flag>){setBusy(row.id);setError("");try{const r=await fetch(`/api/platform-feature-flags/admin/${row.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const x=await r.json();if(!r.ok)throw new Error(x?.error?.code||"UPDATE_FAILED");await load()}catch(e){setError(e instanceof Error?e.message:"UPDATE_FAILED")}finally{setBusy(null)}}
 return <main style={{width:"min(100%,520px)",margin:"0 auto",minHeight:"100dvh",padding:18,background:"#f5f7fa",fontFamily:"Inter,Arial,sans-serif"}}>
  <Link href="/" style={{textDecoration:"none",color:"#64748b"}}>← Admin</Link>
  <div style={{margin:"16px 0"}}><h1 style={{margin:0,fontSize:24}}>Feature Flags</h1><p style={{color:"#64748b"}}>Progressive rollout · role targeting · emergency kill switch</p></div>
  {error&&<div style={{padding:12,borderRadius:12,background:"#fff1f2",color:"#be123c",marginBottom:12}}>{error}</div>}
  <div style={{display:"grid",gap:12}}>{rows.map(row=><article key={row.id} style={{padding:16,borderRadius:18,background:"#fff",border:"1px solid #e5e7eb"}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}><div><b>{row.name}</b><code style={{display:"block",marginTop:4,color:"#64748b"}}>{row.key}</code></div><button disabled={busy===row.id} onClick={()=>void patch(row,{enabled:!row.enabled})} style={{border:0,borderRadius:999,padding:"8px 12px",background:row.enabled?"#dcfce7":"#f1f5f9",color:row.enabled?"#166534":"#475569",fontWeight:800}}>{row.enabled?"ON":"OFF"}</button></div>
   {row.description&&<p style={{color:"#64748b"}}>{row.description}</p>}
   <div style={{display:"grid",gap:10}}>
    <label>Rollout: <b>{row.rolloutPercent}%</b><input type="range" min="0" max="100" value={row.rolloutPercent} onChange={e=>setRows(v=>v.map(x=>x.id===row.id?{...x,rolloutPercent:Number(e.target.value)}:x))} onMouseUp={()=>void patch(row,{rolloutPercent:row.rolloutPercent})} onTouchEnd={()=>void patch(row,{rolloutPercent:row.rolloutPercent})} style={{width:"100%"}}/></label>
    <div><small>Channels</small><div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:5}}>{channels.map(c=><button key={c} onClick={()=>{const next=row.channels.includes(c)?row.channels.filter(x=>x!==c):[...row.channels,c];void patch(row,{channels:next})}} style={{border:0,borderRadius:10,padding:"7px 9px",background:row.channels.includes(c)?"#e0f2fe":"#f8fafc",fontWeight:700}}>{c}</button>)}</div></div>
    <div><small>Roles</small><div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:5}}>{roles.map(c=><button key={c} onClick={()=>{const next=row.roles.includes(c)?row.roles.filter(x=>x!==c):[...row.roles,c];void patch(row,{roles:next})}} style={{border:0,borderRadius:10,padding:"7px 9px",background:row.roles.includes(c)?"#ecfdf5":"#f8fafc",fontWeight:700}}>{c}</button>)}</div></div>
    <button disabled={busy===row.id} onClick={()=>void patch(row,{killSwitch:!row.killSwitch})} style={{border:0,borderRadius:12,padding:10,background:row.killSwitch?"#7f1d1d":"#fff1f2",color:row.killSwitch?"#fff":"#be123c",fontWeight:900}}>⛔ Kill switch: {row.killSwitch?"ACTIVE":"OFF"}</button>
   </div>
  </article>)}</div>
 </main>
}
