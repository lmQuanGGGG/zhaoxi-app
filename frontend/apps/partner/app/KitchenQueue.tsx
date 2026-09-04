"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import {getCached,setCached} from "./_lib/client-cache";
import {IosPersonIcon,IosPhoneIcon} from "./IosIcons";

type Item={requestId:string;requestCode:string;stage:string;priority:string;serviceName:string;customerName:string;customerPhone?:string;addressText?:string;quantity:number;estimatedMinutes:number;estimatedReadyAt:string|null;overdueMinutes:number;elapsedMinutes:number;late:boolean;courierName:string;sortScore:number};
type Data={counts:{waiting:number;preparing:number;ready:number;courier:number;late:number};items:Item[]};
const copy={
"zh-CN":{title:"厨房队列",waiting:"待接单",preparing:"备餐中",ready:"待取餐",courier:"配送交接",late:"已超时",priority:"优先级",normal:"普通",high:"优先",urgent:"紧急",eta:"调整时间",minutes:"分钟",empty:"厨房队列为空",overdue:"超时",elapsed:"已用时",refresh:"刷新"},
"zh-TW":{title:"廚房隊列",waiting:"待接單",preparing:"備餐中",ready:"待取餐",courier:"配送交接",late:"已逾時",priority:"優先級",normal:"普通",high:"優先",urgent:"緊急",eta:"調整時間",minutes:"分鐘",empty:"廚房隊列為空",overdue:"逾時",elapsed:"已用時",refresh:"重新整理"},
"vi-VN":{title:"Hàng đợi bếp",waiting:"Chờ nhận",preparing:"Đang chuẩn bị",ready:"Chờ lấy món",courier:"Bàn giao",late:"Đơn trễ",priority:"Ưu tiên",normal:"Bình thường",high:"Ưu tiên",urgent:"Khẩn",eta:"Điều chỉnh thời gian",minutes:"phút",empty:"Không có đơn trong hàng đợi bếp",overdue:"Trễ",elapsed:"Đã xử lý",refresh:"Làm mới"},
"en-US":{title:"Kitchen queue",waiting:"Waiting",preparing:"Preparing",ready:"Ready",courier:"Handoff",late:"Late",priority:"Priority",normal:"Normal",high:"High",urgent:"Urgent",eta:"Adjust time",minutes:"minutes",empty:"Kitchen queue is empty",overdue:"Late",elapsed:"Elapsed",refresh:"Refresh"}} as const;

export default function KitchenQueue({organizationId}:{organizationId:string}){
 const{locale}=useZhaoXiLocale();const t=copy[locale];
 const cacheKey=`partner_kitchen_${organizationId}_${locale}`;
 const[data,setData]=useState<Data>(()=>getCached<Data>(cacheKey)||{counts:{waiting:0,preparing:0,ready:0,courier:0,late:0},items:[]});
 const[busy,setBusy]=useState("");
 const load=useCallback(async()=>{if(!organizationId)return;try{const r=await fetch(`/api/partner-kitchen?organizationId=${encodeURIComponent(organizationId)}&locale=${encodeURIComponent(locale)}`,{cache:"no-store"});const j=await r.json();if(j?.ok){setData(j.data);setCached(cacheKey,j.data)}}catch{}},[organizationId,locale,cacheKey]);
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),5000);return()=>clearInterval(timer)},[load]);
 async function patch(item:Item,payload:Record<string,unknown>){setBusy(item.requestId+String(payload.action));try{await fetch("/api/partner-kitchen",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({organizationId,requestId:item.requestId,...payload})});await load()}finally{setBusy("")}}
 const columns=useMemo(()=>[
  {key:"waiting",title:t.waiting,items:data.items.filter(x=>x.stage==="assigned")},
  {key:"preparing",title:t.preparing,items:data.items.filter(x=>x.stage==="preparing")},
  {key:"ready",title:t.ready,items:data.items.filter(x=>x.stage==="ready_for_pickup")},
  {key:"courier",title:t.courier,items:data.items.filter(x=>["courier_booked","handed_off"].includes(x.stage))},
 ],[data,t]);
 return <section style={{margin:"18px 0"}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><div><h2 style={{margin:"0 0 4px"}}>{t.title}</h2><small style={{color:data.counts.late?"#dc2626":"#64748b",fontWeight:800}}>{t.late}: {data.counts.late}</small></div><button onClick={()=>void load()} style={{border:0,borderRadius:10,padding:"8px 10px",background:"#eef7f1",color:"#078343",fontWeight:800}}>{t.refresh}</button></div>
   <div className="zx-kitchen-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(220px,1fr))",gap:10,overflowX:"auto",paddingTop:10}}>
    {columns.map(col=><section className="zx-kitchen-column" key={col.key} style={{minWidth:220,background:"#f8faf9",border:"1px solid #e2e8e5",borderRadius:16,padding:9}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><b style={{fontSize:18}}>{col.title}</b><span style={{display:"grid",placeItems:"center",minWidth:24,height:24,borderRadius:999,background:"#ecfdf5",color:"#078343",fontSize:18,fontWeight:900}}>{col.items.length}</span></header>
      <div style={{display:"grid",gap:8}}>{!col.items.length?<small style={{padding:20,color:"#94a3b8",textAlign:"center"}}>{t.empty}</small>:col.items.map(item=><article key={item.requestId} style={{padding:10,borderRadius:13,background:item.late?"#fff1f2":"#fff",border:item.late?"1px solid #fecdd3":"1px solid #edf2ef",boxShadow:"0 5px 14px rgba(15,23,42,.04)"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:6}}><b style={{fontSize:18}}>{item.requestCode}</b>{item.late&&<span style={{fontSize:18,color:"#be123c",fontWeight:900}}>{t.overdue} {item.overdueMinutes}m</span>}</div>
        <strong style={{display:"block",fontSize:18,marginTop:5}}>{item.serviceName}</strong>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,marginTop:4,flexWrap:"wrap"}}>
          <small style={{display:"inline-flex",alignItems:"center",gap:4,color:"#64748b",fontWeight:700}}><IosPersonIcon size={13} color="#111827"/> {item.customerName} · ×{item.quantity}</small>
          {item.customerPhone&&<a href={`tel:${item.customerPhone}`} style={{display:"inline-flex",alignItems:"center",gap:4,background:"#ecfdf5",color:"#067647",padding:"3px 8px",borderRadius:999,fontSize:12,fontWeight:850,textDecoration:"none",border:"1px solid #bbf7d0"}}><IosPhoneIcon size={12} color="#111827"/> {item.customerPhone}</a>}
        </div>
        <small style={{display:"block",color:"#64748b",marginTop:4}}>⏱ {t.elapsed}: {item.elapsedMinutes} {t.minutes}</small>
        <div style={{display:"flex",gap:5,marginTop:8}}>{(["normal","high","urgent"] as const).map(level=><button key={level} disabled={!!busy} onClick={()=>void patch(item,{action:"priority",priority:level})} style={{flex:1,border:0,borderRadius:8,padding:"6px 4px",background:item.priority===level?(level==="urgent"?"#fee2e2":"#dcfce7"):"#f1f5f9",color:item.priority===level?(level==="urgent"?"#b91c1c":"#067647"):"#64748b",fontSize:18,fontWeight:850}}>{t[level]}</button>)}</div>
        {item.stage==="preparing"&&<select value={item.estimatedMinutes||15} disabled={!!busy} onChange={e=>void patch(item,{action:"eta",minutes:Number(e.target.value)})} style={{width:"100%",marginTop:7,border:"1px solid #dbe5df",borderRadius:8,padding:6,fontSize:18}}>{[5,10,15,20,25,30,35,40,45,60,75,90].map(v=><option key={v} value={v}>{t.eta}: {v} {t.minutes}</option>)}</select>}
      </article>)}</div>
    </section>)}
   </div>
 </section>
}
