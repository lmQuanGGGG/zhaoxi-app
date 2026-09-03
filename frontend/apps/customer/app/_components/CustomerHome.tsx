"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import { useZhaoXiSession } from "@zhaoxi/auth";
import { serviceModules } from "@zhaoxi/branding";
import { formatMarketplacePrice, marketplaceFallbackImage, type MarketplaceRecommendation } from "@zhaoxi/marketplace";
import CustomerLocationBar from "./CustomerLocationBar";
import PersonalizedHomeFeed from "./PersonalizedHomeFeed";
import { CustomerShell } from "./CustomerShell";
import { CustomerIcon } from "./CustomerIcon";
import { CustomerServiceIcon } from "./CustomerServiceIcon";
import { getCustomerServicePresentation } from "./customer-service-presentation";
import { useClientSWR } from "../_lib/client-cache";
import styles from "../hub.module.css";

type ApiModule = { code?: string; name?: string; description?: string; icon?: string; route?: string };
type PersonalizedRecommendation = MarketplaceRecommendation & {reasonCode?:"favorite"|"recent_view"|"ordered"|"popular"|"new"|"explore";personalizedScore?:number};
const WELCOME_SLIDE_INTERVAL_MS=3000;
const landmarkSlides=[
  {image:"/ui/18.3.3/landmarks/dragon-bridge.webp",label:{"vi-VN":"Cầu Rồng","en-US":"Dragon Bridge","zh-CN":"龙桥","zh-TW":"龍橋"}},
  {image:"/ui/18.3.3/landmarks/ba-na-hills.webp",label:{"vi-VN":"Bà Nà Hills","en-US":"Ba Na Hills","zh-CN":"巴拿山","zh-TW":"巴拿山"}},
  {image:"/ui/18.3.3/landmarks/my-khe-beach.webp",label:{"vi-VN":"Biển Mỹ Khê","en-US":"My Khe Beach","zh-CN":"美溪海滩","zh-TW":"美溪海灘"}},
  {image:"/ui/18.3.3/landmarks/marble-mountains.webp",label:{"vi-VN":"Ngũ Hành Sơn","en-US":"Marble Mountains","zh-CN":"五行山","zh-TW":"五行山"}},
  {image:"/ui/18.3.3/landmarks/linh-ung.webp",label:{"vi-VN":"Chùa Linh Ứng","en-US":"Linh Ung Pagoda","zh-CN":"灵应寺","zh-TW":"靈應寺"}},
  {image:"/ui/18.3.3/landmarks/han-river.webp",label:{"vi-VN":"Sông Hàn","en-US":"Han River","zh-CN":"韩江","zh-TW":"韓江"}},
] as const;
const copy = {
  "zh-CN": { welcome:"欢迎来到岘港",subtitle:"赵喜陪伴您的每一天",search:"搜索服务、商家、商品…",recommend:"更多发现",more:"更多",city:"岘港",ai:"告诉赵喜，您今天需要什么？",aiHint:"例如：我想租海边附近的房子",module:"生活服务",emergency:"紧急求助",popular:"热门",newPartner:"新入驻",available:"探索服务",becauseFavorite:"因为您已收藏",becauseViewed:"因为您最近看过",becauseOrdered:"根据您的订单",becausePopular:"热门推荐",becauseNew:"新入驻",becauseExplore:"为您探索" },
  "zh-TW": { welcome:"歡迎來到峴港",subtitle:"趙喜陪伴您的每一天",search:"搜尋服務、商家、商品…",recommend:"更多探索",more:"更多",city:"峴港",ai:"告訴趙喜，您今天需要什麼？",aiHint:"例如：我想租海邊附近的房子",module:"生活服務",emergency:"緊急求助",popular:"熱門",newPartner:"新進駐",available:"探索服務",becauseFavorite:"因為您已收藏",becauseViewed:"因為您最近看過",becauseOrdered:"根據您的訂單",becausePopular:"熱門推薦",becauseNew:"新進駐",becauseExplore:"為您探索" },
  "vi-VN": { welcome:"Chào mừng đến Đà Nẵng",subtitle:"ZhaoXi đồng hành cùng bạn mỗi ngày",search:"Tìm dịch vụ, cửa hàng, sản phẩm…",recommend:"Khám phá thêm",more:"Xem thêm",city:"Đà Nẵng",ai:"Hôm nay bạn cần ZhaoXi giúp gì?",aiHint:"Ví dụ: Tôi cần thuê nhà gần biển",module:"Dịch vụ đời sống",emergency:"Hỗ trợ khẩn cấp",popular:"Phổ biến",newPartner:"Mới tham gia",available:"Khám phá dịch vụ",becauseFavorite:"Vì bạn đã yêu thích",becauseViewed:"Vì bạn vừa xem",becauseOrdered:"Dựa trên đơn của bạn",becausePopular:"Đang phổ biến",becauseNew:"Đối tác mới",becauseExplore:"Khám phá cho bạn" },
  "en-US": { welcome:"Welcome to Da Nang",subtitle:"ZhaoXi is with you every day",search:"Search services, merchants, products…",recommend:"Explore more",more:"More",city:"Da Nang",ai:"What can ZhaoXi help you with today?",aiHint:"Example: I need a home near the beach",module:"Life services",emergency:"Emergency help",popular:"Popular",newPartner:"New partner",available:"Explore service",becauseFavorite:"Because you favorited it",becauseViewed:"Because you viewed it",becauseOrdered:"Based on your orders",becausePopular:"Popular now",becauseNew:"New partner",becauseExplore:"Explore for you" },
} as const;

export default function CustomerHome(){
  const {locale}=useZhaoXiLocale();const session=useZhaoXiSession();const t=copy[locale];
  const [recommendations,setRecommendations]=useState<PersonalizedRecommendation[]>([]);const[personalized,setPersonalized]=useState(false);const [offset,setOffset]=useState(0);const carouselRef=useRef<HTMLElement|null>(null);
  const[bannerEffect,setBannerEffect]=useState(0);

  const { data: uiConfigData } = useClientSWR<any>("customer_ui_config", async () => {
    const r = await fetch("/api/customer-ui-config", { cache: "no-store" });
    const j = await r.json();
    return j?.ok && j.data ? j.data : null;
  }, { ttlMs: 300000 });
  const uiConfig = uiConfigData;

  const fetchModules = useCallback(async (): Promise<ApiModule[]> => {
    try {
      const r = await fetch(`/api/platform-modules?locale=${encodeURIComponent(locale)}`, { cache: "no-store" });
      const d = await r.json();
      return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
    } catch {
      return [];
    }
  }, [locale]);
  const { data: apiModulesData } = useClientSWR<ApiModule[]>(`platform_modules_${locale}`, fetchModules, { ttlMs: 300000 });
  const apiModules = apiModulesData || [];

  useEffect(()=>{
    let alive=true;
    fetch(`/api/customer-recommendations?locale=${encodeURIComponent(locale)}&limit=12&offset=${offset}`,{cache:"no-store"}).then(r=>r.json()).then(d=>{if(alive){setRecommendations(Array.isArray(d?.data)?d.data:[]);setPersonalized(Boolean(d?.personalized))}}).catch(()=>{if(alive){setRecommendations([]);setPersonalized(false)}});
    return()=>{alive=false};
  },[locale,offset]);

  useEffect(()=>{const delay=Math.max(30000,Number(uiConfig?.recommendationCycleSeconds||60)*1000);const timer=window.setInterval(()=>setOffset(current=>(current+3)%12),delay);return()=>window.clearInterval(timer)},[uiConfig?.recommendationCycleSeconds]);
  useEffect(()=>{const timer=window.setInterval(()=>setBannerEffect(v=>(v+1)%landmarkSlides.length),WELCOME_SLIDE_INTERVAL_MS);return()=>window.clearInterval(timer)},[]);
  useEffect(()=>{const delay=Math.max(30000,Number(uiConfig?.recommendationCycleSeconds||60)*1000);const timer=window.setInterval(()=>{const el=carouselRef.current;if(!el)return;const max=el.scrollWidth-el.clientWidth;if(max<8)return;const next=el.scrollLeft+Math.max(160,el.clientWidth*.66);el.scrollTo({left:next>=max-8?0:next,behavior:"smooth"})},delay);return()=>window.clearInterval(timer)},[uiConfig?.recommendationCycleSeconds]);
  const banner=uiConfig?.bannerContent?.[locale]||{title:t.welcome,subtitle:t.subtitle,cityLabel:t.city};
  const activeLandmark=bannerEffect%landmarkSlides.length;
  const exploreLabel=locale==="vi-VN"?"Khám phá ngay":locale==="en-US"?"Explore now":locale==="zh-TW"?"立即探索":"立即探索";
  const reason=(item:PersonalizedRecommendation)=>item.reasonCode==="favorite"?t.becauseFavorite:item.reasonCode==="recent_view"?t.becauseViewed:item.reasonCode==="ordered"?t.becauseOrdered:item.reasonCode==="popular"?t.becausePopular:item.reasonCode==="new"?t.becauseNew:t.becauseExplore;
  
  const modules=useMemo(()=>{
    const raw = apiModules.length
      ? apiModules.map((item,index)=>{const fallback=serviceModules[index];const code=item.code||fallback?.id||`module-${index}`;return{code,name:item.name||(locale==="vi-VN"?fallback?.vi:fallback?.zh)||code,href:item.route||`/services/${code}`}})
      : serviceModules.map(item=>({code:item.id,name:locale==="vi-VN"?item.vi:item.zh,href:item.customerHref}));
    return raw.slice(0, 8);
  },[apiModules,locale]);
  return <CustomerShell className={styles.customerShell} bare>
    <section className={styles.customerContent}>
      <Link className={styles.searchBox} href="/search"><CustomerIcon name="search"/><span>{t.search}</span></Link>
      <section className={styles.welcomeBanner} aria-roledescription="carousel" aria-label={banner.cityLabel||t.city}>
        <div className={styles.welcomeSlides} aria-hidden="true">{landmarkSlides.map((slide,index)=><span key={slide.image} className={`${styles.welcomeSlide} ${index===activeLandmark?styles.welcomeSlideActive:""}`} style={{backgroundImage:`url(${slide.image})`}}/>)}</div>
        <div className={styles.welcomeCopy}><small>ZHAOXI · {banner.cityLabel||t.city}</small><h1>{banner.title}</h1><p>{banner.subtitle}</p><Link href="/discover" className={styles.welcomeCta}>{exploreLabel} <span aria-hidden="true">›</span></Link></div>
        <div className={styles.welcomeMeta}><strong>{landmarkSlides[activeLandmark].label[locale]}</strong><div className={styles.welcomeDots}>{landmarkSlides.map((slide,index)=><button key={slide.image} type="button" className={index===activeLandmark?styles.welcomeDotActive:""} onClick={()=>setBannerEffect(index)} aria-label={`${index+1}/${landmarkSlides.length}`} aria-current={index===activeLandmark?"true":undefined}/>)}</div></div>
      </section>
      <div className={styles.contextRow}>
        <CustomerLocationBar inline={true}/>
        <Link className={styles.aiCardInline} href="/support">
          <span className={styles.aiIcon}><CustomerIcon name="assistant"/></span>
          <div>
            <small>{t.ai}</small>
            <b>{t.aiHint}</b>
          </div>
        </Link>
      </div>
      <div className={styles.sectionRow}><h2>{t.module}</h2><Link href="/services">{t.more} ›</Link></div>
      <section className={styles.serviceGrid}>{modules.map(item=>{const visual=getCustomerServicePresentation(item.code);return <Link href={item.href||"/"} key={item.code} className={item.code==="emergency"?styles.emergencyModule:styles.serviceItem} style={{"--service-accent":visual.accent,"--service-tint":visual.tint} as React.CSSProperties}><span><CustomerServiceIcon serviceId={item.code}/></span><b>{item.name}</b></Link>})}</section>
      <PersonalizedHomeFeed/>
      <div className={styles.sectionRow}><h2>{t.recommend}</h2><Link href="/discover">{t.more} ›</Link></div>
      <section className={styles.recommendCarousel} ref={carouselRef}>{recommendations.slice(0,6).map(item=>{const price=formatMarketplacePrice(item.priceFrom,item.currency||"VND",locale);const meta=personalized?reason(item):item.kind==="module_fallback"?t.available:item.isNew?t.newPartner:item.usageCount>0?t.popular:(item.organizationName||t.available);return <Link href={item.href} className={styles.recommendCard} key={`${item.kind}-${item.id}`}><div className={styles.recommendImage} style={{backgroundImage:`url(${item.imageUrl||marketplaceFallbackImage(item.imageKey)})`}}><span className={styles.recommendBadge}><CustomerServiceIcon serviceId={item.moduleCode} size={22}/></span></div><b>{item.title}</b><span>{meta}</span>{price&&<strong>{price}</strong>}</Link>})}</section>
      <Link className={styles.emergencyStrip} href="/khan-cap"><span><CustomerServiceIcon serviceId="emergency"/></span><div><b>{t.emergency}</b><small>{locale==="vi-VN"?"Bệnh viện, công an, cứu hộ, phiên dịch":locale==="en-US"?"Hospital, police, rescue, interpretation":locale==="zh-TW"?"醫院、公安、救援、中文翻譯":"医院、公安、救援、中文翻译"}</small></div><CustomerIcon name="chevron"/></Link>
      <footer className={styles.customerFooter}>{locale==="vi-VN"?"Nền tảng dịch vụ đời sống ZhaoXi tại Đà Nẵng":locale==="en-US"?"ZhaoXi life services in Da Nang":locale==="zh-TW"?"趙喜峴港生活服務平台":"赵喜岘港生活服务平台"}</footer>
    </section>
  </CustomerShell>
}
