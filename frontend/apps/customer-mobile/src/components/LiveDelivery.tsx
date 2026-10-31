import { Image } from "expo-image";
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, type LatLng } from "react-native-maps";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import type { DeliveryJobStatus, DeliveryTracking } from "../api/types";
import { shortDate } from "../format";
import { useI18n } from "../i18n";
import { colors, shadow } from "../theme";
import { Art3D, ArtLabel } from "../ui";

// Labels from @zhaoxi/driver `deliveryStageLabel` and the PWA order page.
const stageLabels: Record<string, Record<DeliveryJobStatus, string>> = {
  "vi-VN": { searching_driver: "Đang tìm tài xế", assigned: "Tài xế đã nhận chuyến", picked_up: "Đã lấy hàng", delivering: "Đang giao", delivered: "Đã giao hoàn thành", cancelled: "Đã hủy giao" },
  "zh-CN": { searching_driver: "正在寻找骑手", assigned: "骑手已接单", picked_up: "已取货", delivering: "配送中", delivered: "已送达", cancelled: "配送已取消" },
  "zh-TW": { searching_driver: "正在尋找騎手", assigned: "騎手已接單", picked_up: "已取貨", delivering: "配送中", delivered: "已送達", cancelled: "配送已取消" },
  "en-US": { searching_driver: "Finding driver", assigned: "Driver assigned", picked_up: "Picked up", delivering: "Delivering", delivered: "Delivered", cancelled: "Delivery cancelled" },
};
const copy = {
  "vi-VN": { timeline: "Tiến trình giao hàng", toPickup: "Đang đến điểm lấy", toDropoff: "Đang đến điểm giao", stale: "Vị trí cập nhật chậm" },
  "en-US": { timeline: "Delivery timeline", toPickup: "Heading to pickup", toDropoff: "Heading to drop-off", stale: "Location updates are delayed" },
  "zh-CN": { timeline: "配送进度", toPickup: "前往取货点", toDropoff: "前往送达点", stale: "位置更新较慢" },
  "zh-TW": { timeline: "配送進度", toPickup: "前往取貨點", toDropoff: "前往送達點", stale: "位置更新較慢" },
} as const;

const point = (lat?: string | null, lng?: string | null): LatLng | null => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude !== 0 || longitude !== 0) ? { latitude, longitude } : null;
};

export function deliveryStageLabel(status: DeliveryJobStatus, locale: string) {
  return stageLabels[locale]?.[status] || status;
}

function DriverDot() {
  const pulse = useSharedValue(0);
  useEffect(() => { pulse.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false); }, []);
  const ring = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 1.6 }] }));
  return (
    <View style={styles.driverWrap}>
      <Animated.View style={[styles.driverRing, ring]} />
      <View style={styles.driverDot}><Art3D kind="scooter" size={18} /></View>
    </View>
  );
}

/** Native counterpart of the PWA `DeliveryLiveMap` + tracking card on /order/:id. */
export function LiveDelivery({ tracking }: { tracking: DeliveryTracking }) {
  const { locale } = useI18n();
  const c = copy[locale];
  const map = useRef<MapView>(null);
  const pickup = point(tracking.job.pickupLatitude, tracking.job.pickupLongitude);
  const dropoff = point(tracking.job.dropoffLatitude, tracking.job.dropoffLongitude);
  const driver = point(tracking.location?.latitude, tracking.location?.longitude);
  const path = useMemo(() => (tracking.path || []).map((p) => point(p.latitude, p.longitude)).filter((p): p is LatLng => Boolean(p)), [tracking.path]);
  const all = [pickup, dropoff, driver, ...path].filter((p): p is LatLng => Boolean(p));
  const signature = all.map((p) => `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`).join("|");
  useEffect(() => {
    if (all.length) map.current?.fitToCoordinates(all, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true });
  }, [signature]);
  const telemetry = tracking.telemetry;
  const status = tracking.job.status;
  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.card, shadow("card")]}>
      <View style={styles.head}>
        <ArtLabel kind="truck" size={18} style={styles.stage}>{deliveryStageLabel(status, locale)}</ArtLabel>
        <Text style={[styles.live, { color: telemetry?.isLive ? "#059669" : "#D97706" }]}>{telemetry?.isLive ? "● LIVE" : telemetry?.isStale ? `● ${c.stale}` : "● GPS"}</Text>
      </View>
      {tracking.driver ? (
        <View style={styles.driverRow}>
          {tracking.driver.avatarUrl ? <Image source={{ uri: tracking.driver.avatarUrl }} style={styles.avatar} /> : null}
          <Text style={styles.driverText}><Text style={{ fontWeight: "800" }}>{tracking.driver.displayName}</Text> · {tracking.driver.vehicleType}{tracking.driver.plateNumber ? ` · ${tracking.driver.plateNumber}` : ""}</Text>
        </View>
      ) : null}
      {all.length ? (
        <View style={styles.map}>
          <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={{ ...(driver || dropoff || pickup || all[0]!), latitudeDelta: 0.04, longitudeDelta: 0.04 }} showsCompass={false} toolbarEnabled={false} pitchEnabled={false}>
            {path.length > 1 ? <Polyline coordinates={path} strokeColor={colors.wechat} strokeWidth={4} /> : null}
            {pickup ? <Marker coordinate={pickup} title={tracking.job.pickupAddress} pinColor="#F59E0B" /> : null}
            {dropoff ? <Marker coordinate={dropoff} title={tracking.job.dropoffAddress} pinColor={colors.brandDeep} /> : null}
            {driver ? <Marker coordinate={driver} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges><DriverDot /></Marker> : null}
          </MapView>
        </View>
      ) : null}
      <View style={styles.chips}>
        {telemetry?.targetType ? <ArtLabel kind="compass" size={14} style={styles.chip}>{telemetry.targetType === "pickup" ? c.toPickup : c.toDropoff}</ArtLabel> : null}
        {telemetry?.distanceRemainingKm != null ? <ArtLabel kind="pin" size={14} style={styles.chip}>{telemetry.distanceRemainingKm.toFixed(1)} km</ArtLabel> : null}
        {telemetry?.etaMinutes != null ? <ArtLabel kind="history" size={14} style={styles.chip}>{telemetry.etaMinutes} min</ArtLabel> : null}
        {telemetry?.locationAgeSeconds != null ? <Text style={styles.chip}>{telemetry.locationAgeSeconds}s</Text> : null}
      </View>
      {tracking.timeline?.length ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.timelineTitle}>{c.timeline}</Text>
          {tracking.timeline.map((event) => (
            <View key={event.id} style={styles.event}>
              <View style={styles.eventDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{event.toStatus ? deliveryStageLabel(event.toStatus, locale) : event.eventType}</Text>
                <Text style={styles.eventTime}>{shortDate(event.createdAt, locale)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 16, borderRadius: 20, backgroundColor: colors.white, ...shadow("card") },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  stage: { flexShrink: 1, fontSize: 14, fontWeight: "800", color: colors.ink },
  live: { fontSize: 11, fontWeight: "800" },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  driverText: { flex: 1, fontSize: 12.5, color: "#334155" },
  map: { height: 220, borderRadius: 16, overflow: "hidden", backgroundColor: "#E9F1EC" },
  driverWrap: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  driverRing: { position: "absolute", width: 26, height: 26, borderRadius: 13, backgroundColor: colors.wechat },
  driverDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.wechat, alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { fontSize: 11, color: colors.slate },
  timelineTitle: { fontSize: 13, fontWeight: "800", color: colors.ink, marginTop: 4 },
  event: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#059669", marginTop: 4 },
  eventTitle: { fontSize: 11.5, fontWeight: "700", color: colors.ink },
  eventTime: { fontSize: 9.5, color: "#94A3B8", marginTop: 2 },
});
