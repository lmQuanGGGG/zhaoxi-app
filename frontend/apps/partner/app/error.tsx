"use client";

import { useEffect } from "react";
import { reportRuntimeError } from "@zhaoxi/observability";
import { useZhaoXiLocale, type ZhaoXiLocale } from "@zhaoxi/i18n";
const copy: Record<ZhaoXiLocale, { description:string; retry:string }> = { "zh-CN": { description:"应用暂时遇到问题。你的数据仍会保留，请重新加载页面。",retry:"重试" }, "zh-TW": { description:"應用程式暫時發生問題。你的資料仍會保留，請重新載入頁面。",retry:"重試" }, "vi-VN": { description:"Ứng dụng vừa gặp lỗi tạm thời. Dữ liệu của bạn vẫn được giữ. Hãy thử tải lại màn hình.",retry:"Thử lại" }, "en-US": { description:"The app hit a temporary issue. Your data is still safe; please try loading the screen again.",retry:"Try again" } };

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { locale } = useZhaoXiLocale();
  const t = copy[locale];
  useEffect(() => { console.error("[ZhaoXi Beta Runtime]", error); void reportRuntimeError("partner", error); }, [error]);
  return (
    <main style={{ minHeight:"100dvh", display:"grid", placeItems:"center", padding:24, background:"#f7faf8", color:"#17211b" }}>
      <section style={{ width:"min(100%,430px)", padding:24, border:"1px solid #dce7e0", borderRadius:22, background:"#fff", boxShadow:"0 16px 50px rgba(23,33,27,.08)", textAlign:"center" }}>
        <div style={{ fontSize:36 }}>⚠️</div>
        <h1 style={{ fontSize:22, margin:"10px 0 8px" }}>ZhaoXi</h1>
        <p style={{ color:"#64748b", lineHeight:1.6 }}>{t.description}</p>
        {error.digest && <code style={{ display:"block", margin:"12px 0", fontSize:18, color:"#94a3b8" }}>#{error.digest}</code>}
        <button onClick={reset} style={{ border:0, borderRadius:14, padding:"12px 18px", background:"#07c160", color:"#fff", fontWeight:800, cursor:"pointer" }}>{t.retry}</button>
      </section>
    </main>
  );
}
