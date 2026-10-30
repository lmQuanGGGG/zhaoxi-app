import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { API_URL } from "../config";

export type Session = {
  sessionId: string;
  role: "customer" | "partner" | "admin" | "driver";
  userId: string;
  displayName: string;
  phone?: string;
  avatarUrl?: string;
  authMethod?: "guest" | "otp" | "wechat" | "qr" | "internal" | "password" | string;
  accessExpiresAt?: string;
  refreshExpiresAt?: string;
};
export type AuthState = { accessToken: string; refreshToken: string; session: Session };

const AUTH_KEY = "zhaoxi.customer.auth.v1";
const TRUSTED_KEY = "zhaoxi.customer.trusted-device.v1";
const DEVICE_KEY = "zhaoxi.customer.device-id.v1";
const secureOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Auth store (SecureStore-backed, observable for React)
// ---------------------------------------------------------------------------
let auth: AuthState | null = null;
let deviceId = "";
let refreshPromise: Promise<AuthState | null> | null = null;
let guestPromise: Promise<AuthState | null> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function getAuth() {
  return auth;
}

export function useAuth() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, getAuth);
}

export function isGuest(state: AuthState | null = auth) {
  return !state || state.session.authMethod === "guest";
}

async function saveAuth(value: AuthState | null) {
  auth = value;
  emit();
  if (value) await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(value), secureOptions);
  else await SecureStore.deleteItemAsync(AUTH_KEY);
}

export async function loadAuth() {
  const [raw, storedDevice] = await Promise.all([SecureStore.getItemAsync(AUTH_KEY), SecureStore.getItemAsync(DEVICE_KEY)]);
  deviceId = storedDevice || "";
  if (!deviceId) {
    deviceId = `ios-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await SecureStore.setItemAsync(DEVICE_KEY, deviceId, secureOptions);
  }
  try {
    auth = raw ? (JSON.parse(raw) as AuthState) : null;
  } catch {
    auth = null;
  }
  emit();
  return auth;
}

export function getDeviceId() {
  return deviceId;
}

function deviceName() {
  return `ZhaoXi App · ${Device.modelName || Device.osName || "Mobile"}`;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
async function raw(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = { accept: "application/json" };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (auth?.accessToken) headers.authorization = `Bearer ${auth.accessToken}`;
  return fetch(`${API_URL}${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } });
}

async function parse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function refreshAuth(): Promise<AuthState | null> {
  if (!auth?.refreshToken) return null;
  if (!refreshPromise) {
    const wasGuest = isGuest();
    refreshPromise = fetch(`${API_URL}/api/auth/session/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    })
      .then(async (response) => {
        const body = await parse(response);
        if (!response.ok || !body?.ok) {
          await saveAuth(null);
          // Guests silently get a fresh identity (the trusted device token keeps it stable).
          return wasGuest ? bootstrapGuest() : null;
        }
        await saveAuth(body.data as AuthState);
        return auth;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/** Calls the backend envelope API (`{ ok, data, error }`) and returns `data`. */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  // First launch: every customer endpoint expects at least a guest identity.
  if (!auth) await bootstrapGuest();
  try {
    response = await raw(path, init);
    if (response.status === 401 && auth) {
      if (await refreshAuth()) response = await raw(path, init);
    }
  } catch {
    throw new ApiError("Network request failed", 0, "NETWORK");
  }
  const body = await parse(response);
  if (!response.ok || (body && body.ok === false)) {
    const code = String(body?.error?.code || `HTTP_${response.status}`);
    throw new ApiError(String(body?.error?.message || code), response.status, code);
  }
  return (body && "data" in body ? body.data : body) as T;
}

/** Same as `request` but returns the whole JSON payload (for endpoints with extra top-level fields). */
export async function requestRaw<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!auth) await bootstrapGuest();
  let response = await raw(path, init);
  if (response.status === 401 && auth && (await refreshAuth())) response = await raw(path, init);
  const body = await parse(response);
  if (!response.ok) throw new ApiError(String(body?.error?.message || response.status), response.status, String(body?.error?.code || `HTTP_${response.status}`));
  return body as T;
}

export const json = (value: unknown) => JSON.stringify(value);

// ---------------------------------------------------------------------------
// Identity flows (mirror @zhaoxi/auth in the PWA)
// ---------------------------------------------------------------------------
export async function bootstrapGuest(locale = "vi-VN"): Promise<AuthState | null> {
  if (!guestPromise) {
    guestPromise = (async () => {
      const trustedDeviceToken = (await SecureStore.getItemAsync(TRUSTED_KEY)) || undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt) await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
          const response = await fetch(`${API_URL}/api/auth/guest/bootstrap`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: json({ role: "customer", locale, deviceId, deviceName: deviceName(), trustedDeviceToken }),
          });
          const body = await parse(response);
          if (!response.ok || !body?.ok) continue;
          if (body.data.trustedDeviceToken) await SecureStore.setItemAsync(TRUSTED_KEY, String(body.data.trustedDeviceToken), secureOptions);
          await saveAuth({ accessToken: body.data.accessToken, refreshToken: body.data.refreshToken, session: body.data.session });
          return auth;
        } catch {
          // retry
        }
      }
      return null;
    })().finally(() => {
      guestPromise = null;
    });
  }
  return guestPromise;
}

/** Ensures there is a usable (guest or signed-in) session. */
export async function ensureSession(locale: string) {
  if (auth) return auth;
  return bootstrapGuest(locale);
}

async function finishLogin(data: unknown) {
  const value = data as AuthState | undefined;
  if (!value?.accessToken || value.session?.role !== "customer") throw new ApiError("Invalid session", 422, "INVALID_SESSION");
  await saveAuth(value);
  return value;
}

export type OtpChallenge = { challengeId: string; resendAfterSeconds?: number; expiresAt?: string };

export async function startOtp(phone: string, locale: string) {
  if (!auth) await bootstrapGuest(locale);
  return request<OtpChallenge>("/api/auth/identity/otp/start", { method: "POST", body: json({ channel: "sms", phone, locale }) });
}

export async function verifyOtp(phone: string, challengeId: string, code: string) {
  const data = await request<AuthState>("/api/auth/identity/otp/verify", { method: "POST", body: json({ channel: "sms", phone, challengeId, code }) });
  return finishLogin(data);
}

export async function loginWithPin(input: { phone?: string; username?: string; pin: string }) {
  const data = await request<AuthState>("/api/auth/identity/pin/login", { method: "POST", body: json({ role: "customer", ...input, deviceId, deviceName: deviceName() }) });
  return finishLogin(data);
}

export async function loginWithPassword(input: { username: string; password: string; mode: "login" | "register"; locale: string }) {
  const data = await request<AuthState & { isNewUser?: boolean }>("/api/auth/identity/account/login", {
    method: "POST",
    body: json({ role: "customer", ...input, username: input.username.trim().toLowerCase(), deviceId, deviceName: deviceName() }),
  });
  await finishLogin(data);
  return data;
}

export const setPin = (pin: string) => request("/api/auth/identity/pin/set", { method: "POST", body: json({ pin }) });

export function updateSessionProfile(patch: Partial<Session>) {
  if (!auth) return;
  void saveAuth({ ...auth, session: { ...auth.session, ...patch } });
}

export async function logout(locale: string, beforeLogout?: () => Promise<unknown>) {
  await beforeLogout?.().catch(() => undefined);
  if (auth?.refreshToken) await raw("/api/auth/session/logout", { method: "POST", body: json({ refreshToken: auth.refreshToken }) }).catch(() => undefined);
  await saveAuth(null);
  // The trusted-device token resolves to the signed-in user too; drop it so
  // the next guest identity is genuinely anonymous.
  await SecureStore.deleteItemAsync(TRUSTED_KEY);
  return bootstrapGuest(locale);
}
