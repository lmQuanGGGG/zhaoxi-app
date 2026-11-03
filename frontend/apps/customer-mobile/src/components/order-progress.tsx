import { statusLabels, type ZhaoXiLocale } from "@zhaoxi/i18n";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import type { OrderDetail } from "../api/types";
import { shortDate } from "../format";
import { foodMilestones, fulfillmentCopy, milestoneLabels } from "../order-copy";
import { colors, font } from "../theme";
import { Art3D, SoftGlow, statusGlow, type StatusArtKind } from "../ui/service-icons";

/** Clay illustration for each food fulfillment stage (details.fulfillmentStage). */
const stageArt: Record<string, StatusArtKind> = {
  preparing: "cooking", ready_for_pickup: "gift", courier_booked: "delivery", handed_off: "delivery", delivered: "medal", cancelled: "cancel",
};

/** Same, keyed by the history note the backend writes for that stage. */
const noteArt: Record<string, StatusArtKind> = {
  PARTNER_ACCEPTED_FOOD_ORDER: "cooking", FOOD_PREPARING: "cooking", FOOD_READY_FOR_PICKUP: "gift", AUTO_READY_FOR_EXTERNAL_PICKUP: "gift",
  EXTERNAL_COURIER_BOOKED: "delivery", FOOD_HANDED_TO_COURIER: "delivery", EXTERNAL_DELIVERY_DELIVERED: "medal", FOOD_ORDER_CANCELLED: "cancel",
};

// Modules whose "in progress" means a courier is on the road.
const DELIVERED_MODULES = new Set(["food", "market"]);
const UNPAID = new Set(["pending", "awaiting_payment"]);

/** Picks the illustration for a service request: fulfillment stage first, then the request status. */
export function statusArt({ status, stage, note, moduleCode, paymentStatus }: { status: string; stage?: string; note?: string | null; moduleCode?: string | null; paymentStatus?: string }): StatusArtKind {
  if (status === "cancelled" || status === "rejected") return "cancel";
  if (status === "completed") return "medal";
  const fromStage = (stage && stageArt[stage]) || (note && noteArt[note]);
  if (fromStage) return fromStage;
  const food = moduleCode === "food";
  switch (status) {
    case "accepted":
      return food ? "cooking" : "gift";
    case "in_progress":
      return food ? "cooking" : moduleCode && DELIVERED_MODULES.has(moduleCode) ? "delivery" : "clipboard";
    case "waiting_customer":
      return paymentStatus && UNPAID.has(paymentStatus) ? "wallet" : "attention";
    default:
      return "hourglass";
  }
}

/** Status illustration on its soft halo; the halo breathes while the order is still moving. */
export function OrderStatusArt({ kind, active, size = 52 }: { kind: StatusArtKind; active: boolean; size?: number }) {
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(0);
  useEffect(() => {
    if (active && !reduceMotion) breath.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true);
    else breath.value = withTiming(0, { duration: 200 });
  }, [active, reduceMotion, breath]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.75 + breath.value * 0.25, transform: [{ scale: 1 + breath.value * 0.12 }] }));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }, halo]}>
        <SoftGlow color={statusGlow[kind]} size={size * 1.45} opacity={0.34} />
      </Animated.View>
      <Art3D kind={kind} size={size * 0.92} />
    </View>
  );
}

/** Food progress as soft segments (one per milestone) with the label underneath; no dots. */
export function MilestoneTrack({ reached, cancelled, locale }: { reached: number; cancelled: boolean; locale: ZhaoXiLocale }) {
  const fill = cancelled ? colors.danger : colors.brand;
  return (
    <View style={styles.track}>
      {foodMilestones.map((milestone, index) => (
        <View key={milestone} style={styles.trackStep}>
          <View style={[styles.segment, index <= reached && { backgroundColor: fill }]} />
          <Text style={[styles.trackText, index <= reached && { color: colors.text }, index === reached && { fontWeight: "800" }]} numberOfLines={1}>{milestoneLabels[locale][milestone]}</Text>
        </View>
      ))}
    </View>
  );
}

/** Newest-first history: each step is its clay illustration joined by a soft rail. */
export function OrderTimeline({ history, moduleCode, locale }: { history: OrderDetail["history"]; moduleCode?: string | null; locale: ZhaoXiLocale }) {
  const entries = history.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return (
    <View>
      {entries.map((entry, index) => {
        const latest = index === 0;
        const kind = statusArt({ status: entry.toStatus, note: entry.note, moduleCode });
        const copy = entry.note ? fulfillmentCopy[locale][entry.note] : undefined;
        return (
          <View key={entry.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={styles.artSlot}>
                {latest ? <SoftGlow color={statusGlow[kind]} size={50} opacity={0.3} /> : null}
                <Art3D kind={kind} size={latest ? 32 : 24} />
              </View>
              {index < entries.length - 1 ? <View style={styles.railLine} /> : null}
            </View>
            <View style={styles.rowText}>
              <Text style={[font.h3, !latest && { color: colors.textSecondary, fontWeight: "600" }]}>{copy?.title || statusLabels[locale][entry.toStatus] || entry.toStatus}</Text>
              <Text style={font.tiny}>{shortDate(entry.createdAt, locale)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", gap: 4 },
  trackStep: { flex: 1, alignItems: "center", gap: 6 },
  segment: { alignSelf: "stretch", height: 6, borderRadius: 3, backgroundColor: "#E4ECE9" },
  trackText: { fontSize: 10, color: colors.textMuted, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10 },
  rail: { width: 36, alignItems: "center" },
  artSlot: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  railLine: { flex: 1, width: 3, minHeight: 8, borderRadius: 1.5, backgroundColor: "#E4ECE9", marginVertical: 2 },
  rowText: { flex: 1, paddingTop: 7, paddingBottom: 16, gap: 2 },
});
