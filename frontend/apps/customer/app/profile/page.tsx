"use client";

import Link from "next/link";
import {useEffect,useMemo,useState,type ReactNode} from "react";
import {IdentityUpgradeSheet,updateSession,useZhaoXiSession} from "@zhaoxi/auth";
import {useZhaoXiLocale,type ZhaoXiLocale} from "@zhaoxi/i18n";
import {CustomerShell} from "../_components/CustomerShell";
import LocationPicker from "../_components/LocationPicker";
import styles from "../hub.module.css";

type Address={id:string;label:string;recipientName?:string|null;recipientPhone?:string|null;addressText:string;latitude?:number|null;longitude?:number|null;isDefault:boolean};
type ProfileData={
 identity:{userId:string;zhaoxiId:string;isGuest:boolean;profileCompletedAt?:string|null;preferredLocale:ZhaoXiLocale;createdAt:string};
 user:{displayName:string;phone:string;email:string;avatarUrl:string};
 profile:{nationality:string;gender:string;birthday:string;cityName:string;addressText:string;latitude:number|null;longitude:number|null;whatsapp:string;wechatContactId:string;notes:string};
 addresses:Address[];
};

const copy={
"zh-CN":{
 fallback:"赵喜用户",member:"赵喜会员",guest:"临时访客",persistent:"已保存账户",identity:"赵喜 ID",profile:"个人资料",edit:"编辑",save:"保存资料",saving:"正在保存…",cancel:"取消",saved:"资料已保存",name:"姓名",phone:"手机号码",email:"邮箱",nationality:"国籍",gender:"性别",birthday:"生日",city:"城市",address:"常用地址",whatsapp:"WhatsApp",wechat:"微信 ID",notes:"备注",optional:"选填",male:"男",female:"女",other:"其他",unset:"未设置",
 completion:"资料完整度",addressBook:"常用地址",addAddress:"添加地址",default:"默认",setDefault:"设为默认",delete:"删除",label:"地址名称",recipient:"收件人",recipientPhone:"联系电话",saveAddress:"保存地址",noAddress:"尚未保存地址",home:"家",work:"工作",
 orders:"我的订单",favorites:"我的收藏",history:"浏览记录",coupons:"优惠券",notifications:"消息中心",language:"语言设置",security:"设备与登录",emergency:"紧急帮助",personal:"个人中心",accountHint:"保存资料后，此设备下次打开赵喜会识别同一账户。",guestHint:"当前为临时访客。验证手机号码后，将成为长期赵喜账户。"
},
"zh-TW":{
 fallback:"趙喜用戶",member:"趙喜會員",guest:"臨時訪客",persistent:"已儲存帳戶",identity:"趙喜 ID",profile:"個人資料",edit:"編輯",save:"儲存資料",saving:"正在儲存…",cancel:"取消",saved:"資料已儲存",name:"姓名",phone:"手機號碼",email:"Email",nationality:"國籍",gender:"性別",birthday:"生日",city:"城市",address:"常用地址",whatsapp:"WhatsApp",wechat:"微信 ID",notes:"備註",optional:"選填",male:"男",female:"女",other:"其他",unset:"未設定",
 completion:"資料完整度",addressBook:"常用地址",addAddress:"新增地址",default:"預設",setDefault:"設為預設",delete:"刪除",label:"地址名稱",recipient:"收件人",recipientPhone:"聯絡電話",saveAddress:"儲存地址",noAddress:"尚未儲存地址",home:"家",work:"工作",
 orders:"我的訂單",favorites:"我的收藏",history:"瀏覽記錄",coupons:"優惠券",notifications:"訊息中心",language:"語言設定",security:"裝置與登入",emergency:"緊急協助",personal:"個人中心",accountHint:"儲存資料後，此裝置下次開啟趙喜會識別同一帳戶。",guestHint:"目前為臨時訪客。驗證手機號碼後，將成為長期趙喜帳戶。"
},
"vi-VN":{
 fallback:"Người dùng ZhaoXi",member:"Thành viên ZhaoXi",guest:"Khách tạm thời",persistent:"Tài khoản đã lưu",identity:"ID ZhaoXi",profile:"Thông tin cá nhân",edit:"Chỉnh sửa",save:"Lưu thông tin",saving:"Đang lưu…",cancel:"Hủy",saved:"Đã lưu thông tin",name:"Họ và tên",phone:"Số điện thoại",email:"Email",nationality:"Quốc tịch",gender:"Giới tính",birthday:"Ngày sinh",city:"Thành phố",address:"Địa chỉ thường dùng",whatsapp:"WhatsApp",wechat:"WeChat ID",notes:"Ghi chú",optional:"Không bắt buộc",male:"Nam",female:"Nữ",other:"Khác",unset:"Chưa thiết lập",
 completion:"Mức độ hoàn thiện",addressBook:"Địa chỉ đã lưu",addAddress:"Thêm địa chỉ",default:"Mặc định",setDefault:"Đặt mặc định",delete:"Xóa",label:"Tên địa chỉ",recipient:"Người nhận",recipientPhone:"Số điện thoại",saveAddress:"Lưu địa chỉ",noAddress:"Chưa có địa chỉ đã lưu",home:"Nhà",work:"Công việc",
 orders:"Đơn của tôi",favorites:"Yêu thích",history:"Lịch sử xem",coupons:"Mã ưu đãi",notifications:"Trung tâm thông báo",language:"Ngôn ngữ",security:"Thiết bị & đăng nhập",emergency:"Hỗ trợ khẩn cấp",personal:"Cá nhân",accountHint:"Sau khi lưu hồ sơ, thiết bị này sẽ nhận lại đúng tài khoản ZhaoXi ở lần mở sau.",guestHint:"Bạn đang dùng tài khoản Guest. Hãy xác minh số điện thoại để chuyển thành tài khoản ZhaoXi lâu dài."
},
"en-US":{
 fallback:"ZhaoXi user",member:"ZhaoXi member",guest:"Temporary guest",persistent:"Saved account",identity:"ZhaoXi ID",profile:"Personal information",edit:"Edit",save:"Save profile",saving:"Saving…",cancel:"Cancel",saved:"Profile saved",name:"Full name",phone:"Phone",email:"Email",nationality:"Nationality",gender:"Gender",birthday:"Birthday",city:"City",address:"Usual address",whatsapp:"WhatsApp",wechat:"WeChat ID",notes:"Notes",optional:"Optional",male:"Male",female:"Female",other:"Other",unset:"Not set",
 completion:"Profile completion",addressBook:"Saved addresses",addAddress:"Add address",default:"Default",setDefault:"Set default",delete:"Delete",label:"Address label",recipient:"Recipient",recipientPhone:"Phone",saveAddress:"Save address",noAddress:"No saved addresses",home:"Home",work:"Work",
 orders:"My orders",favorites:"Favorites",history:"Browsing history",coupons:"Coupons",notifications:"Notification center",language:"Language",security:"Devices & sign-in",emergency:"Emergency help",personal:"Personal",accountHint:"After saving your profile, this device will recognize the same ZhaoXi account next time.",guestHint:"You are using a Guest identity. Verify your phone number to make it a persistent ZhaoXi account."
}} as const;

import { getCached, setCached } from "../_lib/client-cache";

const PROFILE_CACHE_KEY = "customer_profile_data";

const emptyProfile:ProfileData={identity:{userId:"",zhaoxiId:"",isGuest:true,preferredLocale:"zh-CN",createdAt:""},user:{displayName:"",phone:"",email:"",avatarUrl:""},profile:{nationality:"",gender:"",birthday:"",cityName:"",addressText:"",latitude:null,longitude:null,whatsapp:"",wechatContactId:"",notes:""},addresses:[]};

export default function Profile(){
 const{locale}=useZhaoXiLocale();const session=useZhaoXiSession();const t=copy[locale];

 const initialData = useMemo<ProfileData>(() => {
   const cached = getCached<ProfileData>(PROFILE_CACHE_KEY);
   if (cached) return cached;
   return {
     identity: {
       userId: session?.userId || "",
       zhaoxiId: session?.userId ? `ZX-${session.userId.replaceAll("-","").slice(0,10).toUpperCase()}` : "",
       isGuest: session ? session.authMethod === "guest" : true,
       preferredLocale: locale,
       createdAt: ""
     },
     user: {
       displayName: session?.displayName || "",
       phone: session?.phone || "",
       email: "",
       avatarUrl: session?.avatarUrl || ""
     },
     profile: {
       nationality: "", gender: "", birthday: "", cityName: "Da Nang", addressText: "",
       latitude: null, longitude: null, whatsapp: "", wechatContactId: "", notes: ""
     },
     addresses: []
   };
 }, [session]);

 const[data,setData]=useState<ProfileData>(initialData);const[editing,setEditing]=useState(false);const[saving,setSaving]=useState(false);const[msg,setMsg]=useState("");const[showAddress,setShowAddress]=useState(false);const[addressBusy,setAddressBusy]=useState(false);const[phoneLoginOpen,setPhoneLoginOpen]=useState(false);
 const[form,setForm]=useState(() => {
   const d = initialData;
   return {
     displayName: d.user.displayName || session?.displayName || "",
     phone: d.user.phone || session?.phone || "",
     email: d.user.email || "",
     nationality: d.profile.nationality || "",
     gender: d.profile.gender || "",
     birthday: d.profile.birthday || "",
     cityName: d.profile.cityName || "Da Nang",
     addressText: d.profile.addressText || "",
     whatsapp: d.profile.whatsapp || "",
     wechatContactId: d.profile.wechatContactId || "",
     notes: d.profile.notes || ""
   };
 });
 const[addressForm,setAddressForm]=useState({label:"",recipientName:"",recipientPhone:"",addressText:"",isDefault:true});const[addressPoint,setAddressPoint]=useState<{latitude:number;longitude:number}|null>(null);

 useEffect(() => {
   if (!data.user.displayName && session?.displayName) {
     setData(prev => ({
       ...prev,
       user: {
         ...prev.user,
         displayName: session.displayName || prev.user.displayName,
         phone: session.phone || prev.user.phone,
         avatarUrl: session.avatarUrl || prev.user.avatarUrl
       }
     }));
   }
 }, [session, data.user.displayName]);

 async function load(){
  try{
   const r=await fetch("/api/customer-profile",{cache:"no-store"});
   const j=await r.json();
   if(j?.ok&&j.data){
    setData(j.data);
    setCached(PROFILE_CACHE_KEY, j.data);
    const d=j.data;
    setForm(prev => ({
      ...prev,
      displayName: d.user.displayName || prev.displayName || "",
      phone: d.user.phone || prev.phone || "",
      email: d.user.email || prev.email || "",
      nationality: d.profile.nationality || prev.nationality || "",
      gender: d.profile.gender || prev.gender || "",
      birthday: d.profile.birthday || prev.birthday || "",
      cityName: d.profile.cityName || prev.cityName || "Da Nang",
      addressText: d.profile.addressText || prev.addressText || "",
      whatsapp: d.profile.whatsapp || prev.whatsapp || "",
      wechatContactId: d.profile.wechatContactId || prev.wechatContactId || "",
      notes: d.profile.notes || prev.notes || ""
    }));
    const def=d.addresses?.find((x:Address)=>x.isDefault);
    setAddressForm(v=>({...v,recipientName:d.user.displayName||v.recipientName||"",recipientPhone:d.user.phone||v.recipientPhone||"",addressText:def?.addressText||d.profile.addressText||v.addressText||""}));
   }
  }catch{}
 }
 useEffect(()=>{void load()},[]);

 const completion=useMemo(()=>{const fields=[form.displayName,form.phone,form.nationality,form.cityName,form.addressText];return Math.round(fields.filter(Boolean).length/fields.length*100)},[form]);
 const currentName=data.user.displayName||session?.displayName||"";
 const displayName=currentName||t.fallback;
 const hasDefaultName = !currentName || currentName === "ZhaoXi Guest" || currentName === "Người dùng ZhaoXi" || currentName.includes("Guest");

 const menu=[
  ["📦",t.orders,"/orders"],["☆",t.favorites,"/favorites"],["◷",t.history,"/history"],["🎟️",t.coupons,"/coupons"],
  ["◌",t.notifications,"/messages"],["文",t.language,"/language"],["🛡️",t.security,"/profile/security"],["🆘",t.emergency,"/khan-cap"]
 ] as const;

 async function save(){
  setSaving(true);setMsg("");
  try{
   const phone=form.phone.trim();const r=await fetch("/api/customer-profile",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({...form,phone,preferredLocale:locale})});
   const j=await r.json();if(!r.ok||!j?.ok)throw new Error(j?.error?.code||"SAVE_FAILED");
   setData(j.data);setCached(PROFILE_CACHE_KEY, j.data);updateSession({displayName:j.data.user.displayName||form.displayName,phone:j.data.user.phone||form.phone,avatarUrl:j.data.user.avatarUrl||undefined});setEditing(false);setMsg(t.saved);window.setTimeout(()=>setMsg(""),2200);
  }catch(e){setMsg(e instanceof Error?e.message:"SAVE_FAILED")}finally{setSaving(false)}
 }
 async function addAddress(){
  if(!addressForm.addressText.trim())return;setAddressBusy(true);
  try{const r=await fetch("/api/customer-addresses",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...addressForm,label:addressForm.label||t.home,latitude:addressPoint?.latitude,longitude:addressPoint?.longitude})});const j=await r.json();if(!r.ok||!j?.ok)throw new Error();setShowAddress(false);setAddressForm(v=>({...v,label:"",addressText:""}));setAddressPoint(null);await load()}finally{setAddressBusy(false)}
 }
 async function setDefault(id:string){await fetch(`/api/customer-addresses/${id}`,{method:"PATCH"});await load()}
 async function removeAddress(id:string){await fetch(`/api/customer-addresses/${id}`,{method:"DELETE"});await load()}

 return <><IdentityUpgradeSheet role="customer" open={phoneLoginOpen} onClose={()=>setPhoneLoginOpen(false)} onVerified={()=>{setPhoneLoginOpen(false);void load();}}/><CustomerShell className={styles.customerShell} bare>
  <section style={{margin:"12px 14px 0",padding:"20px 18px",borderRadius:24,background:"linear-gradient(135deg,#08a855,#07c160 58%,#43d28a)",color:"#fff",boxShadow:"0 15px 38px rgba(7,193,96,.18)"}}>
   <div style={{display:"grid",gridTemplateColumns:"62px 1fr auto",gap:12,alignItems:"center"}}>
    <div style={{width:62,height:62,borderRadius:20,background:"rgba(255,255,255,.95)",color:"#078343",display:"grid",placeItems:"center",fontSize:26,fontWeight:950,overflow:"hidden",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>{data.user.avatarUrl?<img src={data.user.avatarUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:displayName.slice(0,1).toUpperCase()}</div>
    <div style={{minWidth:0}}>
     <small style={{opacity:.88,display:"block"}}>{data.identity.isGuest?t.guest:t.persistent}</small>
     <h1 style={{fontSize:21,margin:"2px 0 4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:800}}>{displayName}</h1>
     <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <span style={{fontSize:11,opacity:.92}}>{t.identity}: {data.identity.zhaoxiId||"—"}</span>
      {hasDefaultName && (
       <button type="button" onClick={()=>setEditing(true)} style={{border:0,borderRadius:999,padding:"3px 10px",background:"#FFF",color:"#078343",fontWeight:800,fontSize:11,cursor:"pointer",boxShadow:"none"}}>
        ✏️ {locale==="vi-VN"?"Đặt tên ngay":locale.startsWith("zh")?"设置姓名":"Set name"}
       </button>
      )}
     </div>
    </div>
    <button onClick={()=>setEditing(v=>!v)} style={{border:0,borderRadius:12,padding:"9px 12px",background:"rgba(255,255,255,.24)",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",boxShadow:"none"}}>{editing?t.cancel:t.edit}</button>
   </div>
   <div style={{marginTop:14}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:5}}><span>{t.completion}</span><b>{completion}%</b></div><div style={{height:7,borderRadius:99,background:"rgba(255,255,255,.23)",overflow:"hidden"}}><i style={{display:"block",height:"100%",width:`${completion}%`,background:"#fff",borderRadius:99,transition:"width .35s ease"}}/></div></div>
  </section>

  <div style={{maxWidth:720,margin:"12px auto 0",padding:"0 14px calc(140px + env(safe-area-inset-bottom))",display:"grid",gap:12}}>
   {hasDefaultName && !editing && (
    <section style={{padding:"14px 16px",borderRadius:18,background:"linear-gradient(135deg,#FFFBEB,#FEF3C7)",border:"1px solid #FDE68A",color:"#92400E",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,boxShadow:"none"}}>
     <div>
      <b style={{fontSize:13.5,display:"block",color:"#78350F"}}>👋 {locale==="vi-VN"?"Bạn chưa đặt tên hiển thị":locale.startsWith("zh")?"您尚未设置姓名":"Set your name"}</b>
      <small style={{fontSize:11,color:"#92400E",marginTop:2,display:"block"}}>{locale==="vi-VN"?"Đặt tên ngay để tài xế và đối tác tiện xưng hô khi phục vụ bạn.":locale.startsWith("zh")?"请设置姓名以便商家与配送员称呼您。":"Set your name so partners and drivers can address you."}</small>
     </div>
     <button type="button" onClick={()=>setEditing(true)} style={{border:0,borderRadius:999,padding:"8px 14px",background:"#D97706",color:"#FFFFFF",fontWeight:800,fontSize:11.5,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"none"}}>
      {locale==="vi-VN"?"Đặt tên ngay":locale.startsWith("zh")?"去设置":"Set now"}
     </button>
    </section>
   )}

   <section style={{padding:"13px 15px",borderRadius:18,background:data.identity.isGuest?"#fff7ed":"#ecfdf5",color:data.identity.isGuest?"#9a5b13":"#067647",fontSize:11.5,lineHeight:1.55,border:data.identity.isGuest?"1px solid #fed7aa":"1px solid #d1fae5",boxShadow:"none"}}>
    <div>{data.identity.isGuest?t.guestHint:t.accountHint}</div>
    {data.identity.isGuest&&<button type="button" onClick={()=>setPhoneLoginOpen(true)} style={{marginTop:9,border:0,borderRadius:999,padding:"8px 14px",background:"#078343",color:"#fff",fontWeight:850,fontSize:11.5,cursor:"pointer",boxShadow:"none"}}>Xác minh số điện thoại</button>}
   </section>

   <section className={styles.listing} style={{display:"grid",gap:12,borderRadius:20,border:"1px solid #EEF2F6",background:"#FFFFFF",boxShadow:"none"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><b>{t.profile}</b>{msg&&<small style={{color:"#078343",fontWeight:750}}>{msg}</small>}</div>
    {editing?<div style={{display:"grid",gap:9}}>
      <Field label={t.name}><input value={form.displayName} placeholder={locale==="vi-VN"?"Nhập họ và tên của bạn":""} onChange={e=>setForm({...form,displayName:e.target.value})}/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Field label={t.phone}><input value={form.phone} inputMode="tel" autoComplete="tel" placeholder={locale==="vi-VN"?"Ví dụ: 090 123 4567":"Phone number"} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label={t.email}><input value={form.email} inputMode="email" onChange={e=>setForm({...form,email:e.target.value})}/></Field></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Field label={t.nationality}><input value={form.nationality} onChange={e=>setForm({...form,nationality:e.target.value})}/></Field><Field label={t.gender}><select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">{t.unset}</option><option value="male">{t.male}</option><option value="female">{t.female}</option><option value="other">{t.other}</option></select></Field></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Field label={t.birthday}><input type="date" value={form.birthday} onChange={e=>setForm({...form,birthday:e.target.value})}/></Field><Field label={t.city}><input value={form.cityName} onChange={e=>setForm({...form,cityName:e.target.value})}/></Field></div>
      <Field label={t.address}><input value={form.addressText} onChange={e=>setForm({...form,addressText:e.target.value})}/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Field label={t.whatsapp}><input value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})}/></Field><Field label={t.wechat}><input value={form.wechatContactId} onChange={e=>setForm({...form,wechatContactId:e.target.value})}/></Field></div>
      <Field label={`${t.notes} (${t.optional})`}><textarea value={form.notes} rows={3} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      <button disabled={saving} onClick={()=>void save()} style={{border:0,borderRadius:13,padding:"12px 14px",background:"#07c160",color:"#fff",fontWeight:850,cursor:"pointer",boxShadow:"none"}}>{saving?t.saving:t.save}</button>
    </div>:<div style={{display:"grid",gap:8,fontSize:12}}>
      <Info label={t.phone} value={data.user.phone}/><Info label={t.nationality} value={data.profile.nationality}/><Info label={t.city} value={data.profile.cityName}/><Info label={t.address} value={data.profile.addressText}/><Info label={t.whatsapp} value={data.profile.whatsapp}/><Info label={t.wechat} value={data.profile.wechatContactId}/>
    </div>}
   </section>

   <section className={styles.listing} style={{display:"grid",gap:10,borderRadius:20,border:"1px solid #EEF2F6",background:"#FFFFFF",boxShadow:"none"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><b>{t.addressBook}</b><button onClick={()=>setShowAddress(v=>!v)} style={{border:0,borderRadius:999,padding:"7px 13px",background:"#ecfdf5",color:"#078343",fontWeight:800,fontSize:11,cursor:"pointer",boxShadow:"none"}}>{t.addAddress}</button></div>
    {showAddress&&<div style={{display:"grid",gap:8,padding:"10px",borderRadius:14,background:"#f8faf9"}}>
      <Field label={t.label}><input value={addressForm.label} placeholder={t.home} onChange={e=>setAddressForm({...addressForm,label:e.target.value})}/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Field label={t.recipient}><input value={addressForm.recipientName} onChange={e=>setAddressForm({...addressForm,recipientName:e.target.value})}/></Field><Field label={t.recipientPhone}><input value={addressForm.recipientPhone} inputMode="tel" onChange={e=>setAddressForm({...addressForm,recipientPhone:e.target.value})}/></Field></div>
      <Field label={t.address}><input value={addressForm.addressText} onChange={e=>setAddressForm({...addressForm,addressText:e.target.value})}/></Field>
      <LocationPicker locale={locale} address={addressForm.addressText} point={addressPoint} onAddress={value=>setAddressForm(v=>({...v,addressText:value}))} onPoint={setAddressPoint}/>
      <label style={{display:"flex",alignItems:"center",gap:7,fontSize:11}}><input type="checkbox" checked={addressForm.isDefault} onChange={e=>setAddressForm({...addressForm,isDefault:e.target.checked})}/>{t.default}</label>
      <button disabled={addressBusy} onClick={()=>void addAddress()} style={{border:0,borderRadius:12,padding:"10px",background:"#07c160",color:"#fff",fontWeight:800,cursor:"pointer",boxShadow:"none"}}>{t.saveAddress}</button>
    </div>}
    {!data.addresses.length?<small style={{color:"#64748b"}}>{t.noAddress}</small>:data.addresses.map(a=><article key={a.id} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:9,padding:"10px 0",borderTop:"1px solid #edf2ef"}}>
      <div><div style={{display:"flex",alignItems:"center",gap:6}}><b style={{fontSize:12}}>{a.label}</b>{a.isDefault&&<span style={{padding:"3px 7px",borderRadius:999,background:"#ecfdf5",color:"#078343",fontSize:8,fontWeight:850}}>{t.default}</span>}</div><small style={{display:"block",color:"#64748b",marginTop:4,lineHeight:1.45}}>{a.addressText}</small></div>
      <div style={{display:"flex",gap:4,alignItems:"center"}}>{!a.isDefault&&<button onClick={()=>void setDefault(a.id)} style={{...mini,boxShadow:"none",cursor:"pointer"}}>{t.setDefault}</button>}<button onClick={()=>void removeAddress(a.id)} style={{...mini,color:"#dc2626",background:"#fff1f2",boxShadow:"none",cursor:"pointer"}}>{t.delete}</button></div>
    </article>)}
   </section>

   <section style={{display:"grid",gap:8}}>
    <h2 style={{fontSize:16,fontWeight:750,margin:"4px 2px",color:"#1E293B"}}>{t.personal}</h2>
    <div style={{display:"grid",gap:8}}>
      {menu.map(([icon,title,href])=>(
        <Link key={href} href={href} style={{display:"grid",gridTemplateColumns:"34px 1fr 18px",alignItems:"center",textDecoration:"none",color:"#1E293B",background:"#FFFFFF",border:"1px solid #EEF2F6",borderRadius:18,padding:"14px 16px",boxShadow:"none",transition:"transform .12s ease"}}>
          <span style={{fontSize:18}}>{icon}</span>
          <b style={{fontSize:14,fontWeight:650}}>{title}</b>
          <span style={{color:"#94A3B8",fontSize:18}}>›</span>
        </Link>
      ))}
    </div>
   </section>
  </div>
 </CustomerShell></>
}

function Field({label,children}:{label:string;children:ReactNode}) {
  return (
    <label className={styles.profileField}>
      <span>{label}</span>
      <div className={styles.profileFieldControl}>{children}</div>
    </label>
  );
}
function Info({label,value}:{label:string;value?:string|null}){return <div style={{display:"grid",gridTemplateColumns:"105px 1fr",gap:8}}><span style={{color:"#64748b"}}>{label}</span><b style={{fontWeight:750,overflowWrap:"anywhere"}}>{value||"—"}</b></div>}
const mini={border:0,borderRadius:9,padding:"6px 7px",background:"#f1f5f9",color:"#475569",fontSize:8,fontWeight:800};
