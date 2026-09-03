"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { IdentityUpgradeSheet, useZhaoXiSession } from "@zhaoxi/auth";
const localTestBypass=process.env.NEXT_PUBLIC_ZHAOXI_LOCAL_TEST_BYPASS==="true";
import { localizeOrganizationName, useZhaoXiLocale } from "@zhaoxi/i18n";
import { useRouter, useSearchParams } from "next/navigation";
import { readZhaoXiCart, useZhaoXiCart } from "@zhaoxi/cart";
import { paymentMethodLabel, type PaymentCapabilities, type PaymentMethod } from "@zhaoxi/payment";
import { invalidateCache } from "../_lib/client-cache";
import LocationPicker from "./LocationPicker";
import {CustomerServiceIcon} from "./CustomerServiceIcon";
import styles from "../request.module.css";

type Point = { latitude: number; longitude: number };
type SavedAddress={id:string;label:string;recipientName?:string|null;recipientPhone?:string|null;addressText:string;latitude?:number|null;longitude?:number|null;isDefault:boolean};
type Service = {
  id: string;
  code: string;
  moduleCode: string;
  name?: string;
  summary?: string;
  priceFrom?: string | null;
  currency?: string;
  organization?: { id?:string; code?: string; name?: string; address?: string; metadata?: Record<string, unknown> };
  metadata?: Record<string, unknown>;
};

const copy = {
  "zh-CN": { back:"返回", title:"确认服务订单", name:"姓名", phone:"收货电话", address:"收货地址", date:"期望日期", time:"期望时间", quantity:"数量", detail:"需求说明", note:"补充备注", submit:"确认订单", sending:"正在提交…", required:"请完整填写姓名、电话、地址和配送位置", privacy:"您的联系方式仅用于本次服务沟通。", itemPrice:"商品金额", delivery:"配送费", distance:"配送距离", total:"应付总额", payment:"货到付款", paymentMethodTitle:"支付方式", paymentSummaryTitle:"费用明细", calculate:"正在计算配送费…", locationRequired:"请选择配送位置", priceUnavailable:"价格待商家确认", scheduleHint:"如不选择日期和时间，订单将立即发送给商家处理。", cartLocked:"数量已按购物车锁定", savedAddresses:"已保存地址", useAddress:"使用", deliveryGross:"配送费原价", subsidy:"商家配送补贴", deliveryPay:"实际配送费", subsidyTime:"补贴时段", routeGoogle:"Google 路线", routeFallback:"备用距离", restaurantPaused:"餐厅暂停接单", restaurantClosed:"餐厅当前已打烊", restaurantBusy:"餐厅厨房订单已满", restaurantHours:"今日营业时间", itemOriginal:"商品原价", itemDiscount:"菜品优惠", scheduledOff:"该菜品当前不在售卖时段", coupon:"Mã ưu đãi / Coupon", couponCode:"输入优惠码", applyCoupon:"使用", removeCoupon:"取消", coupons:"可用优惠券", couponDiscount:"优惠券优惠", couponInvalid:"优惠券不可用", couponMin:"最低订单", couponExpired:"优惠券已过期", couponLimit:"优惠券使用次数已达上限", platformPaused:"平台暂时停止该餐厅接单" },
  "zh-TW": { back:"返回", title:"確認服務訂單", name:"姓名", phone:"收貨電話", address:"收貨地址", date:"期望日期", time:"期望時間", quantity:"數量", detail:"需求說明", note:"補充備註", submit:"確認訂單", sending:"正在提交…", required:"請完整填寫姓名、電話、地址和配送位置", privacy:"您的聯絡方式僅用於本次服務溝通。", itemPrice:"商品金額", delivery:"配送費", distance:"配送距離", total:"應付總額", payment:"貨到付款", paymentMethodTitle:"付款方式", paymentSummaryTitle:"費用明細", calculate:"正在計算配送費…", locationRequired:"請選擇配送位置", priceUnavailable:"價格由商家確認", scheduleHint:"若不選擇日期與時間，訂單會立即送交商家處理。", cartLocked:"數量已依購物車鎖定", savedAddresses:"已儲存地址", useAddress:"使用", deliveryGross:"配送費原價", subsidy:"商家配送補貼", deliveryPay:"實際配送費", subsidyTime:"補貼時段", routeGoogle:"Google 路線", routeFallback:"備援距離", restaurantPaused:"餐廳暫停接單", restaurantClosed:"餐廳目前已打烊", restaurantBusy:"餐廳廚房訂單已滿", restaurantHours:"今日營業時間", itemOriginal:"商品原價", itemDiscount:"餐點優惠", scheduledOff:"該餐點目前不在販售時段", coupon:"Mã ưu đãi / Coupon", couponCode:"輸入優惠碼", applyCoupon:"使用", removeCoupon:"取消", coupons:"可用優惠券", couponDiscount:"優惠券優惠", couponInvalid:"優惠券不可用", couponMin:"最低訂單", couponExpired:"優惠券已過期", couponLimit:"優惠券使用次數已達上限", platformPaused:"平台暫時停止該餐廳接單" },
  "vi-VN": { back:"Quay lại", title:"Xác nhận đơn dịch vụ", name:"Họ và tên", phone:"Số điện thoại người nhận", address:"Địa chỉ nhận hàng", date:"Ngày mong muốn", time:"Giờ mong muốn", quantity:"Số lượng", detail:"Nội dung yêu cầu", note:"Ghi chú bổ sung", submit:"Xác nhận đặt đơn", sending:"Đang gửi…", required:"Vui lòng nhập đầy đủ họ tên, số điện thoại, địa chỉ và vị trí nhận hàng", privacy:"Thông tin liên hệ chỉ dùng để xử lý đơn này.", itemPrice:"Tiền hàng", delivery:"Phí giao hàng", distance:"Quãng đường", total:"Tổng thanh toán", payment:"Thanh toán khi nhận hàng", paymentMethodTitle:"Phương thức thanh toán", paymentSummaryTitle:"Chi tiết thanh toán", calculate:"Đang tính phí giao hàng…", locationRequired:"Vui lòng chọn vị trí nhận hàng", priceUnavailable:"Giá sẽ được đối tác xác nhận", scheduleHint:"Nếu không chọn ngày và giờ, đơn hàng được hiểu là đặt ngay và chuyển ngay cho đối tác.", cartLocked:"Đã khóa theo giỏ hàng", savedAddresses:"Địa chỉ đã lưu", useAddress:"Dùng", deliveryGross:"Phí giao hàng gốc", subsidy:"Nhà hàng trợ giá", deliveryPay:"Phí giao hàng thực trả", subsidyTime:"Khung giờ trợ giá", routeGoogle:"Khoảng cách Google Maps", routeFallback:"Khoảng cách dự phòng", restaurantPaused:"Nhà hàng đang tạm ngưng nhận đơn", restaurantClosed:"Nhà hàng hiện đã đóng cửa", restaurantBusy:"Bếp nhà hàng đang đạt giới hạn đơn", restaurantHours:"Giờ hoạt động hôm nay", itemOriginal:"Giá món gốc", itemDiscount:"Ưu đãi món", scheduledOff:"Món hiện chưa trong khung giờ mở bán", coupon:"Mã ưu đãi / Coupon", couponCode:"Nhập mã ưu đãi", applyCoupon:"Áp dụng", removeCoupon:"Bỏ mã", coupons:"Mã ưu đãi khả dụng", couponDiscount:"Giảm bằng coupon", couponInvalid:"Coupon không khả dụng", couponMin:"Đơn tối thiểu", couponExpired:"Coupon đã hết hạn", couponLimit:"Coupon đã hết lượt sử dụng", platformPaused:"Platform đang tạm dừng nhận đơn của nhà hàng" },
  "en-US": { back:"Back", title:"Confirm service order", name:"Full name", phone:"Recipient phone", address:"Delivery address", date:"Preferred date", time:"Preferred time", quantity:"Quantity", detail:"Request details", note:"Additional notes", submit:"Confirm order", sending:"Submitting…", required:"Enter name, phone, address and delivery location", privacy:"Contact information is used only to fulfil this order.", itemPrice:"Items", delivery:"Delivery fee", distance:"Delivery distance", total:"Total", payment:"Cash on delivery", paymentMethodTitle:"Payment method", paymentSummaryTitle:"Payment details", calculate:"Calculating delivery fee…", locationRequired:"Choose a delivery location", priceUnavailable:"Price will be confirmed by the partner", scheduleHint:"Leave date and time blank to send the order immediately.", cartLocked:"Locked from cart", savedAddresses:"Saved addresses", useAddress:"Use", deliveryGross:"Gross delivery fee", subsidy:"Restaurant subsidy", deliveryPay:"Delivery fee you pay", subsidyTime:"Subsidy window", routeGoogle:"Google Maps route", routeFallback:"Fallback distance", restaurantPaused:"Restaurant is temporarily pausing orders", restaurantClosed:"Restaurant is currently closed", restaurantBusy:"Restaurant kitchen is at order capacity", restaurantHours:"Today’s business hours", itemOriginal:"Original item price", itemDiscount:"Food promotion", scheduledOff:"This item is not currently in its sale window", coupon:"Coupon & Promo", couponCode:"Enter promo code", applyCoupon:"Apply", removeCoupon:"Remove", coupons:"Available coupons", couponDiscount:"Coupon discount", couponInvalid:"Coupon unavailable", couponMin:"Minimum order", couponExpired:"Coupon expired", couponLimit:"Coupon usage limit reached", platformPaused:"Platform has temporarily paused this restaurant" },
} as const;

const fallbackOrigins: Record<string, Point> = {
  "ZX-FOOD-001": { latitude: 16.054407, longitude: 108.202164 },
  "ZX-LIFE-001": { latitude: 16.06778, longitude: 108.22083 },
  "ZX-TRAVEL-001": { latitude: 16.07101, longitude: 108.23031 },
  "ZX-HOME-001": { latitude: 16.04792, longitude: 108.24365 },
};

function numberFrom(value: unknown) { const number = Number(value); return Number.isFinite(number) ? number : undefined; }
function formatMoney(value: number, currency = "VND") { return `${Math.round(value).toLocaleString("vi-VN")} ${currency}`; }
type CouponEvaluation={valid:boolean;code:string;reason:string|null;couponId:string|null;title:string;discountType:"percent"|"fixed"|null;discountValue:number;discountAmount:number;itemSubtotalBeforeCoupon:number;itemSubtotalAfterCoupon:number};
type AvailableCoupon={id:string;code:string;title:string;discountType:"percent"|"fixed";discountValue:number;maxDiscountAmount:number|null;minOrderAmount:number;totalUsageLimit:number|null;perCustomerLimit:number;usedCount:number;eligible:boolean;remainingForCustomer:number};
type FoodPrice={scheduledAvailable:boolean;promoActive:boolean;promotionType:string;promotionLabel:string;baseUnitPrice:number;effectiveUnitPrice:number;quantity:number;baseSubtotal:number;discount:number;finalSubtotal:number};
type RestaurantStatus={open:boolean;code:"open"|"platform_paused"|"manual_paused"|"closed_hours"|"at_capacity";businessHoursToday?:{enabled:boolean;open:string;close:string};pauseReason?:string};
type DeliveryQuote={
 eligible:boolean;distanceKm:number|null;fee:number|null;grossFee:number|null;distanceFee?:number|null;subsidy:number;
 customerDeliveryFee:number|null;currency:string;etaMinutes:number|null;routeDurationMinutes:number|null;
 zoneKm:number;subsidyActive:boolean;subsidyWindow?:{start:string;end:string}|null;
 weather?:{source:"open_meteo"|"unavailable";precipitationMm:number;weatherCode:number|null;rainLevel:"none"|"light"|"moderate"|"heavy";surcharge:number};
 distanceProvider?:"google_routes"|"geo_fallback"|null;fulfillmentMode?:"external_manual";reason:string;
};

const rainCopy={
  "zh-CN":{light:"小雨附加费",moderate:"中雨附加费",heavy:"大雨/雷暴附加费"},
  "zh-TW":{light:"小雨附加費",moderate:"中雨附加費",heavy:"大雨／雷暴附加費"},
  "vi-VN":{light:"Phụ phí mưa nhỏ",moderate:"Phụ phí mưa vừa",heavy:"Phụ phí mưa to/dông"},
  "en-US":{light:"Light rain surcharge",moderate:"Moderate rain surcharge",heavy:"Heavy rain surcharge"},
} as const;

const weatherFairCopy={
  "zh-CN":"天气 (Open-Meteo): 晴好 (无雨天附加费)",
  "zh-TW":"天氣 (Open-Meteo): 晴好 (無雨天附加費)",
  "vi-VN":"Thời tiết (Open-Meteo): Nắng ráo (0đ phụ phí)",
  "en-US":"Weather (Open-Meteo): Fair (0đ surcharge)",
} as const;

export default function ServiceRequestForm({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cartOrg = searchParams.get("cartOrg");
  const session = useZhaoXiSession();
  const { clearOrganization } = useZhaoXiCart();
  const { locale } = useZhaoXiLocale();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [paymentCapabilities, setPaymentCapabilities] = useState<PaymentCapabilities>({cashOnDelivery:true,bankTransfer:false,wechatPay:false,wechatPayMode:"configuration_required",wechatPayCurrency:"CNY"});
  const [point, setPoint] = useState<Point | null>(null);
  const [savedAddresses,setSavedAddresses]=useState<SavedAddress[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [deliveryQuote,setDeliveryQuote]=useState<DeliveryQuote|null>(null);
  const [restaurantStatus,setRestaurantStatus]=useState<RestaurantStatus|null>(null);
  const [foodPricing,setFoodPricing]=useState<Record<string,FoodPrice>>({});
  const [couponCode,setCouponCode]=useState("");
  const [couponEvaluation,setCouponEvaluation]=useState<CouponEvaluation|null>(null);
  const [availableCoupons,setAvailableCoupons]=useState<AvailableCoupon[]>([]);
function getDefaultSchedule() {
  const target = new Date(Date.now() + 15 * 60 * 1000);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");
  const hours = String(target.getHours()).padStart(2, "0");
  const minutes = String(target.getMinutes()).padStart(2, "0");
  return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
}

  const [couponBusy,setCouponBusy]=useState(false);
  const defaultSchedule = useMemo(() => getDefaultSchedule(), []);
  const [form, setForm] = useState({ name:"", phone:"", address:"", date:defaultSchedule.date, time:defaultSchedule.time, quantity:"1", description:"" });
  const [identityUpgradeOpen,setIdentityUpgradeOpen]=useState(false);
  const cartItems = useMemo(() => cartOrg ? readZhaoXiCart().filter(item => String(item.organizationId || "unknown") === cartOrg) : [], [cartOrg, serviceId]);
  const t = copy[locale];

  const isGuest = !session || session.authMethod === "guest" || !session.phone;

  useEffect(() => {
    const sched = getDefaultSchedule();
    setForm(current => ({
      ...current,
      date: current.date || sched.date,
      time: current.time || sched.time,
    }));
  }, []);

  useEffect(() => {
    if (session && (session.authMethod === "guest" || !session.phone)) {
      router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [session, router]);


  useEffect(() => {
    let cancelled=false;
    fetch("/api/customer-profile",{cache:"no-store"})
      .then(r=>r.json())
      .then(j=>{
        if(cancelled||!j?.ok||!j.data)return;
        const d=j.data;
        const addresses=Array.isArray(d.addresses)?d.addresses as SavedAddress[]:[];
        setSavedAddresses(addresses);
        const saved=addresses.find(x=>x.isDefault);
        setForm(current=>({
          ...current,
          name:d.user?.displayName||current.name||"",
          phone:d.user?.phone||current.phone||"",
          address:saved?.addressText||d.profile?.addressText||current.address||"",
        }));
        const lat=Number(saved?.latitude??d.profile?.latitude);
        const lng=Number(saved?.longitude??d.profile?.longitude);
        if(Number.isFinite(lat)&&Number.isFinite(lng)&&lat!==0&&lng!==0)setPoint({latitude:lat,longitude:lng});
      }).catch(()=>{});
    return()=>{cancelled=true};
  }, []);

  useEffect(() => {
    const profile = localStorage.getItem("zhaoxi-customer-profile");
    if (profile) {
      try {
        const value = JSON.parse(profile);
        setForm((current) => ({ ...current, name:session?.displayName || value.name || "", phone:session?.phone || current.phone || "", address:value.address || "" }));
        if (value.latitude && value.longitude) setPoint({ latitude:Number(value.latitude), longitude:Number(value.longitude) });
      } catch { /* ignore invalid local profile */ }
    } else if (session) setForm((current) => ({ ...current, name:session.displayName || "", phone:session.phone || "" }));
  }, [session]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/platform-services/${serviceId}?locale=${locale}`, { cache:"no-store" })
      .then((response) => response.json())
      .then((data) => { const next=data?.data||null; setService(next); if(next?.id){ const saved=localStorage.getItem(`zhaoxi-service-quantity-${next.id}`); if(saved) setForm(current=>({...current,quantity:String(Math.max(1,Math.min(99,Number.parseInt(saved,10)||1)))})); } })
      .catch(() => setService(null))
      .finally(() => setLoading(false));
  }, [serviceId, locale]);

  useEffect(()=>{
    if(service?.moduleCode!=="food"||!service.organization?.id){setRestaurantStatus(null);return}
    let cancelled=false;
    const loadStatus=()=>fetch(`/api/restaurant-status/${encodeURIComponent(String(service.organization?.id))}`,{cache:"no-store"}).then(r=>r.json()).then(j=>{if(!cancelled&&j?.ok)setRestaurantStatus(j.data)}).catch(()=>{});
    void loadStatus();const timer=window.setInterval(loadStatus,10000);
    return()=>{cancelled=true;window.clearInterval(timer)}
  },[service?.moduleCode,service?.organization?.id]);

  const isFood = service?.moduleCode === "food";
  const lockedCart = cartItems.length > 0;
  const quantity = lockedCart ? cartItems.reduce((sum,item)=>sum+item.quantity,0) : Math.max(1, Number.parseInt(form.quantity || "1", 10) || 1);
  const unitPrice = numberFrom(service?.priceFrom) || 0;
  const fallbackItemSubtotal = lockedCart ? cartItems.reduce((sum,item)=>sum+item.unitPrice*item.quantity,0) : unitPrice * quantity;
  const pricingLines=Object.values(foodPricing);
  const itemBaseSubtotal=isFood&&pricingLines.length?pricingLines.reduce((sum,x)=>sum+Number(x.baseSubtotal||0),0):fallbackItemSubtotal;
  const itemDiscount=isFood&&pricingLines.length?pricingLines.reduce((sum,x)=>sum+Number(x.discount||0),0):0;
  const itemSubtotal=isFood&&pricingLines.length?pricingLines.reduce((sum,x)=>sum+Number(x.finalSubtotal||0),0):fallbackItemSubtotal;
  const couponDiscount=isFood&&couponEvaluation?.valid?Number(couponEvaluation.discountAmount||0):0;
  const itemSubtotalAfterCoupon=Math.max(0,itemSubtotal-couponDiscount);
  const foodScheduleBlocked=isFood&&pricingLines.some(x=>x.scheduledAvailable===false);
  const shippingGross = isFood && deliveryQuote?.eligible && deliveryQuote.grossFee !== null ? Number(deliveryQuote.grossFee||0) : 0;
  const shippingSubsidy = isFood && deliveryQuote?.eligible ? Number(deliveryQuote.subsidy||0) : 0;
  const shipping = isFood && deliveryQuote?.eligible && deliveryQuote.customerDeliveryFee !== null ? Number(deliveryQuote.customerDeliveryFee||0) : 0;
  const total = itemSubtotalAfterCoupon + shipping;
  const currency = service?.currency || "VND";
  useEffect(()=>{
    if(!isFood||!service?.id){setFoodPricing({});return}
    const timer=window.setTimeout(()=>{
      const lines=lockedCart?cartItems.map(x=>({id:x.serviceId,q:x.quantity})):[{id:service.id,q:quantity}];
      const params=new URLSearchParams({ids:lines.map(x=>x.id).join(",")});for(const line of lines)params.set(`q_${line.id}`,String(line.q));
      fetch(`/api/food-pricing?${params}`,{cache:"no-store"}).then(r=>r.json()).then(j=>{if(j?.ok)setFoodPricing(j.data||{})}).catch(()=>{});
    },100);return()=>window.clearTimeout(timer)
  },[isFood,service?.id,lockedCart,quantity,cartItems]);
  useEffect(()=>{
    const organizationId=service?.organization?.id;
    if(!isFood||!organizationId){setAvailableCoupons([]);setCouponEvaluation(null);return}
    const timer=window.setTimeout(()=>fetch(`/api/customer-coupons?organizationId=${encodeURIComponent(String(organizationId))}&itemSubtotal=${encodeURIComponent(String(itemSubtotal))}`,{cache:"no-store"}).then(r=>r.json()).then(j=>{if(j?.ok)setAvailableCoupons(j.data||[])}).catch(()=>{}),120);
    return()=>window.clearTimeout(timer)
  },[isFood,service?.organization?.id,itemSubtotal]);
  useEffect(()=>{
    if(!couponEvaluation?.valid||!couponCode.trim()||!service?.organization?.id)return;
    const timer=window.setTimeout(()=>{fetch("/api/customer-coupons",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({organizationId:service.organization?.id,code:couponCode,itemSubtotal})}).then(r=>r.json()).then(j=>{if(j?.ok)setCouponEvaluation(j.data)}).catch(()=>{})},140);
    return()=>window.clearTimeout(timer)
  },[itemSubtotal,service?.organization?.id]);
  const origin = useMemo<Point | null>(() => {
    if (!service?.organization) return null;
    const metadata = service.organization.metadata || {};
    const latitude = numberFrom(metadata.latitude);
    const longitude = numberFrom(metadata.longitude);
    if (latitude !== undefined && longitude !== undefined) return { latitude, longitude };
    return service.organization.code ? fallbackOrigins[service.organization.code] || null : null;
  }, [service]);

  useEffect(() => {
    if (!isFood || !service?.id || !point) { setDistanceKm(null);setDeliveryQuote(null);return; }
    let cancelled=false;setCalculating(true);
    fetch("/api/delivery-quote",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({serviceId:service.id,latitude:point.latitude,longitude:point.longitude})})
      .then(r=>r.json()).then(j=>{if(cancelled)return;const q=j?.data as DeliveryQuote|undefined;setDeliveryQuote(q||null);setDistanceKm(q?.distanceKm??null);if(q&&!q.eligible)setError(q.reason==="outside_service_zone"?({"zh-CN":"该地址超出商家配送范围","zh-TW":"該地址超出商家配送範圍","vi-VN":"Địa chỉ nằm ngoài vùng giao hàng của đối tác","en-US":"This address is outside the partner delivery zone"} as const)[locale]:({"zh-CN":"商家尚未设置配送位置","zh-TW":"商家尚未設定配送位置","vi-VN":"Đối tác chưa thiết lập vị trí giao hàng","en-US":"Partner delivery location is not configured"} as const)[locale]);})
      .catch(()=>{if(!cancelled){setDistanceKm(null);setDeliveryQuote(null)}}).finally(()=>{if(!cancelled)setCalculating(false)});
    return()=>{cancelled=true};
  },[isFood,service?.id,point?.latitude,point?.longitude,locale]);

  useEffect(() => { fetch("/api/platform-payments/capabilities", { cache:"no-store" }).then(r=>r.json()).then(d=>{ if(d?.data) setPaymentCapabilities(d.data); }).catch(()=>{}); }, []);

  const quantityLabel = isFood ? ({ "zh-CN":"菜品数量", "zh-TW":"餐點數量", "vi-VN":"Số lượng món", "en-US":"Item quantity" } as const)[locale] : t.quantity;

  function update(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]:value })); }
  function chooseAddress(address:SavedAddress){
    setForm(current=>({...current,name:address.recipientName||current.name,phone:address.recipientPhone||current.phone,address:address.addressText}));
    const latitude=Number(address.latitude),longitude=Number(address.longitude);
    if(Number.isFinite(latitude)&&Number.isFinite(longitude)&&latitude!==0&&longitude!==0)setPoint({latitude,longitude});
  }
  function changeQuantity(delta: number) { update("quantity", String(Math.max(1, Math.min(99, quantity + delta)))); }

  function couponErrorMessage(reason?:string|null){
    if(reason==="COUPON_EXPIRED")return t.couponExpired;
    if(reason==="COUPON_USAGE_LIMIT_REACHED"||reason==="COUPON_CUSTOMER_LIMIT_REACHED")return t.couponLimit;
    return t.couponInvalid;
  }
  async function applyCoupon(code=couponCode){
    const organizationId=service?.organization?.id;if(!isFood||!organizationId||!code.trim())return;
    setCouponBusy(true);setError("");
    try{const r=await fetch("/api/customer-coupons",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({organizationId,code:code.trim().toUpperCase(),itemSubtotal})});const j=await r.json();if(!r.ok||!j?.ok)throw new Error(j?.error?.code||"COUPON_INVALID");setCouponCode(String(j.data.code||code).toUpperCase());setCouponEvaluation(j.data);if(!j.data.valid)setError(couponErrorMessage(j.data.reason))}
    catch(e){setCouponEvaluation(null);setError(e instanceof Error?e.message:t.couponInvalid)}
    finally{setCouponBusy(false)}
  }
  function clearCoupon(){setCouponCode("");setCouponEvaluation(null);setError("")}

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!localTestBypass && isGuest) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) { setError(t.required); return; }
    if (isFood && !point) { setError(t.locationRequired); return; }
    if(isFood&&foodScheduleBlocked){setError(t.scheduledOff);return}
    if(isFood&&restaurantStatus&&!restaurantStatus.open){
      setError(restaurantStatus.code==="platform_paused"?(restaurantStatus.pauseReason||t.platformPaused):restaurantStatus.code==="manual_paused"?(restaurantStatus.pauseReason||t.restaurantPaused):restaurantStatus.code==="closed_hours"?`${t.restaurantClosed}${restaurantStatus.businessHoursToday?.enabled?` · ${t.restaurantHours}: ${restaurantStatus.businessHoursToday.open}–${restaurantStatus.businessHoursToday.close}`:""}`:t.restaurantBusy);
      return;
    }
    if (!service) return;
    setSubmitting(true);
    try {
      const payload = {
        moduleCode:service.moduleCode,
        serviceId:service.id,
        customerName:form.name.trim(),
        recipientPhone:form.phone.trim(),
        title:service.name || service.code,
        description:form.description.trim() || undefined,
        locale,
        addressText:form.address.trim(),
        latitude:point?.latitude,
        longitude:point?.longitude,
        details:{
          recipientPhone:form.phone.trim(),
          scheduledDate:form.date || undefined,
          scheduledTime:form.time || undefined,
          quantity,
          unitPrice,
          items: lockedCart ? cartItems.map(item=>({serviceId:item.serviceId,name:item.name,imageUrl:item.imageUrl,quantity:item.quantity,unitPrice:item.unitPrice,subtotal:item.unitPrice*item.quantity})) : undefined,
          itemBaseSubtotal,
          itemDiscount,
          itemSubtotalBeforeCoupon:itemSubtotal,
          couponCode:couponEvaluation?.valid?couponEvaluation.code:undefined,
          couponDiscount,
          itemSubtotal:itemSubtotalAfterCoupon,
          pricingSource:"customer_preview_16.30",
          deliveryDistanceKm:distanceKm,
          deliveryGrossFee:shippingGross,
          deliveryDistanceFee:deliveryQuote?.distanceFee,
          deliveryWeatherSurcharge:deliveryQuote?.weather?.surcharge||0,
          deliveryWeatherLevel:deliveryQuote?.weather?.rainLevel||"none",
          deliverySubsidy:shippingSubsidy,
          deliveryFee:shipping,
          deliveryCustomerFee:shipping,
          deliverySubsidyActive:deliveryQuote?.subsidyActive,
          deliverySubsidyWindow:deliveryQuote?.subsidyWindow,
          deliveryEtaMinutes:deliveryQuote?.etaMinutes,
          deliveryRouteDurationMinutes:deliveryQuote?.routeDurationMinutes,
          deliveryZoneKm:deliveryQuote?.zoneKm,
          deliveryDistanceProvider:deliveryQuote?.distanceProvider,
          deliveryPricingSource:"backend_policy_16.25.1",
          deliveryFulfillmentMode:"external_manual",
          driverDispatchRequired:false,
          totalAmount:total,
          currency,
          paymentMethod,
        },
      };
      const response = await fetch("/api/platform-requests", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error?.message || "Unable to submit");
      const created = data.data;
      const existing = JSON.parse(localStorage.getItem("zhaoxi-request-codes") || "[]") as string[];
      localStorage.setItem("zhaoxi-request-codes", JSON.stringify(Array.from(new Set([created.requestCode, ...existing])).slice(0, 30)));
      localStorage.setItem("zhaoxi-customer-profile", JSON.stringify({ name:form.name.trim(), phone:form.phone.trim(), address:form.address.trim(), latitude:point?.latitude, longitude:point?.longitude }));
      if(lockedCart&&cartOrg)clearOrganization(cartOrg);
      invalidateCache("customer_orders");
      const partnerCode = data.routing?.organizationCode || service.organization?.code || "";
      const partnerName = localizeOrganizationName(locale, partnerCode, data.routing?.organizationName || service.organization?.name);
      router.push(`/request-success?code=${encodeURIComponent(created.requestCode)}&id=${encodeURIComponent(created.id)}&partner=${encodeURIComponent(partnerName)}&partnerCode=${encodeURIComponent(partnerCode)}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to submit"); }
    finally { setSubmitting(false); }
  }

  if (loading) return <main className={styles.shell}><div className={styles.state}>喜<br/><small>{t.sending}</small></div></main>;
  if (!service) return <main className={styles.shell}><div className={styles.state}><Link href="/">{t.back}</Link></div></main>;
  const partnerName = localizeOrganizationName(locale, service.organization?.code, service.organization?.name);

  return <><IdentityUpgradeSheet role="customer" open={identityUpgradeOpen} onClose={()=>setIdentityUpgradeOpen(false)}/><main className={styles.shell}>
    <header className={styles.header}><Link href={`/service/${service.id}`} className={styles.backButton}>‹</Link><span style={{fontWeight:800,fontSize:13,color:"#059669"}}>ZHAOXI</span></header>
    <section className={styles.card}>
      <div className={styles.serviceHead}>{service.metadata?.imageUrl ? <img className={styles.serviceHeadImage} src={String(service.metadata.imageUrl)} alt={service.name || service.code} /> : <span><CustomerServiceIcon serviceId={service.moduleCode} size={48}/></span>}<div><small>{partnerName}</small><h1>{service.name || service.code}</h1><p>{service.summary}</p></div></div>
      <h2>{t.title}</h2>
      <form onSubmit={submit} className={styles.form}>
        <label>{t.name}<input value={form.name} onChange={(event) => update("name", event.target.value)} maxLength={120} autoComplete="name" required/></label>
        <label>{t.phone}<input value={form.phone} onChange={(event) => update("phone", event.target.value)} maxLength={30} inputMode="tel" autoComplete="tel" placeholder={session?.phone || "09..."} required/></label>
        {savedAddresses.length>0&&<section className={styles.savedAddressBox}><small>{t.savedAddresses}</small><div className={styles.savedAddressRow}>{savedAddresses.slice(0,5).map(address=><button type="button" key={address.id} data-default={address.isDefault} onClick={()=>chooseAddress(address)}><b>{address.label}</b><span>{address.addressText}</span><em>{t.useAddress}</em></button>)}</div></section>}
        {!isFood && <label>{t.address}<input value={form.address} onChange={(event) => update("address", event.target.value)} maxLength={300} autoComplete="street-address" required/></label>}
        {isFood && <LocationPicker locale={locale} address={form.address} point={point} onAddress={(value) => update("address", value)} onPoint={setPoint}/>}        
        <div className={styles.two}><label>{t.date}<input type="date" value={form.date} onChange={(event) => update("date", event.target.value)}/></label><label>{t.time}<input type="time" value={form.time} onChange={(event) => update("time", event.target.value)}/></label></div>
        <label>{quantityLabel}{lockedCart ? <div className={styles.lockedQuantityBox}><strong className={styles.lockedQuantityNumber}>{quantity}</strong><span className={styles.cartLockedBadge}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{display:"inline-block",verticalAlign:"middle",flexShrink:0}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>{t.cartLocked}</span></span></div> : <div className={styles.quantityRow}><button type="button" className={styles.quantityButton} onClick={() => changeQuantity(-1)}>−</button><input className={styles.quantityInput} type="number" min="1" max="99" value={form.quantity} onChange={(event) => update("quantity", String(Math.max(1, Math.min(99, Number.parseInt(event.target.value || "1", 10) || 1))))}/><button type="button" className={styles.quantityButton} onClick={() => changeQuantity(1)}>+</button></div>}</label>
        <label>{t.detail}<textarea value={form.description} onChange={(event) => update("description", event.target.value)} maxLength={1500}/></label>
        {isFood&&foodScheduleBlocked&&<div className={styles.error}>{t.scheduledOff}</div>}
        {isFood&&restaurantStatus&&!restaurantStatus.open&&<div className={styles.error}>{restaurantStatus.code==="platform_paused"?(restaurantStatus.pauseReason||t.platformPaused):restaurantStatus.code==="manual_paused"?(restaurantStatus.pauseReason||t.restaurantPaused):restaurantStatus.code==="closed_hours"?`${t.restaurantClosed}${restaurantStatus.businessHoursToday?.enabled?` · ${t.restaurantHours}: ${restaurantStatus.businessHoursToday.open}–${restaurantStatus.businessHoursToday.close}`:""}`:t.restaurantBusy}</div>}

        {isFood && (
          <section className={styles.couponSection}>
            <div className={styles.sectionHeaderRow}>
              <b className={styles.sectionHeading}>{t.coupon}</b>
              {couponEvaluation?.valid && (
                <span className={styles.couponAppliedTag}>
                  ✓ {locale === "vi-VN" ? "Đã áp dụng" : locale === "en-US" ? "Applied" : locale === "zh-TW" ? "已套用" : "已使用"}
                </span>
              )}
            </div>
            <div className={styles.couponInputRow}>
              <input
                className={styles.couponInput}
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponEvaluation(null);
                }}
                placeholder={t.couponCode}
              />
              {couponEvaluation?.valid ? (
                <button type="button" className={styles.couponRemoveBtn} onClick={clearCoupon}>
                  {t.removeCoupon}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.couponApplyBtn}
                  disabled={couponBusy || !couponCode.trim()}
                  onClick={() => void applyCoupon()}
                >
                  {couponBusy ? "…" : t.applyCoupon}
                </button>
              )}
            </div>
            {couponEvaluation?.valid && (
              <div className={styles.couponAppliedBanner}>
                <span style={{ fontWeight: 600, color: "#065F46" }}>
                  ✓ {couponEvaluation.title || couponEvaluation.code}
                </span>
                <strong style={{ color: "#059669", fontSize: 13 }}>
                  −{formatMoney(couponDiscount, currency)}
                </strong>
              </div>
            )}
            {availableCoupons.length > 0 && (
              <div style={{ display: "grid", gap: 6, marginTop: 2 }}>
                <small className={styles.couponListTitle}>{t.coupons}</small>
                <div className={styles.couponChips}>
                  {availableCoupons.slice(0, 6).map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className={`${styles.couponChip} ${couponCode === c.code ? styles.couponChipActive : ""}`}
                      disabled={!c.eligible}
                      onClick={() => {
                        setCouponCode(c.code);
                        void applyCoupon(c.code);
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <strong>{c.code}</strong>
                        <span className={styles.couponChipDiscount}>
                          {c.discountType === "percent" ? `${c.discountValue}%` : `${c.discountValue.toLocaleString("vi-VN")} đ`}
                        </span>
                      </div>
                      {c.minOrderAmount > 0 && (
                        <em>
                          {t.couponMin}: {c.minOrderAmount.toLocaleString("vi-VN")} đ
                        </em>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section className={styles.paymentMethodSection}>
          <h3 className={styles.sectionHeading}>{t.paymentMethodTitle}</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {(["cash_on_delivery", "bank_transfer", "wechat_pay"] as PaymentMethod[]).map((method) => {
              const enabled =
                method === "cash_on_delivery" ||
                (method === "bank_transfer"
                  ? paymentCapabilities.bankTransfer
                  : paymentCapabilities.wechatPay && currency === (paymentCapabilities.wechatPayCurrency || "CNY"));
              const isSelected = paymentMethod === method;

              const methodDescriptions: Record<string, Record<PaymentMethod, string>> = {
                "vi-VN": {
                  cash_on_delivery: "Thanh toán bằng tiền mặt hoặc chuyển khoản khi nhận hàng",
                  bank_transfer: "Chuyển khoản trực tiếp qua ngân hàng",
                  wechat_pay: "Thanh toán trực tuyến bằng WeChat Pay",
                },
                "zh-CN": {
                  cash_on_delivery: "送达时支付现金或转账",
                  bank_transfer: "银行转账付款",
                  wechat_pay: "微信跨境在线支付",
                },
                "zh-TW": {
                  cash_on_delivery: "送達時支付現金或轉帳",
                  bank_transfer: "銀行轉帳付款",
                  wechat_pay: "微信跨境線上支付",
                },
                "en-US": {
                  cash_on_delivery: "Pay with cash or transfer on delivery",
                  bank_transfer: "Bank transfer payment",
                  wechat_pay: "Online payment via WeChat Pay",
                },
              };

              return (
                <label
                  key={method}
                  className={`${styles.paymentMethodCard} ${isSelected ? styles.paymentMethodCardActive : ""} ${!enabled ? styles.paymentMethodCardDisabled : ""}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={isSelected}
                    disabled={!enabled}
                    onChange={() => setPaymentMethod(method)}
                    style={{ display: "none" }}
                  />
                  <div className={`${styles.paymentRadioIndicator} ${isSelected ? styles.paymentRadioIndicatorActive : ""}`}>
                    {isSelected && <span className={styles.paymentRadioInner} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className={styles.paymentMethodName}>{paymentMethodLabel(method, locale)}</span>
                    </div>
                    <small className={styles.paymentMethodDesc}>
                      {methodDescriptions[locale]?.[method] || methodDescriptions["vi-VN"][method]}
                    </small>
                  </div>
                  {!enabled && (
                    <span className={styles.paymentDisabledBadge}>
                      {locale === "vi-VN" ? "Chưa kích hoạt" : locale === "en-US" ? "Not enabled" : locale === "zh-TW" ? "尚未啟用" : "尚未启用"}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </section>

        <section className={styles.priceSummarySection}>
          <h3 className={styles.sectionHeading}>{t.paymentSummaryTitle}</h3>
          {unitPrice > 0 ? (
            <div style={{ display: "grid", gap: 9 }}>
              <div className={styles.priceRow}>
                <span>{itemDiscount > 0 ? t.itemOriginal : t.itemPrice}</span>
                <b>{formatMoney(itemDiscount > 0 ? itemBaseSubtotal : itemSubtotal, currency)}</b>
              </div>
              {itemDiscount > 0 && (
                <div className={`${styles.priceRow} ${styles.priceRowDiscount}`}>
                  <span>{t.itemDiscount}</span>
                  <b>−{formatMoney(itemDiscount, currency)}</b>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className={`${styles.priceRow} ${styles.priceRowDiscount}`}>
                  <span>{t.couponDiscount}</span>
                  <b>−{formatMoney(couponDiscount, currency)}</b>
                </div>
              )}
              {isFood && (
                <>
                  {calculating ? (
                    <div className={styles.priceRow}>
                      <span>{t.delivery}</span>
                      <b style={{ color: "#059669" }}>{t.calculate}</b>
                    </div>
                  ) : deliveryQuote?.eligible ? (
                    <>
                      <div className={styles.priceRow}>
                        <span>
                          {t.deliveryGross}
                          {distanceKm !== null ? ` (${distanceKm.toFixed(1)} km)` : ""}
                        </span>
                        <b>{formatMoney(Number(deliveryQuote.distanceFee ?? shippingGross), currency)}</b>
                      </div>
                      {deliveryQuote.weather && (
                        <div className={styles.priceRow}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 13 }}>
                              {deliveryQuote.weather.rainLevel === "heavy" ? "⛈️" : deliveryQuote.weather.rainLevel === "moderate" ? "🌧️" : deliveryQuote.weather.rainLevel === "light" ? "🌦️" : "🌤️"}
                            </span>
                            {deliveryQuote.weather.surcharge > 0 
                              ? rainCopy[locale][deliveryQuote.weather.rainLevel as "light" | "moderate" | "heavy"]
                              : weatherFairCopy[locale]}
                          </span>
                          <b style={{ color: deliveryQuote.weather.surcharge > 0 ? "#D97706" : "#059669" }}>
                            {deliveryQuote.weather.surcharge > 0 ? `+${formatMoney(deliveryQuote.weather.surcharge, currency)}` : "0 VND"}
                          </b>
                        </div>
                      )}
                      {shippingSubsidy > 0 && (
                        <div className={`${styles.priceRow} ${styles.priceRowDiscount}`}>
                          <span>
                            {t.subsidy}
                            {deliveryQuote.subsidyWindow ? ` (${deliveryQuote.subsidyWindow.start}–${deliveryQuote.subsidyWindow.end})` : ""}
                          </span>
                          <b>−{formatMoney(shippingSubsidy, currency)}</b>
                        </div>
                      )}
                      <div className={styles.priceRow}>
                        <span>{t.deliveryPay}</span>
                        <b>{formatMoney(shipping, currency)}</b>
                      </div>
                      <div className={styles.priceRow}>
                        <span>
                          {( { "zh-CN": "预计送达", "zh-TW": "預計送達", "vi-VN": "Dự kiến giao", "en-US": "Estimated delivery" } as const )[locale]}
                        </span>
                        <b style={{ color: "#059669" }}>≈ {deliveryQuote.etaMinutes} min</b>
                      </div>
                      <small className={styles.routeSource}>
                        {deliveryQuote.distanceProvider === "google_routes" ? t.routeGoogle : t.routeFallback}
                      </small>
                    </>
                  ) : (
                    <div className={styles.priceRow}>
                      <span>{t.delivery}</span>
                      <b>—</b>
                    </div>
                  )}
                </>
              )}
              <div className={styles.priceTotalDivider} />
              <div className={styles.priceTotalRow}>
                <span>{t.total}</span>
                <strong>{formatMoney(total, currency)}</strong>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: "#64748B", fontSize: 13 }}>{t.priceUnavailable}</p>
          )}
        </section>

        {error && <div className={styles.error}>{error}</div>}
        <p className={styles.privacy}>{t.privacy}</p>
        <button disabled={submitting || (isFood && (calculating || !point || distanceKm === null || !deliveryQuote?.eligible || restaurantStatus?.open===false || foodScheduleBlocked))} type="submit">{submitting ? t.sending : t.submit}</button>
      </form>
    </section>
  </main></>;
}
