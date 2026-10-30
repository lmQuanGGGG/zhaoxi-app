import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";
import { ApiError } from "./api/client";

// Stale-while-revalidate everywhere: cached data renders instantly (also on a
// cold start thanks to the AsyncStorage persister) while a refetch runs.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24,
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      refetchOnReconnect: true,
    },
  },
});

export const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: "zhaoxi.query-cache.v1", throttleTime: 1500 });

/** Bump when cached response shapes change so stale caches are discarded. */
export const CACHE_BUSTER = "customer-mobile-1";

// Refetch stale queries when the app returns to the foreground.
AppState.addEventListener("change", (status) => {
  if (Platform.OS !== "web") focusManager.setFocused(status === "active");
});

export const keys = {
  modules: (locale: string) => ["modules", locale] as const,
  uiConfig: ["ui-config"] as const,
  recommendations: (locale: string) => ["recommendations", locale] as const,
  homeFeed: (locale: string, userId?: string) => ["home-feed", locale, userId] as const,
  nearby: (module: string, locale: string, pointKey: string) => ["nearby", module, locale, pointKey] as const,
  restaurantStatuses: (ids: string) => ["restaurant-statuses", ids] as const,
  restaurantStatus: (id: string) => ["restaurant-status", id] as const,
  orgServices: (id: string, locale: string) => ["org-services", id, locale] as const,
  service: (id: string, locale: string) => ["service", id, locale] as const,
  foodPricing: (signature: string) => ["food-pricing", signature] as const,
  favorite: (id: string, userId?: string) => ["favorite", id, userId] as const,
  favorites: (locale: string, userId?: string) => ["favorites", locale, userId] as const,
  history: (locale: string, userId?: string) => ["history", locale, userId] as const,
  profile: (userId?: string) => ["profile", userId] as const,
  orders: (locale: string, userId?: string) => ["orders", locale, userId] as const,
  order: (id: string, locale: string) => ["order", id, locale] as const,
  tracking: (id: string) => ["tracking", id] as const,
  notifications: (locale: string, filter: string, userId?: string) => ["notifications", locale, filter, userId] as const,
  unread: (locale: string, userId?: string) => ["unread", locale, userId] as const,
  threads: (locale: string, userId?: string) => ["threads", locale, userId] as const,
  thread: (id: string) => ["thread", id] as const,
  search: (query: string, locale: string, module?: string) => ["search", query, locale, module] as const,
  help: (locale: string, query: string) => ["help", locale, query] as const,
  payments: (userId?: string) => ["payments", userId] as const,
  coupons: (orgId: string, subtotal: number) => ["coupons", orgId, subtotal] as const,
};
