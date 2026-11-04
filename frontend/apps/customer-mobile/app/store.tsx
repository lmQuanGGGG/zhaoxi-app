import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { request } from "../src/api/client";
import { getAccountAccess } from "../src/api/endpoints";
import { useSession } from "../src/hooks";
import { useI18n } from "../src/i18n";
import { isPartnerAccount, useMiniAppAccess } from "../src/miniapps/access";
import { PARTNER_MINIAPP_ID, findMiniApp } from "../src/miniapps/registry";
import { keys } from "../src/query";
import { colors, font, space } from "../src/theme";
import { Button, Header, Screen } from "../src/ui";
import { ServiceTile } from "../src/ui/service-icons";

/** Partner web: its `/auth/handoff` page signs the WebView in with a one-time code, then opens `next`. */
const PARTNER_WEB = "https://partner.zhaoxi.trieuhymedia.net";

const copy = {
  "vi-VN": { title: "Gian hàng của bạn", register: "Đăng ký gian hàng", guestTitle: "Đăng nhập để mở gian hàng", guestBody: "Gian hàng dùng chung tài khoản ZhaoXi: đăng nhập hoặc tạo tài khoản, rồi gửi hồ sơ gian hàng ngay trong app.", signIn: "Đăng nhập ZhaoXi", failed: "Chưa mở được trang đăng ký. Kiểm tra mạng rồi thử lại.", retry: "Thử lại" },
  "en-US": { title: "Your store", register: "Open a store", guestTitle: "Sign in to open a store", guestBody: "Stores use your ZhaoXi account: sign in or sign up, then send your store profile right here.", signIn: "Sign in to ZhaoXi", failed: "Couldn't open the sign-up page. Check your connection and try again.", retry: "Retry" },
  "zh-CN": { title: "我的店铺", register: "开通店铺", guestTitle: "登录后开通店铺", guestBody: "店铺使用您的赵喜账号：登录或注册后，直接在应用内提交店铺资料。", signIn: "登录赵喜", failed: "无法打开注册页面，请检查网络后重试。", retry: "重试" },
  "zh-TW": { title: "我的店鋪", register: "開通店鋪", guestTitle: "登入後開通店鋪", guestBody: "店鋪使用您的趙喜帳號：登入或註冊後，直接在應用內提交店鋪資料。", signIn: "登入趙喜", failed: "無法開啟註冊頁面，請檢查網路後重試。", retry: "重試" },
} as const;

/**
 * One entry for "my store" (home service arc + services hub):
 * - a store member → the Partner mini app;
 * - signed in without a store → partner web sign-up in a WebView, signed in as this same ZhaoXi account
 *   (one-time role-switch code), so the application and the store it becomes belong to this account;
 * - guest → sign in / sign up to ZhaoXi first; the login screen comes back here.
 */
export default function StoreScreen() {
  const { locale } = useI18n();
  const c = copy[locale];
  const { userId, guest } = useSession();
  const signedIn = Boolean(userId) && !guest;
  const access = useMiniAppAccess();
  const account = useQuery({ queryKey: keys.accountAccess(userId), queryFn: getAccountAccess, enabled: signedIn, staleTime: 5 * 60_000 });
  const entry = findMiniApp(PARTNER_MINIAPP_ID);
  // Either signal is enough: the catalog decides what the mini app screen loads, /api/account/me is the fallback.
  const isPartner = Boolean((entry && access.ready && access.canOpen(entry)) || (account.data && isPartnerAccount(account.data)));
  const decided = signedIn && (isPartner || (access.ready && account.isFetched));

  useEffect(() => {
    if (signedIn && isPartner) router.replace(`/miniapp/${PARTNER_MINIAPP_ID}`);
  }, [signedIn, isPartner]);

  // The code is single-use and lives 60 s, so it is fetched per visit and never cached / persisted.
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const needsWeb = decided && !isPartner;
  useEffect(() => {
    if (!needsWeb) return;
    let active = true;
    setFailed(false);
    setUrl(null);
    request<{ code: string }>("/api/auth/role-switch/create", { method: "POST", body: JSON.stringify({ targetRole: "customer" }) })
      .then(({ code }) => active && setUrl(`${PARTNER_WEB}/auth/handoff#${new URLSearchParams({ code, next: "/onboarding" }).toString()}`))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [needsWeb, attempt]);

  let body;
  if (!signedIn) {
    body = (
      <View style={styles.center}>
        <ServiceTile code="store" size={84} />
        <Text style={[font.h2, styles.text]}>{c.guestTitle}</Text>
        <Text style={[font.body, styles.text, { color: colors.textSecondary }]}>{c.guestBody}</Text>
        <Button title={c.signIn} onPress={() => router.push("/login")} style={{ alignSelf: "stretch", marginTop: space.md }} />
      </View>
    );
  } else if (failed) {
    body = (
      <View style={styles.center}>
        <Text style={[font.body, styles.text]}>{c.failed}</Text>
        <Button title={c.retry} variant="secondary" onPress={() => setAttempt((n) => n + 1)} />
      </View>
    );
  } else if (url) {
    body = (
      <WebView
        source={{ uri: url }}
        style={{ flex: 1, backgroundColor: "#f6faf7" }}
        startInLoadingState
        renderLoading={() => <View style={[StyleSheet.absoluteFill, styles.center]}><ActivityIndicator color={colors.brand} /></View>}
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
      />
    );
  } else {
    body = <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>;
  }

  return (
    <Screen>
      <Header title={signedIn && !isPartner ? c.register : c.title} />
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: space.xl },
  text: { textAlign: "center" },
});
