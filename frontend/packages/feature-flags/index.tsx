"use client";
import {useEffect,useState,type ReactNode} from "react";
import {useZhaoXiSession} from "@zhaoxi/auth";

export type FeatureSnapshot={channel:string;role:string;flags:Record<string,boolean>;updatedAt:string};
export function useFeatureFlags(){
  const session=useZhaoXiSession();
  const [snapshot,setSnapshot]=useState<FeatureSnapshot|null>(null);
  useEffect(()=>{let active=true;const role=session?.role||"customer";const subject=session?.userId||"anonymous";void fetch(`/api/platform-feature-flags?role=${encodeURIComponent(role)}&subject=${encodeURIComponent(subject)}`,{cache:"no-store"}).then(r=>r.json().catch(()=>null)).then(x=>{if(active&&x?.ok)setSnapshot(x.data)}).catch(()=>{});return()=>{active=false}},[session?.role,session?.userId]);
  return snapshot;
}
export function FeatureGate({name,children,fallback=null}:{name:string;children:ReactNode;fallback?:ReactNode}){
  const snapshot=useFeatureFlags();
  if(!snapshot)return null;
  return snapshot.flags[name]?<>{children}</>:<>{fallback}</>;
}
