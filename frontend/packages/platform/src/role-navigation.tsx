"use client";
import Link from"next/link";
import{useMemo,useState}from"react";
import{usePathname}from"next/navigation";
import{useZhaoXiLocale}from"@zhaoxi/i18n";
import type{ZhaoXiRole}from"@zhaoxi/auth";

type ActiveRole=Extract<ZhaoXiRole,"customer"|"partner"|"admin">;
type Item={key:string;href:string;icon:"home"|"command"|"grid"|"chart"|"pay"|"orders"|"messages"|"profile"|"store"|"settlement"|"support";labels:Record<string,string>};

const labels={
 "vi-VN":{more:"Thêm",close:"Đóng",menu:"Chức năng",customer:"Khách hàng",partner:"Đối tác",admin:"Quản trị"},
 "en-US":{more:"More",close:"Close",menu:"Functions",customer:"Customer",partner:"Partner",admin:"Admin"},
 "zh-CN":{more:"更多",close:"关闭",menu:"功能",customer:"客户",partner:"合作伙伴",admin:"管理"},
 "zh-TW":{more:"更多",close:"關閉",menu:"功能",customer:"客戶",partner:"合作夥伴",admin:"管理"},
} as const;

const L=(vi:string,en:string,zh:string,tw=zh)=>({"vi-VN":vi,"en-US":en,"zh-CN":zh,"zh-TW":tw});
const primary:Record<ActiveRole,Item[]>={
 customer:[
  {key:"home",href:"/",icon:"home",labels:L("Trang chủ","Home","首页","首頁")},
  {key:"orders",href:"/orders",icon:"orders",labels:L("Đơn hàng","Orders","订单","訂單")},
  {key:"services",href:"/services",icon:"grid",labels:L("Dịch vụ","Services","服务","服務")},
  {key:"messages",href:"/messages",icon:"messages",labels:L("Tin nhắn","Messages","消息")},
  {key:"profile",href:"/profile",icon:"profile",labels:L("Cá nhân","Profile","我的","我的")},
 ],
 partner:[
  {key:"home",href:"/",icon:"home",labels:L("Tổng quan","Overview","总览","總覽")},
  {key:"operations",href:"/",icon:"orders",labels:L("Vận hành","Operations","运营","營運")},
  {key:"catalog",href:"/catalog",icon:"grid",labels:L("Dịch vụ","Services","服务","服務")},
  {key:"analytics",href:"/analytics",icon:"chart",labels:L("Phân tích","Analytics","分析")},
  {key:"settlements",href:"/settlements",icon:"settlement",labels:L("Đối soát","Settlements","结算","結算")},
 ],
 admin:[
  {key:"home",href:"/",icon:"home",labels:L("Tổng quan","Overview","总览","總覽")},
  {key:"command",href:"/?view=command",icon:"command",labels:L("Chỉ huy","Command","指挥","指揮")},
  {key:"services",href:"/?view=services",icon:"grid",labels:L("Dịch vụ","Services","服务","服務")},
  {key:"analytics",href:"/?view=analytics",icon:"chart",labels:L("Phân tích","Analytics","分析")},
  {key:"payment",href:"/?view=payments",icon:"pay",labels:L("Thanh toán","Payment","支付")},
 ],
};
const extra:Record<ActiveRole,Item[]>={
 customer:[
  {key:"favorites",href:"/favorites",icon:"grid",labels:L("Yêu thích","Favorites","收藏")},
  {key:"notifications",href:"/notifications",icon:"messages",labels:L("Thông báo","Notifications","通知")},
  {key:"support",href:"/support",icon:"support",labels:L("Hỗ trợ","Support","支持","支援")},
 ],
 partner:[
  {key:"store",href:"/doi-tac/cua-hang",icon:"store",labels:L("Cửa hàng","Store","店铺","店鋪")},
  {key:"housing",href:"/housing-inventory",icon:"grid",labels:L("Nhà ở","Housing","住房")},
  {key:"travel",href:"/travel-inventory",icon:"grid",labels:L("Du lịch","Travel","旅游","旅遊")},
  {key:"support",href:"/support",icon:"support",labels:L("Hỗ trợ","Support","支持","支援")},
  {key:"tools",href:"/tools",icon:"grid",labels:L("Công cụ","Tools","工具","工具")},
 ],
 admin:[
  {key:"customerOps",href:"/?view=customerOps",icon:"orders",labels:L("Customer Ops","Customer Ops","客户运营","客戶營運")},
  {key:"support",href:"/support",icon:"support",labels:L("Hỗ trợ","Support","支持","支援")},
  {key:"workflow",href:"/?view=workflow",icon:"command",labels:L("Workflow","Workflow","工作流","工作流程")},
  {key:"audit",href:"/audit-log",icon:"chart",labels:L("Nhật ký","Audit log","审计日志","稽核日誌")},
  {key:"features",href:"/feature-flags",icon:"grid",labels:L("Cấu hình","Configuration","配置","設定")},
 ],
};

function Icon({name}:{name:Item["icon"]}){
 if(name==="orders")return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M9 3v3h6V3M9 11h6M9 15h4M8.5 8.5l1.2 1.2 2-2"/></svg>;
 const p:{[K in Item["icon"]]:string}={
  home:"M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  command:"M12 3a9 9 0 1 0 9 9h-4a5 5 0 1 1-5-5z",
  grid:"M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z",
  chart:"M4 20V10h4v10zm6 0V4h4v16zm6 0v-7h4v7z",
  pay:"M4 5h16v14H4zm3 4h10M7 15h4",
  orders:"",
  messages:"M4 5h16v12H8l-4 3z",
  profile:"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0",
  store:"M5 9V6h14v3l-1 3H6zm1 3v8h12v-8",
  settlement:"M5 6h14v12H5zm3 4h8m-8 4h5",
  support:"M12 3a8 8 0 0 0-8 8v5h4v-5a4 4 0 0 1 8 0v5h4v-5a8 8 0 0 0-8-8z",
 };
 return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={p[name]}/></svg>
}
function ServiceGemIcon(){return <span className="zx-customer-services-gem" aria-hidden="true"><i/><i/><i/><i/></span>}
function active(path:string,href:string){if(href.startsWith("/?view=")){if(typeof window==="undefined")return false;return path==="/"&&new URLSearchParams(window.location.search).get("view")===href.split("=")[1]}if(href==="/services"&&path.startsWith("/service/"))return true;if(href==="/orders"&&path.startsWith("/order/"))return true;return href==="/"?path==="/"&&(!(typeof window!=="undefined")||!new URLSearchParams(window.location.search).get("view")):path===href||path.startsWith(href+"/")}

export function UnifiedRoleNavigation({role}:{role:ActiveRole}){
 const{locale}=useZhaoXiLocale();const copy=labels[locale];const pathname=usePathname();const[open,setOpen]=useState(false);const[pending,setPending]=useState<{href:string;from:string}|null>(null);
 const items=useMemo(()=>primary[role],[role]),more=useMemo(()=>extra[role],[role]);
 const customerService=role==="customer"?items.find(item=>item.key==="services"):undefined;
 const visibleItems=role==="customer"?items.filter(item=>item.key!=="services"):items;
 const activePath=role==="customer"&&pending?.from===pathname?pending.href:pathname;
 const prime=(href:string,e:{button:number;metaKey:boolean;ctrlKey:boolean;shiftKey:boolean;altKey:boolean})=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey)setPending({href,from:pathname})};
 return <><div className={role==="customer"?"zx-customer-dock":undefined}><nav className="zx-role-bottom-nav" data-authoritative-bottom-navigation="18.4.5" aria-label={copy.menu}>{visibleItems.map(i=>{const selected=active(activePath,i.href),content=<><span><Icon name={i.icon}/></span>{role!=="customer"&&<small>{i.labels[locale]}</small>}</>;return role==="customer"?<Link key={i.key} href={i.href} prefetch={true} className={selected?"active":""} aria-label={i.labels[locale]} aria-current={selected?"page":undefined} onPointerDown={e=>prime(i.href,e)} onPointerCancel={()=>setPending(null)} onClick={e=>prime(i.href,e)}>{content}</Link>:<a key={i.key} href={i.href} className={selected?"active":""} aria-current={selected?"page":undefined}>{content}</a>})}</nav>
 {customerService&&<Link href={customerService.href} prefetch={true} className={`zx-customer-services-trigger ${active(activePath,customerService.href)?"active":""}`} aria-label={customerService.labels[locale]} onPointerDown={e=>prime(customerService.href,e)} onPointerCancel={()=>setPending(null)} onClick={e=>prime(customerService.href,e)}><ServiceGemIcon/></Link>}</div>
 {role!=="customer"&&<button type="button" className="zx-role-more-trigger" onClick={()=>setOpen(true)} aria-label={copy.more}>•••</button>}
 {role!=="customer"&&open&&<div className="zx-role-menu-backdrop" onClick={()=>setOpen(false)}><section className="zx-role-menu-sheet" onClick={e=>e.stopPropagation()}><header><div><b>ZHAOXI</b><small>{copy[role]}</small></div><button type="button" onClick={()=>setOpen(false)}>×</button></header><div className="zx-role-menu-grid">{more.map(i=><a key={i.key} href={i.href}><span><Icon name={i.icon}/></span><b>{i.labels[locale]}</b></a>)}</div></section></div>}</>
}
