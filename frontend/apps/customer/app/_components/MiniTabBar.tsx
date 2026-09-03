"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import styles from "./MiniTabBar.module.css";
const labels={
"zh-CN":{home:"首页",explore:"探索",messages:"消息",orders:"订单",profile:"我的"},
"zh-TW":{home:"首頁",explore:"探索",messages:"消息",orders:"訂單",profile:"我的"},
"vi-VN":{home:"Trang chủ",explore:"Khám phá",messages:"Tin nhắn",orders:"Đơn hàng",profile:"Cá nhân"},
"en-US":{home:"Home",explore:"Explore",messages:"Messages",orders:"Orders",profile:"Profile"}} as const;
export default function MiniTabBar(){
 const path=usePathname();const{locale}=useZhaoXiLocale();const t=labels[locale];const[unread,setUnread]=useState({messages:0,notifications:0,total:0});
 useEffect(()=>{let alive=true;const load=()=>fetch(`/api/customer-unread-summary?locale=${encodeURIComponent(locale)}`,{cache:"no-store"}).then(r=>r.json()).then(j=>{if(alive&&j?.ok)setUnread({messages:Number(j.data?.messages||0),notifications:Number(j.data?.notifications||0),total:Number(j.data?.total||0)})}).catch(()=>{});void load();const timer=window.setInterval(load,10000);return()=>{alive=false;window.clearInterval(timer)}},[locale,path]);
 const items=[{href:"/",icon:"⌂",label:t.home},{href:"/search",icon:"⌕",label:t.explore},{href:"/messages",icon:"◌",label:t.messages,badge:unread.messages},{href:"/orders",icon:"▤",label:t.orders},{href:"/profile",icon:"♙",label:t.profile}];
 return <nav className={styles.bar} aria-label="Main navigation">{items.map(i=>{const active=i.href==="/"?path===i.href:path.startsWith(i.href);return <Link key={i.href} href={i.href} className={`${styles.item} ${active?styles.active:""}`}><span className={styles.iconWrap}><span className={styles.icon}>{i.icon}</span>{Boolean(i.badge)&&<em>{Math.min(99,Number(i.badge))}</em>}</span><b>{i.label}</b></Link>})}</nav>
}
