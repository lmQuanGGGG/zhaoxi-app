"use client";
import {createZhaoXiSdk,type PartnerOrderAction,type PartnerOrderFact,type PartnerOrderKind,type ServiceRequestRow} from "@zhaoxi/sdk";
import type {ZhaoXiLocale} from "@zhaoxi/i18n";
import {paymentMethodLabel} from "@zhaoxi/payment";
import {ActionButton} from "@zhaoxi/ui";

// Non-food orders (housing, travel, visa, car rental, translation, ...). The backend decides the
// kind, the facts worth showing and the next actions; this file only labels and dispatches them.

const sdk=createZhaoXiSdk();

const kindCopy:Record<ZhaoXiLocale,Record<PartnerOrderKind,string>>={
 "zh-CN":{food_delivery:"餐饮订单",housing_inquiry:"租房意向",travel_booking:"旅游预订",service_booking:"服务订单"},
 "zh-TW":{food_delivery:"餐飲訂單",housing_inquiry:"租房意向",travel_booking:"旅遊預訂",service_booking:"服務訂單"},
 "vi-VN":{food_delivery:"Đơn món ăn",housing_inquiry:"Yêu cầu thuê nhà",travel_booking:"Đặt tour",service_booking:"Đơn dịch vụ"},
 "en-US":{food_delivery:"Food order",housing_inquiry:"Rental inquiry",travel_booking:"Tour booking",service_booking:"Service order"},
};
const newCopy:Record<ZhaoXiLocale,Record<PartnerOrderKind,string>>={
 "zh-CN":{food_delivery:"新订单",housing_inquiry:"新的租房意向",travel_booking:"新的旅游预订",service_booking:"新的服务订单"},
 "zh-TW":{food_delivery:"新訂單",housing_inquiry:"新的租房意向",travel_booking:"新的旅遊預訂",service_booking:"新的服務訂單"},
 "vi-VN":{food_delivery:"Có đơn hàng mới",housing_inquiry:"Có yêu cầu thuê nhà mới",travel_booking:"Có yêu cầu đặt tour mới",service_booking:"Có đơn dịch vụ mới"},
 "en-US":{food_delivery:"New order",housing_inquiry:"New rental inquiry",travel_booking:"New tour booking",service_booking:"New service order"},
};
const factCopy:Record<ZhaoXiLocale,Record<string,string>>={
 "zh-CN":{scheduledDate:"预约日期",scheduledTime:"预约时间",quantity:"数量",totalAmount:"订单金额",paymentMethod:"支付方式",moveInDate:"入住日期",leaseMonths:"租期",occupants:"入住人数",budget:"预算",monthlyRent:"月租",propertyType:"房型",visitDate:"出行日期",visitTime:"出发时间",guests:"人数",adults:"成人",children:"儿童",packageName:"套餐",departurePoint:"出发地点",quotedAmount:"报价",preferredContact:"优先联系",wechat:"WeChat",whatsapp:"WhatsApp",customerNote:"客户备注"},
 "zh-TW":{scheduledDate:"預約日期",scheduledTime:"預約時間",quantity:"數量",totalAmount:"訂單金額",paymentMethod:"付款方式",moveInDate:"入住日期",leaseMonths:"租期",occupants:"入住人數",budget:"預算",monthlyRent:"月租",propertyType:"房型",visitDate:"出行日期",visitTime:"出發時間",guests:"人數",adults:"成人",children:"兒童",packageName:"方案",departurePoint:"出發地點",quotedAmount:"報價",preferredContact:"優先聯絡",wechat:"WeChat",whatsapp:"WhatsApp",customerNote:"客戶備註"},
 "vi-VN":{scheduledDate:"Ngày hẹn",scheduledTime:"Giờ hẹn",quantity:"Số lượng",totalAmount:"Giá trị đơn",paymentMethod:"Thanh toán",moveInDate:"Ngày nhận phòng",leaseMonths:"Thời gian thuê",occupants:"Số người ở",budget:"Ngân sách",monthlyRent:"Giá thuê/tháng",propertyType:"Loại nhà",visitDate:"Ngày đi tour",visitTime:"Giờ khởi hành",guests:"Số khách",adults:"Người lớn",children:"Trẻ em",packageName:"Gói tour",departurePoint:"Điểm đón",quotedAmount:"Báo giá",preferredContact:"Ưu tiên liên hệ",wechat:"WeChat",whatsapp:"WhatsApp",customerNote:"Ghi chú của khách"},
 "en-US":{scheduledDate:"Date",scheduledTime:"Time",quantity:"Quantity",totalAmount:"Order value",paymentMethod:"Payment",moveInDate:"Move-in",leaseMonths:"Lease",occupants:"Occupants",budget:"Budget",monthlyRent:"Monthly rent",propertyType:"Property type",visitDate:"Tour date",visitTime:"Departure",guests:"Guests",adults:"Adults",children:"Children",packageName:"Package",departurePoint:"Pick-up point",quotedAmount:"Quote",preferredContact:"Preferred contact",wechat:"WeChat",whatsapp:"WhatsApp",customerNote:"Customer note"},
};
const monthsCopy:Record<ZhaoXiLocale,string>={"zh-CN":"个月","zh-TW":"個月","vi-VN":"tháng","en-US":"months"};
const actionCopy:Record<ZhaoXiLocale,Record<PartnerOrderKind,Record<PartnerOrderAction,string>>>={
 "zh-CN":{
  food_delivery:{accept:"接单",start:"开始处理",complete:"完成",reject:"拒绝",cancel:"取消"},
  housing_inquiry:{accept:"接收意向",start:"开始联系客户",complete:"完成跟进",reject:"无法承接",cancel:"取消"},
  travel_booking:{accept:"确认预订",start:"开始",complete:"行程完成",reject:"拒绝预订",cancel:"取消预订"},
  service_booking:{accept:"接单",start:"开始服务",complete:"服务完成",reject:"拒绝",cancel:"取消订单"}},
 "zh-TW":{
  food_delivery:{accept:"接單",start:"開始處理",complete:"完成",reject:"拒絕",cancel:"取消"},
  housing_inquiry:{accept:"接收意向",start:"開始聯絡客戶",complete:"完成跟進",reject:"無法承接",cancel:"取消"},
  travel_booking:{accept:"確認預訂",start:"開始",complete:"行程完成",reject:"拒絕預訂",cancel:"取消預訂"},
  service_booking:{accept:"接單",start:"開始服務",complete:"服務完成",reject:"拒絕",cancel:"取消訂單"}},
 "vi-VN":{
  food_delivery:{accept:"Nhận đơn",start:"Bắt đầu",complete:"Hoàn tất",reject:"Từ chối",cancel:"Hủy"},
  housing_inquiry:{accept:"Nhận yêu cầu",start:"Bắt đầu liên hệ khách",complete:"Hoàn tất tư vấn",reject:"Không thể tiếp nhận",cancel:"Hủy"},
  travel_booking:{accept:"Xác nhận tour",start:"Bắt đầu",complete:"Hoàn tất tour",reject:"Từ chối",cancel:"Hủy tour"},
  service_booking:{accept:"Nhận đơn",start:"Bắt đầu xử lý",complete:"Hoàn tất dịch vụ",reject:"Từ chối",cancel:"Hủy đơn"}},
 "en-US":{
  food_delivery:{accept:"Accept",start:"Start",complete:"Complete",reject:"Reject",cancel:"Cancel"},
  housing_inquiry:{accept:"Accept inquiry",start:"Start contacting customer",complete:"Complete follow-up",reject:"Cannot accept",cancel:"Cancel"},
  travel_booking:{accept:"Confirm booking",start:"Start",complete:"Tour completed",reject:"Reject booking",cancel:"Cancel booking"},
  service_booking:{accept:"Accept",start:"Start service",complete:"Service completed",reject:"Reject",cancel:"Cancel order"}},
};

/** Kind of an order; falls back to the old food marker when the backend has not sent `orderKind` yet. */
export function orderKindOf(row:ServiceRequestRow):PartnerOrderKind{
 if(row.orderKind)return row.orderKind;
 if(row.moduleCode==="food"||row.details?.deliveryFulfillmentMode==="external_manual")return "food_delivery";
 if(row.moduleCode==="housing")return "housing_inquiry";
 if(row.moduleCode==="travel")return "travel_booking";
 return "service_booking";
}
export const orderKindLabel=(kind:PartnerOrderKind,locale:ZhaoXiLocale)=>kindCopy[locale][kind];
export const newOrderLabel=(kind:PartnerOrderKind,locale:ZhaoXiLocale)=>newCopy[locale][kind];

function factValue(fact:PartnerOrderFact,locale:ZhaoXiLocale):string{
 if(fact.format==="money")return Number(fact.value||0).toLocaleString("vi-VN")+" VND";
 if(fact.format==="months")return `${fact.value} ${monthsCopy[locale]}`;
 if(fact.format==="payment")return paymentMethodLabel(String(fact.value),locale);
 if(fact.format==="date"&&/^\d{4}-\d{2}-\d{2}$/.test(String(fact.value))){const[y,m,d]=String(fact.value).split("-");return `${d}/${m}/${y}`}
 return String(fact.value);
}

export function ServiceOrderFacts({row,locale}:{row:ServiceRequestRow;locale:ZhaoXiLocale}){
 const facts=row.orderFacts||[];
 if(!facts.length)return null;
 return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,padding:"10px 0",fontSize:15}}>
  {facts.map(fact=><span key={fact.key} style={fact.key==="customerNote"?{gridColumn:"1/-1"}:undefined}>{factCopy[locale][fact.key]||fact.key}: <b style={fact.format==="money"?{color:"#07a856"}:undefined}>{factValue(fact,locale)}</b></span>)}
 </div>;
}

/** Sends a partner action to the endpoint that owns that order's state machine. */
export async function runServiceOrderAction(row:ServiceRequestRow,action:PartnerOrderAction,organizationId:string){
 if(orderKindOf(row)==="travel_booking"){
  const travelAction=action==="accept"?"confirm":action;
  const response=await fetch(`/api/partner-travel-leads/${encodeURIComponent(row.id)}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({organizationId,action:travelAction})});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.ok)throw new Error(payload?.error?.code||payload?.error?.message||"TRAVEL_BOOKING_UPDATE_FAILED");
  return;
 }
 const status=({accept:"accepted",start:"in_progress",complete:"completed",reject:"rejected",cancel:"cancelled"} as const)[action];
 await sdk.updateStatus(row.id,status,`partner:${status}`);
}

export function ServiceOrderActions({row,locale,busy,disabled,onRun}:{row:ServiceRequestRow;locale:ZhaoXiLocale;busy:boolean;disabled?:boolean;onRun:(action:PartnerOrderAction)=>void}){
 const kind=orderKindOf(row);
 const actions=row.partnerActions||[];
 if(!actions.length)return null;
 return <>{actions.map(action=>{
  const negative=action==="reject"||action==="cancel";
  return <ActionButton key={action} tone={negative?"danger":action==="complete"?"dark":undefined} disabled={busy||(!negative&&Boolean(disabled))} onClick={()=>onRun(action)}>{actionCopy[locale][kind][action]}</ActionButton>;
 })}</>;
}
