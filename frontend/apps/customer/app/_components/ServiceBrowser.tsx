"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import MiniTabBar from "./MiniTabBar";
import CustomerLocationBar from "./CustomerLocationBar";
import {CustomerServiceIcon} from "./CustomerServiceIcon";
import {CustomerIcon} from "./CustomerIcon";
import {readSessionPoint,subscribeSessionPoint,type SessionPoint} from "../_lib/customer-location";
import { localizeOrganizationName, localizeServiceName, useZhaoXiLocale } from "@zhaoxi/i18n";
import { useZhaoXiCart } from "@zhaoxi/cart";
import { useZhaoXiSession } from "@zhaoxi/auth";
import { getCached, setCached } from "../_lib/client-cache";
import styles from "../services.module.css";

type Service = {
  id: string;
  code: string;
  moduleCode: string;
  name?: string;
  summary?: string;
  priceFrom?: string | null;
  currency?: string;
  organizationId?: string | null;
  organizationCode?: string | null;
  organizationName?: string | null;
  organizationAddress?: string | null;
  organizationMetadata?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  distanceKm?: number | null;
  nearby?: boolean;
};

type FoodPrice={scheduledAvailable:boolean;promoActive:boolean;promotionType:string;promotionLabel:string;baseUnitPrice:number;effectiveUnitPrice:number;quantity:number;baseSubtotal:number;discount:number;finalSubtotal:number};

type RestaurantStatus={open:boolean;code:"open"|"platform_paused"|"manual_paused"|"closed_hours"|"at_capacity";activeKitchenOrders:number;capacityRemaining:number;businessHoursToday?:{enabled:boolean;open:string;close:string};pauseReason?:string};

const ui = {
  "zh-CN": { back: "返回", loading: "正在加载…", empty: "暂无服务", error: "加载失败", detail: "详情", results: "项", search: "搜索商家或商品", restaurants: "餐厅", services:"服务", serviceSearch:"搜索服务或商家", subtotal: "小计", soldOut: "已售罄", addCart: "加入购物车", cart: "购物车", viewMore: "查看更多", open: "营业中", ask:"咨询赵喜助手", askHint:"找不到合适服务？先问赵喜。", nearby:"附近", distance:"距离", paused:"暂停接单", closed:"已打烊", busy:"订单已满", opens:"营业时间", promo:"优惠", scheduledOff:"暂未开售", platformPaused:"平台暂时停止接单" },
  "zh-TW": { back: "返回", loading: "正在載入…", empty: "暫無服務", error: "載入失敗", detail: "詳情", results: "項", search: "搜尋商家或商品", restaurants: "餐廳", services:"服務", serviceSearch:"搜尋服務或商家", subtotal: "小計", soldOut: "已售罄", addCart: "加入購物車", cart: "購物車", viewMore: "查看更多", open: "營業中", ask:"詢問趙喜助手", askHint:"找不到合適服務？先問趙喜。", nearby:"附近", distance:"距離", paused:"暫停接單", closed:"已打烊", busy:"訂單已滿", opens:"營業時間", promo:"優惠", scheduledOff:"暫未開售", platformPaused:"平台暫時停止接單" },
  "vi-VN": { back: "Quay lại", loading: "Đang tải…", empty: "Chưa có dịch vụ", error: "Không tải được dữ liệu", detail: "Chi tiết", results: "món", search: "Tìm nhà hàng hoặc món ăn", restaurants: "Nhà hàng", services:"Dịch vụ", serviceSearch:"Tìm dịch vụ hoặc đối tác", subtotal: "Thành tiền", soldOut: "Hết món", addCart: "Thêm vào giỏ", cart: "Giỏ hàng", viewMore: "Xem thêm món", open: "Đang mở", ask:"Hỏi Trợ lý ZhaoXi", askHint:"Chưa tìm thấy dịch vụ phù hợp? Hãy hỏi ZhaoXi trước.", nearby:"Gần bạn", distance:"Khoảng cách", paused:"Tạm ngưng nhận đơn", closed:"Đã đóng cửa", busy:"Bếp đang quá tải", opens:"Giờ mở cửa", promo:"Ưu đãi", scheduledOff:"Chưa đến giờ bán", platformPaused:"Platform đang tạm dừng nhận đơn" },
  "en-US": { back: "Back", loading: "Loading…", empty: "No services", error: "Unable to load", detail: "Details", results: "items", search: "Search restaurant or item", restaurants: "Restaurants", services:"Services", serviceSearch:"Search service or partner", subtotal: "Subtotal", soldOut: "Sold out", addCart: "Add to cart", cart: "Cart", viewMore: "View full menu", open: "Open", ask:"Ask ZhaoXi Assistant", askHint:"Can’t find the right service? Ask ZhaoXi first.", nearby:"Nearby", distance:"Distance", paused:"Orders paused", closed:"Closed", busy:"Kitchen at capacity", opens:"Business hours", promo:"Promotion", scheduledOff:"Not on sale now", platformPaused:"Platform has temporarily paused orders" },
} as const;

const moduleMeta:Record<string,Record<string,{title:string}>>={
"zh-CN":{food:{title:"餐厅"},housing:{title:"租房"},visa:{title:"护照签证"},"car-rental":{title:"租车服务"},translation:{title:"翻译服务"},travel:{title:"旅游服务"},payment:{title:"支付服务"},community:{title:"华人社区"},market:{title:"华人商城"}},
"zh-TW":{food:{title:"餐廳"},housing:{title:"租房"},visa:{title:"護照簽證"},"car-rental":{title:"租車服務"},translation:{title:"翻譯服務"},travel:{title:"旅遊服務"},payment:{title:"支付服務"},community:{title:"華人社區"},market:{title:"華人商城"}},
"vi-VN":{food:{title:"Nhà hàng"},housing:{title:"Thuê nhà"},visa:{title:"Hộ chiếu – thị thực"},"car-rental":{title:"Thuê xe"},translation:{title:"Phiên dịch"},travel:{title:"Du lịch"},payment:{title:"Thanh toán"},community:{title:"Cộng đồng"},market:{title:"Chợ Người Hoa"}},
"en-US":{food:{title:"Restaurants"},housing:{title:"Housing"},visa:{title:"Passport & visa"},"car-rental":{title:"Car rental"},translation:{title:"Translation"},travel:{title:"Travel"},payment:{title:"Payments"},community:{title:"Community"},market:{title:"Chinese market"}}};

function money(value: number, currency = "VND") {
  return `${Math.round(value).toLocaleString("vi-VN")} ${currency}`;
}

export default function ServiceBrowser({ moduleCode }: { moduleCode: string }) {
  const router = useRouter();
  const session = useZhaoXiSession();
  const isGuest = !session || session.authMethod === "guest";
  const { locale } = useZhaoXiLocale();
  const t = ui[locale];
  const { add, count } = useZhaoXiCart();
  const cacheKey = `service_browser_${moduleCode}_${locale}`;
  const initialCached = getCached<Service[]>(cacheKey);
  const [items, setItems] = useState<Service[]>(() => initialCached || []);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(() => initialCached && initialCached.length > 0 ? "ready" : "loading");
  const [query, setQuery] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [slides, setSlides] = useState<Record<string, number>>({});
  const [sessionPoint,setSessionPoint]=useState<SessionPoint|null>(null);
  const [restaurantStatuses,setRestaurantStatuses]=useState<Record<string,RestaurantStatus>>(() => getCached<Record<string,RestaurantStatus>>(`restaurant_statuses_${moduleCode}`) || {});
  const [foodPricing,setFoodPricing]=useState<Record<string,FoodPrice>>({});

  useEffect(()=>{setSessionPoint(readSessionPoint());return subscribeSessionPoint(setSessionPoint)},[]);

  useEffect(() => {
    let cancelled = false;
    const load = (showLoading = false) => {
      if (showLoading && (!initialCached || initialCached.length === 0)) setStatus("loading");
      const locationParams=new URLSearchParams({module:moduleCode,locale,limit:"100"});
      if(sessionPoint){locationParams.set("lat",String(sessionPoint.latitude));locationParams.set("lng",String(sessionPoint.longitude))}
      fetch(`/api/customer-nearby-services?${locationParams}`, {
        cache: "no-store",
        headers: { "cache-control": "no-cache" },
      })
        .then((response) => response.json())
        .then((payload) => {
          if (cancelled) return;
          const nextItems=Array.isArray(payload?.data)?payload.data:[];
          setItems(nextItems);
          setCached(cacheKey, nextItems);
          if(moduleCode==="food"){
            const ids=Array.from(new Set(nextItems.map((x:Service)=>x.organizationId).filter(Boolean))) as string[];
            if(ids.length)fetch(`/api/restaurant-status?ids=${encodeURIComponent(ids.join(","))}`,{cache:"no-store"}).then(r=>r.json()).then(j=>{
              if(!cancelled&&j?.ok) {
                setRestaurantStatuses(j.data||{});
                setCached(`restaurant_statuses_${moduleCode}`, j.data||{});
              }
            }).catch(()=>{});
            else setRestaurantStatuses({});
          }
          setStatus("ready");
        })
        .catch(() => {
          if (!cancelled && (!initialCached || initialCached.length === 0)) setStatus("error");
        });
    };
    load(false);
    const onFocus = () => load(false);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [moduleCode, locale, sessionPoint?.latitude, sessionPoint?.longitude]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlides((current) => {
        const next = { ...current };
        for (const item of items) {
          const key = item.organizationId || item.organizationCode || "x";
          const banners = Array.isArray(item.organizationMetadata?.bannerUrls)
            ? (item.organizationMetadata.bannerUrls as unknown[])
            : [];
          if (banners.length > 1) next[key] = ((current[key] || 0) + 1) % banners.length;
        }
        return next;
      });
    }, 4200);
    return () => window.clearInterval(timer);
  }, [items]);

  useEffect(()=>{
    if(moduleCode!=="food"||!items.length){setFoodPricing({});return}
    const timer=window.setTimeout(()=>{
      const params=new URLSearchParams({ids:items.map(x=>x.id).join(",")});
      for(const item of items){const q=Math.max(1,(quantities[item.id]??Number(localStorage.getItem(`zhaoxi-service-quantity-${item.id}`))??1));params.set(`q_${item.id}`,String(q))}
      fetch(`/api/food-pricing?${params}`,{cache:"no-store"}).then(r=>r.json()).then(j=>{if(j?.ok)setFoodPricing(j.data||{})}).catch(()=>{});
    },120);
    return()=>window.clearTimeout(timer)
  },[moduleCode,items,quantities]);

  function change(event: MouseEvent, id: string, delta: number) {
    event.preventDefault();
    event.stopPropagation();
    if (delta > 0 && isGuest) {
      router.push(`/login?redirect=${encodeURIComponent(`/services/${moduleCode}`)}`);
      return;
    }
    setQuantities((current) => {
      const stored = Number(localStorage.getItem(`zhaoxi-service-quantity-${id}`)) || 0;
      const quantity = Math.max(0, Math.min(99, (current[id] ?? stored) + delta));
      localStorage.setItem(`zhaoxi-service-quantity-${id}`, String(quantity));
      return { ...current, [id]: quantity };
    });
  }

  function handleAdd(item: Service, quantity: number, unitPrice: number, image: string) {
    if (isGuest) {
      router.push(`/login?redirect=${encodeURIComponent(`/services/${moduleCode}`)}`);
      return;
    }
    if (quantity > 0) {
      add({
        serviceId: item.id,
        organizationId: item.organizationId,
        organizationName: localizeOrganizationName(locale, item.organizationCode, item.organizationName, item.organizationMetadata),
        name: localizeServiceName(locale, item.name || item.code),
        imageUrl: image,
        unitPrice,
        currency: item.currency || "VND",
        quantity,
      });
    }
  }

  const filtered = useMemo(
    () => items.filter((item) => `${item.name || ""} ${item.summary || ""} ${item.organizationName || ""}`.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );
  const groups = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const item of filtered) {
      const key = item.organizationId || item.organizationCode || "unknown";
      map.set(key, [...(map.get(key) || []), item]);
    }
    return [...map.entries()];
  }, [filtered]);

  const isFood=moduleCode==="food";const currentMeta=(moduleMeta[locale]||moduleMeta["en-US"])[moduleCode]||{title:t.services};

  if(!isFood){return <main className={styles.shell}><header className={styles.header}><div className={styles.foodHeaderBar}><Link href="/" className={styles.backButton}>‹ <span>{t.back}</span></Link><div className={styles.headerTitle}><span><CustomerServiceIcon serviceId={moduleCode} size={40}/></span><div><b>{currentMeta.title}</b><small>{filtered.length} {t.results}</small></div></div></div></header><section className={styles.body}><div className={styles.locationWrap}><CustomerLocationBar banner/></div><label className={styles.search}><CustomerIcon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.serviceSearch}/></label>{status==="loading"&&<State text={t.loading}/>} {status==="error"&&<State text={t.error}/>} {status==="ready"&&!filtered.length&&<State text={t.empty}/>}<div className={styles.genericServiceList}>{filtered.map(item=>{const image=String(item.metadata?.imageUrl||"");return <Link href={`/service/${item.id}`} key={item.id} className={styles.genericServiceCard}>{image?<img src={image} alt=""/>:<span><CustomerServiceIcon serviceId={moduleCode} size={44}/></span>}<div><b>{localizeServiceName(locale, item.name || item.code)}</b><p>{item.summary}</p><small>{localizeOrganizationName(locale,item.organizationCode,item.organizationName,item.organizationMetadata)}</small>{item.distanceKm!==null&&item.distanceKm!==undefined&&<em className={styles.distanceBadge}>⌖ {item.distanceKm.toFixed(1)} km</em>}{Number(item.priceFrom||0)>0&&<strong>{money(Number(item.priceFrom),item.currency)}</strong>}</div><i>›</i></Link>})}</div></section><MiniTabBar/></main>}

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.foodHeaderBar}>
          <Link href="/" className={styles.backButton}>‹ <span>{t.back}</span></Link>
          <div className={styles.headerTitle}><span><CustomerServiceIcon serviceId="food" size={40}/></span><div><b>{t.restaurants}</b><small>{filtered.length} {t.results}</small></div></div>
          {count > 0 && <Link href="/cart" className={styles.foodCartHeaderAction}>{t.cart} ({count})</Link>}
        </div>
      </header>
      <section className={styles.body}>
        <div className={styles.locationWrap}><CustomerLocationBar banner/></div>
        <label className={styles.search}><CustomerIcon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label>
        {status === "loading" && <State text={t.loading} />}
        {status === "error" && <State text={t.error} />}
        {status === "ready" && !filtered.length && <State text={t.empty} />}
        <div className={styles.restaurantList}>
          {groups.map(([key, menu]) => {
            const organization = menu[0];
            const banners = (Array.isArray(organization.organizationMetadata?.draftBannerUrls) && organization.organizationMetadata.draftBannerUrls.length
              ? organization.organizationMetadata.draftBannerUrls
              : Array.isArray(organization.organizationMetadata?.bannerUrls) ? organization.organizationMetadata.bannerUrls : []) as string[];
            const fallback = String(organization.organizationMetadata?.draftLogoUrl || organization.organizationMetadata?.logoUrl || "");
            const displayBanners = banners.length ? banners : fallback ? [fallback] : [];
            const activeSlide = slides[key] || 0;
            const logo = fallback;
            const previewMenu = menu.slice(0, 2);
            const restaurantStatus=restaurantStatuses[String(organization.organizationId||key)];
            const restaurantOpen=restaurantStatus?.open!==false;
            const restaurantStatusLabel=!restaurantStatus||restaurantStatus.code==="open"?t.open:restaurantStatus.code==="platform_paused"?t.platformPaused:restaurantStatus.code==="manual_paused"?t.paused:restaurantStatus.code==="closed_hours"?t.closed:t.busy;
            return (
              <section className={styles.restaurant} key={key} style={{opacity:restaurantOpen?1:.72}}>
                <Link href={`/restaurant/${encodeURIComponent(key)}`} className={styles.restaurantBanner}>
                  <div className={styles.fadeBanner} aria-hidden="true">
                    {displayBanners.map((url, index) => (
                      <div
                        className={`${styles.fadeBannerLayer} ${index === activeSlide ? styles.fadeBannerLayerActive : ""}`}
                        key={`${url}-${index}`}
                        style={{ backgroundImage: `url(${url})` }}
                      />
                    ))}
                    <div className={styles.fadeBannerShade} />
                  </div>
                  {logo ? <img src={logo} alt="" className={styles.restaurantLogo} /> : <span className={styles.restaurantLogoFallback}>喜</span>}
                  <div><small className={styles.openBadge} style={!restaurantOpen?{background:"#fff1f2",color:"#b42318"}:undefined}>{restaurantStatusLabel}</small><h2>{localizeOrganizationName(locale, organization.organizationCode, organization.organizationName, organization.organizationMetadata)}</h2><p>{organization.organizationAddress}</p>{restaurantStatus&&!restaurantOpen&&<small style={{display:"block",marginTop:3,color:"#b42318",fontWeight:800}}>{restaurantStatus.code==="closed_hours"&&restaurantStatus.businessHoursToday?.enabled?`${t.opens}: ${restaurantStatus.businessHoursToday.open}–${restaurantStatus.businessHoursToday.close}`:restaurantStatus.pauseReason||restaurantStatusLabel}</small>}{organization.distanceKm!==null&&organization.distanceKm!==undefined&&<em className={styles.restaurantDistance}>⌖ {organization.distanceKm.toFixed(1)} km</em>}</div>
                </Link>
                <div className={styles.restaurantMenu}>
                  {previewMenu.map((item) => {
                    const quantity = quantities[item.id] ?? (Number(localStorage.getItem(`zhaoxi-service-quantity-${item.id}`)) || 0);
                    const priceInfo=foodPricing[item.id];
                    const unitPrice = Number(priceInfo?.effectiveUnitPrice ?? item.priceFrom ?? 0);
                    const baseUnitPrice=Number(priceInfo?.baseUnitPrice ?? item.priceFrom ?? 0);
                    const lineSubtotal=quantity>0&&priceInfo?.quantity===Math.max(1,quantity)?Number(priceInfo.finalSubtotal):unitPrice*quantity;
                    const image = String(item.metadata?.imageUrl || "");
                    const available = item.metadata?.isAvailable !== false && restaurantOpen && priceInfo?.scheduledAvailable!==false;
                    return (
                      <article className={styles.menuItem} key={item.id} style={{ opacity: available ? 1 : 0.58 }}>
                        <Link href={available ? `/service/${item.id}` : "#"} onClick={(event) => { if (!available) event.preventDefault(); }} className={styles.menuMain}>
                          {image ? <img src={image} alt={localizeServiceName(locale, item.name || item.code)} className={styles.menuImage} style={{ objectFit: "cover" }} /> : <div className={styles.menuImage}><CustomerServiceIcon serviceId="food" size={40}/></div>}
                          <div><h3>{localizeServiceName(locale, item.name || item.code)}</h3><p>{item.summary}</p><strong>{unitPrice ? money(unitPrice, item.currency) : ""}</strong>{priceInfo?.promoActive&&<><small style={{marginLeft:6,textDecoration:"line-through",color:"#94a3b8"}}>{money(baseUnitPrice,item.currency)}</small><em style={{display:"inline-block",marginTop:4,padding:"3px 6px",borderRadius:999,background:"#fff7ed",color:"#c2410c",fontSize:8,fontStyle:"normal",fontWeight:850}}>{priceInfo.promotionLabel||t.promo}</em></>}{!available && <small style={{ display: "block", color: "#dc2626", fontWeight: 900, marginTop: 4 }}>{priceInfo?.scheduledAvailable===false?t.scheduledOff:t.soldOut}</small>}</div>
                        </Link>
                        <div className={styles.menuBottom}>
                          <div className={styles.menuQuantity}><button disabled={!available || quantity === 0} onClick={(event) => change(event, item.id, -1)}>−</button><b>{quantity}</b><button disabled={!available} onClick={(event) => change(event, item.id, 1)}>+</button></div>
                          <span>{t.subtotal}: <b>{money(lineSubtotal, item.currency)}</b></span>
                          {available ? <><button className={styles.addToCartButton} disabled={quantity===0} onClick={(event) => { event.preventDefault(); handleAdd(item, quantity, quantity>0?lineSubtotal/quantity:unitPrice, image); }}>{t.addCart}</button><Link href={`/service/${item.id}`}>{t.detail} ›</Link></> : <b style={{ color: "#dc2626" }}>{t.soldOut}</b>}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <Link className={styles.viewRestaurant} href={`/restaurant/${encodeURIComponent(key)}`}>{t.viewMore}{menu.length > 2 ? ` (${menu.length - 2})` : ""} ›</Link>
              </section>
            );
          })}
        </div>
      </section>
      <MiniTabBar />
    </main>
  );
}

function State({ text }: { text: string }) {
  return <div className={styles.state}><div className={styles.stateIcon}><CustomerIcon name="search"/></div><p>{text}</p></div>;
}
