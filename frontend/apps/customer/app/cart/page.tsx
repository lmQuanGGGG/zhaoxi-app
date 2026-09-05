"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {useZhaoXiCart} from "@zhaoxi/cart";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import MiniTabBar from "../_components/MiniTabBar";

const copy={
"zh-CN":{title:"购物车",empty:"购物车为空",emptyHint:"从餐厅选择商品后会显示在这里。",continue:"继续选餐",total:"商品金额",remove:"删除",checkout:"去确认订单",locked:"每家餐厅独立结算",restaurant:"餐厅",items:"件",clear:"清空此购物车",summary:"购物车汇总"},
"zh-TW":{title:"購物車",empty:"購物車為空",emptyHint:"從餐廳選擇商品後會顯示在這裡。",continue:"繼續選餐",total:"商品金額",remove:"刪除",checkout:"去確認訂單",locked:"每家餐廳獨立結算",restaurant:"餐廳",items:"件",clear:"清空此購物車",summary:"購物車摘要"},
"vi-VN":{title:"Giỏ hàng",empty:"Giỏ hàng đang trống",emptyHint:"Các món đã chọn từ nhà hàng sẽ xuất hiện tại đây.",continue:"Tiếp tục chọn món",total:"Tiền hàng",remove:"Xóa",checkout:"Xác nhận đơn",locked:"Mỗi nhà hàng được thanh toán riêng",restaurant:"Nhà hàng",items:"món",clear:"Xóa giỏ này",summary:"Tổng quan giỏ hàng"},
"en-US":{title:"Cart",empty:"Your cart is empty",emptyHint:"Items selected from restaurants will appear here.",continue:"Continue choosing dishes",total:"Items total",remove:"Remove",checkout:"Review order",locked:"Each restaurant checks out separately",restaurant:"Restaurant",items:"items",clear:"Clear this cart",summary:"Cart summary"}} as const;
export default function CartPage(){
 const{locale}=useZhaoXiLocale();const t=copy[locale];
 const router=useRouter();
 const{groups,remove,setQuantity,clearOrganization,count,total}=useZhaoXiCart();
 function checkout(href:string){router.push(href)}
 return <main style={{width:"100%",maxWidth:680,margin:"0 auto",padding:"14px 14px calc(110px + env(safe-area-inset-bottom))",minHeight:"100dvh",background:"#f5f7fa",boxSizing:"border-box"}}>
   <header style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
     <Link href="/services/food" style={back}>‹</Link>
     <div><small style={{color:"#07a856",fontWeight:900}}>ZHAOXI</small><h1 style={{fontSize:24,margin:"3px 0 0"}}>{t.title}</h1></div>
   </header>
   {!groups.length
    ? <section style={empty}><div style={{fontSize:34}}>🛒</div><h2>{t.empty}</h2><p>{t.emptyHint}</p><Link href="/services/food" style={primary}>{t.continue}</Link></section>
    : <>
      <section style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        <div style={summaryCard}><small>{t.summary}</small><strong>{count} {t.items}</strong></div>
        <div style={summaryCard}><small>{t.total}</small><strong>{Math.round(total).toLocaleString("vi-VN")} VND</strong></div>
      </section>
      <div style={{display:"grid",gap:10}}>
       {groups.map(group=><section key={group.organizationId} style={groupCard}>
          <header style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"start"}}>
            <div><small style={{color:"#64748b"}}>{t.restaurant}</small><h2 style={{fontSize:16,margin:"3px 0"}}>{group.organizationName||t.restaurant}</h2><span style={{fontSize:11,color:"#059669",background:"#ECFDF5",padding:"2px 8px",borderRadius:6,fontWeight:600}}>{t.locked}</span></div>
            <button type="button" onClick={()=>clearOrganization(group.organizationId)} style={dangerMini}>{t.clear}</button>
          </header>
         <div style={{display:"grid",gap:8,marginTop:10}}>
          {group.items.map(item=><article key={item.serviceId} style={{display:"grid",gridTemplateColumns:"52px 1fr",gap:9,padding:"8px 0",borderTop:"1px solid #edf2ef"}}>
            {item.imageUrl?<img src={item.imageUrl} alt={item.name} style={{width:52,height:52,objectFit:"cover",borderRadius:12}}/>:<div style={{width:52,height:52,borderRadius:12,background:"#eefaf3",display:"grid",placeItems:"center"}}>🍽️</div>}
            <div style={{minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</b><button type="button" onClick={()=>remove(item.serviceId,item.organizationId)} style={removeButton}>{t.remove}</button></div>
              <small style={{display:"block",color:"#64748b",marginTop:3}}>{item.unitPrice.toLocaleString("vi-VN")} {item.currency}</small>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginTop:7}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <button type="button" style={qtyButton} onClick={()=>item.quantity<=1?remove(item.serviceId,item.organizationId):setQuantity(item.serviceId,item.quantity-1,item.organizationId)}>−</button>
                  <b style={{minWidth:20,textAlign:"center"}}>{item.quantity}</b>
                  <button type="button" style={qtyButton} onClick={()=>setQuantity(item.serviceId,item.quantity+1,item.organizationId)}>+</button>
                </div>
                <strong style={{fontSize:12,color:"#ef5a3c"}}>{(item.quantity*item.unitPrice).toLocaleString("vi-VN")} {item.currency}</strong>
              </div>
            </div>
          </article>)}
         </div>
         <footer style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginTop:10,paddingTop:10,borderTop:"1px solid #edf2ef"}}>
           <div><small style={{color:"#64748b"}}>{t.total}</small><strong style={{display:"block",fontSize:17}}>{group.total.toLocaleString("vi-VN")} VND</strong></div>
           <button type="button" onClick={()=>checkout(`/request/${group.items[0].serviceId}?cartOrg=${encodeURIComponent(group.organizationId)}`)} style={{...primary,border:0,cursor:"pointer"}}>{t.checkout}</button>
         </footer>
       </section>)}
      </div>
    </>}
   <MiniTabBar/>
 </main>
}
const back={width:36,height:36,borderRadius:12,display:"inline-flex",alignItems:"center",justifyContent:"center",textDecoration:"none",fontSize:20,lineHeight:1,color:"#1E293B",background:"#FFFFFF",border:"1px solid #E2E8F0",boxShadow:"none"};
const empty={background:"rgba(255,255,255,.78)",border:"1px solid rgba(255,255,255,.95)",borderRadius:20,padding:"42px 22px",textAlign:"center" as const,boxShadow:"0 10px 30px rgba(15,23,42,.06)"};
const primary={display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"11px 14px",borderRadius:13,background:"#07c160",color:"#fff",textDecoration:"none",fontWeight:850,fontSize:12};
const summaryCard={display:"grid",gap:4,padding:"12px 13px",borderRadius:16,background:"rgba(255,255,255,.72)",border:"1px solid rgba(255,255,255,.9)",backdropFilter:"blur(18px)"};
const groupCard={background:"rgba(255,255,255,.78)",border:"1px solid rgba(255,255,255,.94)",borderRadius:19,padding:12,boxShadow:"0 10px 30px rgba(15,23,42,.06)",backdropFilter:"blur(18px)"};
const dangerMini={border:0,borderRadius:10,padding:"7px 8px",background:"#fff1f2",color:"#dc2626",fontSize:9,fontWeight:850};
const removeButton={border:0,background:"transparent",color:"#dc2626",fontSize:9,fontWeight:800};
const qtyButton={width:28,height:28,border:"1px solid #cfe8da",borderRadius:9,background:"#ecfdf5",color:"#078646",fontSize:17,fontWeight:900};
