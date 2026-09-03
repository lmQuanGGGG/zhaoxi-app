"use client";
import {useEffect,useState} from "react";
import {saveSession} from "@zhaoxi/auth";
import {useZhaoXiLocale} from "@zhaoxi/i18n";

const DEVICE_STORAGE_KEY="zhaoxi-device-id-v2";
function getDeviceId(){let id=window.localStorage.getItem(DEVICE_STORAGE_KEY);if(!id){id=`web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;window.localStorage.setItem(DEVICE_STORAGE_KEY,id)}return id}
function deviceName(){return `${/Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)?"Mobile":"Desktop"} · ${navigator.platform||"Web"}`.slice(0,180)}
const copy={
 "vi-VN":{title:"Đăng nhập quản trị",checking:"Đang xác thực Admin QR…",success:"Đăng nhập thành công. Đang chuyển vào Trung tâm quản trị…",invalid:"Mã Admin QR không hợp lệ hoặc đã bị vô hiệu hóa."},
 "zh-CN":{title:"管理员登录",checking:"正在验证管理员二维码…",success:"登录成功，正在进入管理中心…",invalid:"管理员二维码无效或已停用。"},
 "zh-TW":{title:"管理員登入",checking:"正在驗證管理員 QR…",success:"登入成功，正在進入管理中心…",invalid:"管理員 QR 無效或已停用。"},
 "en-US":{title:"Admin sign-in",checking:"Verifying Admin QR…",success:"Sign-in successful. Opening Administration Center…",invalid:"The Admin QR is invalid or has been disabled."}
} as const;

export default function AdminQrLoginPage(){
 const{locale}=useZhaoXiLocale(),t=copy[locale];
 const[msg,setMsg]=useState<string>(t.checking),[state,setState]=useState<"checking"|"ok"|"error">("checking");
 useEffect(()=>{setMsg(t.checking)},[t.checking]);
 useEffect(()=>{let active=true;void(async()=>{try{
   const code=new URLSearchParams(window.location.hash.replace(/^#/,"")).get("code")||"";
   history.replaceState(null,"",window.location.pathname);
   if(code.length<24)throw new Error("ADMIN_QR_CODE_REQUIRED");
   const r=await fetch("/api/auth/unified/admin/card",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({cardCode:code,deviceId:getDeviceId(),deviceName:deviceName()})});
   const j=await r.json();if(!r.ok||!j?.ok)throw new Error(j?.error?.code||"ADMIN_QR_INVALID");
   saveSession({...j.data,authMethod:"internal",sessionMode:"server"});
   if(active){setState("ok");setMsg(t.success);window.setTimeout(()=>window.location.replace("/"),320)}
 }catch{if(active){setState("error");setMsg(t.invalid)}}})();return()=>{active=false}},[t.invalid,t.success]);
 return <main style={{minHeight:"100dvh",display:"grid",placeItems:"center",padding:20,background:"radial-gradient(circle at 18% 8%,rgba(7,193,96,.22),transparent 30%),radial-gradient(circle at 82% 4%,rgba(72,115,255,.22),transparent 32%),linear-gradient(145deg,#edf8f4,#f2f6ff 55%,#eef3ff)"}}><section style={{width:"min(420px,100%)",padding:28,border:"1px solid rgba(255,255,255,.88)",borderRadius:28,background:"linear-gradient(145deg,rgba(255,255,255,.80),rgba(255,255,255,.54))",boxShadow:"0 24px 70px rgba(39,58,91,.16),inset 0 1px 0 rgba(255,255,255,.94)",backdropFilter:"blur(28px) saturate(160%)",textAlign:"center"}}><div style={{width:60,height:60,margin:"0 auto 15px",display:"grid",placeItems:"center",borderRadius:19,background:"linear-gradient(145deg,#2bdd8b,#07b95f)",color:"white",fontSize:28,fontWeight:950,boxShadow:"0 12px 30px rgba(7,193,96,.28)"}}>喜</div><small style={{fontWeight:900,color:"#07884c",letterSpacing:".08em"}}>ZHAOXI</small><h1 style={{fontSize:23,margin:"8px 0 9px",color:"#10203a"}}>{t.title}</h1><div style={{margin:"18px 0 2px",padding:15,borderRadius:17,border:"1px solid rgba(255,255,255,.88)",background:state==="error"?"rgba(255,241,242,.78)":state==="ok"?"rgba(232,255,243,.82)":"rgba(255,255,255,.58)",color:state==="error"?"#b42318":"#52627a",fontSize:13,lineHeight:1.5,boxShadow:"inset 0 1px 0 rgba(255,255,255,.9)"}}>{state==="checking"&&<span style={{display:"inline-block",marginRight:7,color:"#07b95f"}}>●</span>}{state==="ok"&&<span style={{marginRight:7,color:"#07a957"}}>✓</span>}{state==="error"&&<span style={{marginRight:7}}>!</span>}{msg}</div></section></main>
}
