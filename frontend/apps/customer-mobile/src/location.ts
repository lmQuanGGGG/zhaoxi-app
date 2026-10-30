import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useSyncExternalStore } from "react";
import type { Point } from "./api/types";

// Shared "where am I" state used for nearby services and delivery quotes.
export type LocationState = { point: Point | null; label: string; status: "idle" | "locating" | "ready" | "denied" };

const KEY = "zhaoxi.location.v1";
let state: LocationState = { point: null, label: "", status: "idle" };
const listeners = new Set<() => void>();

function set(next: Partial<LocationState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export function useLocationState() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => state);
}

export function getLocationState() {
  return state;
}

export const pointKey = (point: Point | null) => (point ? `${point.latitude.toFixed(3)}_${point.longitude.toFixed(3)}` : "none");

export async function hydrateLocation() {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) || "null") as { point: Point; label: string } | null;
    if (saved?.point) set({ point: saved.point, label: saved.label || "", status: "ready" });
  } catch {
    // ignore corrupt cache
  }
}

export function setManualLocation(point: Point, label: string) {
  set({ point, label, status: "ready" });
  void AsyncStorage.setItem(KEY, JSON.stringify({ point, label })).catch(() => undefined);
}

export async function formatAddress(point: Point) {
  try {
    const [place] = await Location.reverseGeocodeAsync(point);
    if (!place) return "";
    return [place.name, place.street && place.street !== place.name ? place.street : null, place.district || place.subregion, place.city || place.region].filter(Boolean).join(", ");
  } catch {
    return "";
  }
}

/** Reads the current GPS position. Prompts for permission only when `prompt` is true. */
export async function locate(prompt = true): Promise<Point | null> {
  const permission = await Location.getForegroundPermissionsAsync();
  let granted = permission.granted;
  if (!granted && prompt && permission.canAskAgain) granted = (await Location.requestForegroundPermissionsAsync()).granted;
  if (!granted) {
    if (prompt) set({ status: "denied" });
    return null;
  }
  set({ status: "locating" });
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
    const position = last || (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    set({ point, status: "ready" });
    const label = await formatAddress(point);
    setManualLocation(point, label);
    return point;
  } catch {
    set({ status: state.point ? "ready" : "idle" });
    return null;
  }
}

export async function searchAddress(query: string): Promise<Array<Point & { label: string }>> {
  if (!query.trim()) return [];
  try {
    const results = await Location.geocodeAsync(`${query}, Đà Nẵng`);
    return Promise.all(results.slice(0, 5).map(async (result) => {
      const point = { latitude: result.latitude, longitude: result.longitude };
      return { ...point, label: (await formatAddress(point)) || query };
    }));
  } catch {
    return [];
  }
}
