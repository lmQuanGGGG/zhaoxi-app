"use client";
import {useEffect,useState} from "react";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import {readSessionPoint,subscribeSessionPoint,writeSessionPoint,type SessionPoint} from "../_lib/customer-location";
import styles from "../hub.module.css";
import {CustomerIcon} from "./CustomerIcon";

type Context={source:"current"|"default_address"|"profile"|"none";point:SessionPoint|null;addressText:string;label:string};
const copy={
"zh-CN":{title:"当前位置",current:"当前位置",saved:"默认地址",profile:"常用位置",none:"未设置位置",useCurrent:"使用当前位置",using:"定位中…",savedHint:"将优先显示附近服务",clear:"使用已保存地址",error:"无法获取位置，请检查浏览器定位权限。"},
"zh-TW":{title:"目前位置",current:"目前位置",saved:"預設地址",profile:"常用位置",none:"尚未設定位置",useCurrent:"使用目前位置",using:"定位中…",savedHint:"將優先顯示附近服務",clear:"使用已儲存地址",error:"無法取得位置，請檢查瀏覽器定位權限。"},
"vi-VN":{title:"Vị trí hiện tại",current:"Vị trí hiện tại",saved:"Địa chỉ mặc định",profile:"Vị trí thường dùng",none:"Chưa thiết lập vị trí",useCurrent:"Dùng vị trí hiện tại",using:"Đang định vị…",savedHint:"ZhaoXi sẽ ưu tiên dịch vụ gần bạn",clear:"Dùng địa chỉ đã lưu",error:"Không lấy được vị trí. Hãy kiểm tra quyền định vị của trình duyệt."},
"en-US":{title:"Current location",current:"Current location",saved:"Default address",profile:"Usual location",none:"No location set",useCurrent:"Use current location",using:"Locating…",savedHint:"ZhaoXi will prioritize nearby services",clear:"Use saved address",error:"Unable to get your location. Check browser location permission."}} as const;

export default function CustomerLocationBar({compact=false,inline=false}:{compact?:boolean;inline?:boolean}){
 const{locale}=useZhaoXiLocale();const t=copy[locale];const[point,setPoint]=useState<SessionPoint|null>(null);const[context,setContext]=useState<Context|null>(null);const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function load(next?:SessionPoint|null){const p=next===undefined?readSessionPoint():next;setPoint(p);const qs=p?`?lat=${p.latitude}&lng=${p.longitude}`:"";try{const r=await fetch(`/api/customer-location-context${qs}`,{cache:"no-store"});const j=await r.json();if(j?.ok)setContext(j.data)}catch{}}
 useEffect(()=>{const initial=readSessionPoint();void load(initial);if(!initial)locate();return subscribeSessionPoint(p=>void load(p))},[]);
 function locate(){if(busy)return;setBusy(true);setError("");if(!navigator.geolocation){setBusy(false);setError(t.error);return}navigator.geolocation.getCurrentPosition(pos=>{const next={latitude:Number(pos.coords.latitude.toFixed(7)),longitude:Number(pos.coords.longitude.toFixed(7))};writeSessionPoint(next);setBusy(false)},()=>{setBusy(false);setError(t.error)},{enableHighAccuracy:true,timeout:12000,maximumAge:60000})}
 const source=point?"current":context?.source||"none";const label=source==="current"?t.current:source==="default_address"?t.saved:source==="profile"?t.profile:t.none;
 return <section className={`${styles.locationBar} ${compact?styles.locationBarCompact:""} ${inline?styles.locationBarInline:""}`} role="button" tabIndex={0} aria-label={t.useCurrent} onClick={locate} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();locate()}}}>
   <span className={styles.locationPin}><CustomerIcon name="location"/></span>
   <div><small>{label}</small><b>{busy?t.using:context?.addressText||t.savedHint}</b></div>
   {error&&<em>{error}</em>}
 </section>
}
