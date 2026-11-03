import { createContext, createElement, useContext, type ReactNode } from "react";
import type { MiniAppBridge, MiniAppContext, MiniAppProps } from "./types";

/**
 * `@zhaoxi/miniapp-sdk` là shared module: trong mini app, import này trỏ về
 * đúng instance của host, nên context dưới đây là một object duy nhất.
 */
const MiniAppReactContext = createContext<MiniAppProps | null>(null);

export function MiniAppProvider({ value, children }: { value: MiniAppProps; children?: ReactNode }) {
  return createElement(MiniAppReactContext.Provider, { value }, children);
}

export function useMiniApp(): MiniAppProps {
  const value = useContext(MiniAppReactContext);
  if (!value) throw new Error("useMiniApp() phải nằm trong mini app do host ZhaoXi mở");
  return value;
}

export function useMiniAppContext(): MiniAppContext {
  return useMiniApp().context;
}

export function useMiniAppBridge(): MiniAppBridge {
  return useMiniApp().bridge;
}
