import type { CSSProperties, ReactNode } from "react";

export const uiTokens = {
  colors: {
    primary: "#2E7D63",
    primaryDark: "#183F35",
    primarySoft: "#E3F0E8",
    brand: "#183F35",
    brandSoft: "#E3F0E8",
    text: "#18211E",
    muted: "#68716C",
    background: "#F6F4EF",
    surface: "#FFFFFF",
    glass: "rgba(255,255,255,.68)",
    glassStrong: "rgba(255,255,255,.82)",
    border: "transparent",
    hairline: "transparent",
    lavender: "#EFE7DD",
    iceBlue: "#E7F0EE",
    blush: "#F9E8E0",
    dark: "#14201D",
  },
  radius: { sm: 12, md: 16, lg: 20, xl: 28 },
  shadow: "0 16px 34px rgba(24,33,30,.10)",
  shadowSoft: "0 8px 20px rgba(24,33,30,.07)",
  blur: "blur(18px) saturate(135%)",
  fontFamily: 'Inter, "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif',
  auroraBackground: "#F6F4EF",
} as const;

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div style={{display:"flex",alignItems:"center",gap:10}}>
    <div style={{width:compact?38:46,height:compact?38:46,borderRadius:14,display:"grid",placeItems:"center",background:uiTokens.colors.brand,color:"white",fontWeight:800,fontSize:compact?17:20}}>赵喜</div>
    <div><div style={{fontWeight:800,fontSize:compact?18:22}}>赵喜</div><div style={{fontSize:12,opacity:.75}}>岘港华人生活服务平台</div></div>
  </div>;
}

export function MetricCard({ label, value, note }: { label:string; value:string|number; note?:string }) {
  return <div style={cardStyle}><div style={{fontSize:13,color:uiTokens.colors.muted}}>{label}</div><div style={{fontSize:27,fontWeight:800,color:uiTokens.colors.brand,marginTop:8}}>{value}</div>{note&&<div style={{fontSize:12,color:uiTokens.colors.muted,marginTop:5}}>{note}</div>}</div>;
}

export function Surface({ children, style }: { children:ReactNode; style?:CSSProperties }) {
  return <section style={{...cardStyle,...style}}>{children}</section>;
}

export function StatusBadge({ children, tone="green" }: { children:ReactNode; tone?:"green"|"orange"|"neutral" }) {
  const tones = tone === "orange"
    ? {background:uiTokens.colors.brandSoft,color:"#A75122"}
    : tone === "neutral" ? {background:"#EEF0EE",color:"#59605B"}
    : {background:"#EAF7F0",color:"#216649"};
  return <span style={{...tones,display:"inline-block",borderRadius:999,padding:"4px 9px",fontSize:12}}>{children}</span>;
}

export function PrimaryButton({ children }: { children:ReactNode }) {
  return <button type="button" style={{border:0,borderRadius:10,background:uiTokens.colors.primary,color:"white",padding:"10px 14px",fontWeight:700}}>{children}</button>;
}

export const appShellStyle: CSSProperties = {
  minHeight:"100dvh",
  background:uiTokens.auroraBackground,
  color:uiTokens.colors.text,
  fontFamily:uiTokens.fontFamily
};
export const cardStyle: CSSProperties = {
  background:uiTokens.colors.glassStrong,
  border:0,
  borderRadius:uiTokens.radius.lg,
  padding:17,
  boxShadow:uiTokens.shadowSoft,
  backdropFilter:uiTokens.blur,
  WebkitBackdropFilter:uiTokens.blur
};

export function ActionButton({ children, onClick, disabled=false, tone="primary" }: { children:ReactNode; onClick?:()=>void; disabled?:boolean; tone?:"primary"|"dark"|"danger"|"neutral" }) {
  const background = tone === "dark" ? "#0f172a" : tone === "danger" ? "#dc2626" : tone === "neutral" ? "#eef2f0" : uiTokens.colors.primary;
  const color = tone === "neutral" ? uiTokens.colors.text : "#fff";
  return <button type="button" onClick={onClick} disabled={disabled} style={{border:0,borderRadius:12,background,color,padding:"10px 14px",fontWeight:750,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.55:1}}>{children}</button>;
}

export function EmptyState({ title, description }: { title:string; description?:string }) {
  return <div style={{...cardStyle,textAlign:"center",padding:34,borderStyle:"dashed"}}><div style={{fontSize:28,marginBottom:8}}>喜</div><b>{title}</b>{description&&<p style={{color:uiTokens.colors.muted,marginBottom:0}}>{description}</p>}</div>;
}


export const mobileWorkspaceTokens = {
  phoneMax: 767,
  tabletMin: 768,
  tabletMax: 1199,
  contentPaddingPhone: 16,
  sectionGap: 24,
  cardRadius: 18,
  iconBox: 40,
  iconSize: 20,
  bottomNavHeight: 72,
} as const;

export const mobileCardStyle: CSSProperties = {
  background:"#FFFFFF",
  border:"1px solid rgba(255,255,255,.9)",
  borderRadius:18,
  padding:16,
  boxShadow:"0 4px 20px rgba(0,0,0,.04)",
  minWidth:0,
  boxSizing:"border-box"
};

export const mobileFieldStyle: CSSProperties = {
  width:"100%",
  minHeight:44,
  border:"1px solid #E5E7EB",
  borderRadius:10,
  background:"rgba(255,255,255,.92)",
  color:"#111827",
  padding:"0 12px",
  boxSizing:"border-box"
};

export{useZhaoXiDevice,MobileWorkspace,MobileCard,MobileToolbar,MobileDataList,MobileDataRow,MobileBottomSheet,mobileActionStyle,NativeFilterButton,NativeActionBar,NativeFullScreenSheet,ResponsiveRecordCard,NativeDetailSection,NativeTransactionSummary,NativeStatusPill,NativeWorkflowActions,NativeSearchFilterSheet,NativeDrillDown,NativeTimeline,NativeConfirmSheet,NativeStateView}from"./mobile-workspace";
export type{ZhaoXiDevice}from"./mobile-workspace";

export type{NativeViewState}from"./mobile-workspace";
