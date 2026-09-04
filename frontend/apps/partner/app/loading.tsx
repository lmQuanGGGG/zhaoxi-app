"use client";
import { useZhaoXiLocale, type ZhaoXiLocale } from "@zhaoxi/i18n";
const copy: Record<ZhaoXiLocale, string> = { "zh-CN": "ZhaoXi 正在加载…", "zh-TW": "ZhaoXi 正在載入…", "vi-VN": "ZhaoXi đang tải…", "en-US": "ZhaoXi is loading…" };
export default function Loading(){const { locale }=useZhaoXiLocale();return <main style={{minHeight:"100dvh",display:"grid",placeItems:"center",background:"#f7faf8"}}><div style={{width:"min(100%,430px)",padding:24,textAlign:"center"}}><div style={{fontSize:34}}>⏳</div><p style={{color:"#64748b",fontWeight:700}}>{copy[locale]}</p></div></main>}
