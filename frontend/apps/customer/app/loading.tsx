"use client";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
const copy={"zh-CN":"正在加载…","zh-TW":"正在載入…","vi-VN":"Đang tải…","en-US":"Loading…"} as const;
export default function Loading(){const{locale}=useZhaoXiLocale();return <main style={{minHeight:"100dvh",display:"grid",placeItems:"center",background:"#f7faf8"}}><div style={{width:"min(100%,430px)",padding:24,textAlign:"center"}}><div style={{width:48,height:48,borderRadius:16,margin:"0 auto 12px",overflow:"hidden",display:"grid",placeItems:"center"}}><img src="/brand-logo.png" alt="ZhaoXi" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div><p style={{color:"#64748b",fontWeight:700}}>{copy[locale]}</p></div></main>}
