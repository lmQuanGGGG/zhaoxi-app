import { useQuery } from "@tanstack/react-query";
import { getHistory } from "../src/api/endpoints";
import { ServiceList } from "../src/components/ServiceList";
import { useSession } from "../src/hooks";
import { useI18n } from "../src/i18n";
import { keys } from "../src/query";
import { Header, Screen } from "../src/ui";

export default function HistoryScreen() {
  const { t, locale } = useI18n();
  const { userId } = useSession();
  const history = useQuery({ queryKey: keys.history(locale, userId), queryFn: () => getHistory(locale), enabled: Boolean(userId) });
  return (
    <Screen>
      <Header title={t.profile.history} />
      <ServiceList items={history.data || []} loading={history.isPending} refreshing={history.isRefetching} onRefresh={() => void history.refetch()} emptyIcon="clock" emptyTitle={t.personal.historyEmpty} />
    </Screen>
  );
}
