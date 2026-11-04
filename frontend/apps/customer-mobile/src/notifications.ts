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
import { isMiniAppOpen, PARTNER_MINIAPP_ID } from "./miniapps/registry";
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
    // Push đơn mới / báo chuyển khoản của gian hàng (mini app Quản lý gian hàng) gửi `channelId: "new-orders"`.
    // Host chưa có order_alert.wav nên dùng âm mặc định, rung mạnh để phân biệt.
    Notifications.setNotificationChannelAsync("new-orders", {
      name: "Đơn hàng mới của gian hàng",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 180, 500, 180, 900],
      lightColor: "#16a36a",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    }),
  ]);
}

export type PushStatus = { enabled: boolean; reason: "" | "simulator" | "denied" | "no-project" | "error" };

/** Expo push token của host (xin quyền khi `prompt`). Dùng cho push khách và cho mini app (`miniapps/push.ts`). */
export async function getExpoPushToken(prompt: boolean): Promise<{ token: string | null; status: PushStatus }> {
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
  const { token, status } = await getExpoPushToken(prompt);
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

/**
 * Push dành cho một mini app (không có `url`): backend ghi `data.miniappId` (Partner: `zhaoxi.partner`, đơn mới
 * `screen: "orders"`, tin nhắn `screen: "messages"`, kèm `orderId`, `organizationId`). Backend cũ chưa ghi `miniappId`: nhận diện
 * push Partner theo `screen`. Chạm vào thì mở mini app ở đúng đơn / cuộc chat; khi mini app đang mở, chính nó nhận
 * sự kiện nên host bỏ qua. Push của khách luôn có `url` và giữ nguyên cách xử lý.
 */
const MINIAPP_ID_PATTERN = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;

function miniAppPushTarget(data: Record<string, unknown>) {
  const screen = data.screen === "messages" ? "messages" : data.screen === "orders" ? "orders" : null;
  const declared = typeof data.miniappId === "string" && MINIAPP_ID_PATTERN.test(data.miniappId) ? data.miniappId : null;
  const miniappId = declared ?? (screen ? PARTNER_MINIAPP_ID : null);
  if (!miniappId) return null;
  const params = new URLSearchParams();
  if (screen) params.set("screen", screen);
  if (typeof data.orderId === "string" && data.orderId) params.set("order", data.orderId);
  // Gian hàng của đơn: chủ nhiều gian hàng chạm push của gian hàng khác thì mini app đổi sang gian hàng đó.
  if (typeof data.organizationId === "string" && data.organizationId) params.set("org", data.organizationId);
  // Push Partner kiểu cũ luôn có đơn; thiếu đơn thì không phải push của mini app.
  if (!declared && !params.has("order")) return null;
  const query = params.toString();
  return { miniappId, href: `/miniapp/${miniappId}${query ? `?${query}` : ""}` };
}

function openFromNotification(response: Notifications.NotificationResponse | null) {
  const data = response?.notification.request.content.data as Record<string, unknown> | undefined;
  if (!data) return;
  if (typeof data.url !== "string" || !data.url) {
    const target = miniAppPushTarget(data);
    if (target && !isMiniAppOpen(target.miniappId)) router.push(routeForWebHref(target.href));
    return;
  }
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
