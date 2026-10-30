import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { normalizeLocale, supportedLocales, type ZhaoXiLocale } from "@zhaoxi/i18n";
import { strings, type Strings } from "./strings";

export type { ZhaoXiLocale };
export { supportedLocales };

const LOCALE_KEY = "zhaoxi.locale.v1";

export const localeLabels: Record<ZhaoXiLocale, { native: string; flag: string }> = {
  "vi-VN": { native: "Tiếng Việt", flag: "🇻🇳" },
  "zh-CN": { native: "简体中文", flag: "🇨🇳" },
  "zh-TW": { native: "繁體中文", flag: "🇹🇼" },
  "en-US": { native: "English", flag: "🇬🇧" },
};

/** Device language → closest supported ZhaoXi locale (PWA default is zh-CN). */
export function deviceLocale(): ZhaoXiLocale {
  const first = getLocales()[0];
  const code = first?.languageCode || "";
  if (code === "vi") return "vi-VN";
  if (code === "en") return "en-US";
  if (code === "zh") return first?.languageScriptCode === "Hant" || ["TW", "HK", "MO"].includes(first?.regionCode || "") ? "zh-TW" : "zh-CN";
  return "zh-CN";
}

export async function loadStoredLocale(): Promise<ZhaoXiLocale | null> {
  const value = await AsyncStorage.getItem(LOCALE_KEY).catch(() => null);
  return value ? normalizeLocale(value) : null;
}

type I18nValue = { locale: ZhaoXiLocale; t: Strings; setLocale: (locale: ZhaoXiLocale) => void };
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: ZhaoXiLocale; children: ReactNode }) {
  const [locale, setLocaleState] = useState(initialLocale);
  const setLocale = useCallback((next: ZhaoXiLocale) => {
    setLocaleState(next);
    void AsyncStorage.setItem(LOCALE_KEY, next).catch(() => undefined);
  }, []);
  const value = useMemo(() => ({ locale, t: strings[locale], setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}

/** Picks a locale-specific value from a `{ "vi-VN": ..., ... }` record. */
export function pick<T>(locale: ZhaoXiLocale, values: Record<ZhaoXiLocale, T>): T {
  return values[locale];
}
