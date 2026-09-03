"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
export type CartItem={serviceId:string;organizationId?:string|null;organizationName?:string;name:string;imageUrl?:string;unitPrice:number;currency:string;quantity:number};
export type CartGroup={organizationId:string;organizationName:string;items:CartItem[];count:number;total:number};
const KEY="zhaoxi_cart_v2";
function read():CartItem[]{if(typeof window==="undefined")return[];try{const value=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(value)?value.filter((x)=>Number(x?.quantity)>0):[]}catch{return[]}}
function write(items:CartItem[]){localStorage.setItem(KEY,JSON.stringify(items.filter(x=>x.quantity>0)));window.dispatchEvent(new Event("zhaoxi-cart-change"))}
export function readZhaoXiCart(){return read()}
export function useZhaoXiCart(){const[items,setItems]=useState<CartItem[]>([]);useEffect(()=>{const sync=()=>setItems(read());sync();window.addEventListener("storage",sync);window.addEventListener("zhaoxi-cart-change",sync);return()=>{window.removeEventListener("storage",sync);window.removeEventListener("zhaoxi-cart-change",sync)}},[]);
const add=useCallback((item:CartItem)=>{if(item.quantity<=0)return;const current=read();const index=current.findIndex(x=>x.serviceId===item.serviceId&&String(x.organizationId||"")===String(item.organizationId||""));if(index>=0)current[index]={...current[index],...item,quantity:Math.min(99,current[index].quantity+item.quantity)};else current.push({...item,quantity:Math.min(99,item.quantity)});write(current);setItems(current)},[]);
const setQuantity=useCallback((serviceId:string,quantity:number,organizationId?:string|null)=>{const current=read().map(x=>x.serviceId===serviceId&&(organizationId===undefined||String(x.organizationId||"")===String(organizationId||""))?{...x,quantity:Math.max(1,Math.min(99,quantity))}:x);write(current);setItems(current)},[]);
const remove=useCallback((serviceId:string,organizationId?:string|null)=>{const current=read().filter(x=>!(x.serviceId===serviceId&&(organizationId===undefined||String(x.organizationId||"")===String(organizationId||""))));write(current);setItems(current)},[]);
const clear=useCallback(()=>{write([]);setItems([])},[]);
const clearOrganization=useCallback((organizationId:string)=>{const current=read().filter(x=>String(x.organizationId||"unknown")!==organizationId);write(current);setItems(current)},[]);
const groups=useMemo<CartGroup[]>(()=>{const map=new Map<string,CartItem[]>();for(const item of items){const key=String(item.organizationId||"unknown");map.set(key,[...(map.get(key)||[]),item])}return [...map.entries()].map(([organizationId,groupItems])=>({organizationId,organizationName:groupItems[0]?.organizationName||"Nhà hàng",items:groupItems,count:groupItems.reduce((s,x)=>s+x.quantity,0),total:groupItems.reduce((s,x)=>s+x.unitPrice*x.quantity,0)}))},[items]);
const total=useMemo(()=>items.reduce((sum,x)=>sum+x.unitPrice*x.quantity,0),[items]);const count=useMemo(()=>items.reduce((sum,x)=>sum+x.quantity,0),[items]);return{items,groups,add,setQuantity,remove,clear,clearOrganization,total,count}}
