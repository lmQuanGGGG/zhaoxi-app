import { normalizeLocale } from "@/lib/locale";

function env(name: string) { return process.env[name]?.trim() || ""; }

export function normalizeAuthLocale(value?: string | null) {
  return normalizeLocale(value || undefined);
}

export function safeAuthReturnUrl(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://zhaoxi.local");
    if (url.origin !== "https://zhaoxi.local") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function configuredWeChatCallbackOrigin() {
  const value = env("WECHAT_AUTH_CALLBACK_ORIGIN") || env("ZHAOXI_BACKEND_PUBLIC_URL");
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const allowed = url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:");
    if (!allowed || url.username || url.password) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function resolveWeChatCallbackOrigin(requestUrl?: string) {
  const configured = configuredWeChatCallbackOrigin();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return undefined;
  if (!requestUrl) return undefined;
  try {
    const url = new URL(requestUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

export function weChatConfiguration() {
  const credentials = Boolean(env("WECHAT_OPEN_APP_ID") && env("WECHAT_OPEN_APP_SECRET"));
  const callbackOrigin = configuredWeChatCallbackOrigin();
  return {
    configured: credentials && Boolean(callbackOrigin),
    credentials,
    callbackConfigured: Boolean(callbackOrigin),
    callbackOrigin,
    missing: [
      ...(!env("WECHAT_OPEN_APP_ID") ? ["WECHAT_OPEN_APP_ID"] : []),
      ...(!env("WECHAT_OPEN_APP_SECRET") ? ["WECHAT_OPEN_APP_SECRET"] : []),
      ...(!callbackOrigin ? ["WECHAT_AUTH_CALLBACK_ORIGIN|ZHAOXI_BACKEND_PUBLIC_URL"] : []),
    ],
  };
}
