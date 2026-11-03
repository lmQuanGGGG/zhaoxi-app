import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import type { Point } from "../api/types";
import { colors } from "../theme";

const DA_NANG: Point = { latitude: 16.0544, longitude: 108.2022 };

/** Native counterpart of the PWA LocationPicker map: drag the pin or tap to choose the delivery point. */
export function DeliveryMap({ point, onChange }: { point: Point | null; onChange: (point: Point) => void }) {
  const map = useRef<MapView>(null);
  const center = point || DA_NANG;
  useEffect(() => {
    if (point) map.current?.animateToRegion({ ...point, latitudeDelta: 0.012, longitudeDelta: 0.012 } satisfies Region, 350);
  }, [point?.latitude, point?.longitude]);
  return (
    <View style={styles.wrap}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...center, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        showsUserLocation
        showsCompass={false}
        toolbarEnabled={false}
        onPress={(event) => onChange(event.nativeEvent.coordinate)}
      >
        <Marker coordinate={center} draggable pinColor={colors.brandDeep} onDragEnd={(event) => onChange(event.nativeEvent.coordinate)} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 260, borderRadius: 18, overflow: "hidden", backgroundColor: "#F3EFEA" },
});
