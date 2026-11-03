import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFavorites, setFavorite } from "../src/api/endpoints";
import type { FavoriteItem } from "../src/api/types";
import { ServiceList } from "../src/components/ServiceList";
import { usePullRefresh, useSession } from "../src/hooks";
import { useI18n } from "../src/i18n";
import { keys } from "../src/query";
import { colors } from "../src/theme";
import { Header, IconButton, Screen, haptic } from "../src/ui";

export default function FavoritesScreen() {
  const { t, locale } = useI18n();
  const { userId } = useSession();
  const client = useQueryClient();
  const key = keys.favorites(locale, userId);
  const favorites = useQuery({ queryKey: key, queryFn: () => getFavorites(locale), enabled: Boolean(userId) });
  const pull = usePullRefresh(favorites.refetch);
  // Optimistic removal with rollback.
  const remove = useMutation({
    mutationFn: (item: FavoriteItem) => setFavorite(item.id, false),
    onMutate: async (item) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<FavoriteItem[]>(key);
      client.setQueryData<FavoriteItem[]>(key, (current) => (current || []).filter((x) => x.id !== item.id));
      client.setQueryData(keys.favorite(item.id, userId), { favorite: false });
      haptic.success();
      return { previous };
    },
    onError: (_e, _item, context) => client.setQueryData(key, context?.previous),
    onSettled: () => void client.invalidateQueries({ queryKey: ["home-feed"] }),
  });
  return (
    <Screen>
      <Header title={t.profile.favorites} subtitle={favorites.data?.length ? `${favorites.data.length}` : undefined} />
      <ServiceList
        items={favorites.data || []}
        loading={favorites.isPending}
        refreshing={pull.refreshing}
        onRefresh={pull.onRefresh}
        emptyIcon="heart"
        emptyTitle={t.personal.favoritesEmpty}
        renderAction={(item) => <IconButton icon="heart" color={colors.danger} label={t.detail.unfavorite} onPress={() => remove.mutate(item)} />}
      />
    </Screen>
  );
}
