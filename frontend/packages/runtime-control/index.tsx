"use client";
import {useEffect,useMemo,useState,type ReactNode} from "react";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import {useZhaoXiSession} from "@zhaoxi/auth";

type App="customer"|"partner"|"driver"|"admin";
type Control={app:App;accessMode:"closed"|"beta"|"public";publicRolloutPercent:number;cohortBucket:number;publicEligible:boolean;maintenanceEnabled:boolean;maintenanceMessage:Record<string,string>;notice:Record<string,string>;updatedAt:string};
const fallback={"vi-VN":"Hệ thống đang được bảo trì. Vui lòng quay lại sau.","zh-CN":"系统正在维护，请稍后再试。","zh-TW":"系統正在維護，請稍後再試。","en-US":"The service is under maintenance. Please try again later."} as const;
const closed={"vi-VN":"Ứng dụng hiện chưa mở truy cập.","zh-CN":"应用目前尚未开放访问。","zh-TW":"應用目前尚未開放存取。","en-US":"This app is not currently open for access."} as const;
const staged={"vi-VN":"Public Beta đang được mở theo từng nhóm người dùng. Thiết bị này chưa nằm trong đợt hiện tại.","zh-CN":"公开测试正在分批开放，当前设备暂未进入本轮。","zh-TW":"公開測試正在分批開放，目前裝置尚未進入本輪。","en-US":"Public Beta is rolling out in stages. This device is not in the current cohort yet."} as const;

function anonymousSubject(){
  if(typeof window==="undefined")return "anonymous";
  const key="zx_rollout_subject_v1";
  let value=window.localStorage.getItem(key);
  if(!value){value=(typeof crypto!=="undefined"&&"randomUUID"in crypto?crypto.randomUUID():`${Date.now()}-${Math.random()}`);window.localStorage.setItem(key,value)}
  return value;
}

export function RuntimeGate({app,children}:{app:App;children:ReactNode}){
 const{locale}=useZhaoXiLocale();const session=useZhaoXiSession();const[state,setState]=useState<Control|null>(null);
 const subject=useMemo(()=>session?.userId||anonymousSubject(),[session?.userId]);
 useEffect(()=>{let active=true;const load=()=>fetch(`/api/platform-runtime-control?app=${app}&subject=${encodeURIComponent(subject)}`,{cache:"no-store"}).then(r=>r.json()).then(x=>{if(active&&x?.ok)setState(x.data)}).catch(()=>{});void load();const timer=window.setInterval(()=>void load(),30000);return()=>{active=false;window.clearInterval(timer)}},[app,subject]);
 if(app==="admin"||!state)return <>{children}</>;
 const stagedBlocked=state.accessMode==="public"&&!state.publicEligible;
 const blocked=state.maintenanceEnabled||state.accessMode==="closed"||stagedBlocked;
 if(!blocked)return <>{children}</>;
 const text=state.maintenanceEnabled?(state.maintenanceMessage?.[locale]||fallback[locale]):state.accessMode==="closed"?closed[locale]:staged[locale];
 return <main style={{minHeight:"100dvh",display:"grid",placeItems:"center",padding:24,background:"#f6faf7",fontFamily:"Inter,Arial,sans-serif"}}><section style={{width:"min(100%,390px)",padding:28,borderRadius:24,background:"#fff",boxShadow:"0 18px 60px rgba(15,23,42,.10)",textAlign:"center"}}><div style={{fontSize:46}}>{state.maintenanceEnabled?"🛠️":stagedBlocked?"🚦":"🔒"}</div><h1 style={{fontSize:22,margin:"12px 0 8px"}}>ZhaoXi</h1><p style={{color:"#64748b",lineHeight:1.6}}>{text}</p><small style={{color:"#94a3b8"}}>{state.accessMode.toUpperCase()}{state.accessMode==="public"?` · ${state.publicRolloutPercent}%`:""}</small></section></main>
}
