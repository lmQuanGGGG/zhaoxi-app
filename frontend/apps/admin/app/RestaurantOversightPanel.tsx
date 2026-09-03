"use client";
import {useEffect,useMemo,useState} from "react";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import {getCached,setCached} from "./_lib/client-cache";

type Restaurant={
 id:string;code:string;name:string;phone:string|null;addressText:string|null;status:"active"|"pending"|"suspended";
 platformControl:{paused:boolean;reason:string};
 restaurantOperations:{manualPaused:boolean;pauseReason:string;maxActiveKitchenOrders:number;autoPauseWhenCapacity:boolean;businessHoursEnabled:boolean;timezone:string};
 services:{total:number;enabled:number;soldOut:number};members:{total:number;active:number};coupons:{total:number;enabled:number;used:number};
 orders:{total:number;completed:number;cancelled:number;active:number};
 revenue:{gmv:number;foodRevenue:number;promotionDiscount:number;couponDiscount:number;deliverySubsidy:number};
};
type ListData={periodDays:number;summary:{restaurants:number;active:number;suspended:number;platformPaused:number;orders:number;completed:number;gmv:number};restaurants:Restaurant[]};
type Detail={restaurant:Restaurant;analytics:any;members:any[];coupons:any[];services:any[]};

const copy={
 "zh-CN":{title:"餐厅平台监管",subtitle:"集中查看所有餐厅、订单、收入、优惠活动和平台控制状态。",restaurants:"餐厅",active:"正常",suspended:"已停用",paused:"平台暂停",orders:"订单",gmv:"交易总额",search:"搜索餐厅、编号或电话",all:"全部",open:"查看",platformPause:"平台暂停接单",resume:"恢复接单",suspend:"停用餐厅",activate:"启用餐厅",reason:"平台操作原因",detail:"餐厅详情",foodRevenue:"餐品收入",promotion:"菜品促销",coupon:"优惠券优惠",shipSubsidy:"配送补贴",completed:"已完成",cancelled:"已取消",processing:"处理中",services:"菜品",soldOut:"售罄",members:"商家账号",campaigns:"优惠券",kitchen:"厨房容量",partnerPause:"商家自行暂停",businessHours:"营业时间控制",topItems:"热销菜品",campaignPerformance:"优惠券表现",refresh:"刷新",close:"关闭",days7:"7天",days30:"30天",days90:"90天",confirmSuspend:"确定停用这个餐厅吗？停用后将无法接收新订单。",empty:"暂无餐厅"},
 "zh-TW":{title:"餐廳平台監管",subtitle:"集中查看所有餐廳、訂單、收入、優惠活動與平台控制狀態。",restaurants:"餐廳",active:"正常",suspended:"已停用",paused:"平台暫停",orders:"訂單",gmv:"交易總額",search:"搜尋餐廳、編號或電話",all:"全部",open:"查看",platformPause:"平台暫停接單",resume:"恢復接單",suspend:"停用餐廳",activate:"啟用餐廳",reason:"平台操作原因",detail:"餐廳詳情",foodRevenue:"餐點收入",promotion:"餐點促銷",coupon:"優惠券優惠",shipSubsidy:"配送補貼",completed:"已完成",cancelled:"已取消",processing:"處理中",services:"餐點",soldOut:"售罄",members:"商家帳號",campaigns:"優惠券",kitchen:"廚房容量",partnerPause:"商家自行暫停",businessHours:"營業時間控制",topItems:"熱銷餐點",campaignPerformance:"優惠券表現",refresh:"重新整理",close:"關閉",days7:"7天",days30:"30天",days90:"90天",confirmSuspend:"確定停用這個餐廳嗎？停用後將無法接收新訂單。",empty:"暫無餐廳"},
 "vi-VN":{title:"Kiểm soát nhà hàng toàn nền tảng",subtitle:"Giám sát tập trung nhà hàng, đơn hàng, doanh thu, khuyến mãi và trạng thái vận hành.",restaurants:"Nhà hàng",active:"Đang hoạt động",suspended:"Đã khóa",paused:"Platform tạm dừng",orders:"Đơn hàng",gmv:"Tổng giao dịch",search:"Tìm nhà hàng, mã hoặc số điện thoại",all:"Tất cả",open:"Xem",platformPause:"Platform tạm dừng nhận đơn",resume:"Cho nhận đơn lại",suspend:"Khóa nhà hàng",activate:"Mở lại nhà hàng",reason:"Lý do thao tác của Platform",detail:"Chi tiết nhà hàng",foodRevenue:"Doanh thu món",promotion:"Ưu đãi món",coupon:"Giảm coupon",shipSubsidy:"Trợ giá giao hàng",completed:"Hoàn thành",cancelled:"Đã hủy",processing:"Đang xử lý",services:"Món",soldOut:"Hết món",members:"Tài khoản Partner",campaigns:"Coupon",kitchen:"Công suất bếp",partnerPause:"Partner tự tạm dừng",businessHours:"Kiểm soát giờ mở cửa",topItems:"Món bán chạy",campaignPerformance:"Hiệu quả coupon",refresh:"Làm mới",close:"Đóng",days7:"7 ngày",days30:"30 ngày",days90:"90 ngày",confirmSuspend:"Khóa nhà hàng này? Sau khi khóa, nhà hàng sẽ không nhận được đơn mới.",empty:"Chưa có nhà hàng"},
 "en-US":{title:"Platform restaurant oversight",subtitle:"Centrally monitor restaurants, orders, revenue, promotions and operating controls.",restaurants:"Restaurants",active:"Active",suspended:"Suspended",paused:"Platform paused",orders:"Orders",gmv:"GMV",search:"Search restaurant, code or phone",all:"All",open:"View",platformPause:"Pause orders by platform",resume:"Resume orders",suspend:"Suspend restaurant",activate:"Activate restaurant",reason:"Platform action reason",detail:"Restaurant detail",foodRevenue:"Food revenue",promotion:"Item promotion",coupon:"Coupon discount",shipSubsidy:"Delivery subsidy",completed:"Completed",cancelled:"Cancelled",processing:"In progress",services:"Items",soldOut:"Sold out",members:"Partner accounts",campaigns:"Coupons",kitchen:"Kitchen capacity",partnerPause:"Partner paused",businessHours:"Business-hour control",topItems:"Top items",campaignPerformance:"Coupon performance",refresh:"Refresh",close:"Close",days7:"7 days",days30:"30 days",days90:"90 days",confirmSuspend:"Suspend this restaurant? It will stop receiving new orders.",empty:"No restaurants yet"}
} as const;
const money=(v:number)=>`${Math.round(v||0).toLocaleString("vi-VN")} VND`;

export default function RestaurantOversightPanel(){
 const{locale}=useZhaoXiLocale();const t=copy[locale];
 const[days,setDays]=useState<7|30|90>(30);
 const cacheKey=`admin_restaurants_${days}`;
 const[data,setData]=useState<ListData|null>(()=>getCached<ListData>(cacheKey));
 const[query,setQuery]=useState("");const[filter,setFilter]=useState<"all"|"active"|"suspended"|"paused">("all");const[selected,setSelected]=useState<string>("");const[detail,setDetail]=useState<Detail|null>(null);const[reason,setReason]=useState("");const[busy,setBusy]=useState("");const[error,setError]=useState("");
 async function load(){
  try{
    const r=await fetch(`/api/admin-restaurants?days=${days}`,{cache:"no-store"});
    const j=await r.json();
    if(!r.ok||!j?.ok)throw new Error(j?.error?.code||"LOAD_FAILED");
    setData(j.data);
    setCached(cacheKey,j.data);
    setError("");
  }catch(e){
    setError(e instanceof Error?e.message:"LOAD_FAILED");
  }
 }
 async function loadDetail(id:string){setSelected(id);setDetail(null);const r=await fetch(`/api/admin-restaurants/${id}?days=${days}`,{cache:"no-store"});const j=await r.json();if(r.ok&&j?.ok)setDetail(j.data)}
 useEffect(()=>{void load()},[days,cacheKey]);
 useEffect(()=>{if(selected)void loadDetail(selected)},[days,selected]);
 const rows=useMemo(()=>{const q=query.trim().toLowerCase();return(data?.restaurants||[]).filter(x=>{if(filter==="active"&&x.status!=="active")return false;if(filter==="suspended"&&x.status!=="suspended")return false;if(filter==="paused"&&!x.platformControl.paused)return false;return!q||[x.name,x.code,x.phone||"",x.addressText||""].some(v=>v.toLowerCase().includes(q))})},[data,query,filter]);
 async function action(action:string){
  if(!selected)return;if(action==="suspend"&&!window.confirm(t.confirmSuspend))return;
  setBusy(action);setError("");
  try{const r=await fetch(`/api/admin-restaurants/${selected}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action,reason})});const j=await r.json();if(!r.ok||!j?.ok)throw new Error(j?.error?.code||"UPDATE_FAILED");setReason("");await Promise.all([load(),loadDetail(selected)])}catch(e){setError(e instanceof Error?e.message:"UPDATE_FAILED")}finally{setBusy("")}
 }
 const summary=data?.summary;
 return <section style={{display:"grid",gap:14}}>
  <header><h1 style={{margin:"0 0 5px"}}>{t.title}</h1><p style={{margin:0,color:"#64748b",fontSize:12}}>{t.subtitle}</p></header>
  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{([7,30,90] as const).map(v=><button key={v} onClick={()=>setDays(v)} style={pill(days===v)}>{v===7?t.days7:v===30?t.days30:t.days90}</button>)}<button onClick={()=>void load()} style={pill(false)}>↻ {t.refresh}</button></div>
  {summary&&<section style={metricGrid}><Metric l={t.restaurants} v={String(summary.restaurants)}/><Metric l={t.active} v={String(summary.active)}/><Metric l={t.suspended} v={String(summary.suspended)}/><Metric l={t.paused} v={String(summary.platformPaused)}/><Metric l={t.orders} v={String(summary.orders)}/><Metric l={t.gmv} v={money(summary.gmv)}/></section>}
  <section style={card}><div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search} style={input}/><select value={filter} onChange={e=>setFilter(e.target.value as any)} style={input}><option value="all">{t.all}</option><option value="active">{t.active}</option><option value="suspended">{t.suspended}</option><option value="paused">{t.paused}</option></select></div>
   {error&&<p style={{color:"#b42318",fontSize:10}}>{error}</p>}
   <div style={{display:"grid",gap:8,marginTop:10}}>{!rows.length?<small>{t.empty}</small>:rows.map(x=><article key={x.id} style={{padding:11,border:"1px solid #edf2ef",borderRadius:14,display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"center"}}>
    <div style={{minWidth:0}}><div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><b style={{fontSize:11}}>{x.name}</b><Badge text={x.status==="suspended"?t.suspended:x.platformControl.paused?t.paused:t.active} bad={x.status==="suspended"||x.platformControl.paused}/></div><small style={{display:"block",color:"#64748b",marginTop:4}}>{x.code} · {x.phone||"—"} · {x.orders.total} {t.orders.toLowerCase()}</small><small style={{display:"block",marginTop:3}}>{money(x.revenue.gmv)} · {t.foodRevenue}: {money(x.revenue.foodRevenue)}</small></div>
    <button onClick={()=>void loadDetail(x.id)} style={{border:0,borderRadius:10,padding:"8px 10px",background:"#ecfdf5",color:"#067647",fontWeight:850}}>{t.open}</button>
   </article>)}</div>
  </section>
  {selected&&<div style={overlay} onMouseDown={e=>{if(e.target===e.currentTarget)setSelected("")}}><section style={modal}>{!detail?<p>…</p>:<><header style={{display:"flex",justifyContent:"space-between",gap:10}}><div><h2 style={{margin:"0 0 4px"}}>{detail.restaurant.name}</h2><small>{detail.restaurant.code} · {detail.restaurant.status}</small></div><button onClick={()=>setSelected("")} style={close}>×</button></header>
   <section style={metricGrid}><Metric l={t.gmv} v={money(detail.analytics.revenue.gmv)}/><Metric l={t.foodRevenue} v={money(detail.analytics.revenue.foodRevenue)}/><Metric l={t.completed} v={String(detail.analytics.orders.completed)}/><Metric l={t.cancelled} v={String(detail.analytics.orders.cancelled)}/><Metric l={t.processing} v={String(detail.analytics.orders.inProgress)}/><Metric l={t.promotion} v={`−${money(detail.analytics.revenue.itemPromotionDiscount)}`}/><Metric l={t.coupon} v={`−${money(detail.analytics.revenue.couponDiscount)}`}/><Metric l={t.shipSubsidy} v={`−${money(detail.analytics.revenue.deliverySubsidy)}`}/></section>
   <section style={{...card,background:"#f8faf9"}}><div style={metricGrid}><Metric l={t.services} v={`${detail.restaurant.services.enabled}/${detail.restaurant.services.total}`}/><Metric l={t.soldOut} v={String(detail.restaurant.services.soldOut)}/><Metric l={t.members} v={`${detail.restaurant.members.active}/${detail.restaurant.members.total}`}/><Metric l={t.campaigns} v={`${detail.restaurant.coupons.enabled}/${detail.restaurant.coupons.total}`}/><Metric l={t.kitchen} v={String(detail.restaurant.restaurantOperations.maxActiveKitchenOrders)}/><Metric l={t.partnerPause} v={detail.restaurant.restaurantOperations.manualPaused?"ON":"OFF"}/></div></section>
   <section style={card}><b style={{fontSize:11}}>{t.topItems}</b><div style={{display:"grid",gap:5,marginTop:7}}>{detail.analytics.topItems?.slice(0,5).map((x:any,i:number)=><div key={x.serviceId} style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:9}}><span>{i+1}. {x.name} · ×{x.quantity}</span><b>{money(x.revenue)}</b></div>)||null}</div></section>
   <section style={card}><b style={{fontSize:11}}>{t.campaignPerformance}</b><div style={{display:"grid",gap:5,marginTop:7}}>{detail.analytics.campaignPerformance?.slice(0,5).map((x:any)=><div key={x.id} style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:9}}><span>{x.code} · {x.periodRedemptions} redeem</span><b>{money(x.completedRevenue)}</b></div>)||null}</div></section>
   <section style={card}><label style={{display:"grid",gap:5,fontSize:9,color:"#64748b"}}>{t.reason}<textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2} style={input}/></label><div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:7,marginTop:8}}>{detail.restaurant.platformControl.paused?<button disabled={!!busy} onClick={()=>void action("resume")} style={good}>{t.resume}</button>:<button disabled={!!busy} onClick={()=>void action("pause")} style={warn}>{t.platformPause}</button>}{detail.restaurant.status==="suspended"?<button disabled={!!busy} onClick={()=>void action("activate")} style={good}>{t.activate}</button>:<button disabled={!!busy} onClick={()=>void action("suspend")} style={danger}>{t.suspend}</button>}</div></section>
  </>}</section></div>}
 </section>
}
function Metric({l,v}:{l:string;v:string}){return <div style={{padding:9,borderRadius:12,background:"#fff",border:"1px solid #edf1ef"}}><small style={{display:"block",fontSize:7,color:"#64748b"}}>{l}</small><b style={{display:"block",fontSize:10,marginTop:3}}>{v}</b></div>}
function Badge({text,bad}:{text:string;bad:boolean}){return <span style={{padding:"3px 6px",borderRadius:999,background:bad?"#fff1f2":"#ecfdf5",color:bad?"#b42318":"#067647",fontSize:7,fontWeight:900}}>{text}</span>}
const pill=(active:boolean)=>({border:"1px solid #dbe4df",borderRadius:999,padding:"7px 10px",background:active?"#07c160":"#fff",color:active?"#fff":"#111827",fontSize:8,fontWeight:850});
const metricGrid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:7} as const;
const card={padding:12,border:"1px solid #e3eae6",borderRadius:16,background:"#fff"} as const;
const input={width:"100%",boxSizing:"border-box",border:"1px solid #dbe5df",borderRadius:10,padding:"9px 10px",background:"#fff",font:"inherit"} as const;
const overlay={position:"fixed",inset:0,zIndex:100,background:"rgba(15,23,42,.48)",display:"grid",placeItems:"center",padding:12} as const;
const modal={width:"min(100%,760px)",maxHeight:"92vh",overflowY:"auto",background:"#f8faf9",borderRadius:20,padding:14,display:"grid",gap:10} as const;
const close={border:0,borderRadius:999,width:32,height:32,background:"#eef2f0",fontSize:18} as const;
const good={border:0,borderRadius:11,padding:10,background:"#07c160",color:"#fff",fontWeight:850} as const;
const warn={border:0,borderRadius:11,padding:10,background:"#fff7ed",color:"#c2410c",fontWeight:850} as const;
const danger={border:0,borderRadius:11,padding:10,background:"#fff1f2",color:"#b42318",fontWeight:850} as const;
