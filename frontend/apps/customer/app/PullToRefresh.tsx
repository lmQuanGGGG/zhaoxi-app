"use client";

import { useEffect, useRef, useState } from "react";
import { useZhaoXiLocale } from "@zhaoxi/i18n";

const THRESHOLD = 72;

export default function PullToRefresh() {
  const [distance, setDistance] = useState(0);
  const distanceRef = useRef(0);
  const { locale } = useZhaoXiLocale();

  useEffect(() => {
    let startY = 0;
    let pulling = false;
    let refreshing = false;
    const atTop = () => window.scrollY <= 0 && !document.querySelector("input:focus, textarea:focus, select:focus");
    const start = (event: TouchEvent) => { if (!refreshing && atTop()) { startY = event.touches[0]?.clientY || 0; pulling = true; } };
    const move = (event: TouchEvent) => {
      if (!pulling || refreshing) return;
      const next = Math.max(0, (event.touches[0]?.clientY || 0) - startY);
      if (!next) return;
      event.preventDefault();
      const nextDistance = Math.min(THRESHOLD + 18, next * 0.45);
      distanceRef.current = nextDistance;
      setDistance(nextDistance);
    };
    const end = () => {
      if (!pulling) return;
      pulling = false;
      const shouldRefresh = distanceRef.current >= THRESHOLD;
      distanceRef.current = 0;
      setDistance(0);
      if (!shouldRefresh || refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end, { passive: true });
    return () => { window.removeEventListener("touchstart", start); window.removeEventListener("touchmove", move); window.removeEventListener("touchend", end); };
  }, []);

  if (!distance) return null;
  const copy={"vi-VN":["Kéo để làm mới","Thả để làm mới"],"en-US":["Pull to refresh","Release to refresh"],"zh-CN":["下拉刷新","松开刷新"],"zh-TW":["下拉重新整理","放開重新整理"]} as const;
  return <div aria-live="polite" style={{ position:"fixed", zIndex:9999, top:"max(8px, env(safe-area-inset-top))", left:"50%", transform:`translate(-50%, ${Math.min(12, distance - THRESHOLD)}px)`, padding:"8px 12px", borderRadius:999, background:"#ffffff", color:"#087d4d", boxShadow:"0 8px 24px rgba(15, 53, 39, .18)", fontSize:12, fontWeight:800, pointerEvents:"none", opacity:Math.min(1, distance / 24) }}>↻ {copy[locale][distance >= THRESHOLD ? 1 : 0]}</div>;
}
