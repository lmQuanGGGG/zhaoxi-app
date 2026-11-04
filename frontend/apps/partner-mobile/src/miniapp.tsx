import type { MiniAppLocale, MiniAppProps } from "@zhaoxi/miniapp-sdk";
import { useMemo } from "react";
import { configureApi } from "./api";
import type { Language } from "./i18n";
import { PartnerApp, type PartnerHost } from "./PartnerApp";

/**
 * Entry mini app `zhaoxi.partner` (build ở frontend/apps/miniapp_zhaoxi_partner). Host ZhaoXi render
 * component này với `{ context, bridge }`; Partner nhận ngôn ngữ, backend, người dùng, tham số mở và lệnh
 * đóng từ host, còn phiên partner lấy bằng mã đổi vai trò (`bridge.createRoleHandoff`).
 */
const LANGUAGE: Record<MiniAppLocale, Language> = { "vi-VN": "vi", "en-US": "en", "zh-CN": "zh", "zh-TW": "zh" };
const CAPSULE_GAP = 10;

export default function PartnerMiniApp({ context, bridge }: MiniAppProps) {
  // Gọi khi render (trước mọi effect của con): API của Partner trỏ đúng backend host đang dùng.
  configureApi({ apiUrl: context.host.apiUrl, deviceName: "ZhaoXi Partner (mini app)" });
  const userId = context.user && !context.user.isGuest ? context.user.id : null;
  const { screen, order } = context.launch;
  const capsuleInset = context.capsule.width + context.capsule.right + CAPSULE_GAP;
  const host = useMemo<PartnerHost>(() => ({
    language: LANGUAGE[context.locale] ?? "vi",
    capsuleInset,
    launch: { screen: screen === "messages" ? "messages" : screen === "orders" ? "orders" : undefined, order: order || undefined },
    userId,
    // Host cũ chưa có createRoleHandoff: Partner chỉ còn đăng nhập tay.
    createHandoff: typeof bridge.createRoleHandoff === "function" ? async () => (await bridge.createRoleHandoff("partner")).code : null,
    close: bridge.close,
    // Host cũ chưa có getPushToken: Partner tự lấy token qua expo-notifications (shared module) như bản 1.0.0.
    getPushToken: typeof bridge.getPushToken === "function" ? () => bridge.getPushToken() : null,
  }), [context.locale, capsuleInset, screen, order, userId, bridge]);
  return <PartnerApp host={host}/>;
}
