"use client";
import{useCallback,useEffect,useState}from"react";import{useZhaoXiSession}from"@zhaoxi/auth";import{useZhaoXiLocale}from"@zhaoxi/i18n";
type Alert={id:string;requestId:string;requestCode:string;status:string;note?:string|null;customerName?:string|null;serviceName?:string|null;moduleName?:string|null;createdAt:string};
const C={
"zh-CN":{message:"租房客户发来了新消息",reminder:"即将到看房时间",open:"打开租房客户线索",close:"关闭"},
"zh-TW":{message:"租房客戶傳來了新訊息",reminder:"即將到看房時間",open:"開啟租房客戶線索",close:"關閉"},
"vi-VN":{message:"Customer thuê nhà vừa gửi tin nhắn",reminder:"Sắp đến lịch xem nhà",open:"Mở pipeline thuê nhà",close:"Đóng"},
"en-US":{message:"A housing customer sent a new message",reminder:"A property viewing is coming up",open:"Open housing pipeline",close:"Close"}} as const;
export default function HousingNotificationAlerts(){const session=useZhaoXiSession(),{locale}=useZhaoXiLocale(),t=C[locale],orgId=session?.organizationId||"";const[item,setItem]=useState<Alert|null>(null);
 const poll=useCallback(async()=>{if(!orgId||item)return;try{const dismissed=new Set<string>(JSON.parse(localStorage.getItem("zhaoxi-partner-housing-alerts")||"[]"));const r=await fetch(`/api/platform-notifications?audience=partner&organizationId=${encodeURIComponent(orgId)}&locale=${locale}`,{cache:"no-store"}),j=await r.json().catch(()=>null);const list=(Array.isArray(j?.data)?j.data:[]) as Alert[];const next=list.find(x=>(String(x.note||"").startsWith("HOUSING_MESSAGE:customer")||String(x.note||"").startsWith("HOUSING_APPOINTMENT_REMINDER:"))&&!dismissed.has(x.id));if(next)setItem(next)}catch{}},[orgId,locale,item]);
 useEffect(()=>{void poll();const timer=setInterval(()=>void poll(),6000);return()=>clearInterval(timer)},[poll]);
 function close(){if(!item)return;try{const x=JSON.parse(localStorage.getItem("zhaoxi-partner-housing-alerts")||"[]") as string[];localStorage.setItem("zhaoxi-partner-housing-alerts",JSON.stringify(Array.from(new Set([...x,item.id])).slice(-200)))}catch{}setItem(null)}
 if(!item)return null;const message=String(item.note||"").startsWith("HOUSING_MESSAGE:")?t.message:t.reminder;
 return <div className="zx-customer-alert zx-bottom-alert"><button aria-label={t.close} onClick={close}>×</button><div>🏠</div><b>{item.customerName||item.requestCode}</b><p>{message}</p><button onClick={()=>{close();window.location.href="/"}}>{t.open}</button></div>
}
