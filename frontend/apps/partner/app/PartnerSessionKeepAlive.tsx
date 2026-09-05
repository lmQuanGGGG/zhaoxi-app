"use client";

import {useEffect} from "react";
import {refreshServerSession} from "@zhaoxi/auth";

/** Keeps the Partner PWA session warm without treating a temporary outage as logout. */
export default function PartnerSessionKeepAlive(){
 useEffect(()=>{
  let disposed=false;
  let refreshing=false;
  const refresh=()=>{
   if(disposed||refreshing||document.visibilityState!=="visible"||navigator.onLine===false)return;
   refreshing=true;
   void refreshServerSession().finally(()=>{refreshing=false;});
  };
  const onVisible=()=>{if(document.visibilityState==="visible")refresh();};
  const timer=window.setInterval(refresh,9*60*1000);
  document.addEventListener("visibilitychange",onVisible);
  window.addEventListener("pageshow",refresh);
  window.addEventListener("online",refresh);
  refresh();
  return()=>{
   disposed=true;
   window.clearInterval(timer);
   document.removeEventListener("visibilitychange",onVisible);
   window.removeEventListener("pageshow",refresh);
   window.removeEventListener("online",refresh);
  };
 },[]);
 return null;
}
