"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ZhaoXiTheme = "light" | "dark";
export const THEME_STORAGE_KEY = "zhaoxi-theme";

type ThemeContextValue = { theme: ZhaoXiTheme; setTheme: (theme: ZhaoXiTheme) => void; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextValue>({ theme: "light", setTheme: () => undefined, toggleTheme: () => undefined });

export function applyTheme(theme: ZhaoXiTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ZhaoXiThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ZhaoXiTheme>("light");
  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
    setThemeState(stored); applyTheme(stored);
    const sync = () => { const next = window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light"; setThemeState(next); applyTheme(next); };
    window.addEventListener("storage", sync); window.addEventListener("zhaoxi:theme", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("zhaoxi:theme", sync); };
  }, []);
  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: (next) => { window.localStorage.setItem(THEME_STORAGE_KEY, next); applyTheme(next); setThemeState(next); window.dispatchEvent(new CustomEvent("zhaoxi:theme", { detail: next })); },
    toggleTheme: () => { const next = theme === "light" ? "dark" : "light"; window.localStorage.setItem(THEME_STORAGE_KEY, next); applyTheme(next); setThemeState(next); window.dispatchEvent(new CustomEvent("zhaoxi:theme", { detail: next })); },
  }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useZhaoXiTheme() { return useContext(ThemeContext); }

export const foundationThemeTokens = {
  mobileMaxWidth: 520,
  colors: { primary: "#07C160", brand: "#C96F3A", danger: "#E53935", warning: "#F59E0B" },
  radius: { control: 12, card: 18, sheet: 24 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
} as const;
