export type SessionPoint={latitude:number;longitude:number};
export const CUSTOMER_LOCATION_EVENT="zhaoxi-customer-location";
const KEY="zhaoxi-session-location";

export function readSessionPoint():SessionPoint|null{
 if(typeof window==="undefined")return null;
 try{
  const value=JSON.parse(sessionStorage.getItem(KEY)||"null");
  const latitude=Number(value?.latitude),longitude=Number(value?.longitude);
  return Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180?{latitude,longitude}:null;
 }catch{return null}
}
export function writeSessionPoint(point:SessionPoint|null){
 if(typeof window==="undefined")return;
 if(point)sessionStorage.setItem(KEY,JSON.stringify(point));else sessionStorage.removeItem(KEY);
 window.dispatchEvent(new CustomEvent(CUSTOMER_LOCATION_EVENT,{detail:point}));
}
export function subscribeSessionPoint(callback:(point:SessionPoint|null)=>void){
 if(typeof window==="undefined")return()=>{};
 const handler=()=>callback(readSessionPoint());
 window.addEventListener(CUSTOMER_LOCATION_EVENT,handler);
 window.addEventListener("storage",handler);
 return()=>{window.removeEventListener(CUSTOMER_LOCATION_EVENT,handler);window.removeEventListener("storage",handler)}
}
