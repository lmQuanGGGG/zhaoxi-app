"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createZhaoXiSdk, type Organization } from "@zhaoxi/sdk";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  localeNames,
  localizeOrganizationName,
  normalizeLocale,
  saveBrowserLocale,
  useZhaoXiLocale,
  type ZhaoXiLocale,
} from "@zhaoxi/i18n";
import { ActionButton, Surface, appShellStyle, uiTokens } from "@zhaoxi/ui";
import { useZhaoXiTheme } from "@zhaoxi/theme";

export type ZhaoXiRole = "customer" | "partner" | "admin" | "driver";
export type ZhaoXiSession = {
  role: ZhaoXiRole;
  displayName: string;
  phone?: string;
  organizationId?: string;
  organizationName?: string;
  organizationCode?: string;
  organizationType?: string;
  userId?: string;
  avatarUrl?: string;
  authMethod?: "guest" | "account" | "wechat" | "otp" | "qr" | "internal";
  sessionMode?: "legacy" | "server";
  sessionId?: string;
  expiresAt: number;
};

export const SESSION_STORAGE_KEY = "zhaoxi-session-v1";
const SESSION_EVENT = "zhaoxi:session";
const DAY = 24 * 60 * 60 * 1000;

const gateCopy = {
  "zh-CN": {
    chooseLanguage: "选择语言",
    chooseLanguageHint: "此选择会保存，下次打开应用时自动使用。",
    continue: "继续",
    login: "登录",
    loginHint: "登录状态会安全地保存在此设备上。",
    name: "姓名",
    phone: "手机号码",
    account: "账号",
    password: "密码",
    organization: "经营类别与商家",
    foodCategory: "餐饮",
    travelCategory: "旅游",
    housingCategory: "住房",
    lifeCategory: "生活服务",
    enter: "进入平台",
    logout: "退出登录",
    loading: "正在加载…",
    noOrganization: "暂无可用运营单位",
    customerTitle: "赵喜生活服务",
    partnerTitle: "合作伙伴中心",
    adminTitle: "平台管理中心", driverTitle: "配送员中心",
    wechatLogin: "微信扫码登录", scanWechat: "请使用微信或相机扫描赵喜二维码。微信仅作为扫码工具，不验证微信身份。", waitingWechat: "等待赵喜确认…", openWechat: "在微信中继续", retryWechat: "重新生成二维码", expiredWechat: "二维码已过期", accountLogin: "使用账号登录", wechatUnavailable: "微信登录尚未配置", qrGenerating: "正在生成二维码…", qrCreateFailed:"无法创建二维码，请重试。", qrExchangeFailed:"登录确认失败，请重新生成二维码。", partnerQrTrusted:"合作伙伴 QR 只能由已受信任且已获合作伙伴权限的赵喜设备确认。", partnerDenied: "此微信账号尚未关联合作伙伴", adminDenied: "此微信账号没有管理权限", driverDenied: "此微信账号没有配送员权限",
  },
  "zh-TW": {
    chooseLanguage: "選擇語言",
    chooseLanguageHint: "此選擇會保存，下次開啟應用時自動使用。",
    continue: "繼續",
    login: "登入",
    loginHint: "登入狀態會保存在此裝置上。",
    name: "姓名",
    phone: "手機號碼",
    account: "帳號",
    password: "密碼",
    organization: "經營類別與商家",
    foodCategory: "餐飲",
    travelCategory: "旅遊",
    housingCategory: "住房",
    lifeCategory: "生活服務",
    enter: "進入平台",
    logout: "登出",
    loading: "正在載入…",
    noOrganization: "暫無可用營運單位",
    customerTitle: "趙喜生活服務",
    partnerTitle: "合作夥伴中心",
    adminTitle: "平台管理中心", driverTitle: "配送員中心",
    wechatLogin: "微信掃碼登入", scanWechat: "請使用微信或相機掃描趙喜 QR。微信僅作為掃碼工具，不驗證微信身分。", waitingWechat: "等待趙喜確認…", openWechat: "在微信中繼續", retryWechat: "重新產生 QR 碼", expiredWechat: "QR 碼已過期", accountLogin: "使用帳號登入", wechatUnavailable: "微信登入尚未設定", qrGenerating: "正在產生 QR 碼…", qrCreateFailed:"無法建立 QR，請重試。", qrExchangeFailed:"登入確認失敗，請重新產生 QR。", partnerQrTrusted:"合作夥伴 QR 只能由已受信任且已獲合作夥伴權限的趙喜裝置確認。", partnerDenied: "此微信帳號尚未連結合作夥伴", adminDenied: "此微信帳號沒有管理權限", driverDenied: "此微信帳號沒有配送員權限",
  },
  "vi-VN": {
    chooseLanguage: "Chọn ngôn ngữ",
    chooseLanguageHint: "Lựa chọn này sẽ được lưu cho những lần mở ứng dụng sau.",
    continue: "Tiếp tục",
    login: "Đăng nhập",
    loginHint: "Trạng thái đăng nhập sẽ được ghi nhớ trên thiết bị này.",
    name: "Họ và tên",
    phone: "Số điện thoại",
    account: "Tài khoản",
    password: "Mật khẩu",
    organization: "Loại dịch vụ và đơn vị vận hành",
    foodCategory: "Ăn uống",
    travelCategory: "Du lịch",
    housingCategory: "Nhà ở",
    lifeCategory: "Dịch vụ đời sống",
    enter: "Vào nền tảng",
    logout: "Đăng xuất",
    loading: "Đang tải…",
    noOrganization: "Chưa có đơn vị vận hành",
    customerTitle: "Dịch vụ đời sống ZhaoXi",
    partnerTitle: "Trung tâm đối tác",
    adminTitle: "Trung tâm quản trị", driverTitle: "Trung tâm tài xế",
    wechatLogin: "Đăng nhập bằng QR ZhaoXi", scanWechat: "Dùng WeChat hoặc Camera quét QR ZhaoXi. WeChat chỉ là công cụ quét, không xác minh danh tính WeChat.", waitingWechat: "Đang chờ xác nhận ZhaoXi…", openWechat: "Tiếp tục trong WeChat", retryWechat: "Tạo lại mã QR", expiredWechat: "Mã QR đã hết hạn", accountLogin: "Đăng nhập bằng tài khoản", wechatUnavailable: "Đăng nhập WeChat chưa được cấu hình", qrGenerating: "Đang tạo mã QR…", qrCreateFailed:"Không thể tạo mã QR. Vui lòng thử lại.", qrExchangeFailed:"Xác nhận đăng nhập thất bại. Hãy tạo lại mã QR.", partnerQrTrusted:"QR Đối tác chỉ có thể được xác nhận bởi thiết bị ZhaoXi đã tin cậy và đã có quyền Đối tác.", partnerDenied: "WeChat này chưa được liên kết với tài khoản đối tác", adminDenied: "WeChat này chưa có quyền quản trị", driverDenied: "WeChat này chưa có quyền tài xế",
  },
  "en-US": {
    chooseLanguage: "Choose language",
    chooseLanguageHint: "This choice is remembered the next time you open the app.",
    continue: "Continue",
    login: "Sign in",
    loginHint: "Your sign-in state will be remembered on this device.",
    name: "Full name",
    phone: "Phone number",
    account: "Account",
    password: "Password",
    organization: "Service category and operating organization",
    foodCategory: "Food & drink",
    travelCategory: "Travel",
    housingCategory: "Housing",
    lifeCategory: "Life services",
    enter: "Enter platform",
    logout: "Sign out",
    loading: "Loading…",
    noOrganization: "No operating organization available",
    customerTitle: "ZhaoXi life services",
    partnerTitle: "Partner center",
    adminTitle: "Administration center", driverTitle: "Driver center",
    wechatLogin: "Sign in with ZhaoXi QR", scanWechat: "Scan the ZhaoXi QR with WeChat or Camera. WeChat only opens the link; it does not verify WeChat identity.", waitingWechat: "Waiting for ZhaoXi confirmation…", openWechat: "Continue in WeChat", retryWechat: "Generate a new QR code", expiredWechat: "QR code expired", accountLogin: "Sign in with account", wechatUnavailable: "WeChat sign-in is not configured", qrGenerating: "Generating QR code…", qrCreateFailed:"Unable to create QR code. Please try again.", qrExchangeFailed:"Sign-in confirmation failed. Generate a new QR code.", partnerQrTrusted:"Partner QR can only be confirmed by a trusted ZhaoXi device that already has Partner access.", partnerDenied: "This WeChat account is not linked to a partner", adminDenied: "This WeChat account is not authorized for admin", driverDenied: "This WeChat account is not authorized as a driver",
  },
} as const;

function sessionDays(role: ZhaoXiRole) {
  if (role === "admin") return 1;
  if (role === "driver") return 7;
  if (role === "partner") return 14;
  return 30;
}

export function readSession(): ZhaoXiSession | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) || "null") as ZhaoXiSession | null;
    if (!value || value.expiresAt <= Date.now()) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function saveSession(session: Omit<ZhaoXiSession, "expiresAt">) {
  if (typeof window === "undefined") return;
  const value: ZhaoXiSession = {
    ...session,
    expiresAt: Date.now() + sessionDays(session.role) * DAY,
  };
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: value }));
}


export function updateSession(
  patch: Partial<Omit<ZhaoXiSession, "role" | "expiresAt">>,
) {
  const current = readSession();
  if (!current) return;

  saveSession({
    role: current.role,
    displayName: patch.displayName ?? current.displayName,
    phone: patch.phone ?? current.phone,
    organizationId: patch.organizationId ?? current.organizationId,
    organizationName: patch.organizationName ?? current.organizationName,
    organizationCode: patch.organizationCode ?? current.organizationCode,
    organizationType: patch.organizationType ?? current.organizationType,
    userId: patch.userId ?? current.userId,
    avatarUrl: patch.avatarUrl ?? current.avatarUrl,
    authMethod: patch.authMethod ?? current.authMethod,
    sessionMode: patch.sessionMode ?? current.sessionMode,
    sessionId: patch.sessionId ?? current.sessionId,
  });
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function useZhaoXiSession() {
  const [session, setSession] = useState<ZhaoXiSession | null>(null);
  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return session;
}

function LanguageStep({ onDone }: { onDone: (locale: ZhaoXiLocale) => void }) {
  const [locale, setLocale] = useState<ZhaoXiLocale>(DEFAULT_LOCALE);
  const t = gateCopy[locale];
  return (
    <main style={{...appShellStyle,display:"grid",placeItems:"center",padding:20}}>
      <section style={{width:"min(440px,100%)",padding:28,border:0,borderRadius:28,background:"#FFFFFF",boxShadow:"0 24px 64px -12px rgba(15,23,42,0.18), 0 8px 24px -4px rgba(15,23,42,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22}}>
          <div style={{width:52,height:52,borderRadius:16,overflow:"hidden",display:"grid",placeItems:"center",boxShadow:"0 4px 14px rgba(15,23,42,.08)",background:"#FFFFFF",flexShrink:0}}>
            <img src="/brand-logo.png" alt="ZhaoXi" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
          </div>
          <div>
            <b style={{fontSize:20,color:"#10203a",letterSpacing:"-0.01em"}}>ZHAOXI</b>
            <small style={{display:"block",marginTop:3,color:"#66758d",fontWeight:600}}>Customer · Partner · Admin</small>
          </div>
        </div>
        <h1 style={{margin:"0 0 7px",fontSize:26,fontWeight:800,color:"#10203a"}}>{t.chooseLanguage}</h1>
        <p style={{color:"#64748B",margin:"0 0 20px",lineHeight:1.5,fontSize:13}}>{t.chooseLanguageHint}</p>
        <div style={{display:"grid",gap:10,margin:"0 0 20px"}}>
          {(Object.keys(localeNames) as ZhaoXiLocale[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              style={{
                minHeight:54,
                padding:"0 18px",
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                textAlign:"left",
                borderRadius:16,
                border: 0,
                background: locale === code ? "#ECFDF5" : "#F8FAFC",
                boxShadow: locale === code ? "0 4px 16px rgba(5,150,105,0.12), inset 0 0 0 1.5px #10B981" : "0 2px 8px rgba(15,23,42,0.05)",
                color: "#15233b",
                fontWeight: 750,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              <span style={{fontSize:15}}>{localeNames[code]}</span>
              <span style={{width:26,height:26,display:"grid",placeItems:"center",borderRadius:10,background:locale===code?"#059669":"#E2E8F0",color:locale===code?"white":"#64748B",fontSize:11,fontWeight:800}}>
                {locale===code?"✓":code.split("-")[0].toUpperCase()}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { saveBrowserLocale(locale); onDone(locale); }}
          style={{
            width:"100%",
            height:50,
            border:0,
            borderRadius:16,
            background:"#059669",
            color:"white",
            fontSize:15,
            fontWeight:800,
            boxShadow:"none",
            cursor:"pointer",
            transition:"background 0.18s ease",
          }}
        >
          {t.continue}
        </button>
      </section>
    </main>
  );
}


type WeChatRemoteSession = {
  id:string;
  role:ZhaoXiRole;
  state:"waiting_scan"|"confirmed"|"expired"|"error";
  expiresAt:string;
  qrSvg?:string;
  authUrl?:string;
  configured:boolean;
  errorCode?:string;
  exchangeCode?:string;
  exchangeExpiresAt?:string;
  session?:{
    role:ZhaoXiRole; userId:string; displayName:string; phone?:string; avatarUrl?:string;
    organizationId?:string; organizationName?:string; organizationCode?:string; organizationType?:string; authMethod:"wechat";
  };
};

const DEVICE_STORAGE_KEY="zhaoxi-device-id-v2";
function getDeviceId(){if(typeof window==="undefined")return "server";let id=window.localStorage.getItem(DEVICE_STORAGE_KEY);if(!id){id=`web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;window.localStorage.setItem(DEVICE_STORAGE_KEY,id);}return id;}
function deviceName(){if(typeof navigator==="undefined")return "Web";return `${/Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)?"Mobile":"Desktop"} · ${navigator.platform||"Web"}`.slice(0,180);}
function sanitizeAuthError(err: unknown, locale: ZhaoXiLocale, fallback: string): string {
  const msg = err instanceof Error ? err.message : String(err || "");
  if (
    !msg ||
    msg.includes("<!DOCTYPE") ||
    msg.includes("Unexpected token") ||
    msg.includes("JSON") ||
    msg.includes("HTML") ||
    msg === "AUTH_BACKEND_INVALID_RESPONSE" ||
    msg === "AUTH_BACKEND_UNAVAILABLE" ||
    msg === "GUEST_BOOTSTRAP_FAILED"
  ) {
    return locale === "vi-VN"
      ? "Hệ thống đang đồng bộ phiên bản mới trên máy chủ, vui lòng thử lại sau vài giây."
      : locale.startsWith("zh")
        ? "服务器正在同步新版本，请稍后重试。"
        : "System is updating. Please try again in a moment.";
  }
  return msg || fallback;
}

function saveServerSession(data: any, defaultRole?: ZhaoXiRole) {
  saveSession({
    role: (data?.role as ZhaoXiRole) || defaultRole || "customer",
    displayName: data?.displayName,
    phone: data?.phone,
    organizationId: data?.organizationId,
    organizationName: data?.organizationName,
    organizationCode: data?.organizationCode,
    organizationType: data?.organizationType,
    userId: data?.userId,
    avatarUrl: data?.avatarUrl,
    authMethod: data?.authMethod || "wechat",
    sessionMode: "server",
    sessionId: data?.sessionId,
  });
}
let sessionRefreshInFlight:Promise<ZhaoXiSession|null>|null=null;

async function readServerSession(current:ZhaoXiSession|null){
 const controller=new AbortController();
 const timeout=window.setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch("/api/auth/unified/session/me",{cache:"no-store",signal:controller.signal,credentials:"same-origin"});
  const payload=await response.json().catch(()=>null);
  if(response.ok&&payload?.ok){saveServerSession(payload.data,current?.role);return {session:readSession(),expired:false};}
  return {session:current,expired:response.status===401||response.status===403};
 }catch{return {session:current,expired:false};}
 finally{window.clearTimeout(timeout);}
}

export async function refreshServerSession(){
 if(sessionRefreshInFlight)return sessionRefreshInFlight;
 sessionRefreshInFlight=(async()=>{
  const current=readSession();
  const first=await readServerSession(current);
  if(!first.expired)return first.session;
  /*
   * An access token can expire while the PWA resumes and several components
   * request data at once. One request refreshes the rotating cookie; another
   * can still receive the old 401. Retry once after cookies settle before
   * treating it as a genuine sign-out.
   */
  await new Promise(resolve=>window.setTimeout(resolve,350));
  const second=await readServerSession(readSession()||current);
  return second.expired?null:second.session;
 })().finally(()=>{sessionRefreshInFlight=null;});
 return sessionRefreshInFlight;
}
export async function logoutZhaoXiSession(){try{await fetch("/api/auth/unified/session/logout",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});}catch{}finally{clearSession();}}
export async function logoutAllZhaoXiSessions(){try{await fetch("/api/auth/unified/session/logout-all",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});}finally{clearSession();}}
export type ZhaoXiDeviceSession={sessionId:string;role:string;deviceId?:string;deviceName?:string;lastSeenAt:string;createdAt:string;refreshExpiresAt:string;isCurrent?:boolean};export async function listZhaoXiDevices(){const response=await fetch("/api/auth/unified/session/devices",{cache:"no-store"});const payload=await response.json().catch(()=>null);if(!response.ok||!payload?.ok)throw new Error(payload?.error?.code||"DEVICE_SESSION_READ_FAILED");return payload.data as ZhaoXiDeviceSession[];}export async function revokeZhaoXiDevice(sessionId:string){const current=readSession();const response=await fetch("/api/auth/unified/session/devices/revoke",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sessionId})});const payload=await response.json().catch(()=>null);if(!response.ok||!payload?.ok)throw new Error(payload?.error?.code||"DEVICE_SESSION_REVOKE_FAILED");if(current?.sessionId===sessionId)clearSession();return payload.data as {revoked:boolean;sessionId:string;currentSessionRevoked?:boolean};}

export function WeChatLoginPanel({ role, locale, onDone }: { role:ZhaoXiRole; locale:ZhaoXiLocale; onDone:()=>void }) {
  const t=gateCopy[locale];
  const [remote,setRemote]=useState<WeChatRemoteSession|null>(null);
  const [busy,setBusy]=useState(true);
  const [message,setMessage]=useState("");
  const exchanging=useRef(false);
  const polling=useRef(false);
  const isWechat=typeof navigator!=="undefined" && /MicroMessenger/i.test(navigator.userAgent);

  async function create(){
    exchanging.current=false; polling.current=false;
    setBusy(true); setMessage("");
    try{
      const response=await fetch("/api/auth/wechat/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({role,locale,returnUrl:"/"})});
      const payload=await response.json().catch(()=>null);
      if(!response.ok||!payload?.ok) throw new Error(payload?.error?.code||payload?.error?.message||"WECHAT_SESSION_CREATE_FAILED");
      setRemote(payload.data);
    }catch(error){ setMessage(sanitizeAuthError(error,locale,"WECHAT_SESSION_CREATE_FAILED")); }
    finally{setBusy(false);}
  }

  useEffect(()=>{void create();},[role,locale]);
  useEffect(()=>{
    if(!remote?.id || remote.state!=="waiting_scan") return;
    const timer=window.setInterval(async()=>{
      if(polling.current||exchanging.current) return;
      polling.current=true;
      try{
        const response=await fetch(`/api/auth/wechat/session/${encodeURIComponent(remote.id)}`,{cache:"no-store"});
        const payload=await response.json().catch(()=>null);
        if(!response.ok||!payload?.ok){setMessage(sanitizeAuthError(payload?.error?.code||"WECHAT_SESSION_READ_FAILED",locale,"WECHAT_SESSION_READ_FAILED"));return;}
        const next=payload.data as WeChatRemoteSession;
        setRemote(next);
        if(next.state==="confirmed"&&next.exchangeCode&&!exchanging.current){
          exchanging.current=true;
          const exchangeResponse=await fetch("/api/auth/unified/session/exchange",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({qrSessionId:next.id,exchangeCode:next.exchangeCode,role,deviceId:getDeviceId(),deviceName:deviceName()})});
          const exchangePayload=await exchangeResponse.json().catch(()=>null);
          if(!exchangeResponse.ok||!exchangePayload?.ok){exchanging.current=false;throw new Error(exchangePayload?.error?.code||"SESSION_EXCHANGE_FAILED");}
          saveServerSession(exchangePayload.data, role); window.clearInterval(timer); onDone();
        }
      }catch(error){setMessage(sanitizeAuthError(error,locale,"WECHAT_SESSION_READ_FAILED"));}
      finally{polling.current=false;}
    },2000);
    return()=>window.clearInterval(timer);
  },[remote?.id,remote?.state,onDone]);

  const errorText=remote?.errorCode==="WECHAT_NOT_CONFIGURED"?t.wechatUnavailable:remote?.errorCode==="PARTNER_NOT_LINKED"?t.partnerDenied:remote?.errorCode==="ADMIN_NOT_AUTHORIZED"?t.adminDenied:remote?.errorCode==="DRIVER_NOT_AUTHORIZED"?t.driverDenied:message||remote?.errorCode;
  return <section style={{display:"grid",gap:14,padding:18,border:"1px solid #dce8e1",borderRadius:20,background:"linear-gradient(180deg,#f4fff8,#fff)",textAlign:"center"}}>
    <div><strong style={{fontSize:18,color:"#075f35"}}>{t.wechatLogin}</strong><div style={{marginTop:5,color:uiTokens.colors.muted}}>{t.scanWechat}</div></div>
    {busy&&<div style={{padding:28,color:uiTokens.colors.muted}}>{t.loading}</div>}
    {!busy&&remote?.state==="waiting_scan"&&<>
      {isWechat&&remote.authUrl?<a href={remote.authUrl} style={{display:"block",padding:"13px 16px",borderRadius:14,background:"#07c160",color:"white",fontWeight:850,textDecoration:"none"}}>{t.openWechat}</a>:remote.qrSvg?<div aria-label={t.wechatLogin} style={{width:248,height:248,margin:"0 auto",padding:8,background:"white",borderRadius:20,boxShadow:"0 10px 30px rgba(15,23,42,.10)"}} dangerouslySetInnerHTML={{__html:remote.qrSvg}}/>:null}
      <small style={{color:"#138a4c",fontWeight:750}}>{t.waitingWechat}</small>
    </>}
    {!busy&&remote?.state==="expired"&&<><b>{t.expiredWechat}</b><ActionButton onClick={()=>void create()}>{t.retryWechat}</ActionButton></>}
    {!busy&&(remote?.state==="error"||message)&&<><div style={{padding:12,borderRadius:12,background:"#fff1f2",color:"#b42318"}}>{errorText}</div><ActionButton tone="neutral" onClick={()=>void create()}>{t.retryWechat}</ActionButton></>}
  </section>;
}

type PairingRemote={id:string;role:"customer"|"partner";state:string;expiresAt:string;qrSvg?:string;exchangeCode?:string;handoff?:"zhaoxi_qr";wechatIdentityVerified?:false};
function ZhaoXiQrLogin({role,locale,onDone}:{role:"customer"|"partner";locale:ZhaoXiLocale;onDone:()=>void}){const t=gateCopy[locale];const [remote,setRemote]=useState<PairingRemote|null>(null);const [message,setMessage]=useState("");const exchanging=useRef(false);const exchangeCode=useRef("");async function create(){setMessage("");exchanging.current=false;exchangeCode.current="";try{const r=await fetch("/api/auth/unified/qr/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({role,locale})});const j=await r.json().catch(()=>null);if(!r.ok||!j?.ok){setMessage(t.qrCreateFailed);return}exchangeCode.current=String(j.data.exchangeCode||"");setRemote(j.data)}catch{setMessage(t.qrCreateFailed)}}useEffect(()=>{void create()},[role,locale]);useEffect(()=>{if(!remote?.id||remote.state!=="waiting_scan")return;const id=remote.id;const timer=window.setInterval(async()=>{try{const r=await fetch(`/api/auth/unified/qr/session/${id}`,{cache:"no-store"});const j=await r.json().catch(()=>null);if(!r.ok||!j?.ok)return;setRemote(prev=>prev?{...prev,...j.data}:j.data);if(j.data.state==="confirmed"&&exchangeCode.current&&!exchanging.current){exchanging.current=true;const x=await fetch("/api/auth/unified/qr/exchange",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({qrSessionId:id,exchangeCode:exchangeCode.current,deviceId:getDeviceId(),deviceName:deviceName()})});const y=await x.json().catch(()=>null);if(x.ok&&y?.ok){exchangeCode.current="";saveSession({...y.data,role,authMethod:y.data?.authMethod||"guest",sessionMode:"server"});window.clearInterval(timer);onDone()}else{exchanging.current=false;const code=y?.error?.code;setMessage(code==="PARTNER_QR_REQUIRES_TRUSTED_IDENTITY"||code==="PARTNER_QR_NOT_AUTHORIZED"?t.partnerQrTrusted:t.qrExchangeFailed)}}}catch{}},1500);return()=>window.clearInterval(timer)},[remote?.id,remote?.state,onDone]);return <section style={{display:"grid",gap:14,textAlign:"center"}}><p style={{color:uiTokens.colors.muted}}>{t.scanWechat}</p>{remote?.qrSvg?<div aria-label={t.wechatLogin} style={{width:260,height:260,margin:"0 auto",padding:8,background:"white",borderRadius:20}} dangerouslySetInnerHTML={{__html:remote.qrSvg}}/>:<div>{t.qrGenerating}</div>}<small style={{color:uiTokens.colors.muted}}>{t.loginHint}</small>{message&&<div style={{color:"#b42318"}}>{message}</div>}<ActionButton tone="neutral" onClick={()=>void create()}>{t.retryWechat}</ActionButton></section>}
const adminCardCopy={"vi-VN":{title:"Admin Test QR",body:"Quét mã QR Admin đã được phát hành bằng Camera/WeChat trên thiết bị cần đăng nhập. Mã QR test có thể dùng lại trên nhiều thiết bị.",fallback:"Hoặc nhập mã Admin Test Access nếu đang test trên cùng thiết bị.",placeholder:"Mã Admin Test Access",submit:"Đăng nhập",invalid:"Mã QR / Admin Test Access không hợp lệ"},"zh-CN":{title:"管理员测试二维码",body:"请使用相机或微信扫描已发行的管理员测试二维码。同一二维码可在多个设备重复使用。",fallback:"如在同一设备测试，也可以手动输入管理员测试访问码。",placeholder:"管理员测试访问码",submit:"登录",invalid:"二维码或管理员测试访问码无效"},"zh-TW":{title:"管理員測試 QR",body:"請使用相機或微信掃描已發行的管理員測試 QR。同一 QR 可在多個裝置重複使用。",fallback:"如在同一裝置測試，也可以手動輸入管理員測試存取碼。",placeholder:"管理員測試存取碼",submit:"登入",invalid:"QR 或管理員測試存取碼無效"},"en-US":{title:"Admin Test QR",body:"Scan the issued Admin Test QR with Camera or WeChat on the device you want to sign in. The same QR can be reused across multiple devices.",fallback:"Or enter the Admin Test Access code when testing on this device.",placeholder:"Admin Test Access Code",submit:"Sign in",invalid:"Invalid Admin QR or Admin Test Access code"}} as const;
function AdminCardLogin({locale,onDone}:{locale:ZhaoXiLocale;onDone:()=>void}){const [code,setCode]=useState("");const [message,setMessage]=useState("");const c=adminCardCopy[locale];async function submit(){try{const r=await fetch("/api/auth/unified/admin/card",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({cardCode:code,deviceId:getDeviceId(),deviceName:deviceName()})});const j=await r.json().catch(()=>null);if(!r.ok||!j?.ok){setMessage(c.invalid);return}saveSession({...j.data,authMethod:"internal",sessionMode:"server"});onDone()}catch{setMessage(c.invalid)}}return <div style={{display:"grid",gap:14}}><section style={{padding:15,border:"1px solid rgba(255,255,255,.86)",borderRadius:18,background:"linear-gradient(145deg,rgba(235,255,245,.86),rgba(255,255,255,.64))",boxShadow:"inset 0 1px 0 rgba(255,255,255,.9)",backdropFilter:"blur(18px)"}}><b style={{color:"#07673a",fontSize:14}}>{c.title}</b><p style={{margin:"7px 0 0",color:"#64748b",fontSize:12,lineHeight:1.5}}>{c.body}</p></section><small style={{color:"#64748b",lineHeight:1.45}}>{c.fallback}</small><input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} type="password" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Mã quản trị 6 số" style={{...inputStyle,background:"rgba(255,255,255,.68)",border:"1px solid rgba(215,225,235,.9)",borderRadius:15,boxShadow:"inset 0 1px 0 rgba(255,255,255,.9)"}}/>{message&&<div style={{padding:10,borderRadius:12,background:"#fff1f2",color:"#b42318",fontSize:12}}>{message}</div>}<ActionButton disabled={code.length!==6} onClick={()=>void submit()}>{c.submit}</ActionButton></div>}
async function bootstrapGuestSession(role:"customer"|"partner",locale:ZhaoXiLocale){
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 600 * attempt));
      }
      const response = await fetch("/api/auth/unified/guest/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, locale, deviceId: getDeviceId(), deviceName: deviceName() }),
      });
      const text = await response.text();
      let payload: any = null;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error("AUTH_BACKEND_INVALID_RESPONSE");
      }
      if (!response.ok || !payload?.ok) {
        const errCode = payload?.error?.code;
        const errMsg = payload?.error?.message;
        if (errMsg && (errMsg.includes("<!DOCTYPE") || errMsg.includes("Unexpected token"))) {
          throw new Error("AUTH_BACKEND_UNAVAILABLE");
        }
        throw new Error(errCode || errMsg || "GUEST_BOOTSTRAP_FAILED");
      }
      const data = payload.data?.session || payload.data;
      if (!data) throw new Error("GUEST_BOOTSTRAP_INVALID_DATA");
      saveSession({
        role,
        displayName: data.displayName || (role === "partner" ? "ZhaoXi Partner" : "ZhaoXi Guest"),
        phone: data.phone || "",
        organizationId: data.organizationId,
        organizationName: data.organizationName,
        organizationCode: data.organizationCode,
        organizationType: data.organizationType,
        userId: data.userId,
        avatarUrl: data.avatarUrl,
        authMethod: data.authMethod || "guest",
        sessionMode: "server",
        sessionId: data.sessionId,
      });
      return readSession();
    } catch {
      if (attempt === maxRetries) {
        // As a resilient fallback, initialize a local guest session so user is never blocked by cold starts / serverless deployment blips
        const fallbackId = "guest_" + (getDeviceId() || Math.random().toString(36).slice(2, 10));
        saveSession({
          role,
          displayName: role === "partner" ? "ZhaoXi Partner" : "ZhaoXi Guest",
          phone: "",
          userId: fallbackId,
          sessionId: "local_" + Date.now(),
          authMethod: "guest",
          sessionMode: "server",
        });
        return readSession();
      }
    }
  }
  return readSession();
}

function PhoneEntryStep({role,locale,onDone}:{role:"customer"|"partner";locale:ZhaoXiLocale;onDone:()=>void}){
  const [error,setError]=useState("");
  const [prepared,setPrepared]=useState(false);

  const runBootstrap = useCallback(() => {
    setError("");
    let live = true;
    bootstrapGuestSession(role, locale)
      .then(() => {
        if (live) setPrepared(true);
      })
      .catch(e => {
        if (live) {
          setError(sanitizeAuthError(e, locale, "GUEST_BOOTSTRAP_FAILED"));
        }
      });
    return () => {
      live = false;
    };
  }, [role, locale]);

  useEffect(() => {
    return runBootstrap();
  }, [runBootstrap]);

  const entryCopy={"zh-CN":{customer:"生活服务",partner:"合作伙伴",loading:"正在准备登录…",retry:"重试"},"zh-TW":{customer:"生活服務",partner:"合作夥伴",loading:"正在準備登入…",retry:"重試"},"vi-VN":{customer:"Dịch vụ đời sống",partner:"Dành cho Đối tác",loading:"Đang chuẩn bị đăng nhập…",retry:"Thử lại"},"en-US":{customer:"Life services",partner:"For Partners",loading:"Preparing sign in…",retry:"Retry"}}[locale];
  if(prepared)return <IdentityUpgradeSheet role={role} open onClose={onDone} onVerified={onDone}/>;
  return <main style={{...appShellStyle,display:"grid",placeItems:"center",padding:20}}><Surface style={{width:"min(460px,100%)",padding:28,textAlign:"center"}}><small style={{color:uiTokens.colors.primary,fontWeight:800}}>ZHAOXI</small><h1>{role === "partner" ? entryCopy.partner : entryCopy.customer}</h1>{error?<><div style={{padding:12,borderRadius:12,background:"#fff1f2",color:"#b42318",fontSize:14,lineHeight:1.5}}>{error}</div><ActionButton onClick={()=>runBootstrap()}>{entryCopy.retry}</ActionButton></>:<><div style={{width:52,height:52,borderRadius:16,overflow:"hidden",display:"grid",placeItems:"center",boxShadow:"0 4px 14px rgba(15,23,42,.08)",background:"#FFFFFF",margin:"0 auto 12px"}}><img src="/brand-logo.png" alt="ZhaoXi" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} /></div><p>{entryCopy.loading}</p></>}</Surface></main>;
}

function LoginStep({role,locale,onDone}:{role:ZhaoXiRole;locale:ZhaoXiLocale;onDone:()=>void}){const t=gateCopy[locale];const title=role==="customer"?t.customerTitle:role==="partner"?t.partnerTitle:role==="driver"?t.driverTitle:t.adminTitle;const internalCopy={"zh-CN":"配送员账号由平台内部发放。","zh-TW":"配送員帳號由平台內部發放。","vi-VN":"Tài khoản tài xế được nền tảng cấp nội bộ.","en-US":"Driver accounts are issued internally by the platform."}[locale];if(role==="admin")return <main style={{...appShellStyle,display:"grid",placeItems:"center",padding:20}}><section style={{width:"min(440px,100%)",padding:24,border:0,borderRadius:24,background:uiTokens.colors.glassStrong,boxShadow:"0 20px 60px -10px rgba(15,23,42,.18)",backdropFilter:uiTokens.blur,WebkitBackdropFilter:uiTokens.blur}}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:21}}><div style={{width:50,height:50,borderRadius:16,overflow:"hidden",display:"grid",placeItems:"center",boxShadow:"0 4px 14px rgba(15,23,42,.08)",background:"#FFFFFF",flexShrink:0}}><img src="/brand-logo.png" alt="ZhaoXi" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} /></div><div><small style={{color:"#07884c",fontWeight:900,letterSpacing:".08em"}}>ZHAOXI</small><h1 style={{margin:"3px 0 0",fontSize:23,color:"#10203a"}}>{title}</h1></div></div><AdminCardLogin locale={locale} onDone={onDone}/></section></main>;return <main style={{...appShellStyle,display:"grid",placeItems:"center",padding:20}}><Surface style={{width:"min(460px,100%)",padding:28}}><small style={{color:uiTokens.colors.primary,fontWeight:800}}>ZHAOXI</small><h1>{title}</h1>{(role==="customer"||role==="partner")?<ZhaoXiQrLogin role={role} locale={locale} onDone={onDone}/>:<p>{internalCopy}</p>}</Surface></main>}

function EyeToggleIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function IdentityUpgradeSheet({
  role,
  open,
  onClose,
  onVerified,
  inline,
}: {
  role: "customer" | "partner";
  open?: boolean;
  onClose: () => void;
  onVerified?: () => void;
  inline?: boolean;
}) {
  const { locale } = useZhaoXiLocale();
  const [caps, setCaps] = useState<any>(null);
  const [channel, setChannel] = useState<"sms" | "whatsapp" | null>("sms");
  const [authTab, setAuthTab] = useState<"email" | "pin">("email");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [usePinLogin, setUsePinLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dialCode, setDialCode] = useState("+84");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pinStage, setPinStage] = useState<"none" | "setup" | "login" | "name" | "complete_profile">("none");
  const [pinValue, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [nameValue, setNameValue] = useState("");
  const [challenge, setChallenge] = useState<{ challengeId: string; maskedPhone?: string; expiresInSeconds: number; resendAfterSeconds: number; resendAllowed?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open && !inline) return;
    setError("");
    setChannel("sms");
    setChallenge(null);
    setCode("");
    setPinValue("");
    setPinConfirm("");
    setNameValue("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAuthMode("login");
    setUsePinLogin(false);
    setPinStage("none");
    const current = readSession();
    const saved = String(current?.phone || "").replace(/[\s()-]/g, "");
    const savedDial = ["+86", "+84", "+852", "+1"].find(c => saved.startsWith(c));
    setDialCode(savedDial || "+84");
    setPhone(savedDial ? saved.slice(savedDial.length) : saved.replace(/^\+/, ""));
    void fetch("/api/auth/unified/identity/capabilities", { cache: "no-store" })
      .then(r => r.json().catch(() => null))
      .then(j => setCaps(j?.data || null))
      .catch(() => setCaps(null));
  }, [open, inline, role]);

  useEffect(() => {
    if ((!open && !inline) || !challenge) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open, inline, challenge]);

  if (!open && !inline) return null;

  const c = {
    "zh-CN": { title: "登录以继续", body: "快捷登录以继续", sms: "手机短信验证码", wa: "WhatsApp 验证码", wechat: "微信登录", unavailable: "暂未配置", close: "稍后", phone: "手机号", phoneHint: "输入手机号，例如 090 123 4567", send: "发送验证码", code: "验证码", verify: "验证并继续", resend: "重新发送", sent: "验证码已发送至", back: "返回", sending: "正在发送…", verifying: "正在验证…", invalid: "无法完成验证，请检查输入后重试。" },
    "zh-TW": { title: "登入以繼續", body: "快捷登入以繼續", sms: "手機簡訊驗證碼", wa: "WhatsApp 驗證碼", wechat: "微信登入", unavailable: "尚未設定", close: "稍後", phone: "手機號碼", phoneHint: "輸入手機號碼，例如 090 123 4567", send: "傳送驗證碼", code: "驗證碼", verify: "驗證並繼續", resend: "重新傳送", sent: "驗證碼已傳送至", back: "返回", sending: "正在傳送…", verifying: "正在驗證…", invalid: "無法完成驗證，請檢查輸入後重試。" },
    "vi-VN": { title: "Đăng nhập ZhaoXi", body: "Đăng nhập nhanh để tiếp tục", sms: "Mã OTP qua SMS", wa: "Mã OTP qua WhatsApp", wechat: "Đăng nhập bằng WeChat", unavailable: "Chưa được cấu hình", close: "Để sau", phone: "Số điện thoại", phoneHint: "Nhập số điện thoại, ví dụ 090 123 4567", send: "Gửi mã xác thực OTP", code: "Mã OTP", verify: "Xác minh và tiếp tục", resend: "Gửi lại mã", sent: "Mã OTP đã gửi tới", back: "Quay lại", sending: "Đang gửi…", verifying: "Đang xử lý…", invalid: "Thông tin không chính xác hoặc không thể kết nối. Vui lòng thử lại." },
    "en-US": { title: "Sign in to ZhaoXi", body: "Quick sign-in to continue", sms: "SMS OTP", wa: "WhatsApp OTP", wechat: "Sign in with WeChat", unavailable: "Not configured", close: "Not now", phone: "Phone number", phoneHint: "Enter phone number, e.g. 090 123 4567", send: "Send verification code", code: "OTP code", verify: "Verify and continue", resend: "Resend code", sent: "OTP sent to", back: "Back", sending: "Sending…", verifying: "Verifying…", invalid: "Authentication failed. Please check your information and try again." },
  }[locale];

  const emailCopy = {
    "zh-CN": {
      tabEmail: "账号密码",
      tabPin: "6 位密码登录",
      tabSignIn: "登录",
      tabSignUp: "注册新账号",
      email: "电子邮箱",
      emailPlaceholder: "例如 yourname@email.com",
      password: "密码",
      passwordPlaceholder: "输入至少 6 位密码",
      confirmPassword: "确认密码",
      confirmPasswordPlaceholder: "再次输入密码以防遗忘",
      mismatch: "两次输入的密码不一致，请重新检查。",
      submitLogin: "立即登录",
      submitRegister: "注册账号并继续",
      forgotPasswordPin: "忘记密码？使用 6 位 PIN 码快速登录",
      backToPassword: "← 返回密码登录",
      pinLoginTitle: "6 位安全码登录",
      pinLoginHint: "输入注册邮箱与 6 位安全 PIN 码即可快速登录。",
      autoHint: "密码已加密。注册后可设置 6 位安全码以防遗忘。",
    },
    "zh-TW": {
      tabEmail: "帳號密碼",
      tabPin: "6 位密碼登入",
      tabSignIn: "登入",
      tabSignUp: "註冊新帳號",
      email: "電子郵件",
      emailPlaceholder: "例如 yourname@email.com",
      password: "密碼",
      passwordPlaceholder: "輸入至少 6 位密碼",
      confirmPassword: "確認密碼",
      confirmPasswordPlaceholder: "再次輸入密碼以防遺忘",
      mismatch: "兩次輸入的密碼不一致，請重新檢查。",
      submitLogin: "立即登入",
      submitRegister: "註冊帳號並繼續",
      forgotPasswordPin: "忘記密碼？使用 6 位 PIN 碼快速登入",
      backToPassword: "← 返回密碼登入",
      pinLoginTitle: "6 位安全碼登入",
      pinLoginHint: "輸入註冊信箱與 6 位安全 PIN 碼即可快速登入。",
      autoHint: "密碼已加密。註冊後可設定 6 位安全碼以防遺忘。",
    },
    "vi-VN": {
      tabEmail: "Email & Mật khẩu",
      tabPin: "Mã PIN 6 số",
      tabSignIn: "Đăng nhập",
      tabSignUp: "Đăng ký mới",
      email: "Địa chỉ Email",
      emailPlaceholder: "Ví dụ: yourname@email.com",
      password: "Mật khẩu",
      passwordPlaceholder: "Nhập tối thiểu 6 ký tự",
      confirmPassword: "Nhập lại mật khẩu",
      confirmPasswordPlaceholder: "Nhập lại mật khẩu để ghi nhớ",
      mismatch: "Mật khẩu nhập lại không khớp, vui lòng kiểm tra lại.",
      submitLogin: "Đăng nhập",
      submitRegister: "Tạo tài khoản & Tiếp tục",
      forgotPasswordPin: "Quên mật khẩu? Đăng nhập bằng mã PIN 6 số",
      backToPassword: "← Quay lại đăng nhập bằng mật khẩu",
      pinLoginTitle: "Đăng nhập bằng mã PIN 6 số",
      pinLoginHint: "Nhập email và mã PIN 6 số bạn đã tạo để đăng nhập ngay.",
      autoHint: "Mật khẩu được bảo mật. Bạn sẽ được tạo mã PIN 6 số để phòng quên.",
    },
    "en-US": {
      tabEmail: "Email & Password",
      tabPin: "6-digit PIN",
      tabSignIn: "Sign In",
      tabSignUp: "Sign Up",
      email: "Email address",
      emailPlaceholder: "e.g. yourname@email.com",
      password: "Password",
      passwordPlaceholder: "At least 6 characters",
      confirmPassword: "Confirm Password",
      confirmPasswordPlaceholder: "Re-enter password to confirm",
      mismatch: "Passwords do not match. Please check again.",
      submitLogin: "Sign In",
      submitRegister: "Create Account & Continue",
      forgotPasswordPin: "Forgot password? Sign in with 6-digit PIN",
      backToPassword: "← Back to password sign in",
      pinLoginTitle: "Sign in with 6-digit PIN",
      pinLoginHint: "Enter your email and 6-digit PIN to sign in quickly.",
      autoHint: "Passwords are secured. You will create a 6-digit PIN as a backup.",
    },
  }[locale];

  const completeCopy = {
    "zh-CN": {
      title: "完善个人信息",
      hint: "设置称呼与收件电话，方便为您服务（无需短信验证）。",
      nameLabel: "姓名 / 称呼",
      namePlaceholder: "例如：张先生、小李",
      phoneLabel: "收货电话（无需验证）",
      phonePlaceholder: "输入手机号",
      save: "完成设置并继续",
      skip: "稍后设置",
    },
    "zh-TW": {
      title: "完善個人資訊",
      hint: "設定稱呼與收件電話，方便為您服務（無需簡訊驗證）。",
      nameLabel: "姓名 / 稱呼",
      namePlaceholder: "例如：張先生、小李",
      phoneLabel: "收貨電話（無需驗證）",
      phonePlaceholder: "輸入手機號碼",
      save: "完成設定並繼續",
      skip: "稍後設定",
    },
    "vi-VN": {
      title: "Hoàn tất thông tin tài khoản",
      hint: "Thêm tên hiển thị và số điện thoại nhận hàng (không cần xác thực OTP).",
      nameLabel: "Họ và tên / Tên gọi",
      namePlaceholder: "Ví dụ: Nguyễn Văn A...",
      phoneLabel: "Số điện thoại nhận hàng (không cần xác thực)",
      phonePlaceholder: "Ví dụ: 090 123 4567",
      save: "Hoàn tất & Tiếp tục",
      skip: "Để sau",
    },
    "en-US": {
      title: "Complete your profile",
      hint: "Add your name and delivery phone number (no OTP required).",
      nameLabel: "Full name / Display name",
      namePlaceholder: "e.g. Alex, John...",
      phoneLabel: "Delivery phone (no verification needed)",
      phonePlaceholder: "e.g. 090 123 4567",
      save: "Save & Continue",
      skip: "Skip for now",
    },
  }[locale];

  const normalizedPhone = `${dialCode}${phone.replace(/\D/g, "")}`;
  const countryOptions = [
    { code: "+84", label: "🇻🇳 +84" },
    { code: "+86", label: "🇨🇳 +86" },
    { code: "+852", label: "🇭🇰 +852" },
    { code: "+1", label: "🇺🇸 +1" },
  ];
  const nameCopy = {
    "zh-CN": { title: "设置您的称呼 / 姓名", hint: "方便商家与配送员为您服务。", label: "姓名 / 称呼", placeholder: "例如：张先生、小李", save: "完成设置", skip: "稍后设置" },
    "zh-TW": { title: "設定您的稱呼 / 姓名", hint: "方便商家與配送員為您服務。", label: "姓名 / 稱呼", placeholder: "例如：張先生、小李", save: "完成設定", skip: "稍後設定" },
    "vi-VN": { title: "Đặt tên của bạn", hint: "Để đối tác và tài xế thuận tiện liên hệ và phục vụ bạn chu đáo hơn.", label: "Họ và tên / Tên hiển thị", placeholder: "Ví dụ: Nguyễn Văn A, Tuấn...", save: "Hoàn tất & Tiếp tục", skip: "Để sau" },
    "en-US": { title: "Set your display name", hint: "So partners and drivers know how to address you.", label: "Full name / Display name", placeholder: "e.g. Alex, John...", save: "Save and continue", skip: "Skip for now" },
  }[locale];
  const pinCopy = {
    "zh-CN": { setup: "设置 6 位安全码", setupHint: "设置 6 位安全 PIN 码，若以后忘记密码，可直接输入该 6 位码快速登录。", confirm: "再次输入 6 位密码", save: "保存安全码并继续", login: "用 6 位密码登录", loginHint: "输入注册邮箱或手机号以及 6 位安全码快速登录。", signIn: "登录", pin: "6 位密码", mismatch: "两次输入的 6 位密码不一致。" },
    "zh-TW": { setup: "設定 6 位安全碼", setupHint: "設定 6 位安全 PIN 碼，若以後忘記密碼，可直接輸入該 6 位碼快速登入。", confirm: "再次輸入 6 位密碼", save: "儲存安全碼並繼續", login: "使用 6 位密碼登入", loginHint: "輸入註冊信箱或手機號碼以及 6 位安全碼快速登入。", signIn: "登入", pin: "6 位密碼", mismatch: "兩次輸入的 6 位密碼不一致。" },
    "vi-VN": { setup: "Tạo mã PIN 6 số bảo mật", setupHint: "Tạo mã PIN 6 số để sau này nếu lỡ quên mật khẩu, bạn có thể dùng mã PIN này để đăng nhập ngay.", confirm: "Nhập lại mã PIN 6 số", save: "Lưu mã PIN & Tiếp tục", login: "Đăng nhập bằng PIN 6 số", loginHint: "Nhập email hoặc số điện thoại và mã PIN 6 số của bạn.", signIn: "Đăng nhập", pin: "Mã PIN 6 số", mismatch: "Hai mã PIN 6 số chưa khớp." },
    "en-US": { setup: "Create a 6-digit PIN", setupHint: "Create a 6-digit PIN so you can sign in anytime if you forget your password.", confirm: "Confirm 6-digit PIN", save: "Save PIN & Continue", login: "Sign in with 6-digit PIN", loginHint: "Enter your email or phone and your 6-digit PIN.", signIn: "Sign in", pin: "6-digit PIN", mismatch: "6-digit PINs do not match." },
  }[locale];

  async function startOtp() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/unified/identity/otp/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel: "sms", phone: normalizedPhone, locale }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error?.code || "OTP_START_FAILED");
      setChallenge(j.data);
      setResendAt(Date.now() + Number(j.data?.resendAfterSeconds || 45) * 1000);
      setNow(Date.now());
      setCode("");
    } catch (err) {
      const providerCode = err instanceof Error ? err.message : "";
      const isChina = dialCode === "+86";
      const message =
        providerCode === "PHONE_ALREADY_REGISTERED"
          ? locale === "vi-VN"
            ? "Số này đã đăng ký. Hãy chọn “Đăng nhập bằng PIN 6 số”."
            : locale.startsWith("zh")
              ? "此号码已注册，请使用 6 位 PIN 登录。"
              : "This phone is already registered. Sign in with your 6-digit PIN."
          : providerCode === "OTP_ALREADY_SENT"
            ? locale === "vi-VN"
              ? "Mã OTP cho số này đang còn hiệu lực. Hãy chờ hết thời gian rồi gửi lại."
              : locale.startsWith("zh")
                ? "该号码的验证码仍有效，请稍后再试。"
                : "An OTP for this number is still active. Please wait before trying again."
            : providerCode === "UNIMATRIX_107111"
              ? locale === "vi-VN"
                ? "Số điện thoại không hợp lệ. Vui lòng kiểm tra lại số vừa nhập."
                : locale.startsWith("zh")
                  ? "手机号码格式不正确，请检查后重试。"
                  : "Invalid phone number. Please check and try again."
              : isChina && (providerCode.startsWith("UNIMATRIX_") || providerCode === "OTP_PROVIDER_NOT_CONFIGURED")
              ? locale === "vi-VN"
                ? "Chưa gửi OTP: tài khoản Unimatrix China cần chữ ký SMS +86 đã được duyệt."
                : locale.startsWith("zh")
                  ? "验证码尚未发送：Unimatrix China 账户需要已审核的 +86 短信签名。"
                  : "No OTP was sent: the Unimatrix China account requires an approved +86 SMS signature."
              : sanitizeAuthError(err, locale, c.invalid);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/unified/identity/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel: "sms", phone: normalizedPhone, challengeId: challenge.challengeId, code }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error?.code || "OTP_VERIFY_FAILED");
      saveServerSession(j.data, role);
      setChallenge(null);
      setPinStage("setup");
    } catch (err) {
      setError(sanitizeAuthError(err, locale, c.invalid));
    } finally {
      setBusy(false);
    }
  }

  async function savePin() {
    if (pinValue.length !== 6 || pinConfirm.length !== 6) {
      setError(locale === "vi-VN" ? "Vui lòng nhập đủ 6 chữ số cho cả 2 ô." : "Please enter all 6 digits in both fields.");
      return;
    }
    if (pinValue !== pinConfirm) {
      setError(pinCopy.mismatch);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/unified/identity/pin/set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: pinValue }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || j?.error?.code || "PIN_SET_FAILED");
      setPinStage("none");
      onVerified?.();
    } catch (err: any) {
      setError(sanitizeAuthError(err, locale, c.invalid));
    } finally {
      setBusy(false);
    }
  }

  async function saveName() {
    if (!nameValue.trim()) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/customer-profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: nameValue.trim() }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error();
      const current = readSession();
      if (current) {
        saveSession({ ...current, displayName: nameValue.trim() });
      }
      onVerified?.();
    } catch {
      onVerified?.();
    } finally {
      setBusy(false);
    }
  }

  async function loginWithEmail() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError(locale === "vi-VN" ? "Vui lòng nhập địa chỉ email hợp lệ." : "Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError(locale === "vi-VN" ? "Mật khẩu phải có ít nhất 6 ký tự." : "Password must be at least 6 characters.");
      return;
    }
    if (authMode === "register") {
      if (confirmPassword !== password) {
        setError(emailCopy.mismatch);
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/unified/identity/account/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          role,
          email: trimmedEmail,
          password,
          mode: authMode,
          locale,
          deviceId: getDeviceId(),
          deviceName: deviceName(),
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error?.message || j?.error?.code || "ACCOUNT_LOGIN_FAILED");
      }
      saveServerSession(j.data, role);
      if (authMode === "register" || j.data?.isNewUser) {
        setPinValue("");
        setPinConfirm("");
        setPinStage("setup");
      } else {
        onVerified?.();
      }
    } catch (err: any) {
      setError(sanitizeAuthError(err, locale, c.invalid));
    } finally {
      setBusy(false);
    }
  }

  async function saveCompleteProfile() {
    setBusy(true);
    setError("");
    try {
      const formattedPhone = phone.trim() ? `${dialCode}${phone.replace(/\D/g, "")}` : "";
      const payload: any = {};
      if (nameValue.trim()) payload.displayName = nameValue.trim();
      if (formattedPhone) payload.phone = formattedPhone;

      if (Object.keys(payload).length > 0) {
        const r = await fetch("/api/customer-profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        await r.json().catch(() => null);
        const current = readSession();
        if (current) {
          saveSession({
            ...current,
            ...(payload.displayName ? { displayName: payload.displayName } : {}),
            ...(payload.phone ? { phone: payload.phone } : {}),
          });
        }
      }
      onVerified?.();
    } catch {
      onVerified?.();
    } finally {
      setBusy(false);
    }
  }

  async function loginWithPin() {
    if (pinValue.length !== 6) {
      setError(locale === "vi-VN" ? "Vui lòng nhập đủ 6 chữ số mã PIN." : "PIN must be 6 digits.");
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    const isEmailLogin = usePinLogin || (!normalizedPhone && trimmedEmail);
    if (isEmailLogin && (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))) {
      setError(locale === "vi-VN" ? "Vui lòng nhập email đã đăng ký tài khoản." : "Please enter a valid email address.");
      return;
    }
    if (!isEmailLogin && !/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setError(locale === "vi-VN" ? "Vui lòng nhập số điện thoại hợp lệ." : "Please enter a valid phone number.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/unified/identity/pin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          role,
          email: isEmailLogin ? trimmedEmail : undefined,
          phone: !isEmailLogin ? normalizedPhone : undefined,
          pin: pinValue,
          deviceId: getDeviceId(),
          deviceName: deviceName(),
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message || j?.error?.code || "PIN_LOGIN_FAILED");
      saveServerSession(j.data, role);
      onVerified?.();
    } catch (err: any) {
      setError(sanitizeAuthError(err, locale, c.invalid));
    } finally {
      setBusy(false);
    }
  }

  const resendSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const isInline = Boolean(inline);

  const modernPhoneInput = (
    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
      {c.phone}
      <div style={{
        display: "flex",
        alignItems: "center",
        border: 0,
        borderRadius: 14,
        background: "#F8FAFC",
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
        overflow: "hidden",
      }}>
        <select
          value={dialCode}
          onChange={e => setDialCode(e.target.value)}
          disabled={Boolean(challenge)}
          aria-label="Country calling code"
          style={{
            border: 0,
            background: "transparent",
            padding: "12px 6px 12px 12px",
            fontWeight: 700,
            fontSize: 14,
            color: "#1E293B",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {countryOptions.map(country => (
            <option key={country.code} value={country.code}>{country.label}</option>
          ))}
        </select>
        <div style={{ width: 1, height: 24, background: "#E2E8F0", margin: "0 2px" }} />
        <input
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={dialCode === "+86" ? "138 1234 5678" : c.phoneHint}
          disabled={Boolean(challenge)}
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            background: "transparent",
            padding: "12px 14px",
            fontSize: 15,
            fontWeight: 600,
            color: "#0F172A",
            outline: "none",
          }}
        />
      </div>
    </label>
  );

  const cardContent = (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 3px 12px rgba(15, 23, 42, 0.08)",
            background: "#FFFFFF",
            flexShrink: 0,
          }}>
            <img
              src="/brand-logo.png"
              alt="ZhaoXi"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#059669", letterSpacing: "0.08em", textTransform: "uppercase" }}>ZHAOXI ACCOUNT</div>
            <h2 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>
              {pinStage === "setup"
                ? pinCopy.setup
                : pinStage === "complete_profile"
                ? completeCopy.title
                : pinStage === "name"
                ? nameCopy.title
                : usePinLogin
                ? emailCopy.pinLoginTitle
                : authMode === "register"
                ? emailCopy.tabSignUp
                : (role === "partner" && authTab === "pin")
                ? pinCopy.login
                : emailCopy.tabSignIn}
            </h2>
          </div>
        </div>
        {!isInline && (
          <button
            type="button"
            onClick={onClose}
            aria-label={c.close}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#F1F5F9",
              border: 0,
              color: "#64748B",
              fontSize: 16,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              boxShadow: "none",
            }}
          >
            ✕
          </button>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 13, color: "#64748B", lineHeight: 1.45 }}>
        {pinStage === "setup"
          ? pinCopy.setupHint
          : pinStage === "complete_profile"
          ? completeCopy.hint
          : pinStage === "name"
          ? nameCopy.hint
          : usePinLogin
          ? emailCopy.pinLoginHint
          : authMode === "register"
          ? (locale === "vi-VN" ? "Tạo tài khoản với email và mật khẩu an toàn." : "Create an account with email and password.")
          : (role === "partner" && authTab === "pin")
          ? pinCopy.loginHint
          : c.body}
      </p>

      {error && (
        <div style={{
          padding: "10px 14px",
          borderRadius: 12,
          background: "#FEF2F2",
          border: "1px solid #FEE2E2",
          color: "#991B1B",
          fontSize: 13,
          lineHeight: 1.45,
          fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      {pinStage === "complete_profile" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
            {completeCopy.nameLabel}
            <input
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              placeholder={completeCopy.namePlaceholder}
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: 48,
                padding: "0 14px",
                borderRadius: 14,
                border: 0,
                background: "#F8FAFC",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
                fontSize: 15,
                fontWeight: 600,
                color: "#0F172A",
                outline: "none",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
            {completeCopy.phoneLabel}
            <div style={{
              display: "flex",
              alignItems: "center",
              border: 0,
              borderRadius: 14,
              background: "#F8FAFC",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
              overflow: "hidden",
            }}>
              <select
                value={dialCode}
                onChange={e => setDialCode(e.target.value)}
                aria-label="Country calling code"
                style={{
                  border: 0,
                  background: "transparent",
                  padding: "12px 6px 12px 12px",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#1E293B",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {countryOptions.map(country => (
                  <option key={country.code} value={country.code}>{country.label}</option>
                ))}
              </select>
              <div style={{ width: 1, height: 24, background: "#E2E8F0", margin: "0 2px" }} />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={completeCopy.phonePlaceholder}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 0,
                  background: "transparent",
                  padding: "12px 14px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#0F172A",
                  outline: "none",
                }}
              />
            </div>
          </label>
          <button
            type="button"
            disabled={busy || (!nameValue.trim() && !phone.trim())}
            onClick={() => void saveCompleteProfile()}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 14,
              background: "#059669",
              color: "#FFFFFF",
              border: 0,
              fontWeight: 800,
              fontSize: 15,
              cursor: busy || (!nameValue.trim() && !phone.trim()) ? "not-allowed" : "pointer",
              opacity: busy || (!nameValue.trim() && !phone.trim()) ? 0.6 : 1,
              boxShadow: "none",
            }}
          >
            {busy ? c.verifying : completeCopy.save}
          </button>
          <button
            type="button"
            onClick={onVerified}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 14,
              background: "#F1F5F9",
              color: "#475569",
              border: "1px solid #E2E8F0",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "none",
            }}
          >
            {completeCopy.skip}
          </button>
        </div>
      ) : pinStage === "name" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
            {nameCopy.label}
            <input
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              placeholder={nameCopy.placeholder}
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: 48,
                padding: "0 14px",
                borderRadius: 14,
                border: 0,
                background: "#F8FAFC",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
                fontSize: 15,
                fontWeight: 600,
                color: "#0F172A",
                outline: "none",
              }}
            />
          </label>
          <button
            type="button"
            disabled={busy || !nameValue.trim()}
            onClick={() => void saveName()}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 14,
              background: "#059669",
              color: "#FFFFFF",
              border: 0,
              fontWeight: 800,
              fontSize: 15,
              cursor: busy || !nameValue.trim() ? "not-allowed" : "pointer",
              opacity: busy || !nameValue.trim() ? 0.6 : 1,
              boxShadow: "none",
            }}
          >
            {busy ? c.verifying : nameCopy.save}
          </button>
          <button
            type="button"
            onClick={onVerified}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 14,
              background: "#F1F5F9",
              color: "#475569",
              border: "1px solid #E2E8F0",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "none",
            }}
          >
            {nameCopy.skip}
          </button>
        </div>
      ) : pinStage === "setup" ? (
        <div style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
            {pinCopy.pin}
            <input
              value={pinValue}
              onChange={e => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              type="password"
              placeholder="••••••"
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: 50,
                padding: "0 16px",
                borderRadius: 14,
                border: 0,
                outline: "none",
                background: "#F8FAFC",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
                textAlign: "center",
                letterSpacing: "0.4em",
                fontSize: 22,
                fontWeight: 800,
                color: "#0F172A",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
            {pinCopy.confirm}
            <input
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              type="password"
              placeholder="••••••"
              onKeyDown={e => { if (e.key === "Enter") void savePin(); }}
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: 50,
                padding: "0 16px",
                borderRadius: 14,
                border: 0,
                outline: "none",
                background: "#F8FAFC",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
                textAlign: "center",
                letterSpacing: "0.4em",
                fontSize: 22,
                fontWeight: 800,
                color: "#0F172A",
              }}
            />
          </label>
          <button
            type="button"
            disabled={busy || pinValue.length !== 6 || pinConfirm.length !== 6}
            onClick={() => void savePin()}
            style={{
              width: "100%",
              height: 50,
              borderRadius: 14,
              background: "#059669",
              color: "#FFFFFF",
              border: 0,
              fontWeight: 800,
              fontSize: 15,
              cursor: busy || pinValue.length !== 6 || pinConfirm.length !== 6 ? "not-allowed" : "pointer",
              opacity: busy || pinValue.length !== 6 || pinConfirm.length !== 6 ? 0.6 : 1,
              boxShadow: "none",
            }}
          >
            {busy ? c.verifying : pinCopy.save}
          </button>
          <button
            type="button"
            onClick={onVerified}
            style={{
              width: "100%",
              height: 38,
              borderRadius: 12,
              background: "transparent",
              color: "#64748B",
              border: 0,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: "none",
            }}
          >
            {locale === "vi-VN" ? "Để sau / Bỏ qua" : "Skip for now"}
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {role === "partner" && (
            <div style={{
              display: "flex",
              background: "#F1F5F9",
              padding: 4,
              borderRadius: 14,
              gap: 4,
            }}>
              <button
                type="button"
                onClick={() => { setAuthTab("email"); setError(""); setUsePinLogin(false); }}
                style={{
                  flex: 1,
                  border: 0,
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontWeight: 750,
                  background: authTab === "email" ? "#FFFFFF" : "transparent",
                  color: authTab === "email" ? "#0F172A" : "#64748B",
                  boxShadow: authTab === "email" ? "0 2px 8px rgba(15, 23, 42, 0.08)" : "none",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
              >
                {emailCopy.tabEmail}
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab("pin"); setError(""); }}
                style={{
                  flex: 1,
                  border: 0,
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontWeight: 750,
                  background: authTab === "pin" ? "#FFFFFF" : "transparent",
                  color: authTab === "pin" ? "#0F172A" : "#64748B",
                  boxShadow: authTab === "pin" ? "0 2px 8px rgba(15, 23, 42, 0.08)" : "none",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
              >
                {emailCopy.tabPin}
              </button>
            </div>
          )}

          {role === "customer" || authTab === "email" ? (
            <div style={{ display: "grid", gap: 12 }}>
              {/* Segmented control: Đăng nhập vs Đăng ký */}
              <div style={{
                display: "flex",
                background: "#F1F5F9",
                padding: 4,
                borderRadius: 14,
                gap: 4,
              }}>
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setError(""); setUsePinLogin(false); }}
                  style={{
                    flex: 1,
                    border: 0,
                    borderRadius: 10,
                    padding: "9px 12px",
                    fontSize: 13,
                    fontWeight: 750,
                    background: authMode === "login" && !usePinLogin ? "#FFFFFF" : "transparent",
                    color: authMode === "login" && !usePinLogin ? "#0F172A" : "#64748B",
                    boxShadow: authMode === "login" && !usePinLogin ? "0 2px 8px rgba(15, 23, 42, 0.08)" : "none",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  {emailCopy.tabSignIn}
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("register"); setError(""); setUsePinLogin(false); }}
                  style={{
                    flex: 1,
                    border: 0,
                    borderRadius: 10,
                    padding: "9px 12px",
                    fontSize: 13,
                    fontWeight: 750,
                    background: authMode === "register" ? "#FFFFFF" : "transparent",
                    color: authMode === "register" ? "#0F172A" : "#64748B",
                    boxShadow: authMode === "register" ? "0 2px 8px rgba(15, 23, 42, 0.08)" : "none",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  {emailCopy.tabSignUp}
                </button>
              </div>

              {usePinLogin ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
                    {emailCopy.email}
                    <input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      type="email"
                      autoComplete="email"
                      placeholder={emailCopy.emailPlaceholder}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        height: 50,
                        padding: "0 16px",
                        borderRadius: 14,
                        border: 0,
                        outline: "none",
                        background: "#F8FAFC",
                        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#0F172A",
                      }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
                    {pinCopy.pin}
                    <input
                      value={pinValue}
                      onChange={e => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      type="password"
                      placeholder="••••••"
                      onKeyDown={e => { if (e.key === "Enter") void loginWithPin(); }}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        height: 50,
                        padding: "0 16px",
                        borderRadius: 14,
                        border: 0,
                        outline: "none",
                        background: "#F8FAFC",
                        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
                        textAlign: "center",
                        letterSpacing: "0.4em",
                        fontSize: 22,
                        fontWeight: 800,
                        color: "#0F172A",
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || pinValue.length !== 6 || !email.trim()}
                    onClick={() => void loginWithPin()}
                    style={{
                      width: "100%",
                      height: 50,
                      borderRadius: 14,
                      background: "#059669",
                      color: "#FFFFFF",
                      border: 0,
                      fontWeight: 800,
                      fontSize: 15,
                      cursor: busy || pinValue.length !== 6 || !email.trim() ? "not-allowed" : "pointer",
                      opacity: busy || pinValue.length !== 6 || !email.trim() ? 0.6 : 1,
                      boxShadow: "none",
                    }}
                  >
                    {busy ? c.verifying : pinCopy.signIn}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUsePinLogin(false); setError(""); }}
                    style={{
                      width: "100%",
                      height: 38,
                      borderRadius: 12,
                      background: "transparent",
                      color: "#059669",
                      border: 0,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      boxShadow: "none",
                    }}
                  >
                    {emailCopy.backToPassword}
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
                    {emailCopy.email}
                    <input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      type="email"
                      autoComplete="email"
                      placeholder={emailCopy.emailPlaceholder}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        height: 50,
                        padding: "0 16px",
                        borderRadius: 14,
                        border: 0,
                        outline: "none",
                        background: "#F8FAFC",
                        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#0F172A",
                      }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
                    {emailCopy.password}
                    <div style={{ position: "relative" }}>
                      <input
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        autoComplete={authMode === "login" ? "current-password" : "new-password"}
                        placeholder={emailCopy.passwordPlaceholder}
                        onKeyDown={e => { if (e.key === "Enter" && authMode === "login") void loginWithEmail(); }}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          height: 50,
                          padding: "0 46px 0 16px",
                          borderRadius: 14,
                          border: 0,
                          outline: "none",
                          background: "#F8FAFC",
                          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
                          fontSize: 15,
                          fontWeight: 600,
                          color: "#0F172A",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          border: 0,
                          background: "transparent",
                          padding: 6,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "none",
                        }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <EyeToggleIcon visible={showPassword} />
                      </button>
                    </div>
                  </label>

                  {authMode === "register" && (
                    <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
                      {emailCopy.confirmPassword}
                      <div style={{ position: "relative" }}>
                        <input
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder={emailCopy.confirmPasswordPlaceholder}
                          onKeyDown={e => { if (e.key === "Enter") void loginWithEmail(); }}
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            height: 50,
                            padding: "0 46px 0 16px",
                            borderRadius: 14,
                            border: 0,
                            outline: "none",
                            background: "#F8FAFC",
                            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
                            fontSize: 15,
                            fontWeight: 600,
                            color: "#0F172A",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(p => !p)}
                          style={{
                            position: "absolute",
                            right: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            border: 0,
                            background: "transparent",
                            padding: 6,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "none",
                          }}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          <EyeToggleIcon visible={showConfirmPassword} />
                        </button>
                      </div>
                    </label>
                  )}

                  <button
                    type="button"
                    disabled={busy || !email.trim() || password.length < 6 || (authMode === "register" && confirmPassword.length < 6)}
                    onClick={() => void loginWithEmail()}
                    style={{
                      width: "100%",
                      height: 50,
                      borderRadius: 14,
                      background: "#059669",
                      color: "#FFFFFF",
                      border: 0,
                      fontWeight: 800,
                      fontSize: 15,
                      cursor: busy || !email.trim() || password.length < 6 || (authMode === "register" && confirmPassword.length < 6) ? "not-allowed" : "pointer",
                      opacity: busy || !email.trim() || password.length < 6 || (authMode === "register" && confirmPassword.length < 6) ? 0.6 : 1,
                      boxShadow: "none",
                      marginTop: 2,
                    }}
                  >
                    {busy ? c.verifying : authMode === "register" ? emailCopy.submitRegister : emailCopy.submitLogin}
                  </button>

                  {authMode === "login" ? (
                    <button
                      type="button"
                      onClick={() => { setUsePinLogin(true); setError(""); }}
                      style={{
                        background: "transparent",
                        border: 0,
                        color: "#059669",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: "6px 0",
                        textAlign: "center",
                        boxShadow: "none",
                      }}
                    >
                      {emailCopy.forgotPasswordPin}
                    </button>
                  ) : (
                    <small style={{ textAlign: "center", color: "#94A3B8", fontSize: 11.5, lineHeight: 1.4 }}>
                      {emailCopy.autoHint}
                    </small>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {modernPhoneInput}
              <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155" }}>
                {pinCopy.pin}
                <input
                  value={pinValue}
                  onChange={e => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  type="password"
                  placeholder="••••••"
                  onKeyDown={e => { if (e.key === "Enter") void loginWithPin(); }}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    height: 50,
                    padding: "0 16px",
                    borderRadius: 14,
                    border: 0,
                    outline: "none",
                    background: "#F8FAFC",
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)",
                    textAlign: "center",
                    letterSpacing: "0.4em",
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#0F172A",
                  }}
                />
              </label>
              <button
                type="button"
                disabled={busy || pinValue.length !== 6 || !/^\+[1-9]\d{7,14}$/.test(normalizedPhone)}
                onClick={() => void loginWithPin()}
                style={{
                  width: "100%",
                  height: 50,
                  borderRadius: 14,
                  background: "#059669",
                  color: "#FFFFFF",
                  border: 0,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: busy || pinValue.length !== 6 || !/^\+[1-9]\d{7,14}$/.test(normalizedPhone) ? "not-allowed" : "pointer",
                  opacity: busy || pinValue.length !== 6 || !/^\+[1-9]\d{7,14}$/.test(normalizedPhone) ? 0.6 : 1,
                  boxShadow: "none",
                }}
              >
                {busy ? c.verifying : pinCopy.signIn}
              </button>
            </div>
          )}
        </div>
      )}

      {!isInline && (
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            height: 40,
            borderRadius: 12,
            background: "transparent",
            color: "#64748B",
            border: 0,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: "none",
          }}
        >
          {c.close}
        </button>
      )}
    </div>
  );

  if (isInline) {
    return (
      <div style={{
        width: "100%",
        maxWidth: 440,
        margin: "0 auto",
        background: "#FFFFFF",
        borderRadius: 28,
        border: 0,
        padding: "28px 24px",
        boxShadow: "0 12px 40px rgba(15,23,42,0.08)",
      }}>
        {cardContent}
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "grid",
        placeItems: "center",
        padding: "20px 16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(440px, 100%)",
          background: "#FFFFFF",
          borderRadius: 28,
          padding: "28px 24px",
          border: 0,
          boxShadow: "0 24px 64px -12px rgba(15, 23, 42, 0.25), 0 8px 24px -4px rgba(15, 23, 42, 0.1)",
          maxHeight: "calc(100dvh - 40px)",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {cardContent}
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: 12, borderRadius: 12, border: `1px solid ${uiTokens.colors.border}`, background: "white" };

export function PlatformGate({ role, children }: { role: ZhaoXiRole; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locale, setLocale] = useState<ZhaoXiLocale | null>(null);
  const [session, setSession] = useState<ZhaoXiSession | null>(null);
  const finishGuestEntry = useCallback(() => setSession(readSession()), []);

  useEffect(() => {
    let cancelled=false;
    void (async()=>{
      try{
        const urlLocale=new URLSearchParams(window.location.search).get("lang");
        const storedLocale=window.localStorage.getItem(LOCALE_STORAGE_KEY);
        const resolvedLocale=urlLocale?normalizeLocale(urlLocale):(storedLocale?normalizeLocale(storedLocale):null);
        if(urlLocale)saveBrowserLocale(normalizeLocale(urlLocale));
        if(!cancelled)setLocale(resolvedLocale);
        let current=null;
        try{current=readSession();}catch(error){console.error("ZHAOXI_READ_SESSION_FAILED",error);clearSession();current=null;}
        if(current?.sessionMode==="server"){try{const validated=await refreshServerSession();current=validated;if(!validated)clearSession();}catch(error){console.error("ZHAOXI_REFRESH_SESSION_FAILED",error);clearSession();current=null;}}
        if(!cancelled)setSession(current);
      }catch(error){console.error("ZHAOXI_PLATFORM_GATE_INIT_FAILED",error);if(!cancelled){setSession(null);setLocale(prev=>prev||"vi-VN");}}
      finally{if(!cancelled)setReady(true);}
    })();
    return()=>{cancelled=true;};
  }, []);

  if (!ready) return <main style={{ ...appShellStyle, display: "grid", placeItems: "center" }}>…</main>;
  if (!locale) return <LanguageStep onDone={setLocale} />;
  if (!session || session.role !== role) return (role==="customer" || role==="partner")?<PhoneEntryStep role={role} locale={locale} onDone={finishGuestEntry}/>:<LoginStep role={role} locale={locale} onDone={finishGuestEntry} />;
  return <>{children}</>;
}

export function SessionToolbar() {
  const session = useZhaoXiSession();
  const { locale, setLocale } = useZhaoXiLocale();
  const { theme, toggleTheme } = useZhaoXiTheme();
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const readCart = () => {
      try {
        const val = JSON.parse(localStorage.getItem("zhaoxi_cart_v2") || "[]");
        if (Array.isArray(val)) {
          setCartCount(val.reduce((sum: number, x: any) => sum + (Number(x?.quantity) || 0), 0));
        } else {
          setCartCount(0);
        }
      } catch {
        setCartCount(0);
      }
    };
    readCart();
    window.addEventListener("storage", readCart);
    window.addEventListener("zhaoxi-cart-change", readCart);
    return () => {
      window.removeEventListener("storage", readCart);
      window.removeEventListener("zhaoxi-cart-change", readCart);
    };
  }, []);

  if (!session) return null;
  const t = gateCopy[locale];
  const copy = {
    "zh-CN": { theme:"界面", notification:"通知", cart:"购物车", assistant:"赵喜助手", customer:"客户", partner:"合作伙伴", admin:"管理端", driver:"配送员", assistantDescription:"赵喜平台导航与运营助手。", support:"支持", close:"关闭" },
    "zh-TW": { theme:"介面", notification:"通知", cart:"購物車", assistant:"趙喜助手", customer:"客戶", partner:"合作夥伴", admin:"管理端", driver:"配送員", assistantDescription:"趙喜平台導航與營運助手。", support:"支援", close:"關閉" },
    "vi-VN": { theme:"Giao diện", notification:"Thông báo", cart:"Giỏ hàng", assistant:"Trợ lý ZhaoXi", customer:"Khách hàng", partner:"Đối tác", admin:"Quản trị", driver:"Tài xế", assistantDescription:"Trợ lý điều hướng và hỗ trợ vận hành ZhaoXi.", support:"Hỗ trợ", close:"Đóng" },
    "en-US": { theme:"Theme", notification:"Notifications", cart:"Cart", assistant:"ZhaoXi Assistant", customer:"Customer", partner:"Partner", admin:"Admin", driver:"Driver", assistantDescription:"ZhaoXi navigation and operations assistant.", support:"Support", close:"Close" },
  }[locale] as any;
  const roleLabel=(copy as any)[session.role]||"ZhaoXi";
  const localeShort=locale==="vi-VN"?"VI":locale==="en-US"?"EN":"ZH";
  return <>
    <header className="zx-global-topbar" data-unified-top-bar="18.3.3">
      <div className="zx-topbar-brand">
        <div className="zx-topbar-logo"><img src="/brand-logo.png" alt="ZhaoXi" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"inherit",display:"block"}} /></div>
        <div className="zx-topbar-copy"><strong>ZHAOXI</strong><small>{session.displayName && session.displayName !== roleLabel && session.displayName !== "WeChat user" ? `${roleLabel} · ${session.displayName}` : roleLabel}</small></div>
      </div>
      <div className="zx-topbar-actions">
        <label className="zx-topbar-language" aria-label={gateCopy[locale].chooseLanguage}>
          <span className="zx-topbar-globe">◎</span><b>{localeShort}</b>
          <select value={locale} onChange={(event) => setLocale(event.target.value as ZhaoXiLocale)}>
            <option value="vi-VN">VI</option><option value="en-US">EN</option><option value="zh-CN">ZH</option><option value="zh-TW">ZH-TW</option>
          </select>
        </label>
        {session.role === "customer" && (
          <button className="zx-topbar-icon zx-topbar-cart" type="button" onClick={()=>{window.location.href="/cart"}} aria-label={copy.cart}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            {cartCount > 0 && <i>{cartCount > 99 ? "99+" : cartCount}</i>}
          </button>
        )}
        <button className="zx-topbar-icon zx-topbar-notify" type="button" onClick={()=>{window.location.href=session.role==="customer"?"/notifications":"/support";}} aria-label={copy.notification}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 5 2 5.2 2 7H4.5c0-1.8 2-2 2-7M10 19h4"/></svg>
        </button>
        <button className="zx-topbar-icon zx-topbar-logout" type="button" onClick={() => { void logoutZhaoXiSession().finally(() => { window.location.href = "/"; }); }} aria-label={t.logout}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M13 8l4 4-4 4M8 12h9"/></svg>
        </button>
      </div>
    </header>
    {assistantOpen&&<div className="zx-assistant-backdrop" onClick={()=>setAssistantOpen(false)}><section className="zx-assistant-sheet" onClick={e=>e.stopPropagation()}><header><div className="zx-assistant-avatar"><svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4"/><path d="M7 19c.7-3.1 2.4-4.8 5-4.8s4.3 1.7 5 4.8M6.2 8.5A5.8 5.8 0 0 1 12 3a5.8 5.8 0 0 1 5.8 5.5M5.7 9.2v3.2M18.3 9.2v3.2"/></svg></div><div><b>{copy.assistant}</b><small>ZHAOXI AI</small></div><button onClick={()=>setAssistantOpen(false)}>×</button></header><p>{copy.assistantDescription}</p><div className="zx-assistant-quick"><button onClick={()=>{setAssistantOpen(false);window.location.href="/support"}}>{copy.support}</button><button onClick={()=>setAssistantOpen(false)}>{copy.close}</button></div></section></div>}
    <style>{`
      .zx-global-topbar{position:sticky;top:0;z-index:1000;width:min(calc(100% - 20px),1480px);min-height:60px;height:calc(60px + env(safe-area-inset-top));margin:0 auto 8px;box-sizing:border-box;padding:calc(8px + env(safe-area-inset-top)) 10px 8px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.92);border-radius:0 0 18px 18px;backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);box-shadow:0 8px 26px rgba(43,61,97,.09)}
      .zx-topbar-brand,.zx-topbar-actions{display:flex;align-items:center}.zx-topbar-brand{gap:8px;min-width:0;flex:1;max-width:none}
      .zx-topbar-logo{width:36px;height:36px;flex:0 0 36px;border-radius:12px;display:grid;place-items:center;background:transparent;overflow:hidden}
      .zx-topbar-copy{min-width:0;display:grid;line-height:1.15}.zx-topbar-copy strong{font-size:14px;letter-spacing:.03em;color:var(--zx-toolbar-text,#111827);white-space:nowrap}.zx-topbar-copy small{max-width:none;margin-top:2px;overflow:visible;text-overflow:clip;white-space:nowrap;color:var(--zx-toolbar-muted,#6B7280);font-size:10px;font-weight:600}
      .zx-topbar-actions{gap:5px;justify-content:flex-end;flex-shrink:0}.zx-topbar-language,.zx-topbar-icon{height:36px;border:1px solid rgba(224,229,236,.92);border-radius:12px;background:rgba(255,255,255,.74);color:var(--zx-toolbar-text,#111827);box-shadow:inset 0 1px 0 rgba(255,255,255,.88),0 4px 13px rgba(43,61,97,.05)}
      .zx-topbar-language{position:relative;min-width:45px;padding:0 7px;display:flex;align-items:center;justify-content:center;gap:4px}.zx-topbar-language b{font-size:10px}.zx-topbar-globe{font-size:12px;color:#2563EB}.zx-topbar-language select{position:absolute;inset:0;width:100%;opacity:0;cursor:pointer}.zx-topbar-icon{width:36px;padding:0;display:grid;place-items:center;font-size:17px}
      .zx-topbar-icon svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .zx-topbar-cart{position:relative;color:#374151}
      .zx-topbar-cart i{position:absolute;right:-4px;top:-5px;min-width:16px;height:16px;padding:0 3px;display:grid;place-items:center;border-radius:999px;background:#07C160;color:#fff;border:1.5px solid white;font-size:8px;font-style:normal;font-weight:800}
      .zx-topbar-notify{position:relative;color:#374151}.zx-topbar-notify i{position:absolute;right:-4px;top:-5px;min-width:16px;height:16px;padding:0 3px;display:grid;place-items:center;border-radius:999px;background:#EF4444;color:#fff;border:1.5px solid white;font-size:8px;font-style:normal;font-weight:800}.zx-topbar-logout{color:#EF4444;background:rgba(255,255,255,.78)}
      .zx-assistant-backdrop{position:fixed;inset:0;z-index:1800;background:rgba(15,23,42,.28);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center}.zx-assistant-sheet{width:min(100%,480px);padding:18px 18px calc(20px + env(safe-area-inset-bottom));border-radius:24px 24px 0 0;background:rgba(255,255,255,.96);box-shadow:0 -18px 50px rgba(15,23,42,.16)}.zx-assistant-sheet>header{display:grid;grid-template-columns:42px 1fr 36px;gap:10px;align-items:center}.zx-assistant-avatar{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(145deg,#EDE9FE,#D1FAE5);color:#7C3AED}.zx-assistant-avatar svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.7}.zx-assistant-sheet header>div:nth-child(2){display:grid}.zx-assistant-sheet header b{font-size:16px;color:#111827}.zx-assistant-sheet header small{font-size:10px;color:#6B7280}.zx-assistant-sheet header button{width:36px;height:36px;border:0;border-radius:11px;background:#F3F4F6;font-size:22px}.zx-assistant-sheet p{font-size:13px;color:#6B7280;line-height:1.45}.zx-assistant-quick{display:grid;grid-template-columns:1fr 1fr;gap:9px}.zx-assistant-quick button{height:42px;border:0;border-radius:12px;background:#ECFDF5;color:#047857;font-weight:700}.zx-assistant-quick button:last-child{background:#F3F4F6;color:#4B5563}
      @media(max-width:600px){.zx-global-topbar{width:100%;min-height:56px;height:calc(56px + env(safe-area-inset-top));margin:0 0 6px;padding:calc(7px + env(safe-area-inset-top)) 8px 7px;border-left:0;border-right:0;border-radius:0 0 17px 17px}.zx-topbar-brand{gap:6px;max-width:none}.zx-topbar-logo{width:34px;height:34px;flex-basis:34px;border-radius:11px;background:transparent;overflow:hidden}.zx-topbar-copy strong{font-size:12px;white-space:nowrap}.zx-topbar-copy small{display:block!important;max-width:none!important;font-size:9.5px!important;overflow:visible!important;text-overflow:clip!important;white-space:nowrap!important}.zx-topbar-actions{gap:4px}.zx-topbar-language,.zx-topbar-icon{height:34px}.zx-topbar-language{min-width:39px;padding:0 5px}.zx-topbar-language b{font-size:9px}.zx-topbar-globe{display:none}.zx-topbar-icon{width:34px}.zx-topbar-icon svg{width:18px;height:18px}}
      @media(max-width:390px){.zx-topbar-copy small{display:block!important;max-width:none!important;font-size:9px!important}.zx-topbar-brand{max-width:none}.zx-topbar-actions{gap:3px}.zx-topbar-language{min-width:36px}.zx-topbar-icon{width:32px}.zx-topbar-language,.zx-topbar-icon{height:32px}}
    `}</style>
  </>;
}
