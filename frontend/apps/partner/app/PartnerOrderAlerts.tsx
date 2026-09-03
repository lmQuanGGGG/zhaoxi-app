"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useZhaoXiSession} from "@zhaoxi/auth";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import type{ServiceRequestRow}from"@zhaoxi/sdk";
const copy={
 "zh-CN":{newOrder:"新订单",customer:"客户",customerPhone:"客户电话",address:"配送地址",total:"订单总额",accept:"接单",reject:"拒绝",eta:"预计完成时间",minutes:"分钟",confirm:"确认接单",cancel:"返回",auto:"倒计时结束后，餐品会标记为已准备，等待外部配送安排。"},
 "zh-TW":{newOrder:"新訂單",customer:"客戶",customerPhone:"客戶電話",address:"配送地址",total:"訂單總額",accept:"接單",reject:"拒絕",eta:"預計完成時間",minutes:"分鐘",confirm:"確認接單",cancel:"返回",auto:"倒數結束後，餐點會標記為已準備，等待外部配送安排。"},
 "vi-VN":{newOrder:"Có đơn hàng mới",customer:"Khách hàng",customerPhone:"Số điện thoại khách",address:"Địa chỉ nhận hàng",total:"Tổng đơn",accept:"Nhận đơn",reject:"Từ chối",eta:"Thời gian dự kiến hoàn thành",minutes:"phút",confirm:"Xác nhận đơn giao",cancel:"Quay lại",auto:"Khi hết thời gian, món được đánh dấu đã sẵn sàng và chờ bố trí đơn vị giao hàng bên ngoài."},
 "en-US":{newOrder:"New order",customer:"Customer",customerPhone:"Customer phone",address:"Delivery address",total:"Order total",accept:"Accept",reject:"Reject",eta:"Estimated completion time",minutes:"minutes",confirm:"Confirm order",cancel:"Back",auto:"When the timer ends, the food is marked ready and awaits external delivery arrangement."}
}as const;
const money=(v:unknown)=>Number(v||0).toLocaleString("vi-VN")+" VND";
export default function PartnerOrderAlerts(){const session=useZhaoXiSession();const{locale}=useZhaoXiLocale();const t=copy[locale];const orgId=session?.organizationId||"";const[order,setOrder]=useState<ServiceRequestRow|null>(null);const[step,setStep]=useState<"order"|"eta">("order");const[eta,setEta]=useState(15);const seen=useRef(new Set<string>());
 const poll=useCallback(async()=>{if(!orgId)return;try{const r=await fetch(`/api/platform-requests?scope=operations&organizationId=${encodeURIComponent(orgId)}&locale=${locale}`,{cache:"no-store"});const p=await r.json();const next=(Array.isArray(p?.data)?p.data:[]).find((x:ServiceRequestRow)=>x.status==="assigned"&&x.details?.deliveryFulfillmentMode==="external_manual"&&!seen.current.has(x.id));if(next&&!order)setOrder(next)}catch{}},[orgId,locale,order]);
 useEffect(()=>{void poll();const timer=setInterval(()=>void poll(),5000);const open=(event:Event)=>{const next=(event as CustomEvent<ServiceRequestRow>).detail;if(next){setOrder(next);setStep("eta")}};window.addEventListener("zhaoxi-open-order",open);return()=>{clearInterval(timer);window.removeEventListener("zhaoxi-open-order",open)}},[poll]);
 function close(mark=true){if(order&&mark)seen.current.add(order.id);setOrder(null);setStep("order");setEta(15)}
 async function reject(){if(!order)return;await fetch(`/api/partner-fulfillment/${order.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"cancelled",note:"partner_cancelled_before_accept"})});close()}
 async function confirm(){if(!order)return;const response=await fetch(`/api/partner-fulfillment/${order.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"accept",estimatedMinutes:eta,note:`partner_accept_eta:${eta}`})});if(response.ok){try{new Audio("data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAACAqKCgoKCgoKCgoKCgoA==").play()}catch{}close()}}
 if(!order)return null;const d=order.details||{};
 const displayPhone = (typeof d.recipientPhone === "string" && d.recipientPhone.trim()) ? d.recipientPhone.trim() : (order.customerPhone || "");
 const isFriend = Boolean(typeof d.recipientPhone === "string" && d.recipientPhone.trim() && d.recipientPhone.trim() !== order.customerPhone);
 return <div className="zx-order-modal-backdrop" role="dialog" aria-modal="true">
  <section className="zx-order-modal">
    {step==="order"?<>
      <div className="zx-order-bell">🔔</div>
      <small>ZHAOXI PARTNER</small>
      <h2>{t.newOrder}</h2>
      <strong className="zx-order-code">{order.requestCode}</strong>
      <h3>{order.serviceName||order.title}</h3>
      <div style={{margin:"14px 0",padding:14,borderRadius:16,background:"#F0FDF4",border:"1.5px solid #86EFAC",textAlign:"left",display:"grid",gap:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
          <span style={{color:"#166534",fontSize:13,fontWeight:700}}>👤 {t.customer}: <b>{order.customerName}</b></span>
          <a href={`tel:${displayPhone}`} style={{display:"inline-flex",alignItems:"center",gap:6,background:"#07C160",color:"#FFFFFF",padding:"6px 14px",borderRadius:999,textDecoration:"none",fontSize:14,fontWeight:800,boxShadow:"0 3px 10px rgba(7,193,96,.25)"}}>
            📞 {displayPhone || "Khách chưa có SĐT"}{isFriend ? " (Nhận hộ)" : ""}
          </a>
        </div>
        {order.addressText&&<div style={{fontSize:13,color:"#1F2937",lineHeight:1.4}}>📍 <b>{t.address}:</b> {order.addressText}</div>}
        {d.totalAmount!=null&&<div style={{fontSize:14,fontWeight:800,color:"#078343",marginTop:2}}>💰 {t.total}: {money(d.totalAmount)}</div>}
      </div>
      <div className="zx-order-actions">
        <button className="primary" onClick={()=>setStep("eta")}>{t.accept}</button>
        <button className="danger" onClick={()=>void reject()}>{t.reject}</button>
      </div>
    </>:<>
      <h2>{t.eta}</h2>
      <div style={{margin:"10px 0 14px",padding:12,borderRadius:14,background:"#F0FDF4",border:"1.5px solid #86EFAC",textAlign:"left",display:"grid",gap:6}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:"#166534"}}>👤 <b>{order.customerName}</b> · <strong className="zx-order-code" style={{padding:"2px 8px",fontSize:12}}>{order.requestCode}</strong></span>
          <a href={`tel:${displayPhone}`} style={{display:"inline-flex",alignItems:"center",gap:4,background:"#07C160",color:"#FFFFFF",padding:"5px 12px",borderRadius:999,textDecoration:"none",fontSize:13,fontWeight:800}}>
            📞 {displayPhone || "Chưa có SĐT"}{isFriend ? " (Nhận hộ)" : ""}
          </a>
        </div>
        {order.addressText&&<div style={{fontSize:12,color:"#4B5563",lineHeight:1.35}}>📍 {order.addressText}</div>}
      </div>
      <div className="zx-eta-grid">
        {[10,15,20,25,30].map(value=><button key={value} data-active={eta===value} onClick={()=>setEta(value)}><b>{value}</b><span>{t.minutes}</span></button>)}
      </div>
      <p className="zx-auto-note">⏱ {t.auto}</p>
      <div className="zx-order-actions">
        <button className="ghost" onClick={()=>setStep("order")}>{t.cancel}</button>
        <button className="primary" onClick={()=>void confirm()}>{t.confirm}</button>
      </div>
    </>}
  </section>
 </div>
}
