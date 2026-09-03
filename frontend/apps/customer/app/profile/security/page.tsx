"use client";
import {useEffect,useState} from "react";
import {listZhaoXiDevices,logoutAllZhaoXiSessions,revokeZhaoXiDevice,useZhaoXiSession,type ZhaoXiDeviceSession} from "@zhaoxi/auth";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import {CustomerPageHeader,CustomerShell} from "../../_components/CustomerShell";

const copy={
"zh-CN":{back:"个人中心",title:"设备与登录",hint:"管理当前赵喜账户的登录设备。",current:"当前设备",last:"最近活动",revoke:"退出设备",all:"退出所有设备",none:"暂无活动设备",confirm:"确定退出所有赵喜设备吗？",pin:"设置 6 位登录密码",pinHint:"新设备可使用手机号和此密码登录，无需短信验证码。",pinAgain:"再次输入密码",savePin:"保存密码",pinMismatch:"两次输入的密码不一致。",pinSaved:"登录密码已保存。"},
"zh-TW":{back:"個人中心",title:"裝置與登入",hint:"管理目前趙喜帳戶的登入裝置。",current:"目前裝置",last:"最近活動",revoke:"登出裝置",all:"登出所有裝置",none:"沒有活動裝置",confirm:"確定登出所有趙喜裝置嗎？",pin:"設定 6 位數登入密碼",pinHint:"新裝置可使用手機號碼和此密碼登入，無需再次發送簡訊。",pinAgain:"再次輸入密碼",savePin:"儲存密碼",pinMismatch:"兩次輸入的密碼不一致。",pinSaved:"登入密碼已儲存。"},
"vi-VN":{back:"Cá nhân",title:"Thiết bị & đăng nhập",hint:"Quản lý các thiết bị đang đăng nhập tài khoản ZhaoXi.",current:"Thiết bị hiện tại",last:"Hoạt động gần nhất",revoke:"Đăng xuất thiết bị",all:"Đăng xuất tất cả",none:"Không có thiết bị đang hoạt động",confirm:"Đăng xuất toàn bộ thiết bị ZhaoXi?",pin:"Tạo / đổi PIN 6 số",pinHint:"Máy mới đăng nhập bằng số điện thoại và PIN, không cần gửi SMS lại.",pinAgain:"Nhập lại PIN",savePin:"Lưu PIN",pinMismatch:"Hai mã PIN chưa khớp.",pinSaved:"Đã lưu PIN đăng nhập."},
"en-US":{back:"Personal",title:"Devices & sign-in",hint:"Manage devices signed into your ZhaoXi account.",current:"Current device",last:"Last active",revoke:"Sign out device",all:"Sign out all",none:"No active devices",confirm:"Sign out all ZhaoXi devices?",pin:"Create / change 6-digit PIN",pinHint:"Sign in on a new device with your phone number and PIN, without another SMS.",pinAgain:"Confirm PIN",savePin:"Save PIN",pinMismatch:"PINs do not match.",pinSaved:"Sign-in PIN saved."}} as const;

export default function Security(){
 const{locale}=useZhaoXiLocale();const session=useZhaoXiSession();const t=copy[locale];const[devices,setDevices]=useState<ZhaoXiDeviceSession[]>([]);const[busy,setBusy]=useState("");const[pin,setPin]=useState("");const[pinAgain,setPinAgain]=useState("");const[pinMessage,setPinMessage]=useState("");
 async function load(){try{setDevices(await listZhaoXiDevices())}catch{setDevices([])}}
 useEffect(()=>{void load()},[]);
 async function revoke(id:string){setBusy(id);try{const r=await revokeZhaoXiDevice(id);if(r.currentSessionRevoked||session?.sessionId===id){location.replace("/");return}await load()}finally{setBusy("")}}
 async function logoutAll(){if(!confirm(t.confirm))return;setBusy("all");try{await logoutAllZhaoXiSessions();location.replace("/")}finally{setBusy("")}}
 async function savePin(){if(pin.length!==6||pin!==pinAgain){setPinMessage(t.pinMismatch);return}setBusy("pin");setPinMessage("");try{const r=await fetch("/api/auth/unified/identity/pin/set",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({pin})});const j=await r.json();if(!r.ok||!j?.ok)throw new Error();setPin("");setPinAgain("");setPinMessage(t.pinSaved)}catch{setPinMessage(t.pinMismatch)}finally{setBusy("")}}
 return <CustomerShell>
  <CustomerPageHeader title={t.title} subtitle={t.hint} backHref="/profile"/>
  <section style={{...card,display:"grid",gap:9,marginBottom:10}}><b style={{fontSize:13}}>{t.pin}</b><small style={{color:"#64748b",lineHeight:1.45}}>{t.pinHint}</small><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><input value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" type="password" placeholder="••••••" style={inputStyle}/><input value={pinAgain} onChange={e=>setPinAgain(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" type="password" placeholder={t.pinAgain} style={inputStyle}/></div>{pinMessage&&<small style={{color:pinMessage===t.pinSaved?"#078343":"#be123c",fontWeight:700}}>{pinMessage}</small>}<button disabled={busy==="pin"||pin.length!==6||pinAgain.length!==6} onClick={()=>void savePin()} style={{border:0,borderRadius:11,padding:"10px",background:"#078343",color:"#fff",fontWeight:850}}>{busy==="pin"?"…":t.savePin}</button></section>
  <button disabled={!!busy} onClick={()=>void logoutAll()} style={{width:"100%",border:0,borderRadius:14,padding:"11px",background:"#fff1f2",color:"#be123c",fontWeight:850,marginBottom:10}}>{t.all}</button>
  <section style={{display:"grid",gap:9}}>
   {!devices.length?<div style={card}>{t.none}</div>:devices.map(d=><article key={d.sessionId} style={card}>
    <div style={{display:"grid",gridTemplateColumns:"42px 1fr auto",gap:9,alignItems:"center"}}>
      <div style={{width:40,height:40,borderRadius:13,display:"grid",placeItems:"center",background:"#ecfdf5",fontSize:19}}>📱</div>
      <div><b style={{display:"block",fontSize:12}}>{d.deviceName||d.deviceId||d.role}</b>{d.isCurrent&&<small style={{display:"block",color:"#078343",fontWeight:800,marginTop:3}}>{t.current}</small>}<small style={{display:"block",color:"#64748b",marginTop:3}}>{t.last}: {new Date(d.lastSeenAt).toLocaleString(locale)}</small></div>
      <button disabled={!!busy} onClick={()=>void revoke(d.sessionId)} style={{border:0,borderRadius:10,padding:"7px 8px",background:d.isCurrent?"#fff7ed":"#f1f5f9",color:d.isCurrent?"#c2410c":"#475569",fontSize:9,fontWeight:800}}>{busy===d.sessionId?"…":t.revoke}</button>
    </div>
   </article>)}
  </section>
 </CustomerShell>
}
const card={padding:12,borderRadius:17,background:"rgba(255,255,255,.78)",border:"1px solid rgba(255,255,255,.94)",boxShadow:"0 8px 24px rgba(15,23,42,.05)"};
const inputStyle={width:"100%",boxSizing:"border-box" as const,padding:10,borderRadius:11,border:"1px solid #dbe4ed",background:"#fff"};
