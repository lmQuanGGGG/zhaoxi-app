"use client";
import type { ReactNode } from "react";
import { PlatformGate, SessionToolbar, type ZhaoXiRole } from "@zhaoxi/auth";
import { ZhaoXiI18nProvider } from "@zhaoxi/i18n";
import { ZhaoXiThemeProvider } from "@zhaoxi/theme";
import { UnifiedRoleNavigation } from "./role-navigation";

export type RuntimePlatform = "web"|"wechat-h5"|"wechat-mini-program";
export function detectRuntimePlatform(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent):RuntimePlatform { const ua=userAgent.toLowerCase(); if(ua.includes("miniprogram"))return "wechat-mini-program"; if(ua.includes("micromessenger"))return "wechat-h5"; return "web"; }
export type WeChatQrState = "idle"|"loading"|"waiting_scan"|"scanned"|"confirmed"|"expired"|"error";
export type WeChatQrSession = { id:string; role:ZhaoXiRole; state:WeChatQrState; qrUrl?:string; expiresAt?:string };

export function ZhaoXiFoundationApp({ role, children, alerts }: { role:ZhaoXiRole; children:ReactNode; alerts?:ReactNode }) {
 return <ZhaoXiI18nProvider><ZhaoXiThemeProvider><div className={role==="admin"?"zx-admin-app":role==="partner"?"zx-partner-app":"zx-mobile-app"} data-zhaoxi-foundation="14.0" data-customer-architecture={role==="customer"?"18.4.0":undefined}><PlatformGate role={role}><SessionToolbar/>{alerts}{children}{role==="customer"&&<UnifiedRoleNavigation role={role}/>}</PlatformGate></div></ZhaoXiThemeProvider></ZhaoXiI18nProvider>;
}

export{UnifiedRoleNavigation}from"./role-navigation";
