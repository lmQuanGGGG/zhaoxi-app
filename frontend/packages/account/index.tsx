"use client";
import {useEffect,useState} from "react";
import {
  listZhaoXiDevices,
  WeChatLoginPanel,
  logoutAllZhaoXiSessions,
  revokeZhaoXiDevice,
  updateSession,
  useZhaoXiSession,
  type ZhaoXiDeviceSession,
} from "@zhaoxi/auth";
import {useZhaoXiLocale} from "@zhaoxi/i18n";

type Role="customer"|"partner"|"driver"|"admin";
type Account={
  user:{displayName:string;phone?:string|null;email?:string|null;wechatOpenId?:string|null;isGuest?:boolean;profileCompletedAt?:string|null};
  roles:Role[];
  organizations:Array<{id:string;name:string;memberRole:string}>;
  driver?:{status:string;vehicleType:string;plateNumber?:string|null}|null;
  betaAccess:Array<{role:string;status:string}>;
};
const copy={
  "vi-VN":{title:"Tài khoản ZhaoXi",save:"Lưu hồ sơ",name:"Họ và tên",phone:"Số điện thoại",email:"Email",roles:"Vai trò của tôi",switchRole:"Chuyển sang",linked:"Liên kết tài khoản",wechat:"WeChat",saved:"Đã lưu hồ sơ và ghi nhớ tài khoản trên thiết bị quét",switching:"Đang chuyển…",security:"Thiết bị & phiên đăng nhập",current:"Thiết bị hiện tại",revoke:"Đăng xuất thiết bị",logoutAll:"Đăng xuất tất cả",noDevices:"Không có phiên hoạt động",lastSeen:"Hoạt động",confirmAll:"Đăng xuất toàn bộ phiên ZhaoXi?",upgradeWechat:"Liên kết và đăng nhập bằng WeChat",customer:"Khách hàng",partner:"Đối tác",driver:"Tài xế",admin:"Quản trị",activeStore:"Đang chọn",selectStore:"Chọn quán này"},
  "zh-CN":{title:"赵喜账户",save:"保存资料",name:"姓名",phone:"手机号码",email:"邮箱",roles:"我的角色",switchRole:"切换到",linked:"账户关联",wechat:"微信",saved:"资料已保存，此扫码设备将记住此账户",switching:"正在切换…",security:"设备与登录会话",current:"当前设备",revoke:"退出此设备",logoutAll:"退出所有设备",noDevices:"暂无活动会话",lastSeen:"最近活动",confirmAll:"退出所有赵喜登录会话？",upgradeWechat:"关联并使用微信登录",customer:"客户",partner:"合作伙伴",driver:"配送员",admin:"管理端",activeStore:"当前店铺",selectStore:"选择此店"},
  "zh-TW":{title:"趙喜帳戶",save:"儲存資料",name:"姓名",phone:"手機號碼",email:"Email",roles:"我的角色",switchRole:"切換至",linked:"帳戶連結",wechat:"微信",saved:"資料已儲存，此掃碼裝置將記住此帳戶",switching:"正在切換…",security:"裝置與登入工作階段",current:"目前裝置",revoke:"登出此裝置",logoutAll:"登出所有裝置",noDevices:"沒有活動工作階段",lastSeen:"最近活動",confirmAll:"登出所有趙喜工作階段？",upgradeWechat:"連結並使用微信登入",customer:"客戶",partner:"合作夥伴",driver:"配送員",admin:"管理端",activeStore:"目前店鋪",selectStore:"選擇此店"},
  "en-US":{title:"ZhaoXi account",save:"Save profile",name:"Full name",phone:"Phone",email:"Email",roles:"My roles",switchRole:"Switch to",linked:"Account links",wechat:"WeChat",saved:"Profile saved; this scanner device will remember the account",switching:"Switching…",security:"Devices & sessions",current:"Current device",revoke:"Sign out device",logoutAll:"Sign out all",noDevices:"No active sessions",lastSeen:"Last active",confirmAll:"Sign out all ZhaoXi sessions?",upgradeWechat:"Link and sign in with WeChat",customer:"Customer",partner:"Partner",driver:"Driver",admin:"Admin",activeStore:"Active store",selectStore:"Select store"},
} as const;

export function AccountCenter(){
  const {locale}=useZhaoXiLocale();
  const session=useZhaoXiSession();
  const t=copy[locale];
  const [account,setAccount]=useState<Account|null>(null);
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [email,setEmail]=useState("");
  const [message,setMessage]=useState("");
  const [switching,setSwitching]=useState<Role|null>(null);
  const [devices,setDevices]=useState<ZhaoXiDeviceSession[]>([]);
  const [deviceBusy,setDeviceBusy]=useState<string|null>(null);

  const load=async()=>{
    try{
      const r=await fetch("/api/platform-account/me",{cache:"no-store"});
      const x=await r.json();
      const d=(x?.data||null) as Account|null;
      setAccount(d);
      if(d){setName(d.user.displayName||"");setPhone(d.user.phone||"");setEmail(d.user.email||"");}
    }catch{}
  };
  const loadDevices=async()=>{try{setDevices(await listZhaoXiDevices());}catch{setDevices([]);}};

  useEffect(()=>{void load();void loadDevices();},[]);

  async function save(){
    const r=await fetch("/api/platform-account/me",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({displayName:name,phone,email,preferredLocale:locale})});
    const x=await r.json();
    if(r.ok){setAccount(x.data);updateSession({displayName:name.trim(),phone:phone.trim()});setMessage(t.saved);window.setTimeout(()=>setMessage(""),1800);}
  }
  async function switchRole(role:Role){
    setSwitching(role);
    try{
      const r=await fetch("/api/platform-account/role-switch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({targetRole:role})});
      const x=await r.json();
      if(!r.ok||!x?.ok||!x?.data?.url)throw new Error(x?.error?.code||"ROLE_SWITCH_FAILED");
      window.location.assign(String(x.data.url));
    }catch(e){setMessage(e instanceof Error?e.message:"ROLE_SWITCH_FAILED");setSwitching(null);}
  }
  async function revokeDevice(sessionId:string){
    setDeviceBusy(sessionId);
    try{
      const result=await revokeZhaoXiDevice(sessionId);
      if(result.currentSessionRevoked||session?.sessionId===sessionId){window.location.replace("/");return;}
      await loadDevices();
    }catch(e){setMessage(e instanceof Error?e.message:"DEVICE_SESSION_REVOKE_FAILED");}
    finally{setDeviceBusy(null);}
  }
  async function logoutAll(){
    if(!window.confirm(t.confirmAll))return;
    setDeviceBusy("all");
    try{await logoutAllZhaoXiSessions();window.location.replace("/");}
    finally{setDeviceBusy(null);}
  }

  return <section style={{display:"grid",gap:14}}>
    <h1 style={{margin:0}}>{t.title}</h1>
    <div style={{display:"grid",gap:9,padding:16,border:"1px solid #e5e7eb",borderRadius:18,background:"#fff"}}>
      <label>{t.name}<input value={name} onChange={e=>setName(e.target.value)} style={{width:"100%",padding:11,border:"1px solid #dbe3dd",borderRadius:12}}/></label>
      <label>{t.phone}<input value={phone} onChange={e=>setPhone(e.target.value)} style={{width:"100%",padding:11,border:"1px solid #dbe3dd",borderRadius:12}}/></label>
      <label>{t.email}<input value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%",padding:11,border:"1px solid #dbe3dd",borderRadius:12}}/></label>
      <button type="button" onClick={()=>void save()} style={{padding:12,border:0,borderRadius:12,background:"#07c160",color:"white",fontWeight:800}}>{t.save}</button>
      {message&&<small>{message}</small>}
    </div>

    {account?.user.isGuest && session && (session.role==="customer"||session.role==="partner") && <div style={{padding:16,border:"1px solid #d7eee0",borderRadius:18,background:"#f0fdf4"}}><b>{t.upgradeWechat}</b><div style={{marginTop:12}}><WeChatLoginPanel role={session.role} locale={locale} onDone={()=>window.location.reload()}/></div></div>}

    {account&&<>
      <div style={{padding:16,border:"1px solid #e5e7eb",borderRadius:18,background:"#fff"}}>
        <b>{t.roles}</b>
        <div style={{display:"grid",gap:8,marginTop:10}}>
          {account.roles.map(role=><div key={role} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <span>{t[role]}{session?.role===role?" ✓":""}</span>
            {session?.role!==role&&<button type="button" disabled={switching!==null} onClick={()=>void switchRole(role)} style={{border:0,borderRadius:12,padding:"9px 12px",background:"#ecfdf5",color:"#078343",fontWeight:800}}>{switching===role?t.switching:`${t.switchRole} ${t[role]}`}</button>}
          </div>)}
        </div>
        {account.betaAccess.map(x=><small key={x.role} style={{display:"block",marginTop:5}}>{x.role}: {x.status}</small>)}
      </div>

      <div style={{padding:16,border:"1px solid #e5e7eb",borderRadius:18,background:"#fff"}}>
        <b>{t.linked}</b>
        <p>{t.wechat}: {account.user.wechatOpenId?"✓":"—"}</p>
        {account.organizations.map((o) => {
          const isActive = session?.organizationId === o.id;
          return (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, margin: "8px 0", padding: "6px 10px", background: isActive ? "#f0fdf4" : "#f8faf9", borderRadius: 10, border: isActive ? "1px solid #86efac" : "1px solid #e2e8e5" }}>
              <span>🏪 <b>{o.name}</b> <small style={{ color: "#64748b" }}>· {o.memberRole}</small> {isActive ? <b style={{ color: "#07c160", marginLeft: 6 }}>✓ {t.activeStore}</b> : null}</span>
              {!isActive && session?.role === "partner" && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await fetch("/api/auth/unified/session/organization", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ organizationId: o.id }),
                      });
                      updateSession({ organizationId: o.id, organizationName: o.name });
                      try { localStorage.setItem("zhaoxi.partner.organizationId", o.id); } catch {}
                      window.location.reload();
                    } catch {}
                  }}
                  style={{ border: 0, borderRadius: 8, padding: "5px 10px", background: "#07c160", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                >
                  {t.selectStore}
                </button>
              )}
            </div>
          );
        })}
        {account.driver&&<p>{t.driver} · {account.driver.vehicleType} · {account.driver.status}</p>}
      </div>

      <div style={{padding:16,border:"1px solid #e5e7eb",borderRadius:18,background:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <b>{t.security}</b>
          <button type="button" disabled={deviceBusy!==null} onClick={()=>void logoutAll()} style={{border:0,borderRadius:12,padding:"8px 10px",background:"#fff1f2",color:"#be123c",fontWeight:800}}>{t.logoutAll}</button>
        </div>
        <div style={{display:"grid",gap:10,marginTop:12}}>
          {devices.length===0?<small>{t.noDevices}</small>:devices.map(d=><div key={d.sessionId} style={{padding:12,border:"1px solid #edf0ee",borderRadius:14}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}>
              <div>
                <b>{d.deviceName||d.deviceId||d.role}</b>
                {d.isCurrent&&<small style={{display:"block",color:"#07a856",fontWeight:800}}>{t.current}</small>}
                <small style={{display:"block",color:"#64748b"}}>{d.role} · {t.lastSeen}: {new Date(d.lastSeenAt).toLocaleString(locale)}</small>
              </div>
              <button type="button" disabled={deviceBusy!==null} onClick={()=>void revokeDevice(d.sessionId)} style={{border:0,borderRadius:10,padding:"8px 10px",background:d.isCurrent?"#fff7ed":"#f8fafc",color:d.isCurrent?"#c2410c":"#475569",fontWeight:750}}>{deviceBusy===d.sessionId?"…":t.revoke}</button>
            </div>
          </div>)}
        </div>
      </div>
    </>}
  </section>;
}
