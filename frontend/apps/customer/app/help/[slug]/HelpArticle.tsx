"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import {CustomerPageHeader,CustomerShell} from "../../_components/CustomerShell";

const C={
 "vi-VN":{back:"Trợ giúp",helpful:"Bài này có hữu ích không?",yes:"Có",no:"Không",support:"Liên hệ hỗ trợ"},
 "zh-CN":{back:"帮助",helpful:"这篇文章有帮助吗？",yes:"有",no:"没有",support:"联系支持"},
 "zh-TW":{back:"幫助",helpful:"這篇文章有幫助嗎？",yes:"有",no:"沒有",support:"聯絡支援"},
 "en-US":{back:"Help",helpful:"Was this article helpful?",yes:"Yes",no:"No",support:"Contact support"}
} as const;

export default function HelpArticle({slug}:{slug:string}){
 const{locale}=useZhaoXiLocale();
 const t=C[locale];
 const[x,setX]=useState<any>(null);
 const[done,setDone]=useState(false);

 useEffect(()=>{
  fetch(`/api/public-support-knowledge/${encodeURIComponent(slug)}?locale=${locale}`,{cache:"no-store"})
   .then(r=>r.json())
   .then(j=>j?.ok&&setX(j.data))
   .catch(()=>{});
 },[slug,locale]);

 async function vote(helpful:boolean){
  await fetch(`/api/public-support-knowledge/${encodeURIComponent(slug)}/feedback?locale=${locale}`,{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({helpful})
  });
  setDone(true);
 }

 return (
  <CustomerShell>
   <CustomerPageHeader title={x?.title||"…"} subtitle={x?.category||t.back} backHref="/help"/>
   <section style={{display:"grid",gap:14,paddingBottom:"calc(90px + env(safe-area-inset-bottom))"}}>
    {x&&(
     <article style={{padding:18,borderRadius:20,border:"1px solid #EEF2F6",background:"#FFFFFF",boxShadow:"0 4px 16px rgba(15,23,42,0.03)"}}>
      {x.summary&&<p style={{color:"#64748B",fontSize:13,lineHeight:1.5,marginTop:0,marginBottom:14,fontWeight:500}}>{x.summary}</p>}
      <div style={{whiteSpace:"pre-wrap",lineHeight:1.7,fontSize:13.5,color:"#334155"}}>{x.body}</div>

      <section style={{padding:14,border:"1px solid #EEF2F6",borderRadius:14,background:"#F8FAFC",marginTop:20}}>
       <b style={{fontSize:13,color:"#1E293B"}}>{t.helpful}</b>
       {!done ? (
        <div style={{display:"flex",gap:8,marginTop:10}}>
         <button onClick={()=>void vote(true)} style={{border:"1px solid #E2E8F0",borderRadius:10,padding:"7px 14px",background:"#FFFFFF",color:"#059669",fontWeight:750,fontSize:12,cursor:"pointer"}}>👍 {t.yes}</button>
         <button onClick={()=>void vote(false)} style={{border:"1px solid #E2E8F0",borderRadius:10,padding:"7px 14px",background:"#FFFFFF",color:"#64748B",fontWeight:750,fontSize:12,cursor:"pointer"}}>👎 {t.no}</button>
        </div>
       ) : (
        <small style={{display:"block",marginTop:8,color:"#059669",fontWeight:700}}>✓ Cảm ơn bạn đã phản hồi!</small>
       )}
      </section>

      <Link href="/messages" style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:16,color:"#059669",textDecoration:"none",fontWeight:750,fontSize:13}}>
       💬 {t.support} ›
      </Link>
     </article>
    )}
   </section>
  </CustomerShell>
 );
}
