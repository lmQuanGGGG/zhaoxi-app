"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useZhaoXiLocale, localizeOrganizationName, localizeServiceName, localizeServiceModuleName, type ZhaoXiLocale } from "@zhaoxi/i18n";
import { useClientSWR } from "../_lib/client-cache";
import FavoriteServiceButton from "./FavoriteServiceButton";
import { CustomerServiceIcon } from "./CustomerServiceIcon";

const C={
 "zh-CN":{resume:"继续浏览",recent:"最近浏览",favorites:"我的收藏",partners:"最近查看的合作伙伴",forYou:"为你推荐",discover:"打开个性化发现",from:"起",privacy:"根据您在赵喜中的收藏与最近浏览生成。",shortcuts:"已保存的需求"},
 "zh-TW":{resume:"繼續瀏覽",recent:"最近瀏覽",favorites:"我的收藏",partners:"最近查看的合作夥伴",forYou:"為你推薦",discover:"開啟個人化發現",from:"起",privacy:"根據您在趙喜中的收藏與最近瀏覽生成。",shortcuts:"已儲存的需求"},
 "vi-VN":{resume:"Tiếp tục xem",recent:"Đã xem gần đây",favorites:"Yêu thích",partners:"Partner đã xem gần đây",forYou:"Gợi ý cho bạn",discover:"Mở Dành cho bạn",from:"từ",privacy:"Dựa trên nội dung bạn yêu thích và đã xem trong ZhaoXi.",shortcuts:"Nhu cầu đã lưu"},
 "en-US":{resume:"Continue viewing",recent:"Recently viewed",favorites:"Favorites",partners:"Recently viewed Partners",forYou:"For you",discover:"Open personalized discovery",from:"from",privacy:"Based on your ZhaoXi favorites and recent views.",shortcuts:"Saved intents"}
} as const;

export default function PersonalizedHomeFeed(){
 const{locale}=useZhaoXiLocale();const t=C[locale];
 const cacheKey = `customer_home_feed_${locale}`;
 const fetchFeed = useCallback(async () => {
   try {
     const r = await fetch(`/api/customer-home-feed?locale=${locale}`, { cache: "no-store" });
     const j = await r.json();
     return j?.ok ? j.data : null;
   } catch {
     return null;
   }
 }, [locale]);
 const { data: d } = useClientSWR<any>(cacheKey, fetchFeed, { ttlMs: 30000 });
 if(!d)return null;
 const r=d.smartResume?.service;
 return <section style={{display:"grid",gap:8,marginTop:8}}>
  {d.intentShortcuts?.length>0&&<section style={box}><b style={sectionTitle}>🔖 {t.shortcuts}</b><div style={chipRail}>{d.intentShortcuts.map((x:any)=><Link key={x.id} href={x.shortcutHref} onClick={()=>{fetch(`/api/customer-intents/${x.id}/use`,{method:"POST"}).catch(()=>{})}} style={chip}>{x.watchEnabled?"🔔 ":x.isPinned?"📌 ":"⌕ "}{x.label}</Link>)}</div></section>}
  {(r||d.recentlyViewedPartners?.length>0)&&<section style={shortcutRow}>
   {r&&<Link href={r.publicHref} style={resumeShortcut}><b style={shortcutTitle}>▶ {t.resume}</b><div style={shortcutBody}><div style={shortcutThumb}>{r.imageUrl?<img src={r.imageUrl} alt="" style={cover}/>:<CustomerServiceIcon serviceId={r.moduleCode} size={34}/>}</div><div style={{minWidth:0}}><small style={secondary}>{localizeServiceModuleName(locale, r.moduleCode, r.moduleName)}</small><b style={title}>{localizeServiceName(locale, r.name, r.code)}</b><small style={secondary}>{localizeOrganizationName(locale, r.organizationCode, r.organizationName, r.metadata?.organizationMetadata)}</small></div></div></Link>}
   {d.recentlyViewedPartners?.length>0&&<Link href={d.recentlyViewedPartners[0].href} style={partnerShortcut}><b style={shortcutTitle}>🏪 {t.partners}</b><div style={shortcutBody}><span style={partnerShortcutIcon}>🏪</span><div style={{minWidth:0}}><b style={title}>{localizeOrganizationName(locale, d.recentlyViewedPartners[0].code, d.recentlyViewedPartners[0].name)}</b>{d.recentlyViewedPartners[0].verifiedBadgeCount>0&&<small style={{...secondary,color:"var(--customer-brand-strong)"}}>✓</small>}</div></div></Link>}
  </section>}
  <Feed locale={locale} title={`♥ ${t.favorites}`} items={d.favorites||[]} favorite/>
  <Feed locale={locale} title={`✨ ${t.forYou}`} items={d.forYou||[]} layout="grid"/>
 </section>;
}

function Feed({locale,title,items,favorite=false,layout="rail"}:{locale:ZhaoXiLocale;title:string;items:any[];favorite?:boolean;layout?:"rail"|"grid"}){
 if(!items.length)return null;
 const isGrid=layout==="grid";
 return <section style={box}><b style={sectionTitle}>{title}</b><div style={isGrid?grid:scroll}>{items.slice(0,isGrid?3:8).map(x=><div key={x.id} style={isGrid?gridItem:{position:"relative",flex:"0 0 auto",scrollSnapAlign:"start"}}><Link href={x.publicHref} style={isGrid?gridCard:card}><div style={thumb}>{x.imageUrl?<img src={x.imageUrl} alt="" style={cover}/>:<CustomerServiceIcon serviceId={x.moduleCode} size={38}/>}<span style={serviceBadge}><CustomerServiceIcon serviceId={x.moduleCode} size={20}/></span></div><b style={titleStyle}>{localizeServiceName(locale, x.name, x.code)}</b><small style={cardSecondary}>{localizeOrganizationName(locale, x.organizationCode, x.organizationName, x.metadata?.organizationMetadata)}</small>{x.priceFrom>0&&<small style={price}>{Math.round(x.priceFrom).toLocaleString("vi-VN")} {x.currency}</small>}</Link>{favorite&&<div style={{position:"absolute",right:4,top:4}}><FavoriteServiceButton serviceId={x.id} initial/></div>}</div>)}</div></section>;
}

const box={padding:11,border:0,borderRadius:12,background:"#FFFFFF",color:"var(--zx-text)",boxShadow:"0 8px 22px rgba(24,33,30,.055)"}as const;
const sectionTitle={fontSize:16,lineHeight:1.25,fontWeight:700}as const;
const row={display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}as const;
const more={fontSize:12,color:"var(--customer-brand)",textDecoration:"none"}as const;
const shortcutRow={display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,marginTop:2}as const;
const shortcutTitle={display:"block",fontSize:13,lineHeight:1.15,letterSpacing:"-.02em"}as const;
const shortcutBody={display:"flex",alignItems:"center",gap:8,marginTop:10,minWidth:0}as const;
const resumeShortcut={minWidth:0,minHeight:116,padding:14,borderRadius:20,background:"linear-gradient(135deg,#F7FBFA 0%,#DDF4F0 100%)",color:"inherit",textDecoration:"none",boxShadow:"0 10px 24px rgba(24,33,30,.065)"}as const;
const partnerShortcut={minWidth:0,minHeight:116,padding:14,borderRadius:20,background:"linear-gradient(135deg,#FFFDF8 0%,#F5EBCD 100%)",color:"inherit",textDecoration:"none",boxShadow:"0 10px 24px rgba(24,33,30,.065)"}as const;
const shortcutThumb={width:44,height:44,flex:"0 0 44px",overflow:"hidden",borderRadius:14,display:"grid",placeItems:"center",background:"rgba(255,255,255,.66)"}as const;
const partnerShortcutIcon={width:44,height:44,flex:"0 0 44px",display:"grid",placeItems:"center",borderRadius:14,background:"rgba(255,255,255,.66)",fontSize:23}as const;
const chipRail={display:"flex",gap:6,overflowX:"auto",overflowY:"hidden",paddingTop:8}as const;
const chip={minWidth:96,minHeight:30,display:"inline-flex",alignItems:"center",padding:"0 10px",border:"1px solid var(--zx-border)",borderRadius:999,textDecoration:"none",color:"inherit",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}as const;
const resume={display:"grid",gridTemplateColumns:"58px 1fr auto",gap:9,alignItems:"center",marginTop:8,textDecoration:"none",color:"inherit"}as const;
const resumeThumb={width:58,height:52,borderRadius:9,overflow:"hidden",display:"grid",placeItems:"center",background:"var(--zx-surface-soft)",fontSize:21}as const;
const cover={width:"100%",height:"100%",objectFit:"cover"}as const;
const title={display:"block",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontSize:13,lineHeight:1.25}as const;
const secondary={display:"block",color:"var(--zx-text-secondary)",fontSize:10,lineHeight:1.35}as const;
// Keep this as a real horizontal scrolling region on touch devices.  The end
// padding lets the final card clear the screen edge instead of looking clipped.
const scroll={display:"flex",gap:8,overflowX:"auto",overflowY:"hidden",overscrollBehaviorX:"contain",WebkitOverflowScrolling:"touch",touchAction:"pan-x",scrollSnapType:"x mandatory",scrollbarWidth:"none",padding:"8px 18px 10px 0"}as const;
const card={display:"block",minWidth:118,maxWidth:138,textDecoration:"none",color:"inherit",border:0,borderRadius:12,overflow:"hidden",paddingBottom:7,background:"#FFFFFF",scrollSnapAlign:"start",boxShadow:"0 6px 18px rgba(24,33,30,.055)"}as const;
const grid={display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:9,paddingTop:8}as const;
const gridItem={position:"relative",minWidth:0}as const;
const gridCard={...card,minWidth:0,maxWidth:"none",width:"100%"}as const;
const thumb={position:"relative",width:"100%",aspectRatio:"1 / 1",display:"grid",placeItems:"center",background:"var(--zx-surface-soft)",fontSize:22,overflow:"hidden"}as const;
const serviceBadge={position:"absolute",left:5,top:5,width:24,height:24,display:"grid",placeItems:"center",border:"1px solid var(--zx-border-soft)",borderRadius:8,background:"var(--zx-surface-glass)",boxShadow:"var(--zx-shadow-sm)"}as const;
const titleStyle={display:"block",fontSize:12,lineHeight:1.25,padding:"6px 7px 0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}as const;
const cardSecondary={display:"block",color:"var(--zx-text-secondary)",padding:"2px 7px 0",fontSize:10,lineHeight:1.3}as const;
const price={display:"block",color:"var(--zx-danger)",padding:"2px 7px 0",fontSize:10,lineHeight:1.3,fontWeight:600}as const;
const partner={minWidth:110,padding:9,border:0,borderRadius:11,textDecoration:"none",color:"inherit",display:"grid",gap:3,fontSize:11,background:"#FFFFFF",boxShadow:"0 6px 18px rgba(24,33,30,.055)"}as const;
