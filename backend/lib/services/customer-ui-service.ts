import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { customerUiSettings } from "@/db/schema";

export const DEFAULT_CUSTOMER_UI = {
  scope:"default",
  bannerEffect:0,
  bannerAutoCycle:false,
  bannerCycleSeconds:20,
  recommendationCycleSeconds:60,
  bannerContent:{
    "zh-CN":{title:"欢迎来到岘港",subtitle:"赵喜陪伴您的每一天",cityLabel:"岘港"},
    "zh-TW":{title:"歡迎來到峴港",subtitle:"趙喜陪伴您的每一天",cityLabel:"峴港"},
    "vi-VN":{title:"Chào mừng đến Đà Nẵng",subtitle:"ZhaoXi đồng hành cùng bạn mỗi ngày",cityLabel:"Đà Nẵng"},
    "en-US":{title:"Welcome to Da Nang",subtitle:"ZhaoXi is with you every day",cityLabel:"Da Nang"},
  },
} as const;

function clamp(value:unknown,min:number,max:number,fallback:number){
  const n=Number(value); return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback;
}
function content(input:unknown){
  const source=input&&typeof input==="object"?input as Record<string,any>:{};
  const out:Record<string,{title:string;subtitle:string;cityLabel?:string}>={};
  for(const locale of ["zh-CN","zh-TW","vi-VN","en-US"]){
    const row=source[locale]||{};
    const fallback=(DEFAULT_CUSTOMER_UI.bannerContent as any)[locale];
    out[locale]={
      title:String(row.title||fallback.title).slice(0,120),
      subtitle:String(row.subtitle||fallback.subtitle).slice(0,180),
      cityLabel:String(row.cityLabel||fallback.cityLabel||"").slice(0,80),
    };
  }
  return out;
}

export class CustomerUiService{
  async get(){
    const db=getDb();
    const row=(await db.select().from(customerUiSettings).where(eq(customerUiSettings.scope,"default")).limit(1))[0];
    return row||DEFAULT_CUSTOMER_UI;
  }
  async update(input:any,userId?:string){
    const db=getDb();
    const values={
      scope:"default",
      bannerEffect:clamp(input?.bannerEffect,0,3,0),
      bannerAutoCycle:Boolean(input?.bannerAutoCycle),
      bannerCycleSeconds:clamp(input?.bannerCycleSeconds,8,120,20),
      recommendationCycleSeconds:clamp(input?.recommendationCycleSeconds,30,300,60),
      bannerContent:content(input?.bannerContent),
      updatedByUserId:userId||null,
      updatedAt:new Date(),
    };
    const existing=(await db.select().from(customerUiSettings).where(eq(customerUiSettings.scope,"default")).limit(1))[0];
    if(existing){
      const [row]=await db.update(customerUiSettings).set(values).where(eq(customerUiSettings.id,existing.id)).returning();
      return row;
    }
    const [row]=await db.insert(customerUiSettings).values(values).returning();
    return row;
  }
}
export const customerUiService=new CustomerUiService();
