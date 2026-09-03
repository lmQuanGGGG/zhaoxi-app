"use client";
import { useEffect, useRef, useState } from "react";
export function useInterval(callback: () => void, delay: number | null) { const saved = useRef(callback); useEffect(() => { saved.current = callback; }, [callback]); useEffect(() => { if (delay === null) return; const id = window.setInterval(() => saved.current(), delay); return () => window.clearInterval(id); }, [delay]); }
export function useLocalStorageState<T>(key: string, initial: T) { const [value,setValue] = useState<T>(initial); useEffect(() => { try { const raw=window.localStorage.getItem(key); if(raw!==null)setValue(JSON.parse(raw) as T); } catch {} },[key]); const save=(next:T)=>{setValue(next);try{window.localStorage.setItem(key,JSON.stringify(next));}catch{}}; return [value,save] as const; }
