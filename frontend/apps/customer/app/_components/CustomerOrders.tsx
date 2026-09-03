"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import {statusLabels,useZhaoXiLocale} from "@zhaoxi/i18n";
import {CustomerPageHeader,CustomerShell} from "./CustomerShell";
import styles from "../orders.module.css";

type Order={id:string;requestCode:string;status:string;title:string;description?:string|null;serviceName?:string|null;moduleName?:string|null;moduleCode?:string|null;organizationName?:string|null;createdAt:string;details?:Record<string,unknown>};
type Filter="all"|"active"|"completed"|"cancelled";
const copy={
"zh-CN":{title:"我的订单",loading:"正在加载…",empty:"暂无订单",emptyDesc:"您还没有提交服务订单。",explore:"浏览服务",detail:"查看详情",all:"全部",active:"处理中",completed:"已完成",cancelled:"已取消",orders:"笔订单",total:"金额"},
"zh-TW":{title:"我的訂單",loading:"正在載入…",empty:"暫無訂單",emptyDesc:"您還沒有送出服務訂單。",explore:"瀏覽服務",detail:"查看詳情",all:"全部",active:"處理中",completed:"已完成",cancelled:"已取消",orders:"筆訂單",total:"金額"},
"vi-VN":{title:"Đơn của tôi",loading:"Đang tải…",empty:"Chưa có đơn hàng",emptyDesc:"Bạn chưa gửi yêu cầu dịch vụ nào.",explore:"Khám phá dịch vụ",detail:"Xem chi tiết",all:"Tất cả",active:"Đang xử lý",completed:"Hoàn thành",cancelled:"Đã hủy",orders:"đơn",total:"Giá trị"},
"en-US":{title:"My orders",loading:"Loading…",empty:"No orders",emptyDesc:"You have not submitted any service orders.",explore:"Explore services",detail:"View details",all:"All",active:"Active",completed:"Completed",cancelled:"Cancelled",orders:"orders",total:"Value"}} as const;

import { useClientSWR } from "../_lib/client-cache";

const activeStatuses=new Set(["new","reviewing","assigned","accepted","in_progress","waiting_customer"]);
const cancelledStatuses=new Set(["cancelled","rejected"]);

export default function CustomerOrders(){
 const{locale}=useZhaoXiLocale();const t=copy[locale];const[filter,setFilter]=useState<Filter>("all");
 const cacheKey = `customer_orders_${locale}`;
 const fetchOrders = useCallback(async (): Promise<Order[]> => {
   const codes=JSON.parse(localStorage.getItem("zhaoxi-request-codes")||"[]") as string[];
   const params=new URLSearchParams({locale,mine:"1"});if(codes.length)params.set("codes",codes.join(","));
   try{const r=await fetch(`/api/platform-requests?${params}`,{cache:"no-store"});const j=await r.json();return Array.isArray(j?.data)?j.data:[]}catch{return[]}
 },[locale]);
 const { data: cachedOrders, loading } = useClientSWR<Order[]>(cacheKey, fetchOrders, { ttlMs: 15000 });
 const orders = cachedOrders || [];
 const visible=useMemo(()=>orders.filter(o=>filter==="all"||filter==="active"?filter==="all"||activeStatuses.has(o.status):filter==="completed"?o.status==="completed":cancelledStatuses.has(o.status)),[orders,filter]);
 const counts=useMemo(()=>({all:orders.length,active:orders.filter(o=>activeStatuses.has(o.status)).length,completed:orders.filter(o=>o.status==="completed").length,cancelled:orders.filter(o=>cancelledStatuses.has(o.status)).length}),[orders]);
 const sum=useMemo(()=>visible.reduce((n,o)=>n+Number(o.details?.totalAmount||0),0),[visible]);
 const tabs:[Filter,string][]=[["all",t.all],["active",t.active],["completed",t.completed],["cancelled",t.cancelled]];
 return <CustomerShell>
   <CustomerPageHeader title={t.title}/>
   <section className={styles.body}>
    <div className={styles.orderSummary}><div><small>{t.orders}</small><strong>{visible.length}</strong></div><div><small>{t.total}</small><strong>{sum>0?`${Math.round(sum).toLocaleString("vi-VN")} VND`:"—"}</strong></div></div>
    <nav className={styles.orderFilters}>{tabs.map(([id,label])=><button key={id} onClick={()=>setFilter(id)} data-active={filter===id}>{label}<span>{counts[id]}</span></button>)}</nav>
    {loading?<div className={styles.empty}>{t.loading}</div>:!visible.length?<div className={styles.empty}><span>▤</span><h2>{t.empty}</h2><p>{t.emptyDesc}</p><Link href="/">{t.explore}</Link></div>:<div className={styles.list}>{visible.map(o=><article className={styles.card} key={o.id}>
      <div className={styles.row}><code>{o.requestCode}</code><span data-status={o.status}>{statusLabels[locale][o.status]||o.status}</span></div>
      <small>{o.organizationName||o.moduleName||"ZhaoXi"}</small><h2>{o.serviceName||o.title}</h2>
      {o.description&&<p>{o.description}</p>}
      {Number(o.details?.totalAmount||0)>0&&<strong className={styles.orderAmount}>{Math.round(Number(o.details?.totalAmount)).toLocaleString("vi-VN")} {String(o.details?.currency||"VND")}</strong>}
      <footer><time>{new Date(o.createdAt).toLocaleString(locale)}</time><Link href={`/order/${o.id}`}>{t.detail} ›</Link></footer>
    </article>)}</div>}
   </section>
 </CustomerShell>
}
