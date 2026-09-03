"use client";

import {localeNames,useZhaoXiLocale,type ZhaoXiLocale}from"@zhaoxi/i18n";
import {CustomerPageHeader,CustomerShell} from "../_components/CustomerShell";

const copy={
 "zh-CN":{title:"语言设置",hint:"选择赵喜的显示语言"},
 "zh-TW":{title:"語言設定",hint:"選擇趙喜的顯示語言"},
 "vi-VN":{title:"Cài đặt ngôn ngữ",hint:"Chọn ngôn ngữ hiển thị của ZhaoXi"},
 "en-US":{title:"Language settings",hint:"Choose the display language for ZhaoXi"}
} as const;

export default function Language(){
 const{locale,setLocale}=useZhaoXiLocale();
 const t=copy[locale];

 return (
  <CustomerShell>
   <CustomerPageHeader title={t.title} subtitle={t.hint} backHref="/profile"/>
   <section style={{paddingBottom:"calc(90px + env(safe-area-inset-bottom))",display:"grid",gap:8}}>
    <div style={{background:"#FFFFFF",borderRadius:20,border:"1px solid #EEF2F6",overflow:"hidden",boxShadow:"0 4px 16px rgba(15,23,42,0.03)"}}>
     {(Object.keys(localeNames) as ZhaoXiLocale[]).map((code,idx)=>(
      <button
       key={code}
       onClick={()=>setLocale(code)}
       style={{
        width:"100%",
        display:"flex",
        justifyContent:"space-between",
        alignItems:"center",
        padding:"15px 18px",
        background:locale===code?"#F0FDF4":"transparent",
        border:0,
        borderBottom:idx<Object.keys(localeNames).length-1?"1px solid #F1F5F9":"none",
        cursor:"pointer",
        textAlign:"left",
        font:"inherit"
       }}
      >
       <div>
        <b style={{fontSize:14,color:locale===code?"#059669":"#1E293B"}}>{localeNames[code]}</b>
        <small style={{display:"block",color:"#94A3B8",fontSize:11,marginTop:2}}>{code}</small>
       </div>
       {locale===code&&(
        <span style={{color:"#059669",fontSize:18,fontWeight:800}}>✓</span>
       )}
      </button>
     ))}
    </div>
   </section>
  </CustomerShell>
 );
}
