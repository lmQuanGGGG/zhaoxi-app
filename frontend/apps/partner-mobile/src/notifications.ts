import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
});

export async function configureNotifications() {
  await Notifications.setNotificationCategoryAsync("ORDER_ACTIONS", [
    { identifier: "OPEN_ORDER", buttonTitle: "Mở đơn hàng", options: { opensAppToForeground: true } },
  ]);
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("new-orders", {
      name: "Đơn hàng mới",
      description: "Chuông lớn cho đơn hàng cần xác nhận",
      importance: Notifications.AndroidImportance.MAX,
      sound: "order_alert.wav",
      vibrationPattern: [0, 500, 180, 500, 180, 900],
      enableVibrate: true,
      enableLights: true,
      lightColor: "#16a36a",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }
}

export async function getPushToken() {
  if (!Device.isDevice) return { token: null, reason: "Push cần chạy trên điện thoại thật." };
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  if (permission.status !== "granted") return { token: null, reason: "Bạn chưa cho phép thông báo." };
  const projectId = String(Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || "");
  if (!projectId) return { token: null, reason: "Chưa cấu hình EXPO_PUBLIC_EAS_PROJECT_ID." };
  const result = await Notifications.getExpoPushTokenAsync({ projectId });
  return { token: result.data, reason: "" };
}

export async function notifyNewOrder(order: { requestId: string; requestCode: string; customerName: string }) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔔 Có đơn hàng mới",
      body: `${order.requestCode} · ${order.customerName}`,
      sound: "order_alert.wav",
      categoryIdentifier: "ORDER_ACTIONS",
      data: { orderId: order.requestId, screen: "orders" },
    },
    trigger: Platform.OS === "android" ? { channelId: "new-orders" } : null,
  });
}
