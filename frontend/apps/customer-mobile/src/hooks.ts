import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { isGuest, useAuth } from "./api/client";
import { getFavoriteState, getService, getUnreadSummary, setFavorite } from "./api/endpoints";
import type { RestaurantStatus, Service, ServiceDetail } from "./api/types";
import { useI18n } from "./i18n";
import { keys } from "./query";
import { haptic } from "./ui";
import { toast } from "./ui/toast";

export function useSession() {
  const auth = useAuth();
  return { auth, session: auth?.session ?? null, userId: auth?.session.userId, guest: isGuest(auth) };
}

export function useUnread() {
  const { locale } = useI18n();
  const { userId } = useSession();
  return useQuery({ queryKey: keys.unread(locale, userId), queryFn: () => getUnreadSummary(locale), enabled: Boolean(userId), refetchInterval: 30_000, staleTime: 10_000 });
}

/** Favorite heart with optimistic update + rollback. */
export function useFavorite(serviceId: string, initial?: boolean) {
  const { userId } = useSession();
  const { t } = useI18n();
  const client = useQueryClient();
  const key = keys.favorite(serviceId, userId);
  const query = useQuery({ queryKey: key, queryFn: () => getFavoriteState(serviceId), enabled: Boolean(serviceId && userId) && initial === undefined, initialData: initial === undefined ? undefined : { favorite: initial }, staleTime: 60_000 });
  const mutation = useMutation({
    mutationFn: (next: boolean) => setFavorite(serviceId, next),
    onMutate: async (next) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<{ favorite: boolean }>(key);
      client.setQueryData(key, { favorite: next });
      haptic.success();
      return { previous };
    },
    onError: (_error, _next, context) => {
      client.setQueryData(key, context?.previous);
      toast(t.common.error, "error");
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ["favorites"] });
      void client.invalidateQueries({ queryKey: ["home-feed"] });
    },
  });
  const favorite = Boolean(query.data?.favorite);
  return { favorite, toggle: () => mutation.mutate(!favorite) };
}

export function restaurantStatusLabel(status: RestaurantStatus | undefined, t: ReturnType<typeof useI18n>["t"]) {
  if (!status || status.code === "open") return t.browse.open;
  if (status.code === "platform_paused") return t.browse.platformPaused;
  if (status.code === "manual_paused") return status.pauseReason || t.browse.paused;
  if (status.code === "closed_hours") return status.businessHoursToday?.enabled ? `${t.browse.closed} · ${status.businessHoursToday.open}–${status.businessHoursToday.close}` : t.browse.closed;
  return t.browse.busy;
}

export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Service detail with an instant placeholder built from any cached list containing it. */
export function useServiceDetail(id: string) {
  const { locale } = useI18n();
  const client = useQueryClient();
  return useQuery({
    queryKey: keys.service(id, locale),
    queryFn: () => getService(id, locale),
    placeholderData: (): ServiceDetail | undefined => {
      for (const [, list] of client.getQueriesData<Service[]>({ predicate: (q) => q.queryKey[0] === "nearby" || q.queryKey[0] === "org-services" })) {
        const item = Array.isArray(list) ? list.find((x) => x.id === id) : undefined;
        if (item) {
          return {
            id: item.id, code: item.code, moduleCode: item.moduleCode, name: item.name, summary: item.summary, priceFrom: item.priceFrom, currency: item.currency, metadata: item.metadata,
            organization: item.organizationId ? { id: item.organizationId, code: item.organizationCode || undefined, name: item.organizationName || undefined, address: item.organizationAddress, metadata: item.organizationMetadata } : null,
          };
        }
      }
      return undefined;
    },
  });
}
