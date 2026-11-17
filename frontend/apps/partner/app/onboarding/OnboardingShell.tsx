"use client";
import { useEffect, useState, type ReactNode } from "react";
import { PlatformGate, readSession, refreshServerSession } from "@zhaoxi/auth";
import { LOCALE_STORAGE_KEY, ZhaoXiI18nProvider, normalizeLocale, saveBrowserLocale, type ZhaoXiLocale } from "@zhaoxi/i18n";
import { ZhaoXiThemeProvider } from "@zhaoxi/theme";

type GateState = "checking" | "signed-in" | "guest";

/** Best match for the device language, used only when the visitor never picked one (e.g. a fresh app WebView). */
function deviceLocale(): ZhaoXiLocale {
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of tags) {
    const tag = (raw || "").toLowerCase();
    if (tag.startsWith("vi")) return "vi-VN";
    if (tag.startsWith("zh")) return /(tw|hk|mo|hant)/.test(tag) ? "zh-TW" : "zh-CN";
    if (tag.startsWith("en")) return "en-US";
  }
  return "vi-VN";
}

/**
 * Runs before the I18n provider reads storage (child effects fire first): `?lang=` wins, then the
 * saved choice, then the device language — so sign-up never stops on the language picker.
 */
function bootstrapLocale() {
  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  if (fromUrl) saveBrowserLocale(normalizeLocale(fromUrl));
  else if (!window.localStorage.getItem(LOCALE_STORAGE_KEY)) saveBrowserLocale(deviceLocale());
}

function OnboardingGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>("checking");

  useEffect(() => {
    let active = true;
    try { bootstrapLocale(); } catch { /* storage blocked: the provider falls back to its default */ }
    // react-native-webview exposes this bridge; the app already draws its own header around us.
    if ((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView) document.documentElement.dataset.zxEmbed = "app";
    void (async () => {
      let session = null;
      try {
        // Cookie-backed: also picks up a session created by /auth/handoff or another ZhaoXi tab.
        session = await refreshServerSession();
      } catch {
        session = readSession();
      }
      if (active) setState(session ? "signed-in" : "guest");
    })();
    return () => { active = false; };
  }, []);

  if (state === "checking") return <main className="zx-onb-splash" aria-busy="true"><span className="zx-onb-spinner" /></main>;
  // No ZhaoXi session at all: keep the existing partner sign-in, then show the form.
  if (state === "guest") return <PlatformGate role="partner">{children}</PlatformGate>;
  return <>{children}</>;
}

/** Store sign-up shell: language + theme, and any signed-in ZhaoXi account (customer or partner). */
export default function OnboardingShell({ children }: { children: ReactNode }) {
  return <ZhaoXiI18nProvider><ZhaoXiThemeProvider><div className="zx-onb-app"><OnboardingGate>{children}</OnboardingGate></div></ZhaoXiThemeProvider></ZhaoXiI18nProvider>;
}
