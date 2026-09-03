"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  localeNames,
  normalizeLocale,
  saveBrowserLocale,
  type ZhaoXiLocale,
} from "@zhaoxi/i18n";

const copy: Record<ZhaoXiLocale,{
  title:string;hint:string;customer:string;customerHint:string;
  partner:string;partnerHint:string;scanner:string;language:string;
}> = {
  "zh-CN": {
    title:"请选择入口", hint:"扫描二维码后，请选择您要进入的服务。",
    customer:"客户", customerHint:"使用生活服务",
    partner:"商家 / 合作伙伴", partnerHint:"餐厅及服务合作伙伴",
    scanner:"可使用微信、WhatsApp或手机相机扫码。", language:"语言",
  },
  "zh-TW": {
    title:"請選擇入口", hint:"掃描 QR 碼後，請選擇您要進入的服務。",
    customer:"客戶", customerHint:"使用生活服務",
    partner:"商家 / 合作夥伴", partnerHint:"餐廳及服務合作夥伴",
    scanner:"可使用微信、WhatsApp 或手機相機掃碼。", language:"語言",
  },
  "vi-VN": {
    title:"Chọn mục vào", hint:"Sau khi quét QR, hãy chọn dịch vụ bạn muốn sử dụng.",
    customer:"Khách hàng", customerHint:"Sử dụng dịch vụ đời sống",
    partner:"Nhà hàng / Đối tác", partnerHint:"Dành cho nhà hàng và đối tác dịch vụ",
    scanner:"Có thể quét bằng WeChat, WhatsApp hoặc Camera.", language:"Ngôn ngữ",
  },
  "en-US": {
    title:"Choose entry", hint:"After scanning the QR code, choose the service you want to enter.",
    customer:"Customer", customerHint:"Use ZhaoXi life services",
    partner:"Partner", partnerHint:"For restaurants and service partners",
    scanner:"Scan with WeChat, WhatsApp, or your phone camera.", language:"Language",
  },
};

function configuredPartnerUrl(){
  return process.env.NEXT_PUBLIC_ZHAOXI_PARTNER_URL?.trim()?.replace(/\/$/,"") || "";
}

export default function ZhaoXiEntryPage() {
  const [locale,setLocale]=useState<ZhaoXiLocale>(DEFAULT_LOCALE);
  const [partnerBase,setPartnerBase]=useState(configuredPartnerUrl());

  useEffect(()=>{
    const query=new URLSearchParams(window.location.search).get("lang");
    const stored=window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const initial=normalizeLocale(query||stored||DEFAULT_LOCALE);
    setLocale(initial); saveBrowserLocale(initial);
    if(!partnerBase && window.location.origin.includes("customer")){
      setPartnerBase(window.location.origin.replace("customer","partner"));
    }
  },[partnerBase]);

  const t=copy[locale];
  const customerHref=useMemo(()=>`/?lang=${encodeURIComponent(locale)}`,[locale]);
  const partnerHref=useMemo(()=>partnerBase?`${partnerBase}/?lang=${encodeURIComponent(locale)}`:"#",[partnerBase,locale]);

  function chooseLanguage(next:ZhaoXiLocale){
    setLocale(next); saveBrowserLocale(next);
    const url=new URL(window.location.href); url.searchParams.set("lang",next);
    window.history.replaceState(null,"",url);
  }

  return (
    <main style={{
      minHeight:"100dvh",display:"grid",placeItems:"center",padding:"20px",
      background:"linear-gradient(180deg,#f4fbf7 0%,#eef4f8 100%)",
      fontFamily:"system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
    }}>
      <section style={{
        width:"min(440px,100%)",background:"#fff",border:"1px solid #dce7e0",
        borderRadius:26,padding:"28px 24px",boxShadow:"0 18px 50px rgba(15,23,42,.10)",
        display:"grid",gap:18,textAlign:"center"
      }}>
        <div style={{
          width:64,height:64,borderRadius:20,overflow:"hidden",display:"grid",placeItems:"center",
          margin:"0 auto"
        }}><img src="/brand-logo.png" alt="ZhaoXi" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>

        <small style={{color:"#07A552",fontWeight:800}}>ZHAOXI</small>

        <label style={{display:"grid",gap:7,textAlign:"left",fontSize:13,color:"#64748b"}}>
          {t.language}
          <select value={locale} onChange={e=>chooseLanguage(e.target.value as ZhaoXiLocale)}
            style={{width:"100%",padding:"12px 14px",borderRadius:14,border:"1px solid #cfdad4",background:"#fff",fontSize:16}}>
            {(Object.keys(localeNames) as ZhaoXiLocale[]).map(code=>
              <option key={code} value={code}>{localeNames[code]}</option>
            )}
          </select>
        </label>

        <div>
          <h1 style={{margin:"4px 0 8px",fontSize:29}}>{t.title}</h1>
          <p style={{margin:0,color:"#64748b",lineHeight:1.55}}>{t.hint}</p>
        </div>

        <a href={customerHref} style={{
          textDecoration:"none",padding:"17px 18px",borderRadius:18,
          background:"#07C160",color:"#fff",fontSize:19,fontWeight:800,
          boxShadow:"0 8px 20px rgba(7,193,96,.22)"
        }}>
          {t.customer}
          <span style={{display:"block",fontSize:13,fontWeight:500,opacity:.9,marginTop:4}}>{t.customerHint}</span>
        </a>

        <a href={partnerHref} aria-disabled={partnerHref==="#"} style={{
          textDecoration:"none",padding:"17px 18px",borderRadius:18,
          background:"#fff",color:"#0f172a",fontSize:19,fontWeight:800,
          border:"1px solid #cfdad4",opacity:partnerHref==="#"?.55:1
        }}>
          {t.partner}
          <span style={{display:"block",fontSize:13,fontWeight:500,color:"#64748b",marginTop:4}}>{t.partnerHint}</span>
        </a>

        <small style={{color:"#64748b",lineHeight:1.5}}>{t.scanner}</small>
      </section>
    </main>
  );
}
