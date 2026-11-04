import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { PartnerOrderKind } from "./types";

/** Chỉ app độc lập gọi: trong host ZhaoXi, handler toàn cục là của host (mini app đặt lại sẽ ghi đè). */
export function installNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
  });
}

/** Mini app id backend ghi vào `data.miniappId` của push Partner (host dùng để mở đúng mini app). */
export const PARTNER_MINIAPP_ID = "zhaoxi.partner";

/**
 * Push Partner (đơn mới `screen: "orders"`, tin nhắn `screen: "messages"`); push của host có `url`.
 * Backend mới ghi thêm `miniappId: "zhaoxi.partner"`; push của mini app khác mang `miniappId` khác thì bỏ qua.
 */
export function isPartnerPush(data: unknown) {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : null;
  if (!record || record.url) return false;
  if (record.miniappId !== undefined && record.miniappId !== PARTNER_MINIAPP_ID) return false;
  return record.screen === "orders" || record.screen === "messages";
}

/** Lý do không có token từ `bridge.getPushToken` của host → câu hiển thị ở tab Cài đặt (cùng giọng `getPushToken`). */
export function hostPushReason(reason: string) {
  switch (reason) {
    case "simulator": return "Push cần chạy trên điện thoại thật.";
    case "denied": return "Bạn chưa cho phép thông báo cho app ZhaoXi.";
    case "no-project": return "Bản ZhaoXi này chưa cấu hình push.";
    case "signed-out": return "Đăng nhập ZhaoXi để nhận thông báo đơn hàng.";
    default: return "Không thể bật thông báo.";
  }
}

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
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Tin nhắn khách hàng",
      description: "Tin nhắn mới của khách trong đơn hàng",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#16a36a",
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

const NEW_ORDER_TITLE: Record<PartnerOrderKind, string> = {
  food_delivery: "🔔 Có đơn hàng mới",
  housing_inquiry: "🏠 Có yêu cầu thuê nhà mới",
  travel_booking: "🧭 Có yêu cầu đặt tour mới",
  service_booking: "🔔 Có đơn dịch vụ mới",
};

/** `customSound: false` trong host ZhaoXi: bản build của host không có order_alert.wav, dùng âm mặc định. */
export async function notifyNewOrder(order: { requestId: string; requestCode: string; customerName: string; kind?: PartnerOrderKind }, options: { customSound?: boolean; organizationId?: string } = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: NEW_ORDER_TITLE[order.kind || "food_delivery"],
      body: `${order.requestCode} · ${order.customerName}`,
      sound: options.customSound === false ? "default" : "order_alert.wav",
      categoryIdentifier: "ORDER_ACTIONS",
      // `organizationId`: chuông cục bộ của gian hàng vừa rời đi (đổi gian hàng theo push) không mở đơn ở gian hàng mới.
      data: { orderId: order.requestId, screen: "orders", ...(options.organizationId ? { organizationId: options.organizationId } : {}) },
    },
    trigger: Platform.OS === "android" ? { channelId: "new-orders" } : null,
  });
}
