import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { getDeviceId } from "./api/client";
import { registerPushToken, unregisterPushToken } from "./api/endpoints";
import { routeForWebHref } from "./links";
import { queryClient } from "./query";

const TOKEN_KEY = "zhaoxi.push.token.v1";
const PROMO_KEY = "zhaoxi.push.promotions.v1";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function configureNotificationChannels() {
  if (Platform.OS !== "android") return;
  await Promise.all([
    Notifications.setNotificationChannelAsync("orders", { name: "Đơn hàng & thanh toán", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 120, 250], lightColor: "#0FAF7A" }),
    Notifications.setNotificationChannelAsync("messages", { name: "Tin nhắn", importance: Notifications.AndroidImportance.HIGH, lightColor: "#0FAF7A" }),
    Notifications.setNotificationChannelAsync("promotions", { name: "Khuyến mãi", importance: Notifications.AndroidImportance.DEFAULT }),
  ]);
}

export type PushStatus = { enabled: boolean; reason: "" | "simulator" | "denied" | "no-project" | "error" };

async function expoToken(prompt: boolean): Promise<{ token: string | null; status: PushStatus }> {
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!granted && prompt && current.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } })).granted;
  }
  if (!granted) return { token: null, status: { enabled: false, reason: "denied" } };
  // Simulators can show notifications (local / `simctl push`) but cannot get an Expo push token.
  if (!Device.isDevice) return { token: null, status: { enabled: false, reason: "simulator" } };
  const projectId = String(Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || "");
  if (!projectId) return { token: null, status: { enabled: false, reason: "no-project" } };
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: result.data, status: { enabled: true, reason: "" } };
  } catch {
    return { token: null, status: { enabled: false, reason: "error" } };
  }
}

export async function getPromotionsPreference() {
  return (await AsyncStorage.getItem(PROMO_KEY)) !== "0";
}

/** Gets an Expo token (optionally prompting) and binds it to the current customer. */
export async function registerForPush(locale: string, prompt = false): Promise<PushStatus> {
  const { token, status } = await expoToken(prompt);
  if (!token) return status;
  const promotionsEnabled = await getPromotionsPreference();
  try {
    await registerPushToken({ expoPushToken: token, platform: Platform.OS, deviceId: getDeviceId(), locale, promotionsEnabled });
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    return { enabled: false, reason: "error" };
  }
  return status;
}

export async function setPromotionsPreference(enabled: boolean, locale: string) {
  await AsyncStorage.setItem(PROMO_KEY, enabled ? "1" : "0");
  await registerForPush(locale, false);
}

export async function pushPermissionGranted() {
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

export async function unregisterPush() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) await unregisterPushToken(token).catch(() => undefined);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

function openFromNotification(response: Notifications.NotificationResponse | null) {
  const data = response?.notification.request.content.data as { url?: string } | undefined;
  if (!data?.url) return;
  router.push(routeForWebHref(data.url));
}

function refreshLiveData() {
  for (const key of ["orders", "order", "notifications", "unread", "threads", "thread", "tracking"]) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}

/** Routes notification taps (cold start + background) and refreshes data on arrival. */
export function useNotificationRouting(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let handled = false;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!handled && response) {
        handled = true;
        openFromNotification(response);
        void Notifications.clearLastNotificationResponseAsync?.();
      }
    });
    const tap = Notifications.addNotificationResponseReceivedListener((response) => {
      handled = true;
      openFromNotification(response);
    });
    const received = Notifications.addNotificationReceivedListener(refreshLiveData);
    return () => {
      tap.remove();
      received.remove();
    };
  }, [ready]);
}
