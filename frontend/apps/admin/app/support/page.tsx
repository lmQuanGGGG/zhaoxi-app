"use client";
import Link from "next/link";
import {SupportCenter} from "@zhaoxi/support";
export default function SupportPage(){return <main style={{maxWidth:520,margin:"0 auto",padding:18,minHeight:"100dvh"}}><div style={{marginBottom:12}}><Link href="/" style={{textDecoration:"none",color:"#64748b"}}>← ZhaoXi</Link></div><SupportCenter role="admin"/></main>}
