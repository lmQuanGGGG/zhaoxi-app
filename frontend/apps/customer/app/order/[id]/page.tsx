"use client";

import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useParams} from "next/navigation";
import {useZhaoXiLocale,statusLabels} from "@zhaoxi/i18n";
import {CustomerPageHeader,CustomerShell} from "../../_components/CustomerShell";
import styles from "../../orders.module.css";
import {DeliveryLiveMap,deliveryStageLabel,type DeliveryTracking} from "@zhaoxi/driver";
import {paymentMethodLabel,paymentStatusLabel} from "@zhaoxi/payment";
import {playCustomerOrderChime,registerAudioUnlock,type OrderStageType} from "../../_lib/customer-audio";
import {GrabLogo, XanhSMLogo} from "../../_components/DeliveryCourierLogos";

type Data={requestCode:string;status:string;details?:Record<string,unknown>;title:string;serviceName?:string;moduleName?:string;description?:string;addressText?:string;createdAt:string;history:Array<{id:string;toStatus:string;note?:string;createdAt:string}>};

const copy={
"zh-CN":{loading:"加载中…",confirmed:"商家已确认订单",soon:"即将完成",auto:"时间结束后自动完成",completed:"订单已完成",finding:"正在寻找配送员",progress:"订单进度",updated:"每4秒自动更新位置",step:"步骤",autoDone:"订单已完成，正在寻找配送员",deliveryTimeline:"配送进度",toPickup:"前往取货点",toDropoff:"前往送达点",gpsStale:"位置更新较慢",externalPending:"餐品已准备，等待外部配送安排",grossDelivery:"配送费原价",subsidy:"商家配送补贴",deliveryPay:"实际配送费",readyPickup:"餐品已备好，等待取餐",courierBooked:"已安排外部配送",handedOff:"餐品已交给配送员",deliveredFood:"已送达客户",itemOriginal:"商品原价",itemDiscount:"菜品优惠",itemPay:"商品实际金额",couponDiscount:"优惠券优惠"},
"zh-TW":{loading:"載入中…",confirmed:"商家已確認訂單",soon:"即將完成",auto:"時間結束後自動完成",completed:"訂單已完成",finding:"正在尋找配送員",progress:"訂單進度",updated:"每4秒自動更新位置",step:"步驟",autoDone:"訂單已完成，正在尋找配送員",deliveryTimeline:"配送進度",toPickup:"前往取貨點",toDropoff:"前往送達點",gpsStale:"位置更新較慢",externalPending:"餐點已準備，等待外部配送安排",grossDelivery:"配送費原價",subsidy:"商家配送補貼",deliveryPay:"實際配送費",readyPickup:"餐點已備好，等待取餐",courierBooked:"已安排外部配送",handedOff:"餐點已交給配送員",deliveredFood:"已送達客戶",itemOriginal:"商品原價",itemDiscount:"餐點優惠",itemPay:"餐點實際金額",couponDiscount:"優惠券優惠"},
"vi-VN":{loading:"Đang tải…",confirmed:"Đối tác đã xác nhận đơn",soon:"Sắp hoàn thành",auto:"Tự động hoàn thành khi hết thời gian",completed:"Đã hoàn thành đơn",finding:"Đang tìm người giao hàng",progress:"Tiến trình đơn hàng",updated:"Tự động cập nhật vị trí mỗi 4 giây",step:"Bước",autoDone:"Đã hoàn thành, đang tìm người giao hàng",deliveryTimeline:"Tiến trình giao hàng",toPickup:"Đang đến điểm lấy",toDropoff:"Đang đến điểm giao",gpsStale:"Vị trí cập nhật chậm",externalPending:"Món đã sẵn sàng, đang chờ bố trí đơn vị giao hàng",grossDelivery:"Phí giao hàng gốc",subsidy:"Nhà hàng trợ giá",deliveryPay:"Phí giao hàng thực trả",readyPickup:"Món đã sẵn sàng, chờ lấy món",courierBooked:"Đã bố trí đơn vị giao hàng",handedOff:"Đã bàn giao món cho người giao",deliveredFood:"Đã giao đến khách",itemOriginal:"Giá món gốc",itemDiscount:"Ưu đãi món",itemPay:"Tiền món thực trả",couponDiscount:"Giảm bằng coupon"},
"en-US":{loading:"Loading…",confirmed:"Partner confirmed the order",soon:"Almost completed",auto:"Automatically completes when time ends",completed:"Order completed",finding:"Finding a courier",progress:"Order progress",updated:"Automatically updates location every 4 seconds",step:"Step",autoDone:"Completed, finding a courier",deliveryTimeline:"Delivery timeline",toPickup:"Heading to pickup",toDropoff:"Heading to drop-off",gpsStale:"Location updates are delayed",externalPending:"Food is ready and awaiting external delivery arrangement",grossDelivery:"Gross delivery fee",subsidy:"Restaurant subsidy",deliveryPay:"Delivery fee you pay",readyPickup:"Food ready for pickup",courierBooked:"External courier arranged",handedOff:"Food handed to courier",deliveredFood:"Delivered to customer",itemOriginal:"Original items",itemDiscount:"Food promotion",itemPay:"Final item amount",couponDiscount:"Coupon discount"}
} as const;
const arrivalCopy={
 "zh-CN":"骑手已到，请下楼取餐。",
 "zh-TW":"外送員已到，請下樓取餐。",
 "vi-VN":"Tài xế đã đến, hãy xuống lấy hàng.",
 "en-US":"Your driver has arrived. Please come down to collect your order.",
} as const;
const fulfillmentTimeline={
 "zh-CN":{
  PARTNER_ACCEPTED_FOOD_ORDER:{title:"餐厅已接单",detail:"餐厅正在开始准备餐品"},
  FOOD_PREPARING:{title:"餐品正在准备",detail:"餐厅正在制作您的订单"},
  FOOD_READY_FOR_PICKUP:{title:"餐品已备好",detail:"等待配送员到店取餐"},
  AUTO_READY_FOR_EXTERNAL_PICKUP:{title:"餐品已备好",detail:"等待配送员到店取餐"},
  EXTERNAL_COURIER_BOOKED:{title:"已安排配送",detail:"配送员将前往餐厅取餐"},
  FOOD_HANDED_TO_COURIER:{title:"已交给配送员",detail:"配送员正把餐品送往您的地址"},
  EXTERNAL_DELIVERY_DELIVERED:{title:"配送员已到达",detail:"请下楼取餐"},
  FOOD_ORDER_CANCELLED:{title:"订单已取消",detail:"该订单不会继续处理"},
 },
 "zh-TW":{
  PARTNER_ACCEPTED_FOOD_ORDER:{title:"餐廳已接單",detail:"餐廳正在開始準備餐點"},
  FOOD_PREPARING:{title:"餐點正在準備",detail:"餐廳正在製作您的訂單"},
  FOOD_READY_FOR_PICKUP:{title:"餐點已備好",detail:"等待外送員到店取餐"},
  AUTO_READY_FOR_EXTERNAL_PICKUP:{title:"餐點已備好",detail:"等待外送員到店取餐"},
  EXTERNAL_COURIER_BOOKED:{title:"已安排配送",detail:"外送員將前往餐廳取餐"},
  FOOD_HANDED_TO_COURIER:{title:"已交給外送員",detail:"外送員正把餐點送往您的地址"},
  EXTERNAL_DELIVERY_DELIVERED:{title:"外送員已到達",detail:"請下樓取餐"},
  FOOD_ORDER_CANCELLED:{title:"訂單已取消",detail:"此訂單不會繼續處理"},
 },
 "vi-VN":{
  PARTNER_ACCEPTED_FOOD_ORDER:{title:"Nhà hàng đã nhận đơn",detail:"Nhà hàng bắt đầu chuẩn bị món"},
  FOOD_PREPARING:{title:"Đang chuẩn bị món",detail:"Nhà hàng đang làm món cho đơn của bạn"},
  FOOD_READY_FOR_PICKUP:{title:"Món đã sẵn sàng",detail:"Chờ tài xế đến lấy món"},
  AUTO_READY_FOR_EXTERNAL_PICKUP:{title:"Món đã sẵn sàng",detail:"Chờ tài xế đến lấy món"},
  EXTERNAL_COURIER_BOOKED:{title:"Đã bố trí giao hàng",detail:"Tài xế sẽ đến nhà hàng lấy món"},
  FOOD_HANDED_TO_COURIER:{title:"Đã bàn giao món cho tài xế",detail:"Tài xế đang giao món đến địa chỉ của bạn"},
  EXTERNAL_DELIVERY_DELIVERED:{title:"Tài xế đã đến nơi",detail:"Hãy xuống lấy hàng"},
  FOOD_ORDER_CANCELLED:{title:"Đơn đã hủy",detail:"Đơn này sẽ không được tiếp tục xử lý"},
 },
 "en-US":{
  PARTNER_ACCEPTED_FOOD_ORDER:{title:"Restaurant accepted the order",detail:"The restaurant has started preparing your food"},
  FOOD_PREPARING:{title:"Preparing your food",detail:"The restaurant is making your order"},
  FOOD_READY_FOR_PICKUP:{title:"Food is ready",detail:"Waiting for the driver to pick it up"},
  AUTO_READY_FOR_EXTERNAL_PICKUP:{title:"Food is ready",detail:"Waiting for the driver to pick it up"},
  EXTERNAL_COURIER_BOOKED:{title:"Courier arranged",detail:"The driver will collect the food from the restaurant"},
  FOOD_HANDED_TO_COURIER:{title:"Food handed to driver",detail:"The driver is delivering to your address"},
  EXTERNAL_DELIVERY_DELIVERED:{title:"Driver has arrived",detail:"Please come down to collect your order"},
  FOOD_ORDER_CANCELLED:{title:"Order cancelled",detail:"This order will not be processed further"},
 },
} as const;

export default function OrderDetail(){
 const{id}=useParams<{id:string}>();
 const{locale}=useZhaoXiLocale();
 const t=copy[locale];
 const[data,setData]=useState<Data|null>(null);
 const[tracking,setTracking]=useState<DeliveryTracking|null>(null);
 const[now,setNow]=useState(Date.now());

 const load=useCallback(()=>{
  fetch(`/api/platform-requests/${id}?locale=${locale}`,{cache:'no-store'}).then(r=>r.json()).then(d=>setData(d?.data||null)).catch(()=>{});
  fetch(`/api/delivery/${id}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>setTracking(d?.data||null)).catch(()=>{});
 },[id,locale]);

 useEffect(()=>{
  load();
  const timer=setInterval(()=>{setNow(Date.now());load()},4000);
  return()=>clearInterval(timer);
 },[load]);

 const lastStageKeyRef = useRef<string | null>(null);

 useEffect(() => {
  return registerAudioUnlock();
 }, []);

 useEffect(() => {
  if (!data) return;
  const fulfillmentStage = String(data?.details?.fulfillmentStage || "");
  const trackingStatus = String(tracking?.job?.status || "");
  const orderStatus = String(data.status || "");
  const currentKey = `${orderStatus}:${fulfillmentStage}:${trackingStatus}`;

  if (lastStageKeyRef.current === null) {
    lastStageKeyRef.current = currentKey;
    return;
  }

  if (lastStageKeyRef.current !== currentKey) {
    lastStageKeyRef.current = currentKey;
    let targetStage: OrderStageType = "general";
    if (orderStatus === "delivered" || fulfillmentStage === "delivered" || trackingStatus === "delivered") {
      targetStage = "delivered";
    } else if (
      orderStatus === "delivering" ||
      fulfillmentStage === "handed_off" ||
      fulfillmentStage === "courier_booked" ||
      trackingStatus === "delivering" ||
      trackingStatus === "pickup"
    ) {
      targetStage = "delivering";
    } else if (orderStatus === "in_progress" || fulfillmentStage === "ready_for_pickup") {
      targetStage = "preparing";
    } else if (orderStatus === "accepted" || orderStatus === "completed") {
      targetStage = "accepted";
    }
    playCustomerOrderChime(targetStage);
  }
 }, [data, tracking]);

 if(!data)return <CustomerShell><CustomerPageHeader title={t.loading} backHref="/orders"/><div className={styles.empty}>{t.loading}</div></CustomerShell>;

 const details=data.details||{};
 const end=typeof details.estimatedCompletionAt==='string'?new Date(details.estimatedCompletionAt).getTime():0;
 const remaining=Math.max(0,Math.ceil((end-now)/60000));
 const eta=Number(details.estimatedMinutes||0);
 const external=details.deliveryFulfillmentMode==='external_manual'||details.driverDispatchRequired===false;
 const fulfillmentStage=String(details.fulfillmentStage||'');
 const externalStage=fulfillmentStage==='ready_for_pickup'?t.readyPickup:fulfillmentStage==='courier_booked'?t.courierBooked:fulfillmentStage==='handed_off'?t.handedOff:fulfillmentStage==='delivered'?arrivalCopy[locale]:t.externalPending;

 return (
  <CustomerShell>
   <CustomerPageHeader title={data.serviceName||data.title} subtitle={data.requestCode} backHref="/orders"/>
   <section className={styles.body} style={{display:"grid",gap:12,paddingBottom:"calc(90px + env(safe-area-inset-bottom))"}}>
    <article className={styles.card} style={{borderRadius:20,border:"1px solid #EEF2F6",background:"#FFFFFF",padding:16,boxShadow:"0 4px 16px rgba(15,23,42,0.04)"}}>
     <div className={styles.row}>
      <code style={{background:"#F1F5F9",padding:"3px 8px",borderRadius:8,fontSize:11,fontWeight:600}}>{data.moduleName||"ZhaoXi"}</code>
      <div style={{display:"inline-flex",alignItems:"center",gap:6}}>
       <span data-status={data.status} style={{padding:"4px 10px",borderRadius:999,fontSize:11,fontWeight:750}}>{statusLabels[locale][data.status]||data.status}</span>
       <button
        type="button"
        title="Phát lại chuông"
        aria-label="Phát chuông thông báo"
        onClick={()=>{
         const fs = String(data.details?.fulfillmentStage || "");
         const ts = String(tracking?.job?.status || "");
         const os = String(data.status || "");
         let s: OrderStageType = "general";
         if (os === "delivered" || fs === "delivered" || ts === "delivered") s = "delivered";
         else if (os === "delivering" || fs === "handed_off" || fs === "courier_booked" || ts === "delivering" || ts === "pickup") s = "delivering";
         else if (os === "in_progress" || fs === "ready_for_pickup") s = "preparing";
         else if (os === "accepted" || os === "completed") s = "accepted";
         playCustomerOrderChime(s);
        }}
        style={{border:"none",background:"#F1F5F9",cursor:"pointer",borderRadius:"50%",width:26,height:26,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:12,padding:0}}
       >
        🔔
       </button>
      </div>
     </div>

     {data.status==='in_progress'&&eta>0&&(
      <div className="zx-eta-card" style={{marginTop:12,padding:14,borderRadius:16,background:"linear-gradient(135deg,#ECFDF5,#F0FDF4)",border:"1px solid #A7F3D0"}}>
       <b style={{color:"#065F46",fontSize:13}}>{t.confirmed}</b>
       <strong style={{display:"block",fontSize:22,color:"#047857",margin:"4px 0"}}>{remaining>0?`${remaining} ${locale.startsWith('zh')?'分钟':locale==='en-US'?'min':'phút'}`:t.soon}</strong>
       <div style={{height:6,borderRadius:99,background:"rgba(16,185,129,0.2)",overflow:"hidden",margin:"8px 0"}}><i style={{display:"block",height:"100%",background:"#10B981",borderRadius:99,width:`${Math.max(4,Math.min(100,eta?((eta-remaining)/eta)*100:0))}%`}}/></div>
       <small style={{color:"#065F46",fontSize:11}}>{t.auto}</small>
      </div>
     )}

     {data.status==='completed'&&(
      <div className="zx-finding-courier" style={{marginTop:12,padding:14,borderRadius:16,background:"#ECFDF5",border:"1px solid #A7F3D0",color:"#065F46"}}>
       <b style={{fontSize:14}}>✓ {t.completed}</b>
       <span style={{display:"block",fontSize:12,marginTop:2}}>{external?t.externalPending:t.finding}</span>
      </div>
     )}

     {external&&fulfillmentStage&&(
      <div style={{margin:"12px 0 0",padding:"11px 14px",borderRadius:16,background:"#F0FDF4",border:"1px solid #BBF7D0",color:"#166534",fontWeight:700,fontSize:12.5}}>
       🚚 {externalStage}{details.courierName?` · ${String(details.courierName)}`:""}
      </div>
     )}

     {(Boolean(details.deliveryProvider) || details.deliveryPricingMode === "customer_direct_pay") && (
      <div style={{margin:"12px 0 0",padding:"12px 14px",borderRadius:16,background:"#F8FAFC",border:"1px solid #E2E8F0",display:"grid",gap:6}}>
       <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
         {details.deliveryProvider === "grab" ? <GrabLogo size={20}/> : <XanhSMLogo size={20}/>}
         <b style={{fontSize:13,color:"#0F172A"}}>
          {details.deliveryProvider === "grab" ? "Grab (GrabExpress)" : "Xanh SM (Green SM)"}
         </b>
        </div>
        <span style={{fontSize:11,fontWeight:750,background:"#ECFDF5",color:"#059669",padding:"3px 8px",borderRadius:99}}>
         {locale === "vi-VN" ? "Khách tự trả tài xế" : locale === "en-US" ? "Direct pay" : locale === "zh-TW" ? "顧客自付" : "顾客自付"}
        </span>
       </div>
       <small style={{color:"#64748B",fontSize:11.5,lineHeight:1.4}}>
        {locale === "vi-VN"
         ? "💡 Cước phí giao hàng do khách tự thanh toán trực tiếp cho tài xế khi nhận món."
         : locale === "en-US"
          ? "💡 Delivery fee is paid directly by customer to the driver upon delivery."
          : locale === "zh-TW"
           ? "💡 配送費由顧客在取餐時直接支付給外送員。"
           : "💡 配送费由顾客在收餐时直接支付给骑手。"}
       </small>
      </div>
     )}

     {details.itemSubtotal!=null&&(
      <div style={{display:"grid",gap:7,margin:"12px 0 0",padding:"12px 14px",borderRadius:16,background:"#F8FAFC",border:"1px solid #EEF2F6",fontSize:12.5}}>
       {Number(details.itemDiscount||0)>0&&(
        <>
         <div style={{display:"flex",justifyContent:"space-between",color:"#64748B"}}><span>{t.itemOriginal}</span><b>{Number(details.itemBaseSubtotal||0).toLocaleString("vi-VN")} VND</b></div>
         <div style={{display:"flex",justifyContent:"space-between",color:"#E11D48"}}><span>{t.itemDiscount}</span><b>−{Number(details.itemDiscount||0).toLocaleString("vi-VN")} VND</b></div>
        </>
       )}
       {Number(details.couponDiscount||0)>0&&(
        <div style={{display:"flex",justifyContent:"space-between",color:"#E11D48"}}><span>{t.couponDiscount}{details.couponCode?` (${String(details.couponCode)})`:""}</span><b>−{Number(details.couponDiscount||0).toLocaleString("vi-VN")} VND</b></div>
       )}
       <div style={{display:"flex",justifyContent:"space-between",fontSize:14,paddingTop:6,borderTop:"1px solid #E2E8F0"}}><span>{t.itemPay}</span><b style={{color:"#0F172A",fontWeight:800}}>{Number(details.itemSubtotal||0).toLocaleString("vi-VN")} VND</b></div>
      </div>
     )}

     {Boolean(details.paymentStatus)&&(
      <div style={{margin:"12px 0 0",padding:"12px 14px",border:"1px solid #E2E8F0",borderRadius:16,background:"#FFFFFF",fontSize:12.5}}>
       <b>💳 {paymentMethodLabel(String(details.paymentMethod||"cash_on_delivery"),locale)}</b>
       <span style={{display:"block",marginTop:4,color:"#059669",fontWeight:650}}>{paymentStatusLabel(String(details.paymentStatus),locale)}</span>
      </div>
     )}

     {details.deliveryDistanceKm!=null&&(
      <div style={{display:"grid",gap:7,margin:"12px 0 0",padding:"12px 14px",borderRadius:16,background:"#F8FAFC",border:"1px solid #EEF2F6",fontSize:12.5}}>
       <div style={{display:"flex",gap:12,flexWrap:"wrap",color:"#475569",fontWeight:600}}>
        <span>📍 {Number(details.deliveryDistanceKm).toFixed(1)} km</span>
        {details.deliveryEtaMinutes!=null&&<span>⏱ ≈ {String(details.deliveryEtaMinutes)} min</span>}
       </div>
       {details.deliveryGrossFee!=null&&(
        <div style={{display:"flex",justifyContent:"space-between",color:"#64748B"}}><span>{t.grossDelivery}</span><b>{Number(details.deliveryGrossFee).toLocaleString("vi-VN")} VND</b></div>
       )}
       {Number(details.deliverySubsidy||0)>0&&(
        <div style={{display:"flex",justifyContent:"space-between",color:"#059669"}}><span>{t.subsidy}</span><b>−{Number(details.deliverySubsidy).toLocaleString("vi-VN")} VND</b></div>
       )}
       <div style={{display:"flex",justifyContent:"space-between",fontSize:13,paddingTop:6,borderTop:"1px solid #E2E8F0"}}>
        <span>{t.deliveryPay}</span>
        <b style={{color:details.deliveryPricingMode==="customer_direct_pay"?"#059669":"#0F172A",fontWeight:800}}>
         {details.deliveryPricingMode==="customer_direct_pay"
          ? (locale === "vi-VN" ? "Khách tự trả tài xế" : locale === "en-US" ? "Direct pay to driver" : locale === "zh-TW" ? "顧客自付" : "顾客自付")
          : `${Number(details.deliveryCustomerFee??details.deliveryFee??0).toLocaleString("vi-VN")} VND`}
        </b>
       </div>
      </div>
     )}

     {data.description&&<p style={{margin:"12px 0 0",color:"#475569",fontSize:12.5,lineHeight:1.5}}>{data.description}</p>}
     {data.addressText&&<p style={{margin:"8px 0 0",color:"#475569",fontSize:12.5}}>📍 {data.addressText}</p>}
     <footer style={{marginTop:12,paddingTop:10,borderTop:"1px solid #F1F5F9"}}><time style={{fontSize:11,color:"#94A3B8"}}>{new Date(data.createdAt).toLocaleString(locale)}</time></footer>
    </article>

    {tracking&&!external&&(
     <article className={styles.card} style={{borderRadius:20,border:"1px solid #EEF2F6",background:"#FFFFFF",padding:16,boxShadow:"0 4px 16px rgba(15,23,42,0.04)"}}>
      <div className={styles.row}>
       <b>🚚 {deliveryStageLabel(tracking.job.status,locale)}</b>
       <span style={{fontSize:11,fontWeight:800,color:tracking.telemetry?.isLive?"#059669":"#D97706"}}>{tracking.telemetry?.isLive?"● LIVE":tracking.telemetry?.isStale?`● ${t.gpsStale}`:"● GPS"}</span>
      </div>
      {tracking.driver&&(
       <p style={{margin:"10px 0",display:"flex",alignItems:"center",gap:8,fontSize:12.5,color:"#334155"}}>
        {tracking.driver.avatarUrl&&<img src={tracking.driver.avatarUrl} alt="" style={{width:32,height:32,borderRadius:"50%",objectFit:"cover"}}/>}
        <span><b>{tracking.driver.displayName}</b> · {tracking.driver.vehicleType}{tracking.driver.plateNumber?` · ${tracking.driver.plateNumber}`:""}</span>
       </p>
      )}
      <DeliveryLiveMap tracking={tracking} height={220}/>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:10,fontSize:11,color:"#64748B"}}>
       {tracking.telemetry?.targetType&&<span>🧭 {tracking.telemetry.targetType==="pickup"?t.toPickup:t.toDropoff}</span>}
       {tracking.telemetry?.distanceRemainingKm!=null&&<span>📍 {tracking.telemetry.distanceRemainingKm.toFixed(1)} km</span>}
       {tracking.telemetry?.etaMinutes!=null&&<span>⏱ {tracking.telemetry.etaMinutes} min</span>}
       {tracking.telemetry?.locationAgeSeconds!=null&&<span>{tracking.telemetry.locationAgeSeconds}s</span>}
      </div>
      {tracking.timeline&&tracking.timeline.length>0&&(
       <div style={{marginTop:14}}>
        <b style={{fontSize:13}}>{t.deliveryTimeline}</b>
        <div style={{display:"grid",gap:8,marginTop:8}}>
         {tracking.timeline.map((event:any)=>(
          <div key={event.id} style={{display:"grid",gridTemplateColumns:"12px 1fr",gap:8,alignItems:"start"}}>
           <i style={{width:8,height:8,borderRadius:"50%",background:"#059669",marginTop:4}}/>
           <div>
            <strong style={{fontSize:11,color:"#1E293B"}}>{event.toStatus?deliveryStageLabel(event.toStatus,locale):event.eventType}</strong>
            <small style={{display:"block",color:"#94A3B8",fontSize:9.5,marginTop:2}}>{new Date(event.createdAt).toLocaleString(locale)}</small>
           </div>
          </div>
         ))}
        </div>
       </div>
      )}
     </article>
    )}

    <section style={{display:"grid",gap:10}}>
     <h2 style={{fontSize:15,fontWeight:750,color:"#1E293B",margin:"6px 2px 2px"}}>{t.progress}</h2>
     <div className={styles.list}>
      {data.history.map((h,index)=>{
       const foodStep=h.note&&h.note in fulfillmentTimeline[locale]?fulfillmentTimeline[locale][h.note as keyof typeof fulfillmentTimeline[typeof locale]]:null;
       const detail=foodStep?.detail||(h.note==='AUTO_COMPLETED_FINDING_COURIER'?t.autoDone:h.note==='AUTO_COMPLETED_EXTERNAL_DELIVERY_PENDING'?t.externalPending:h.note);
       return <article className={styles.card} key={h.id} style={{borderRadius:18,border:"1px solid #EEF2F6",background:"#FFFFFF",padding:14,boxShadow:"none"}}>
        <small style={{color:"#059669",fontWeight:750,fontSize:10.5}}>{t.step} {index+1}</small>
        <h2 style={{fontSize:14,fontWeight:700,margin:"4px 0"}}>{foodStep?.title||statusLabels[locale][h.toStatus]||h.toStatus}</h2>
        {detail&&<p style={{fontSize:12,color:"#64748B",margin:"4px 0"}}>{detail}</p>}
        <time style={{fontSize:10,color:"#94A3B8"}}>{new Date(h.createdAt).toLocaleString(locale)}</time>
       </article>
      })}
     </div>
    </section>

    <p style={{textAlign:'center',color:'#94A3B8',fontSize:11.5,margin:"8px 0"}}>{t.updated}</p>
   </section>
  </CustomerShell>
 );
}
