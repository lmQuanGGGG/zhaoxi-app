"use client";
import {useEffect,useMemo,useState} from "react";
import {useZhaoXiSession} from "@zhaoxi/auth";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import {getCached,setCached} from "./_lib/client-cache";
import PartnerWorkspaceNav from "./PartnerWorkspaceNav";

type Daily={date:string;orders:number;completed:number;gmv:number;foodRevenue:number;promotionDiscount:number;couponDiscount:number;deliverySubsidy:number};
type TopItem={serviceId:string;name:string;quantity:number;revenue:number;discount:number;orders:number};
type Campaign={id:string;code:string;title:string;enabled:boolean;usedCount:number;totalUsageLimit:number|null;completedOrders:number;completedDiscount:number;completedRevenue:number;periodRedemptions:number;periodRedeemedDiscount:number;discountType:string;discountValue:number};
type Analytics={
 periodDays:number;generatedAt:string;
 orders:{total:number;completed:number;cancelled:number;inProgress:number;completionRate:number;cancellationRate:number};
 revenue:{gmv:number;itemBaseRevenue:number;itemPromotionDiscount:number;couponDiscount:number;foodRevenue:number;deliveryGrossFee:number;deliverySubsidy:number;customerDeliveryFee:number;averageOrderValue:number};
 operations:{averagePreparationMinutes:number;preparationSamples:number};
 daily:Daily[];topItems:TopItem[];campaignPerformance:Campaign[];
};
const copy={
"zh-CN":{title:"餐厅经营分析",subtitle:"查看订单、收入、优惠活动与厨房表现。",d7:"7天",d30:"30天",d90:"90天",gmv:"客户订单总额",foodRevenue:"餐品实际收入",aov:"平均订单金额",orders:"订单",completed:"已完成",cancelled:"已取消",inProgress:"处理中",completion:"完成率",promotion:"菜品促销",coupon:"优惠券优惠",shipSubsidy:"配送补贴",delivery:"客户配送费",prep:"平均备餐时间",minutes:"分钟",trend:"每日趋势",top:"热销菜品",campaigns:"优惠券表现",quantity:"销量",revenue:"收入",discount:"优惠",redemptions:"领取/使用",campaignOrders:"完成订单",empty:"暂无数据",refresh:"刷新",loading:"正在加载…",period:"统计周期",used:"累计已用"},
"zh-TW":{title:"餐廳營運分析",subtitle:"查看訂單、收入、優惠活動與廚房表現。",d7:"7天",d30:"30天",d90:"90天",gmv:"客戶訂單總額",foodRevenue:"餐點實際收入",aov:"平均訂單金額",orders:"訂單",completed:"已完成",cancelled:"已取消",inProgress:"處理中",completion:"完成率",promotion:"餐點促銷",coupon:"優惠券優惠",shipSubsidy:"配送補貼",delivery:"客戶配送費",prep:"平均備餐時間",minutes:"分鐘",trend:"每日趨勢",top:"熱銷餐點",campaigns:"優惠券表現",quantity:"銷量",revenue:"收入",discount:"優惠",redemptions:"兌換次數",campaignOrders:"完成訂單",empty:"暫無資料",refresh:"重新整理",loading:"正在載入…",period:"統計週期",used:"累計已用"},
"vi-VN":{title:"Phân tích kinh doanh nhà hàng",subtitle:"Theo dõi đơn hàng, doanh thu, ưu đãi và hiệu suất bếp.",d7:"7 ngày",d30:"30 ngày",d90:"90 ngày",gmv:"Tổng giá trị Customer trả",foodRevenue:"Doanh thu món thực tế",aov:"Giá trị đơn trung bình",orders:"Đơn hàng",completed:"Hoàn thành",cancelled:"Đã hủy",inProgress:"Đang xử lý",completion:"Tỷ lệ hoàn thành",promotion:"Ưu đãi món",coupon:"Giảm bằng coupon",shipSubsidy:"Trợ giá giao hàng",delivery:"Phí giao Customer trả",prep:"Thời gian chuẩn bị TB",minutes:"phút",trend:"Xu hướng theo ngày",top:"Món bán chạy",campaigns:"Hiệu quả coupon",quantity:"Số lượng",revenue:"Doanh thu",discount:"Giá trị giảm",redemptions:"Lượt redeem",campaignOrders:"Đơn hoàn thành",empty:"Chưa có dữ liệu",refresh:"Làm mới",loading:"Đang tải…",period:"Kỳ thống kê",used:"Đã dùng toàn thời gian"},
"en-US":{title:"Restaurant business analytics",subtitle:"Track orders, revenue, promotions and kitchen performance.",d7:"7 days",d30:"30 days",d90:"90 days",gmv:"Customer order value",foodRevenue:"Net food revenue",aov:"Average order value",orders:"Orders",completed:"Completed",cancelled:"Cancelled",inProgress:"In progress",completion:"Completion rate",promotion:"Item promotions",coupon:"Coupon discount",shipSubsidy:"Delivery subsidy",delivery:"Customer delivery fee",prep:"Average preparation",minutes:"minutes",trend:"Daily trend",top:"Top-selling items",campaigns:"Coupon performance",quantity:"Quantity",revenue:"Revenue",discount:"Discount",redemptions:"Redemptions",campaignOrders:"Completed orders",empty:"No data yet",refresh:"Refresh",loading:"Loading…",period:"Reporting period",used:"Lifetime used"}
} as const;
const money=(v:number)=>`${Math.round(v||0).toLocaleString("vi-VN")} VND`;

export default function RestaurantAnalyticsDashboard(){
 const session=useZhaoXiSession();const{locale}=useZhaoXiLocale();const t=copy[locale];const orgId=session?.organizationId||"";
 const[days,setDays]=useState<7|30|90>(30);
 const cacheKey=`partner_analytics_${orgId}_${days}`;
 const[data,setData]=useState<Analytics|null>(()=>getCached<Analytics>(cacheKey));
 const[loading,setLoading]=useState(()=>getCached<Analytics>(cacheKey)===null);
 const[error,setError]=useState("");
 async function load(){
  if(!orgId){setLoading(false);return}
  if(getCached(cacheKey)===null)setLoading(true);
  try{
    const r=await fetch(`/api/partner-restaurant-analytics?organizationId=${encodeURIComponent(orgId)}&days=${days}&timezone=Asia%2FHo_Chi_Minh`,{cache:"no-store"});
    const j=await r.json();
    if(!r.ok||!j?.ok)throw new Error(j?.error?.code||"ANALYTICS_FAILED");
    setData(j.data);
    setCached(cacheKey,j.data);
    setError("");
  }catch(e){
    setError(e instanceof Error?e.message:"ANALYTICS_FAILED");
  }finally{
    setLoading(false);
  }
 }
 useEffect(()=>{void load()},[orgId,days,cacheKey]);
 const maxGmv=useMemo(()=>Math.max(1,...(data?.daily||[]).map(x=>x.gmv)),[data]);
 return <main className="zx-native-workspace" style={{minHeight:"100vh",maxWidth:1180,margin:"0 auto",padding:"24px 18px",fontFamily:"Inter,Arial,sans-serif",color:"#111827"}}>
  <header style={{textAlign:"center",padding:"10px 0 4px"}}><small style={{color:"#07c160",fontWeight:900}}>ZHAOXI PARTNER</small><h1 style={{margin:"7px 0 6px"}}>{t.title}</h1><p style={{margin:0,color:"#64748b"}}>{t.subtitle}</p></header>
  <PartnerWorkspaceNav/>
  <section style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",margin:"18px 0",flexWrap:"wrap"}}><div style={{display:"flex",gap:6}}>{([7,30,90] as const).map(v=><button key={v} onClick={()=>setDays(v)} style={{border:"1px solid #dbe4df",borderRadius:999,padding:"12px 16px",background:days===v?"#07c160":"#fff",color:days===v?"#fff":"#111827",fontSize:18,fontWeight:850}}>{v===7?t.d7:v===30?t.d30:t.d90}</button>)}</div><button onClick={()=>void load()} style={{border:0,borderRadius:10,padding:"8px 10px",background:"#eef7f1",color:"#078343",fontWeight:800}}>{t.refresh}</button></section>
  {error&&<p style={{padding:20,borderRadius:12,background:"#fff1f2",color:"#b42318"}}>{error}</p>}
  {loading&&!data?<p>{t.loading}</p>:data?<>
   <section style={metrics}><Metric label={t.gmv} value={money(data.revenue.gmv)}/><Metric label={t.foodRevenue} value={money(data.revenue.foodRevenue)}/><Metric label={t.aov} value={money(data.revenue.averageOrderValue)}/><Metric label={t.orders} value={String(data.orders.total)}/></section>
   <section style={metrics}><Metric label={t.completed} value={`${data.orders.completed} · ${data.orders.completionRate}%`}/><Metric label={t.cancelled} value={`${data.orders.cancelled} · ${data.orders.cancellationRate}%`}/><Metric label={t.inProgress} value={String(data.orders.inProgress)}/><Metric label={t.prep} value={`${data.operations.averagePreparationMinutes} ${t.minutes}`}/></section>
   <section style={{...card,marginTop:12}}><h2 style={heading}>{t.period}</h2><div style={metrics}><Metric label={t.promotion} value={`−${money(data.revenue.itemPromotionDiscount)}`}/><Metric label={t.coupon} value={`−${money(data.revenue.couponDiscount)}`}/><Metric label={t.shipSubsidy} value={`−${money(data.revenue.deliverySubsidy)}`}/><Metric label={t.delivery} value={money(data.revenue.customerDeliveryFee)}/></div></section>
   <section style={{...card,marginTop:12}}><h2 style={heading}>{t.trend}</h2><div style={{display:"flex",alignItems:"end",gap:4,height:170,overflowX:"auto",paddingTop:10}}>{data.daily.map(day=><div key={day.date} title={`${day.date} · ${money(day.gmv)}`} style={{minWidth:18,flex:"1 0 18px",height:"100%",display:"flex",flexDirection:"column",justifyContent:"end",alignItems:"center",gap:4}}><div style={{width:"100%",height:`${Math.max(day.gmv?4:1,day.gmv/maxGmv*130)}px`,borderRadius:"6px 6px 2px 2px",background:"#07c160"}}/><small style={{fontSize:6,color:"#94a3b8",writingMode:"vertical-rl"}}>{day.date.slice(5)}</small></div>)}</div></section>
   <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:12,marginTop:12}}>
    <section style={card}><h2 style={heading}>{t.top}</h2>{!data.topItems.length?<small>{t.empty}</small>:<div style={{display:"grid",gap:7}}>{data.topItems.map((x,i)=><article key={x.serviceId} style={row}><span style={rank}>{i+1}</span><div style={{minWidth:0}}><b style={{fontSize:18,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.name}</b><small style={{color:"#64748b"}}>{t.quantity}: {x.quantity} · {x.orders} {t.orders.toLowerCase()}</small></div><b style={{fontSize:18,marginLeft:"auto"}}>{money(x.revenue)}</b></article>)}</div>}</section>
    <section style={card}><h2 style={heading}>{t.campaigns}</h2>{!data.campaignPerformance.length?<small>{t.empty}</small>:<div style={{display:"grid",gap:7}}>{data.campaignPerformance.slice(0,10).map(x=><article key={x.id} style={{...row,gridTemplateColumns:"1fr auto"}}><div><b style={{fontSize:18}}>{x.code} · {x.title}</b><small style={{display:"block",color:"#64748b",marginTop:3}}>{t.redemptions}: {x.periodRedemptions} · {t.campaignOrders}: {x.completedOrders} · {t.used}: {x.usedCount}{x.totalUsageLimit?`/${x.totalUsageLimit}`:""}</small><small style={{display:"block",color:"#c2410c",marginTop:2}}>{t.discount}: −{money(x.completedDiscount)}</small></div><b style={{fontSize:18}}>{money(x.completedRevenue)}</b></article>)}</div>}</section>
   </section>
  </>:<p>{t.empty}</p>}
 </main>
}
function Metric({label,value}:{label:string;value:string}){return <div style={{padding:20,border:"1px solid #e8eeeb",borderRadius:14,background:"#fff"}}><small style={{display:"block",color:"#64748b",fontSize:18}}>{label}</small><b style={{display:"block",marginTop:5,fontSize:18}}>{value}</b></div>}
const metrics={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:8} as const;
const card={padding:14,border:"1px solid #e3eae6",borderRadius:18,background:"#fff"} as const;
const heading={margin:"0 0 10px",fontSize:18} as const;
const row={display:"grid",gridTemplateColumns:"28px 1fr auto",gap:8,alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f0f3f1"} as const;
const rank={display:"grid",placeItems:"center",width:24,height:24,borderRadius:999,background:"#ecfdf5",color:"#078343",fontSize:18,fontWeight:900} as const;
