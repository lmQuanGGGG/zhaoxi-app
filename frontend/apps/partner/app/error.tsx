"use client";

import { useEffect } from "react";
import { reportRuntimeError } from "@zhaoxi/observability";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[ZhaoXi Beta Runtime]", error); void reportRuntimeError("partner", error); }, [error]);
  return (
    <main style={{ minHeight:"100dvh", display:"grid", placeItems:"center", padding:24, background:"#f7faf8", color:"#17211b" }}>
      <section style={{ width:"min(100%,430px)", padding:24, border:"1px solid #dce7e0", borderRadius:22, background:"#fff", boxShadow:"0 16px 50px rgba(23,33,27,.08)", textAlign:"center" }}>
        <div style={{ fontSize:36 }}>⚠️</div>
        <h1 style={{ fontSize:22, margin:"10px 0 8px" }}>ZhaoXi</h1>
        <p style={{ color:"#64748b", lineHeight:1.6 }}>Ứng dụng vừa gặp lỗi tạm thời. Dữ liệu của bạn vẫn được giữ. Hãy thử tải lại màn hình.</p>
        {error.digest && <code style={{ display:"block", margin:"12px 0", fontSize:18, color:"#94a3b8" }}>#{error.digest}</code>}
        <button onClick={reset} style={{ border:0, borderRadius:14, padding:"12px 18px", background:"#07c160", color:"#fff", fontWeight:800, cursor:"pointer" }}>Thử lại</button>
      </section>
    </main>
  );
}
