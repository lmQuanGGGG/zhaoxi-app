import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { RefreshControl, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { cancelTravelBooking, getHousingInquiries, getTravelBookings } from "../../src/api/endpoints";
import type { FollowupEntry, HousingAppointment, HousingInquiry, InquiryMessage, PaymentSupportTicket, TravelBooking, TravelStage } from "../../src/api/types";
import { AppointmentSection, HistoryList, InquiryThread, PartnerPayment, PaymentSupport, trackerStyles as s, useTrackerCopy } from "../../src/components/trackers";
import { TAB_BAR_SPACE } from "../../src/constants";
import { imageUri, money, num, str } from "../../src/format";
import { usePullRefresh, useSession } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { colors, shadow } from "../../src/theme";
import { AppImage, Button, EmptyState, ErrorState, Header, Screen, SkeletonList, StatusPill } from "../../src/ui";
import { toast } from "../../src/ui/toast";

const objects = <T,>(value: unknown) => (Array.isArray(value) ? value.filter((x) => x && typeof x === "object") as T[] : []);

/** PWA /housing/requests and /travel/requests in one native screen. */
export default function InquiriesScreen() {
  const { kind: rawKind } = useLocalSearchParams<{ kind: string }>();
  const kind = rawKind === "travel" ? "travel" : "housing";
  const t = useTrackerCopy();
  const { t: common } = useI18n();
  const { userId, guest } = useSession();
  const housing = useQuery({ queryKey: keys.housingInquiries(userId), queryFn: getHousingInquiries, enabled: kind === "housing" && Boolean(userId), refetchInterval: 30_000 });
  const travel = useQuery({ queryKey: keys.travelBookings(userId), queryFn: getTravelBookings, enabled: kind === "travel" && Boolean(userId), refetchInterval: 30_000 });
  const query = kind === "housing" ? housing : travel;
  const pull = usePullRefresh(query.refetch);
  const rows = (query.data || []) as Array<HousingInquiry | TravelBooking>;
  return (
    <Screen soft>
      <FlashList
        data={rows}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Header title={kind === "housing" ? t.housingTitle : t.travelTitle} />}
        refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={colors.brand} />}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 14 }}>
            {query.isPending && !guest ? <SkeletonList count={2} /> : query.isError && !guest ? <ErrorState message={common.common.error} retryLabel={common.common.retry} onRetry={() => void query.refetch()} /> : (
              <EmptyState zx={kind} title={kind === "housing" ? t.housingEmpty : t.travelEmpty} action={kind === "housing" ? t.browse : t.browseTravel} onAction={() => router.push(`/services/${kind}`)} />
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 40).duration(260)} style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
            {kind === "housing" ? <HousingCard row={item as HousingInquiry} /> : <TravelCard row={item as TravelBooking} />}
          </Animated.View>
        )}
      />
    </Screen>
  );
}

function HousingCard({ row }: { row: HousingInquiry }) {
  const t = useTrackerCopy();
  const d = row.details || {};
  const stage = row.housingLeadStage || "new";
  const label = (t as Record<string, string>)[stage] || stage;
  const appointment = d.housingAppointment && typeof d.housingAppointment === "object" ? d.housingAppointment as HousingAppointment : null;
  const image = imageUri(row.listing?.imageUrl);
  return (
    <View style={[s.card, shadow("card")]}>
      <View style={s.top}>
        <AppImage uri={image} fallbackCode="housing" style={s.thumb} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={s.code} numberOfLines={1}>{t.code}: {row.requestCode}</Text>
            <StatusPill label={label} tone={stage === "won" ? "brand" : stage === "lost" ? "muted" : "warning"} />
          </View>
          <Text style={s.meta}>{t.moveIn}: {str(d.requestedMoveInDate || d.moveInDate) || "—"}</Text>
          <Text style={s.meta}>{t.budget}: {num(d.budget) > 0 ? money(num(d.budget)) : "—"}</Text>
          {row.listing?.id ? <Text style={s.link} onPress={() => router.push(`/service/${row.listing?.id}`)}>{t.open} ›</Text> : null}
        </View>
      </View>
      <AppointmentSection requestId={row.id} appointment={appointment} />
      <InquiryThread kind="housing" requestId={row.id} messages={objects<InquiryMessage>(d.housingMessages)} />
      <HistoryList title={t.history} entries={objects<FollowupEntry>(d.housingFollowupHistory)} />
    </View>
  );
}

function TravelCard({ row }: { row: TravelBooking }) {
  const t = useTrackerCopy();
  const client = useQueryClient();
  const d = row.details || {};
  const stage = String(d.travelBookingStage || "requested") as TravelStage;
  const cancel = useMutation({
    mutationFn: () => cancelTravelBooking(row.id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["travel-bookings"] }),
    onError: () => toast(t.failed, "error"),
  });
  return (
    <View style={[s.card, shadow("card")]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Text style={s.code}>{row.requestCode}</Text>
        <StatusPill label={t[stage] || stage} tone={stage === "confirmed" || stage === "completed" ? "brand" : stage === "rejected" || stage === "cancelled" ? "danger" : "warning"} />
      </View>
      <View style={s.grid}>
        <Text style={s.gridItem}>{t.date}: <Text style={{ fontWeight: "800", color: colors.ink }}>{str(d.requestedDate) || "—"}</Text></Text>
        <Text style={s.gridItem}>{t.time}: <Text style={{ fontWeight: "800", color: colors.ink }}>{str(d.requestedTime) || "—"}</Text></Text>
        <Text style={s.gridItem}>{t.guests}: <Text style={{ fontWeight: "800", color: colors.ink }}>{str(d.guests) || "1"}</Text></Text>
        <Text style={s.gridItem}>{t.contact}: <Text style={{ fontWeight: "800", color: colors.ink }}>{str(d.preferredContact) || "phone"}</Text></Text>
      </View>
      <PartnerPayment requestId={row.id} stage={stage} details={d} />
      <PaymentSupport requestId={row.id} ticket={(d.paymentSupportTicket as PaymentSupportTicket) || null} />
      <InquiryThread kind="travel" requestId={row.id} messages={objects<InquiryMessage>(d.travelMessages)} />
      <HistoryList title={t.timeline} entries={objects<FollowupEntry>(d.travelTimeline)} />
      {!["completed", "cancelled", "rejected"].includes(stage) ? <Button small variant="danger" title={t.cancelBooking} loading={cancel.isPending} onPress={() => cancel.mutate()} style={{ alignSelf: "flex-start" }} /> : null}
    </View>
  );
}
