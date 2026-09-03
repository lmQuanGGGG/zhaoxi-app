"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import {CustomerPageHeader,CustomerShell} from "../_components/CustomerShell";

const C={
 "vi-VN":{title:"Trung tâm trợ giúp ZhaoXi",search:"Tìm câu trả lời…",empty:"Chưa có bài hướng dẫn phù hợp",support:"Vẫn cần hỗ trợ?",message:"Mở Message Center"},
 "zh-CN":{title:"赵喜帮助中心",search:"搜索答案…",empty:"暂无匹配的帮助文章",support:"仍需要帮助？",message:"打开消息中心"},
 "zh-TW":{title:"趙喜幫助中心",search:"搜尋答案…",empty:"暫無符合的幫助文章",support:"仍需要協助？",message:"開啟訊息中心"},
 "en-US":{title:"ZhaoXi Help Center",search:"Search for answers…",empty:"No matching help articles",support:"Still need help?",message:"Open Message Center"}
} as const;

export default function Help(){
 const{locale}=useZhaoXiLocale();
 const t=C[locale];
 const[q,setQ]=useState("");
 const[rows,setRows]=useState<any[]>([]);

 useEffect(()=>{
  const timer=setTimeout(()=>fetch(`/api/public-support-knowledge?locale=${locale}&q=${encodeURIComponent(q)}`,{cache:"no-store"}).then(r=>r.json()).then(j=>j?.ok&&setRows(j.data||[])).catch(()=>{}),180);
  return()=>clearTimeout(timer);
 },[q,locale]);

 return (
  <CustomerShell>
   <CustomerPageHeader
    title={t.title}
    backHref="/"
    actions={<Link href="/messages" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:12,background:"#F1F5F9",textDecoration:"none",fontSize:18}}>💬</Link>}
   />
   <section style={{display:"grid",gap:12,paddingBottom:"calc(90px + env(safe-area-inset-bottom))"}}>
    <input
     value={q}
     onChange={e=>setQ(e.target.value)}
     placeholder={t.search}
     style={{width:"100%",boxSizing:"border-box",padding:"11px 14px",border:"1px solid #E2E8F0",borderRadius:14,background:"#FFFFFF",fontSize:13.5,color:"#1E293B",outline:"none"}}
    />
    <div style={{display:"grid",gap:8}}>
     {rows.map(x=>(
      <Link key={x.id} href={`/help/${x.slug}`} style={{padding:14,border:"1px solid #EEF2F6",borderRadius:16,background:"#FFFFFF",textDecoration:"none",color:"inherit",display:"grid",gap:4,boxShadow:"0 2px 8px rgba(15,23,42,0.02)"}}>
       <small style={{color:"#059669",fontWeight:700,fontSize:10.5}}>{x.category}</small>
       <b style={{display:"block",fontSize:13.5,color:"#1E293B"}}>{x.title}</b>
       <small style={{color:"#64748B",fontSize:12,lineHeight:1.4}}>{x.summary}</small>
      </Link>
     ))}
     {!rows.length&&(
      <div style={{textAlign:"center",padding:"40px 20px",color:"#94A3B8"}}>
       <div style={{fontSize:32,marginBottom:8}}>❓</div>
       <p style={{fontSize:13}}>{t.empty}</p>
      </div>
     )}
    </div>

    <section style={{padding:16,border:"1px solid #BBF7D0",borderRadius:16,background:"#F0FDF4",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
     <div>
      <b style={{fontSize:13.5,color:"#166534"}}>{t.support}</b>
      <span style={{display:"block",fontSize:12,color:"#15803D",marginTop:2}}>Chat trực tiếp với ZhaoXi Support</span>
     </div>
     <Link href="/messages" style={{display:"inline-flex",alignItems:"center",padding:"9px 14px",borderRadius:12,background:"#059669",color:"#FFFFFF",textDecoration:"none",fontWeight:750,fontSize:12}}>
      {t.message} ›
     </Link>
    </section>
   </section>
  </CustomerShell>
 );
}
