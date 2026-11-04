import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MiniAppPushToken } from "@zhaoxi/miniapp-sdk";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Platform } from "react-native";
import { ApiError, getAuth, isGuest, request } from "../api/client";
import { getAccountAccess } from "../api/endpoints";
import { useSession } from "../hooks";
import { getExpoPushToken } from "../notifications";
import { keys } from "../query";
import { isPartnerAccount } from "./access";
import { PARTNER_MINIAPP_ID } from "./registry";

/**
 * Push token của host cấp cho mini app (`bridge.getPushToken`, quyền `notifications.push`).
 *
 * Mini app đăng ký token với backend bằng phiên riêng của nó (Partner: `/api/partner-push/mobile` bằng phiên
 * partner), nên host không tự gỡ được qua phiên đó. Host ghi lại "token này đã giao cho mini app X, khi đang là
 * người dùng U" và gỡ đăng ký bằng phiên của chính host khi:
 * - người dùng đăng xuất (trước khi bỏ phiên, xem `ui/chrome.tsx`);
 * - phiên host đổi sang người khác / guest (đăng nhập tài khoản khác, refresh hỏng);
 * - `/api/account/me` cho thấy tài khoản không còn là đối tác.
 * Gỡ hỏng (mất mạng) thì giữ bản ghi, thử lại ở lần kế tiếp. Backend còn lọc thành viên gian hàng lúc gửi,
 * nên nhân viên bị gỡ khỏi gian hàng không nhận push dù máy chưa kịp gỡ.
 */
const GRANT_KEY = "zhaoxi.miniapp.push.v1";
type PushGrant = { token: string; userId: string; miniapps: string[] };

/** Đường gỡ đăng ký của từng mini app (DELETE `{ expoPushToken }`, backend nhận phiên host). */
const RELEASE_PATH: Readonly<Record<string, string>> = { [PARTNER_MINIAPP_ID]: "/api/partner-push/mobile" };

const platform = (): MiniAppPushToken["platform"] => (Platform.OS === "android" ? "android" : "ios");

async function readGrant(): Promise<PushGrant | null> {
  try {
    const raw = await AsyncStorage.getItem(GRANT_KEY);
    const value = raw ? (JSON.parse(raw) as Partial<PushGrant>) : null;
    if (!value?.token || !value.userId || !Array.isArray(value.miniapps)) return null;
    return { token: value.token, userId: value.userId, miniapps: value.miniapps.filter((id): id is string => typeof id === "string") };
  } catch {
    return null;
  }
}

/** `bridge.getPushToken` cho mini app `miniappId` (quyền đã kiểm ở bridge). */
export async function getMiniAppPushToken(miniappId: string): Promise<MiniAppPushToken> {
  const auth = getAuth();
  if (!auth || isGuest(auth)) return { token: null, platform: platform(), reason: "signed-out" };
  const { token, status } = await getExpoPushToken(true);
  if (!token) return { token: null, platform: platform(), reason: status.reason || "error" };
  const previous = await readGrant();
  // Token đổi (cài lại app) hoặc người dùng khác: bản ghi cũ phải gỡ trước, không thì máy giữ đăng ký mồ côi.
  if (previous && (previous.token !== token || previous.userId !== auth.session.userId)) await releaseMiniAppPush();
  const current = await readGrant();
  const miniapps = current ? [...new Set([...current.miniapps, miniappId])] : [miniappId];
  await AsyncStorage.setItem(GRANT_KEY, JSON.stringify({ token, userId: auth.session.userId, miniapps } satisfies PushGrant));
  return { token, platform: platform(), reason: "" };
}

let releasing: Promise<void> | null = null;

/** Gỡ token của máy khỏi backend của mọi mini app đã nhận nó. Không ném lỗi; hỏng thì giữ phần còn lại để thử lại. */
export function releaseMiniAppPush(): Promise<void> {
  releasing ??= (async () => {
    const grant = await readGrant();
    if (!grant) return;
    const left: string[] = [];
    for (const miniappId of grant.miniapps) {
      const path = RELEASE_PATH[miniappId];
      if (!path) continue;
      try {
        await request(path, { method: "DELETE", body: JSON.stringify({ expoPushToken: grant.token }) });
      } catch (error) {
        // 4xx khác 401/408/429 không bao giờ thành công khi thử lại (token sai dạng…): coi như đã gỡ.
        const status = error instanceof ApiError ? error.status : 0;
        if (!(status >= 400 && status < 500 && ![401, 408, 429].includes(status))) left.push(miniappId);
      }
    }
    if (left.length) await AsyncStorage.setItem(GRANT_KEY, JSON.stringify({ ...grant, miniapps: left } satisfies PushGrant));
    else await AsyncStorage.removeItem(GRANT_KEY);
  })().finally(() => {
    releasing = null;
  });
  return releasing;
}

/** Gắn ở gốc app: gỡ đăng ký push của mini app khi phiên đổi người hoặc tài khoản không còn là đối tác. */
export function useMiniAppPushGuard() {
  const { userId, guest } = useSession();
  const signedIn = Boolean(userId) && !guest;
  // Cùng khoá với `useMiniAppAccess`: không gọi thêm request.
  const account = useQuery({ queryKey: keys.accountAccess(userId), queryFn: getAccountAccess, enabled: signedIn, staleTime: 5 * 60_000 });
  const notPartner = signedIn && account.isSuccess && !isPartnerAccount(account.data);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void readGrant().then((grant) => {
      if (!alive || !grant) return;
      if (grant.userId !== userId || guest || notPartner) void releaseMiniAppPush();
    });
    return () => {
      alive = false;
    };
  }, [userId, guest, notPartner]);
}
