"use client";
import Link from "next/link";
import { useZhaoXiSession } from "@zhaoxi/auth";
import { useZhaoXiLocale, type ZhaoXiLocale } from "@zhaoxi/i18n";
import { LOCALE_SHORT, onboardingCopy } from "./copy";
import PartnerOnboarding from "./PartnerOnboarding";
import styles from "./onboarding.module.css";

const workspaceLabel = { "vi-VN": "Khu quản lý", "en-US": "Workspace", "zh-CN": "工作台", "zh-TW": "工作台" } as const;
const LANGUAGES: ZhaoXiLocale[] = ["vi-VN", "en-US", "zh-CN", "zh-TW"];
const languageLabel = { "vi-VN": "Ngôn ngữ", "en-US": "Language", "zh-CN": "语言", "zh-TW": "語言" } as const;

export default function OnboardingPage() {
  const { locale, setLocale } = useZhaoXiLocale();
  const session = useZhaoXiSession();
  const t = onboardingCopy[locale];

  return <main className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.heroBar}>
        <div className={styles.brand}>
          <img src="/brand-logo.png" alt="" width={40} height={40} />
          <span><b>ZhaoXi</b><small>Partner</small></span>
        </div>
        <div className={styles.heroTools}>
          <div className={styles.lang} role="group" aria-label={languageLabel[locale]}>
            {LANGUAGES.map((code) => <button key={code} type="button" aria-pressed={code === locale} onClick={() => setLocale(code)}>{LOCALE_SHORT[code]}</button>)}
          </div>
          {session?.role === "partner" && <Link className={styles.heroLink} href="/">{workspaceLabel[locale]} →</Link>}
        </div>
      </div>
      <div className={styles.heroCopy}>
        <small className="zx-eyebrow">{t.eyebrow}</small>
        <h1>{t.title}</h1>
        <p>{t.lede}</p>
        <ul className={styles.perks}>{t.perks.map((perk) => <li key={perk}>✓ {perk}</li>)}</ul>
      </div>
    </header>
    <div className={styles.body}><PartnerOnboarding /></div>
  </main>;
}
