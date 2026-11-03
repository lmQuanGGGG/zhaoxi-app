import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMemo, useSyncExternalStore } from "react";

// Same model as @zhaoxi/cart in the PWA: one cart per restaurant, each checked
// out separately. Updates are synchronous in memory (instant, optimistic UI)
// and persisted to AsyncStorage in the background.
export type CartItem = { serviceId: string; organizationId?: string | null; organizationName?: string; name: string; imageUrl?: string; unitPrice: number; currency: string; quantity: number };
export type CartGroup = { organizationId: string; organizationName: string; items: CartItem[]; count: number; total: number };

const KEY = "zhaoxi.cart.v2";
let items: CartItem[] = [];
const listeners = new Set<() => void>();

const sameLine = (a: CartItem, serviceId: string, organizationId?: string | null) =>
  a.serviceId === serviceId && (organizationId === undefined || String(a.organizationId || "") === String(organizationId || ""));

function commit(next: CartItem[]) {
  items = next.filter((item) => item.quantity > 0);
  for (const listener of listeners) listener();
  void AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => undefined);
}

export async function hydrateCart() {
  try {
    const value = JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
    items = Array.isArray(value) ? value.filter((item: CartItem) => Number(item?.quantity) > 0) : [];
  } catch {
    items = [];
  }
  for (const listener of listeners) listener();
}

export const cart = {
  add(item: CartItem) {
    if (item.quantity <= 0) return;
    const index = items.findIndex((x) => sameLine(x, item.serviceId, item.organizationId));
    if (index >= 0) {
      const current = items[index]!;
      commit(items.map((x, i) => (i === index ? { ...current, ...item, quantity: Math.min(99, current.quantity + item.quantity) } : x)));
    } else commit([...items, { ...item, quantity: Math.min(99, item.quantity) }]);
  },
  setQuantity(serviceId: string, quantity: number, organizationId?: string | null) {
    if (quantity <= 0) return cart.remove(serviceId, organizationId);
    commit(items.map((x) => (sameLine(x, serviceId, organizationId) ? { ...x, quantity: Math.min(99, quantity) } : x)));
  },
  remove(serviceId: string, organizationId?: string | null) {
    commit(items.filter((x) => !sameLine(x, serviceId, organizationId)));
  },
  clearOrganization(organizationId: string) {
    commit(items.filter((x) => String(x.organizationId || "unknown") !== organizationId));
  },
  itemsFor(organizationId: string) {
    return items.filter((x) => String(x.organizationId || "unknown") === organizationId);
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCart() {
  const snapshot = useSyncExternalStore(subscribe, () => items);
  return useMemo(() => {
    const map = new Map<string, CartItem[]>();
    for (const item of snapshot) {
      const key = String(item.organizationId || "unknown");
      map.set(key, [...(map.get(key) || []), item]);
    }
    const groups: CartGroup[] = [...map.entries()].map(([organizationId, groupItems]) => ({
      organizationId,
      organizationName: groupItems[0]?.organizationName || "",
      items: groupItems,
      count: groupItems.reduce((sum, x) => sum + x.quantity, 0),
      total: groupItems.reduce((sum, x) => sum + x.unitPrice * x.quantity, 0),
    }));
    return {
      items: snapshot,
      groups,
      count: snapshot.reduce((sum, x) => sum + x.quantity, 0),
      total: snapshot.reduce((sum, x) => sum + x.unitPrice * x.quantity, 0),
      quantityOf: (serviceId: string) => snapshot.find((x) => x.serviceId === serviceId)?.quantity || 0,
    };
  }, [snapshot]);
}
