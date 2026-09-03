"use client";

import { useCallback, useEffect, useState } from "react";

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

// In-memory cache across client-side router transitions
const memoryCache = new Map<string, CacheEntry<unknown>>();

// Deduplicate in-flight fetch requests
const inFlightRequests = new Map<string, Promise<unknown>>();

// Subscriptions for real-time sync across components
type Subscriber<T> = (data: T) => void;
const subscribers = new Map<string, Set<Subscriber<unknown>>>();

export interface CacheOptions {
  ttlMs?: number; // Time in ms to consider data fresh (default: 45s)
  persist?: boolean; // Save in sessionStorage (default: true)
  revalidateOnFocus?: boolean;
}

/**
 * Retrieve data synchronously from memory cache or sessionStorage
 */
export function getCached<T>(key: string): T | null {
  // 1. Memory cache check
  const mem = memoryCache.get(key);
  if (mem) return mem.data as T;

  // 2. Session storage fallback
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(`zx_c_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw) as CacheEntry<T>;
        memoryCache.set(key, parsed);
        return parsed.data;
      }
    } catch {
      // Storage quota or parse error ignored
    }
  }

  return null;
}

/**
 * Store data in cache and notify subscribers
 */
export function setCached<T>(key: string, data: T, persist = true): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };
  memoryCache.set(key, entry);

  if (persist && typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(`zx_c_${key}`, JSON.stringify(entry));
    } catch {
      // Ignore sessionStorage full
    }
  }

  const subs = subscribers.get(key);
  if (subs) {
    for (const sub of subs) {
      try {
        sub(data);
      } catch {
        // Ignore subscriber failure
      }
    }
  }
}

/**
 * Invalidate cache by key substring or predicate
 */
export function invalidateCache(pattern?: string | RegExp | ((key: string) => boolean)): void {
  if (!pattern) {
    memoryCache.clear();
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k?.startsWith("zx_c_")) keysToRemove.push(k);
        }
        for (const k of keysToRemove) window.sessionStorage.removeItem(k);
      } catch {}
    }
    return;
  }

  const matches = (k: string) => {
    if (typeof pattern === "string") return k.includes(pattern);
    if (pattern instanceof RegExp) return pattern.test(k);
    if (typeof pattern === "function") return pattern(k);
    return false;
  };

  for (const k of Array.from(memoryCache.keys())) {
    if (matches(k)) memoryCache.delete(k);
  }

  if (typeof window !== "undefined") {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k?.startsWith("zx_c_") && matches(k.replace("zx_c_", ""))) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) window.sessionStorage.removeItem(k);
    } catch {}
  }
}

/**
 * Standalone SWR fetcher utility
 */
export async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<{ data: T; fromCache: boolean }> {
  const ttl = options?.ttlMs ?? 45000;
  const cached = getCached<T>(key);
  const mem = memoryCache.get(key);
  const isFresh = mem ? Date.now() - mem.timestamp < ttl : false;

  if (cached !== null && isFresh) {
    return { data: cached, fromCache: true };
  }

  // Deduplicate in-flight
  if (inFlightRequests.has(key)) {
    const data = (await inFlightRequests.get(key)) as T;
    return { data, fromCache: false };
  }

  const promise = (async () => {
    try {
      const freshData = await fetcher();
      setCached(key, freshData, options?.persist !== false);
      return freshData;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);

  if (cached !== null) {
    // Fire and forget background revalidation
    void promise.catch(() => {});
    return { data: cached, fromCache: true };
  }

  const result = await promise;
  return { data: result, fromCache: false };
}

/**
 * React hook for Stale-While-Revalidate data fetching
 */
export function useClientSWR<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: CacheOptions & { initialData?: T } = {}
) {
  const ttl = options.ttlMs ?? 45000;

  // Initialize synchronously with cached data if available -> INSTANT RENDER (0ms latency)!
  const [data, setData] = useState<T | null>(() => {
    if (options.initialData !== undefined) return options.initialData;
    if (!key) return null;
    return getCached<T>(key);
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (!key) return false;
    const hasCache = getCached<T>(key) !== null;
    return !hasCache;
  });

  const [error, setError] = useState<Error | null>(null);

  // Cross-component subscriber sync
  useEffect(() => {
    if (!key) return;
    let subs = subscribers.get(key);
    if (!subs) {
      subs = new Set();
      subscribers.set(key, subs);
    }
    const updateHandler: Subscriber<unknown> = (nextData) => {
      setData(nextData as T);
      setLoading(false);
    };
    subs.add(updateHandler);
    return () => {
      subs?.delete(updateHandler);
    };
  }, [key]);

  const revalidate = useCallback(
    async (force = false) => {
      if (!key) return;
      const mem = memoryCache.get(key);
      const isFresh = !force && mem && Date.now() - mem.timestamp < ttl;

      // If data is already fresh, do not hammer backend
      if (isFresh) return;

      if (getCached(key) === null) {
        setLoading(true);
      }

      try {
        let req = inFlightRequests.get(key) as Promise<T> | undefined;
        if (!req) {
          req = fetcher();
          inFlightRequests.set(key, req as Promise<unknown>);
        }
        const fresh = await req;
        inFlightRequests.delete(key);
        setCached(key, fresh, options.persist !== false);
        setData(fresh);
        setError(null);
      } catch (err) {
        inFlightRequests.delete(key);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    },
    [key, ttl, fetcher, options.persist]
  );

  useEffect(() => {
    void revalidate();
  }, [key, revalidate]);

  // Revalidate on focus only if data is stale
  useEffect(() => {
    if (options.revalidateOnFocus === false) return;
    const onFocus = () => {
      void revalidate();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [revalidate, options.revalidateOnFocus]);

  const mutate = useCallback(
    (newData: T, revalidateAfter = false) => {
      if (key) setCached(key, newData);
      setData(newData);
      if (revalidateAfter) void revalidate(true);
    },
    [key, revalidate]
  );

  return {
    data,
    loading,
    error,
    mutate,
    revalidate: () => revalidate(true),
  };
}
