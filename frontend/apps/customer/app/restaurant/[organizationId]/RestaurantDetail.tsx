"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useZhaoXiLocale, localizeOrganizationName, localizeServiceName } from "@zhaoxi/i18n";
import { useZhaoXiCart } from "@zhaoxi/cart";
import { getCached, setCached } from "../../_lib/client-cache";
import MiniTabBar from "../../_components/MiniTabBar";
import {CustomerServiceIcon} from "../../_components/CustomerServiceIcon";
import VerifiedPartnerIdentity from "../../_components/VerifiedPartnerIdentity";
import styles from "../../services.module.css";

type Service = {
  id: string;
  code: string;
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
};

type FoodPrice={scheduledAvailable:boolean;promoActive:boolean;promotionLabel:string;baseUnitPrice:number;effectiveUnitPrice:number;quantity:number;finalSubtotal:number};

const ui = {
  "zh-CN": { back: "返回", loading: "正在加载…", empty: "暂无商品", subtotal: "小计", add: "加入购物车", soldOut: "已售罄", cart: "购物车", menu: "全部菜单", open: "营业中", promo:"优惠", scheduledOff:"暂未开售", paused:"暂停接单", closed:"已打烊", busy:"订单已满", hours:"营业时间", platformPaused:"平台暂时停止接单" },
  "zh-TW": { back: "返回", loading: "正在載入…", empty: "暫無商品", subtotal: "小計", add: "加入購物車", soldOut: "已售罄", cart: "購物車", menu: "完整菜單", open: "營業中", promo:"優惠", scheduledOff:"暫未開售", paused:"暫停接單", closed:"已打烊", busy:"訂單已滿", hours:"營業時間", platformPaused:"平台暫時停止接單" },
  "vi-VN": { back: "Quay lại", loading: "Đang tải…", empty: "Chưa có món", subtotal: "Thành tiền", add: "Thêm vào giỏ", soldOut: "Hết món", cart: "Giỏ hàng", menu: "Toàn bộ thực đơn", open: "Đang mở", promo:"Ưu đãi", scheduledOff:"Chưa đến giờ bán", paused:"Tạm ngưng nhận đơn", closed:"Đã đóng cửa", busy:"Bếp đang quá tải", hours:"Giờ hoạt động", platformPaused:"Platform đang tạm dừng nhận đơn" },
  "en-US": { back: "Back", loading: "Loading…", empty: "No items", subtotal: "Subtotal", add: "Add to cart", soldOut: "Sold out", cart: "Cart", menu: "Full menu", open: "Open", promo:"Promotion", scheduledOff:"Not on sale now", paused:"Orders paused", closed:"Closed", busy:"Kitchen at capacity", hours:"Business hours", platformPaused:"Platform has temporarily paused orders" },
} as const;

function money(value: number, currency = "VND") {
  return `${Math.round(value).toLocaleString("vi-VN")} ${currency}`;
}

export default function RestaurantDetail({ organizationId }: { organizationId: string }) {
  const { locale } = useZhaoXiLocale();
  const t = ui[locale];
  const { add, count } = useZhaoXiCart();
  const cacheKey = `restaurant_detail_${organizationId}_${locale}`;
  const initialItems = getCached<Service[]>(cacheKey);
  const [items, setItems] = useState<Service[]>(() => initialItems || []);
  const [loading, setLoading] = useState(() => !initialItems || initialItems.length === 0);
  const [slide, setSlide] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [restaurantStatus,setRestaurantStatus]=useState<{open:boolean;code:string;businessHoursToday?:{enabled:boolean;open:string;close:string};pauseReason?:string}|null>(() => getCached(`restaurant_status_${organizationId}`));
  const [foodPricing,setFoodPricing]=useState<Record<string,FoodPrice>>({});

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch(`/api/platform-services?module=food&organizationId=${encodeURIComponent(organizationId)}&locale=${locale}`, { cache: "no-store" })
        .then((response) => response.json().catch(() => null))
        .then((payload) => {
          if (!cancelled) {
            const next = Array.isArray(payload?.data) ? payload.data : [];
            setItems(next);
            setCached(cacheKey, next);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [organizationId, locale]);

  useEffect(()=>{let alive=true;const load=()=>fetch(`/api/restaurant-status/${encodeURIComponent(organizationId)}`,{cache:"no-store"}).then(r=>r.json().catch(()=>null)).then(j=>{if(alive&&j?.ok){setRestaurantStatus(j.data);setCached(`restaurant_status_${organizationId}`, j.data);}}).catch(()=>{});void load();const timer=setInterval(load,15000);return()=>{alive=false;clearInterval(timer)}},[organizationId]);

  const organization = items[0];
  const banners = useMemo(() => {
    const metadata = organization?.organizationMetadata || {};
    const source = Array.isArray(metadata.draftBannerUrls) && metadata.draftBannerUrls.length
      ? metadata.draftBannerUrls
      : Array.isArray(metadata.bannerUrls) ? metadata.bannerUrls : [];
    return source.map(String).filter(Boolean);
  }, [organization]);

  useEffect(() => { setSlide(0); }, [organizationId, banners.join("|")]);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % banners.length), 4200);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  useEffect(()=>{if(!items.length){setFoodPricing({});return}const timer=setTimeout(()=>{const q=new URLSearchParams({ids:items.map(x=>x.id).join(",")});for(const item of items)q.set(`q_${item.id}`,String(Math.max(1,quantities[item.id]||1)));fetch(`/api/food-pricing?${q}`,{cache:"no-store"}).then(r=>r.json().catch(()=>null)).then(j=>{if(j?.ok)setFoodPricing(j.data||{})}).catch(()=>{})},120);return()=>clearTimeout(timer)},[items,quantities]);

  function change(event: MouseEvent, id: string, delta: number) {
    event.preventDefault();
    event.stopPropagation();
    setQuantities((current) => ({ ...current, [id]: Math.max(0, Math.min(99, (current[id] ?? 0) + delta)) }));
  }

  function handleAdd(item: Service, quantity: number, unitPrice: number, image: string) {
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

  if (loading) return <main className={styles.shell}><div className={styles.state}><span>喜</span><p>{t.loading}</p></div></main>;
  if (!organization) return <main className={styles.shell}><div className={styles.state}><span>喜</span><p>{t.empty}</p></div></main>;

  const fallbackBanner = String(organization.organizationMetadata?.draftLogoUrl || organization.organizationMetadata?.logoUrl || "");
  const displayBanners = banners.length ? banners : fallbackBanner ? [fallbackBanner] : [];
  const logo = String(organization.organizationMetadata?.draftLogoUrl || organization.organizationMetadata?.logoUrl || "");
  const restaurantOpen=restaurantStatus?.open!==false;
  const statusLabel=!restaurantStatus||restaurantStatus.code==="open"?t.open:restaurantStatus.code==="platform_paused"?t.platformPaused:restaurantStatus.code==="manual_paused"?t.paused:restaurantStatus.code==="closed_hours"?t.closed:t.busy;

  return (
    <main className={styles.shell}>
      <section className={styles.restaurantDetailHero}>
        <div className={styles.fadeBanner} aria-hidden="true">
          {displayBanners.map((url, index) => (
            <div
              className={`${styles.fadeBannerLayer} ${index === slide ? styles.fadeBannerLayerActive : ""}`}
              key={`${url}-${index}`}
              style={{ backgroundImage: `url(${url})` }}
            />
          ))}
          <div className={styles.fadeBannerShade} />
        </div>
        <Link href="/services/food" className={styles.backButton}>‹</Link>
        <div className={styles.restaurantDetailIdentity}>
          {logo ? <img src={logo} alt="" /> : <span><CustomerServiceIcon serviceId="food" size={32}/></span>}
          <div>
            <small style={!restaurantOpen?{background:"#fff1f2",color:"#b42318"}:undefined}>{statusLabel}</small>
            <h1>{localizeOrganizationName(locale, organization.organizationCode, organization.organizationName, organization.organizationMetadata)}</h1>
            <p>{organization.organizationAddress}</p>{restaurantStatus&&!restaurantOpen&&<em style={{display:"block",marginTop:4,color:"#fff",fontSize:9,fontStyle:"normal"}}>{restaurantStatus.code==="closed_hours"&&restaurantStatus.businessHoursToday?.enabled?`${t.hours}: ${restaurantStatus.businessHoursToday.open}–${restaurantStatus.businessHoursToday.close}`:restaurantStatus.pauseReason||statusLabel}</em>}
          </div>
        </div>
        {banners.length > 1 && <div className={styles.bannerDots}>{banners.map((_, index) => <button type="button" aria-label={`Banner ${index + 1}`} className={index === slide ? styles.activeDot : ""} key={index} onClick={() => setSlide(index)} />)}</div>}
      </section>
      <section className={styles.restaurantDetailBody}>
        <h2>{t.menu}</h2>
        <div className={styles.restaurantMenu}>
          {items.map((item) => {
            const quantity = quantities[item.id] ?? 0;
            const priceInfo=foodPricing[item.id];
            const unit = Number(priceInfo?.effectiveUnitPrice ?? item.priceFrom ?? 0);
            const baseUnit=Number(priceInfo?.baseUnitPrice ?? item.priceFrom ?? 0);
            const lineSubtotal=quantity>0&&priceInfo?.quantity===Math.max(1,quantity)?Number(priceInfo.finalSubtotal):unit*quantity;
            const image = String(item.metadata?.imageUrl || "");
            const available = item.metadata?.isAvailable !== false && restaurantOpen && priceInfo?.scheduledAvailable!==false;
            return (
              <article className={styles.menuItem} key={item.id} style={{ opacity: available ? 1 : 0.58 }}>
                <div className={styles.menuMain}>
                  {image ? <img src={image} alt={localizeServiceName(locale, item.name || item.code)} className={styles.menuImage} /> : <div className={styles.menuImage}><CustomerServiceIcon serviceId="food" size={40}/></div>}
                  <div><h3>{localizeServiceName(locale, item.name || item.code)}</h3><p>{item.summary}</p><strong>{money(unit, item.currency)}</strong>{priceInfo?.promoActive&&<><small style={{marginLeft:6,textDecoration:"line-through",color:"#94a3b8"}}>{money(baseUnit,item.currency)}</small><em style={{display:"block",marginTop:4,color:"#c2410c",fontSize:8,fontStyle:"normal",fontWeight:850}}>{priceInfo.promotionLabel||t.promo}</em></>}{!available && <small className={styles.soldOutText}>{priceInfo?.scheduledAvailable===false?t.scheduledOff:t.soldOut}</small>}</div>
                </div>
                <div className={styles.menuBottom}>
                  <div className={styles.menuQuantity}><button type="button" disabled={!available || quantity === 0} onClick={(event) => change(event, item.id, -1)}>−</button><b>{quantity}</b><button type="button" disabled={!available} onClick={(event) => change(event, item.id, 1)}>+</button></div>
                  <span>{t.subtotal}: <b>{money(lineSubtotal, item.currency)}</b></span>
                  {available && <button type="button" disabled={quantity===0} onClick={() => handleAdd(item, quantity, quantity>0?lineSubtotal/quantity:unit, image)}>{t.add}</button>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <VerifiedPartnerIdentity organizationId={organizationId}/><MiniTabBar />
    </main>
  );
}
