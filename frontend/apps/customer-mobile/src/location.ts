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

type PhotonFeature = { geometry: { coordinates: [number, number] }; properties: Record<string, string | undefined> };

/** One Photon (OpenStreetMap) request biased to Đà Nẵng: named places + streets, ~1 s (same source as the PWA). */
async function photonSearch(query: string, signal?: AbortSignal) {
  const url = `https://photon.komoot.io/api/?limit=6&bbox=108.0,15.85,108.4,16.2&lat=16.0544&lon=108.2022&location_bias_scale=0.1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`photon ${response.status}`);
  const data = (await response.json()) as { features?: PhotonFeature[] };
  const seen = new Set<string>();
  return (data.features || []).map((feature) => {
    const p = feature.properties;
    const [longitude, latitude] = feature.geometry.coordinates;
    const street = p.street ? [p.housenumber, p.street].filter(Boolean).join(" ") : "";
    const label = [p.name, street && street !== p.name ? street : null, p.district || p.locality, p.city].filter(Boolean).join(", ");
    return { latitude, longitude, label };
  }).filter((item) => item.label && !seen.has(item.label) && seen.add(item.label)).slice(0, 5);
}

/** Address search: Photon first (fast, POI-aware); the on-device geocoder is the fallback. */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<Array<Point & { label: string }>> {
  if (!query.trim()) return [];
  try {
    const results = await photonSearch(query.trim(), signal);
    if (results.length) return results;
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  try {
    const results = await Location.geocodeAsync(`${query}, Đà Nẵng`);
    return Promise.all(results.slice(0, 3).map(async (result) => {
      const point = { latitude: result.latitude, longitude: result.longitude };
      return { ...point, label: (await formatAddress(point)) || query };
    }));
  } catch {
    return [];
  }
}
