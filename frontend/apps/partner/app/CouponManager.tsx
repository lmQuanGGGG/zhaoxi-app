"use client";
import {useEffect,useState,type ReactNode} from "react";
import {useZhaoXiLocale} from "@zhaoxi/i18n";

type Coupon={id:string;code:string;title:string;discountType:"percent"|"fixed";discountValue:number;maxDiscountAmount:number|null;minOrderAmount:number;totalUsageLimit:number|null;perCustomerLimit:number;startsAt:string|null;endsAt:string|null;enabled:boolean;usedCount:number};
const copy={
"zh-CN":{title:"优惠券与活动",new:"新建优惠券",code:"优惠码",name:"活动名称",type:"优惠类型",percent:"百分比",fixed:"固定金额",value:"优惠值",cap:"最高优惠",min:"最低订单金额",total:"总使用次数",per:"每位客户次数",start:"开始时间",end:"结束时间",enabled:"启用",save:"保存",delete:"删除",deleteConfirm:"确定删除此优惠券吗？",used:"已使用",empty:"暂无优惠券"},
"zh-TW":{title:"優惠券與活動",new:"新增優惠券",code:"優惠碼",name:"活動名稱",type:"優惠類型",percent:"百分比",fixed:"固定金額",value:"優惠值",cap:"最高優惠",min:"最低訂單金額",total:"總使用次數",per:"每位客戶次數",start:"開始時間",end:"結束時間",enabled:"啟用",save:"儲存",delete:"刪除",deleteConfirm:"確定刪除此優惠券嗎？",used:"已使用",empty:"暫無優惠券"},
"vi-VN":{title:"Coupon & chiến dịch",new:"Tạo coupon",code:"Mã coupon",name:"Tên chiến dịch",type:"Loại giảm",percent:"Phần trăm",fixed:"Số tiền cố định",value:"Giá trị giảm",cap:"Giảm tối đa",min:"Đơn tối thiểu",total:"Tổng lượt dùng",per:"Lượt dùng mỗi khách",start:"Bắt đầu",end:"Kết thúc",enabled:"Đang bật",save:"Lưu",delete:"Xóa",deleteConfirm:"Bạn có chắc muốn xóa coupon này?",used:"Đã dùng",empty:"Chưa có coupon"},
"en-US":{title:"Coupons & campaigns",new:"Create coupon",code:"Coupon code",name:"Campaign name",type:"Discount type",percent:"Percent",fixed:"Fixed amount",value:"Discount value",cap:"Maximum discount",min:"Minimum order",total:"Total uses",per:"Uses per customer",start:"Starts",end:"Ends",enabled:"Enabled",save:"Save",delete:"Delete",deleteConfirm:"Delete this coupon?",used:"Used",empty:"No coupons yet"}} as const;

const blank={code:"",title:"",discountType:"percent",discountValue:10,maxDiscountAmount:"",minOrderAmount:0,totalUsageLimit:"",perCustomerLimit:1,startsAt:"",endsAt:"",enabled:true};

function couponErrorMessage(code:unknown,locale:string){
 const value=String(code||"");
 if(locale==="vi-VN"){
  if(value==="COUPON_CODE_INVALID")return "Nhập mã coupon 3–40 ký tự: chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.";
  if(value==="COUPON_CODE_EXISTS")return "Mã coupon này đã tồn tại. Hãy dùng một mã khác.";
  if(value==="COUPON_TIME_RANGE_INVALID")return "Thời gian kết thúc phải sau thời gian bắt đầu.";
  if(value==="PARTNER_FORBIDDEN"||value==="PARTNER_REQUIRED")return "Bạn không có quyền tạo coupon cho gian hàng này. Hãy đăng nhập lại Partner.";
  if(value==="COUPONS_UNAVAILABLE")return "Không kết nối được máy chủ coupon. Vui lòng thử lại.";
 }
 return value||"Không thể tạo coupon. Vui lòng thử lại.";
}

export default function CouponManager({organizationId}:{organizationId:string}){
 const{locale}=useZhaoXiLocale();const t=copy[locale];const[rows,setRows]=useState<Coupon[]>([]);const[form,setForm]=useState<any>(blank);const[msg,setMsg]=useState("");const[creating,setCreating]=useState(false);
 async function load(){if(!organizationId)return;try{const r=await fetch(`/api/partner-coupons?organizationId=${encodeURIComponent(organizationId)}`,{cache:"no-store"});const j=await r.json().catch(()=>null);if(j?.ok)setRows(j.data||[])}catch{}}
 useEffect(()=>{void load()},[organizationId]);
 async function create(){
  if(creating)return;
  const code=String(form.code||"").trim().toUpperCase();
  if(!/^[A-Z0-9_-]{3,40}$/.test(code)){setMsg(couponErrorMessage("COUPON_CODE_INVALID",locale));return;}
  if(form.startsAt&&form.endsAt&&new Date(form.endsAt)<=new Date(form.startsAt)){setMsg(couponErrorMessage("COUPON_TIME_RANGE_INVALID",locale));return;}
  setCreating(true);setMsg("");
  const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),12000);
  try{
   const r=await fetch("/api/partner-coupons",{method:"POST",headers:{"content-type":"application/json"},signal:controller.signal,body:JSON.stringify({...form,code,organizationId,maxDiscountAmount:form.maxDiscountAmount===""?null:Number(form.maxDiscountAmount),totalUsageLimit:form.totalUsageLimit===""?null:Number(form.totalUsageLimit),startsAt:form.startsAt?new Date(form.startsAt).toISOString():null,endsAt:form.endsAt?new Date(form.endsAt).toISOString():null})});
   const j=await r.json().catch(()=>null);
   if(r.ok&&j?.ok&&j.data){setRows(current=>[j.data,...current.filter(row=>row.id!==j.data.id)]);setForm(blank);setMsg(locale==="vi-VN"?`✓ Đã tạo coupon ${j.data.code}. Customer có thể dùng ngay.`:"✓ Coupon created successfully.");}
   else setMsg(couponErrorMessage(j?.error?.code,locale));
  }catch(error){setMsg(error instanceof DOMException&&error.name==="AbortError"?(locale==="vi-VN"?"Tạo coupon mất quá lâu. Vui lòng thử lại.":"Coupon creation timed out. Please try again."):couponErrorMessage("COUPONS_UNAVAILABLE",locale));}
  finally{window.clearTimeout(timer);setCreating(false);}
 }
 async function patch(row:Coupon,values:Record<string,unknown>){await fetch(`/api/partner-coupons/${row.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({organizationId,...values})});await load()}
 async function remove(row:Coupon){if(!window.confirm(t.deleteConfirm))return;await fetch(`/api/partner-coupons/${row.id}?organizationId=${encodeURIComponent(organizationId)}`,{method:"DELETE"});await load()}
 return <section style={{margin:"18px 0",padding:16,border:"1px solid #dfe7e3",borderRadius:18,background:"#fff",display:"grid",gap:12}}>
  <h2 style={{margin:0}}>{t.title}</h2>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:8}}>
   <Field l={t.code}><input value={form.code} onChange={e=>setForm((v:any)=>({...v,code:e.target.value.toUpperCase()}))}/></Field>
   <Field l={t.name}><input value={form.title} onChange={e=>setForm((v:any)=>({...v,title:e.target.value}))}/></Field>
   <Field l={t.type}><select value={form.discountType} onChange={e=>setForm((v:any)=>({...v,discountType:e.target.value}))}><option value="percent">{t.percent}</option><option value="fixed">{t.fixed}</option></select></Field>
   <Field l={t.value}><input type="number" value={form.discountValue} onChange={e=>setForm((v:any)=>({...v,discountValue:Number(e.target.value)}))}/></Field>
   {form.discountType==="percent"&&<Field l={t.cap}><input type="number" value={form.maxDiscountAmount} onChange={e=>setForm((v:any)=>({...v,maxDiscountAmount:e.target.value}))}/></Field>}
   <Field l={t.min}><input type="number" value={form.minOrderAmount} onChange={e=>setForm((v:any)=>({...v,minOrderAmount:Number(e.target.value)}))}/></Field>
   <Field l={t.total}><input type="number" value={form.totalUsageLimit} onChange={e=>setForm((v:any)=>({...v,totalUsageLimit:e.target.value}))}/></Field>
   <Field l={t.per}><input type="number" min={1} value={form.perCustomerLimit} onChange={e=>setForm((v:any)=>({...v,perCustomerLimit:Number(e.target.value)}))}/></Field>
   <Field l={t.start}><input type="datetime-local" value={form.startsAt} onChange={e=>setForm((v:any)=>({...v,startsAt:e.target.value}))}/></Field>
   <Field l={t.end}><input type="datetime-local" value={form.endsAt} onChange={e=>setForm((v:any)=>({...v,endsAt:e.target.value}))}/></Field>
  </div>
  <button type="button" disabled={creating} onClick={()=>void create()} style={{border:0,borderRadius:12,padding:10,background:"#07c160",color:"#fff",fontWeight:850,opacity:creating ? .7 : 1,cursor:creating?"wait":"pointer"}}>{creating?(locale==="vi-VN"?"Đang tạo coupon…":"Creating coupon…"):t.new}</button>{msg&&<small role="status" style={{color:msg.startsWith("✓")?"#078343":"#b42318",fontWeight:700}}>{msg}</small>}
  <div style={{display:"grid",gap:8}}>{!rows.length?<small style={{color:"#94a3b8"}}>{t.empty}</small>:rows.map(row=><article key={row.id} style={{padding:11,border:"1px solid #edf2ef",borderRadius:14,display:"grid",gap:6}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8}}><b>{row.code} · {row.title}</b><span>{t.used}: {row.usedCount}{row.totalUsageLimit?`/${row.totalUsageLimit}`:""}</span></div>
    <small>{row.discountType==="percent"?`${row.discountValue}%${row.maxDiscountAmount?` · max ${row.maxDiscountAmount.toLocaleString("vi-VN")} VND`:""}`:`${row.discountValue.toLocaleString("vi-VN")} VND`} · min {row.minOrderAmount.toLocaleString("vi-VN")} VND</small>
    <div style={{display:"flex",gap:7}}><button onClick={()=>void patch(row,{enabled:!row.enabled})} style={{flex:1,border:0,borderRadius:9,padding:7,background:row.enabled?"#dcfce7":"#f1f5f9",fontWeight:800}}>{row.enabled?t.enabled:"OFF"}</button><button onClick={()=>void remove(row)} style={{border:0,borderRadius:9,padding:"11px 16px",background:"#fff1f2",color:"#b42318",fontWeight:800}}>{t.delete}</button></div>
  </article>)}</div>
 </section>
}
function Field({l,children}:{l:string;children:ReactNode}){return <label style={{display:"grid",gap:4,fontSize:18,color:"#64748b"}}>{l}{children}</label>}
