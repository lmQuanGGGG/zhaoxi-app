"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {useZhaoXiLocale,statusLabels} from "@zhaoxi/i18n";
import {playCustomerOrderChime,registerAudioUnlock,type OrderStageType} from "./_lib/customer-audio";
type Alert={id:string;requestId:string;requestCode:string;status:string;note?:string;serviceName?:string;moduleName?:string;createdAt:string};
const housingEvent=(x:Alert)=>String(x.note||"").startsWith("HOUSING_MESSAGE:")||String(x.note||"").startsWith("HOUSING_APPOINTMENT_REMINDER:");
const travelEvent=(x:Alert)=>String(x.note||"").startsWith("TRAVEL_MESSAGE:")||String(x.note||"").startsWith("TRAVEL_DEPARTURE_REMINDER:")||String(x.note||"").startsWith("TRAVEL_BOOKING_");
const paymentEvent=(x:Alert)=>String(x.note||"").startsWith("PAYMENT_")||String(x.note||"").startsWith("TRAVEL_PARTNER_PAYMENT_");
const keyFor=(x:Alert)=>housingEvent(x)?`housing:${x.id}`:travelEvent(x)?`travel:${x.id}`:paymentEvent(x)?`payment:${x.id}`:`${x.requestId}:${x.status}`;
const allowed=new Set(["accepted","in_progress","completed","delivering","delivered"]);
const copy={
 "zh-CN":{completed:"订单已完成，正在寻找配送员",delivering:"订单配送中",delivered:"配送员已送达，订单完成",foodReady:"餐品已备好，等待取餐",courierBooked:"已安排配送员",handedOff:"配送员已取餐，正在配送",accepted:(m:string)=>`商家已确认，预计 ${m} 分钟完成`,view:"查看订单",close:"关闭",housingMessage:"房源方发来了新消息",housingReminder:"看房时间快到了",housingView:"查看租房意向",travelMessage:"旅行服务商发来了新消息",travelReminder:"行程即将开始",travelConfirmed:"旅行预约已确认",travelRejected:"旅行预约无法接待",travelCancelled:"旅行预约已取消",travelCompleted:"旅行服务已完成",travelView:"查看旅游预约",paymentPaid:"支付已确认",paymentRefunded:"退款已完成",supportMessage:"支付支持有新消息",supportStage:"支付支持状态已更新",slaSoon:"支付支持即将到 SLA",slaOverdue:"支付支持已超过 SLA",refundSoon:"退款预计时间临近",refundOverdue:"退款预计时间已超过",paymentView:"查看支付支持"},
 "zh-TW":{completed:"訂單已完成，正在尋找配送員",delivering:"訂單配送中",delivered:"外送員已送達，訂單完成",foodReady:"餐點已備好，等待取餐",courierBooked:"已安排外送員",handedOff:"外送員已取餐，正在配送",accepted:(m:string)=>`商家已確認，預計 ${m} 分鐘完成`,view:"查看訂單",close:"關閉",housingMessage:"房源方傳來了新訊息",housingReminder:"看房時間快到了",housingView:"查看租房意向",travelMessage:"旅遊服務商傳來了新訊息",travelReminder:"行程即將開始",travelConfirmed:"旅遊預約已確認",travelRejected:"旅遊預約無法接待",travelCancelled:"旅遊預約已取消",travelCompleted:"旅遊服務已完成",travelView:"查看旅遊預約",paymentPaid:"付款已確認",paymentRefunded:"退款已完成",supportMessage:"支付支援有新訊息",supportStage:"支付支援狀態已更新",slaSoon:"支付支援即將到 SLA",slaOverdue:"支付支援已超過 SLA",refundSoon:"退款預計時間臨近",refundOverdue:"退款預計時間已超過",paymentView:"查看支付支援"},
 "vi-VN":{completed:"Đơn đã hoàn thành, đang tìm người giao hàng",delivering:"Đơn hàng đang được giao",delivered:"Tài xế đã đến nơi, đơn đã giao thành công",foodReady:"Món đã sẵn sàng, chờ tài xế lấy",courierBooked:"Đã bố trí đơn vị giao hàng",handedOff:"Tài xế đã nhận món và đang giao",accepted:(m:string)=>`Đối tác đã xác nhận, dự kiến ${m} phút`,view:"Xem đơn hàng",close:"Đóng",housingMessage:"Partner vừa gửi tin nhắn về nhà/phòng",housingReminder:"Sắp đến lịch xem nhà",housingView:"Xem yêu cầu thuê nhà",travelMessage:"Partner du lịch vừa gửi tin nhắn",travelReminder:"Sắp đến giờ khởi hành",travelConfirmed:"Booking du lịch đã được xác nhận",travelRejected:"Partner không thể tiếp nhận booking",travelCancelled:"Booking du lịch đã bị hủy",travelCompleted:"Dịch vụ du lịch đã hoàn tất",travelView:"Xem booking du lịch",paymentPaid:"Thanh toán đã được xác nhận",paymentRefunded:"Hoàn tiền đã hoàn tất",supportMessage:"Có tin nhắn mới về hỗ trợ thanh toán",supportStage:"Trạng thái hỗ trợ thanh toán đã thay đổi",slaSoon:"Yêu cầu hỗ trợ sắp đến SLA",slaOverdue:"Yêu cầu hỗ trợ đã quá SLA",refundSoon:"Sắp đến thời gian dự kiến hoàn tiền",refundOverdue:"Đã quá thời gian dự kiến hoàn tiền",paymentView:"Xem hỗ trợ thanh toán"},
 "en-US":{completed:"Order completed, finding a courier",delivering:"Order is being delivered",delivered:"Driver has arrived; order delivered",foodReady:"Food is ready for pickup",courierBooked:"Courier arranged",handedOff:"Courier collected the order and is delivering it",accepted:(m:string)=>`Partner confirmed, estimated ${m} minutes`,view:"View order",close:"Close",housingMessage:"The housing provider sent a new message",housingReminder:"Your property viewing is coming up",housingView:"View rental inquiry",travelMessage:"Travel Partner sent a new message",travelReminder:"Your trip is starting soon",travelConfirmed:"Travel booking confirmed",travelRejected:"Travel booking unavailable",travelCancelled:"Travel booking cancelled",travelCompleted:"Travel service completed",travelView:"View travel booking",paymentPaid:"Payment confirmed",paymentRefunded:"Refund completed",supportMessage:"New payment-support message",supportStage:"Payment-support status updated",slaSoon:"Payment support is nearing SLA",slaOverdue:"Payment support is overdue",refundSoon:"Refund ETA is approaching",refundOverdue:"Refund ETA is overdue",paymentView:"View payment support"}
} as const;

function getAlertStageType(x: Alert): OrderStageType {
  const note = String(x.note || "").toLowerCase();
  if (x.status === "delivered" || note.includes("delivered") || note.includes("đã giao")) return "delivered";
  if (x.status === "delivering" || note.includes("courier") || note.includes("handed_off") || note.includes("đang giao")) return "delivering";
  if (x.status === "in_progress" || note.includes("preparing") || note.includes("đang làm") || note.includes("bếp")) return "preparing";
  if (x.status === "accepted" || note.includes("xác nhận") || x.status === "completed") return "accepted";
  return "general";
}

export default function CustomerOrderAlerts(){
  const{locale}=useZhaoXiLocale();
  const t=copy[locale];
  const[item,setItem]=useState<Alert|null>(null);

  useEffect(()=>{
    return registerAudioUnlock();
  },[]);

  const poll=useCallback(async()=>{
    try{
      const codes=JSON.parse(localStorage.getItem("zhaoxi-request-codes")||"[]")as string[];
      if(!codes.length)return;
      const dismissed=new Set<string>(JSON.parse(localStorage.getItem("zhaoxi-dismissed-alert-stages")||"[]"));
      const r=await fetch(`/api/platform-notifications?audience=customer&codes=${encodeURIComponent(codes.join(','))}&locale=${locale}`,{cache:'no-store'});
      const p=await r.json();
      const pr=await fetch("/api/customer-notifications/preferences",{cache:"no-store"}).then(x=>x.json()).catch(()=>null),pref=pr?.data||pr?.ok&&pr.data||{};
      const list=(Array.isArray(p?.data)?p.data:[]) as Alert[];
      const allowedByPref=(x:Alert)=>paymentEvent(x)?pref.paymentEnabled!==false:housingEvent(x)?pref.housingEnabled!==false:travelEvent(x)?pref.travelEnabled!==false:pref.orderEnabled!==false;
      const next=list.find(x=>(allowed.has(x.status)||housingEvent(x)||travelEvent(x)||paymentEvent(x))&&allowedByPref(x)&&!dismissed.has(keyFor(x)));
      if(next && (!item || keyFor(next) !== keyFor(item))){
        setItem(next);
        const stage = getAlertStageType(next);
        playCustomerOrderChime(stage);
      }
    }catch{}
  },[locale,item]);

  useEffect(()=>{void poll();const timer=setInterval(()=>void poll(),5000);return()=>clearInterval(timer)},[poll]);
  function close(){if(!item)return;const values=JSON.parse(localStorage.getItem("zhaoxi-dismissed-alert-stages")||"[]") as string[];localStorage.setItem("zhaoxi-dismissed-alert-stages",JSON.stringify(Array.from(new Set([...values,keyFor(item)])).slice(-200)));setItem(null)}
  if(!item)return null;
  const eta=/ETA\s+(\d+)\s+minutes/i.exec(item.note||"");
  const note=String(item.note||""),isHousingMessage=note.startsWith("HOUSING_MESSAGE:"),isHousingReminder=note.startsWith("HOUSING_APPOINTMENT_REMINDER:"),isTravel=travelEvent(item),isPayment=paymentEvent(item),isTravelMessage=note.startsWith("TRAVEL_MESSAGE:"),isTravelReminder=note.startsWith("TRAVEL_DEPARTURE_REMINDER:");
  const travelLabel=isTravelMessage?t.travelMessage:isTravelReminder?t.travelReminder:note.startsWith("TRAVEL_BOOKING_CONFIRMED")?t.travelConfirmed:note.startsWith("TRAVEL_BOOKING_REJECTED")?t.travelRejected:note.startsWith("TRAVEL_BOOKING_COMPLETED")?t.travelCompleted:note.startsWith("TRAVEL_BOOKING_CANCELLED")?t.travelCancelled:"";
  const paymentLabel=note.includes("REFUND")&&(note.includes("COMPLETED")||note.includes("REFUNDED"))?t.paymentRefunded:note.includes("PAID")?t.paymentPaid:note.startsWith("PAYMENT_SUPPORT_MESSAGE:")?t.supportMessage:note.startsWith("PAYMENT_SUPPORT_SLA_DUE_SOON")?t.slaSoon:note.startsWith("PAYMENT_SUPPORT_SLA_OVERDUE")?t.slaOverdue:note.startsWith("PAYMENT_REFUND_ETA_DUE_SOON")?t.refundSoon:note.startsWith("PAYMENT_REFUND_ETA_OVERDUE")?t.refundOverdue:note.startsWith("PAYMENT_SUPPORT_STAGE:")?t.supportStage:t.supportStage;
  const foodLabel=note==="EXTERNAL_DELIVERY_DELIVERED"?t.delivered:note==="FOOD_HANDED_TO_COURIER"?t.handedOff:note==="EXTERNAL_COURIER_BOOKED"?t.courierBooked:note==="FOOD_READY_FOR_PICKUP"||note==="AUTO_READY_FOR_EXTERNAL_PICKUP"?t.foodReady:"";
  const label=isPayment?paymentLabel:isTravel?travelLabel:isHousingMessage?t.housingMessage:isHousingReminder?t.housingReminder:foodLabel?foodLabel:item.status==="completed"?t.completed:item.status==="delivering"?t.delivering:item.status==="delivered"?t.delivered:eta?t.accepted(eta[1]):(statusLabels[locale]?.[item.status]||item.note||item.status);
  return (
    <div className="zx-order-alert-backdrop">
    <div className="zx-customer-alert zx-order-alert-modal">
      <button aria-label={t.close} onClick={close}>×</button>
      <div
        role="button"
        title="Phát chuông thông báo"
        style={{cursor:"pointer",userSelect:"none"}}
        onClick={() => playCustomerOrderChime(getAlertStageType(item))}
      >
        🔔
      </div>
      <b>{item.serviceName||item.moduleName||item.requestCode}</b>
      <p>{label}</p>
      <Link href={isPayment||isTravel?"/travel/requests":isHousingMessage||isHousingReminder?"/housing/requests":`/order/${item.requestId}`} onClick={close}>
        {isPayment?t.paymentView:isTravel?t.travelView:isHousingMessage||isHousingReminder?t.housingView:t.view}
      </Link>
    </div>
    </div>
  );
}
