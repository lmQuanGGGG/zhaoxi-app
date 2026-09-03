"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import {CustomerPageHeader,CustomerShell} from "./CustomerShell";
import {CustomerServiceIcon} from "./CustomerServiceIcon";

type Kind="favorites"|"history"|"coupons";
const copy={
 "zh-CN":{favorites:"我的收藏",history:"浏览记录",coupons:"优惠券",emptyFav:"暂无收藏",emptyHistory:"暂无浏览记录",emptyCoupons:"暂无可用优惠",explore:"浏览服务",remove:"删除",claim:"领取",claimed:"已领取"},
 "zh-TW":{favorites:"我的收藏",history:"瀏覽記錄",coupons:"優惠券",emptyFav:"暫無收藏",emptyHistory:"暫無瀏覽記錄",emptyCoupons:"暫無可用優惠",explore:"瀏覽服務",remove:"刪除",claim:"領取",claimed:"已領取"},
 "vi-VN":{favorites:"Yêu thích",history:"Lịch sử xem",coupons:"Mã ưu đãi",emptyFav:"Chưa có mục yêu thích",emptyHistory:"Chưa có lịch sử xem",emptyCoupons:"Chưa có ưu đãi khả dụng",explore:"Khám phá dịch vụ",remove:"Xóa",claim:"Nhận",claimed:"Đã nhận"},
 "en-US":{favorites:"Favorites",history:"Browsing history",coupons:"Coupons",emptyFav:"No favorites yet",emptyHistory:"No browsing history",emptyCoupons:"No available offers",explore:"Explore services",remove:"Remove",claim:"Claim",claimed:"Claimed"},
} as const;
const endpoint:Record<Kind,string>={favorites:"/api/customer-favorites",history:"/api/customer-history",coupons:"/api/customer-coupons"};
const icons:Record<Kind,string>={favorites:"☆",history:"◷",coupons:"🎟️"};

import { useClientSWR, invalidateCache } from "../_lib/client-cache";

export default function PersonalDataPage({kind}:{kind:Kind}){
 const{locale}=useZhaoXiLocale();
 const t=copy[locale];
 const cacheKey = `personal_data_${kind}_${locale}`;
 const fetchData = useCallback(async (): Promise<any[]> => {
  const r=await fetch(`${endpoint[kind]}?locale=${encodeURIComponent(locale)}`,{cache:"no-store"});
  const j=await r.json();
  return Array.isArray(j?.data)?j.data:[];
 }, [kind, locale]);
 const { data: cachedData, loading, revalidate, mutate } = useClientSWR<any[]>(cacheKey, fetchData, { ttlMs: 30000 });
 const data = cachedData || [];

 const title=t[kind];
 const empty=kind==="favorites"?t.emptyFav:kind==="history"?t.emptyHistory:t.emptyCoupons;

 async function removeFavorite(item:any){
  mutate(data.filter(x=>x.id!==item.id));
  await fetch(endpoint.favorites,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({serviceId:item.id,favorite:false})});
  invalidateCache("favorites");
  revalidate();
 }

 async function useCoupon(item:any){
  await fetch(endpoint.coupons,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({couponId:item.id})});
  invalidateCache("coupons");
  revalidate();
 }

 async function claim(item:any){
  await fetch(endpoint.coupons,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({couponId:item.id})});
  invalidateCache("coupons");
  revalidate();
 }

 return (
  <CustomerShell>
   <CustomerPageHeader title={title} backHref="/profile"/>
   <div style={{paddingBottom:"calc(90px + env(safe-area-inset-bottom))",display:"grid",gap:10}}>
    {loading ? (
     <section style={{color:"#64748B",padding:24,textAlign:"center"}}>…</section>
    ) : !data.length ? (
     <section style={{padding:"48px 20px",textAlign:"center",borderRadius:20,background:"#FFFFFF",border:"1px solid #EEF2F6"}}>
      <div style={{fontSize:40,marginBottom:10}}>{icons[kind]}</div>
      <p style={{color:"#64748B",fontSize:13,marginBottom:14}}>{empty}</p>
      <Link href="/" style={{display:"inline-flex",padding:"10px 16px",borderRadius:12,background:"#059669",color:"#fff",textDecoration:"none",fontWeight:700,fontSize:13}}>{t.explore}</Link>
     </section>
    ) : (
     <section style={{display:"grid",gap:10}}>
      {data.map((x:any)=>(
       <article key={`${x.id}-${x.viewedAt||x.claimedAt||""}`} style={{display:"grid",gridTemplateColumns:"48px 1fr auto",gap:10,alignItems:"center",padding:12,borderRadius:18,background:"#FFFFFF",border:"1px solid #EEF2F6",boxShadow:"0 4px 16px rgba(15,23,42,0.03)"}}>
        <div style={{width:48,height:48,borderRadius:14,display:"grid",placeItems:"center",background:"#ECFDF5",fontSize:22}}>
         {kind==="coupons"?icons[kind]:<CustomerServiceIcon serviceId={x.moduleCode} size={36}/>}
        </div>
        <div style={{minWidth:0}}>
         <b style={{display:"block",fontSize:13,color:"#1E293B",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.title||x.name||x.code}</b>
         <small style={{display:"block",color:"#64748B",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.description||x.summary||""}</small>
         {x.discountValue!==undefined&&<strong style={{display:"block",color:"#E11D48",marginTop:4,fontSize:12}}>{x.discountType==="fixed"?`${Number(x.discountValue).toLocaleString("vi-VN")} ${x.currency}`:`${x.discountValue}%`}</strong>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
         {kind!=="coupons"&&<Link href={`/service/${x.id}`} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:32,height:32,borderRadius:10,background:"#F1F5F9",textDecoration:"none",color:"#475569",fontWeight:800,fontSize:16}}>›</Link>}
         {kind==="favorites"&&<button onClick={()=>void removeFavorite(x)} style={{border:0,borderRadius:10,padding:"7px 10px",background:"#FFF1F2",color:"#E11D48",fontSize:11,fontWeight:700,cursor:"pointer"}}>{t.remove}</button>}
         {kind==="coupons"&&<button disabled={Boolean(x.claimedAt)} onClick={()=>void claim(x)} style={{border:0,borderRadius:10,padding:"7px 10px",background:x.claimedAt?"#F1F5F9":"#ECFDF5",color:x.claimedAt?"#64748B":"#059669",fontSize:11,fontWeight:700,cursor:x.claimedAt?"default":"pointer"}}>{x.claimedAt?t.claimed:t.claim}</button>}
        </div>
       </article>
      ))}
     </section>
    )}
   </div>
  </CustomerShell>
 );
}
