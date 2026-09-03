import Link from "next/link";
import type {ReactNode} from "react";
import styles from "./CustomerShell.module.css";
export function CustomerShell({children,className="",bare=false}:{children:ReactNode;className?:string;bare?:boolean}){return <main className={`${styles.shell} ${className}`} data-customer-shell="18.4.0">{bare?children:<div className={styles.content}>{children}</div>}</main>}
export function CustomerPageHeader({title,subtitle,backHref="/",eyebrow="ZHAOXI",actions}:{title:string;subtitle?:string;backHref?:string|null;eyebrow?:string;actions?:ReactNode}){return <header className={`${styles.contextHeader} ${backHref===null?styles.contextHeaderNoBack:""}`} data-customer-page-header>{backHref!==null&&<Link className={styles.back} href={backHref} aria-label="Back">‹</Link>}<div className={styles.heading}><small>{eyebrow}</small><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{actions&&<div className={styles.actions}>{actions}</div>}</header>}
export const customerShellStyles=styles;
