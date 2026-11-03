import { Ionicons } from "@expo/vector-icons";
import type { MiniAppLocale, MiniAppProps } from "@zhaoxi/miniapp-sdk";
import { LinearGradient } from "expo-linear-gradient";
import { useState, type ComponentProps } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const copy = {
  "vi-VN": {
    eyebrow: "MINI APP MẪU",
    subtitle: "Chạy bên trong host ZhaoXi",
    session: "Phiên từ host",
    guest: "Khách (chưa đăng nhập)",
    login: "Đăng nhập",
    bridge: "Thử bridge",
    api: "Gọi API ZhaoXi",
    apiOk: "API trả về",
    toast: "Hiện toast của host",
    toastText: "Xin chào từ mini app 👋",
    haptic: "Rung nhẹ",
    route: "Mở Ưu đãi (màn host)",
    close: "Đóng mini app",
    counter: "Bộ đếm (state nội bộ)",
    build: "Phiên bản",
    source: { dev: "dev server", network: "tải mạng", cache: "bộ nhớ đệm" },
  },
  "en-US": {
    eyebrow: "SAMPLE MINI APP",
    subtitle: "Running inside the ZhaoXi host",
    session: "Host session",
    guest: "Guest (not signed in)",
    login: "Sign in",
    bridge: "Try the bridge",
    api: "Call ZhaoXi API",
    apiOk: "API returned",
    toast: "Show host toast",
    toastText: "Hello from the mini app 👋",
    haptic: "Light haptic",
    route: "Open Coupons (host screen)",
    close: "Close mini app",
    counter: "Counter (local state)",
    build: "Version",
    source: { dev: "dev server", network: "network", cache: "cache" },
  },
  "zh-CN": {
    eyebrow: "示例小程序",
    subtitle: "运行在赵喜宿主应用中",
    session: "宿主会话",
    guest: "游客（未登录）",
    login: "登录",
    bridge: "试用桥接",
    api: "调用赵喜 API",
    apiOk: "API 返回",
    toast: "显示宿主提示",
    toastText: "来自小程序的问候 👋",
    haptic: "轻触反馈",
    route: "打开优惠（宿主页面）",
    close: "关闭小程序",
    counter: "计数器（本地状态）",
    build: "版本",
    source: { dev: "开发服务器", network: "网络", cache: "缓存" },
  },
  "zh-TW": {
    eyebrow: "範例小程式",
    subtitle: "執行於趙喜宿主應用中",
    session: "宿主工作階段",
    guest: "訪客（未登入）",
    login: "登入",
    bridge: "試用橋接",
    api: "呼叫趙喜 API",
    apiOk: "API 回傳",
    toast: "顯示宿主提示",
    toastText: "來自小程式的問候 👋",
    haptic: "輕觸回饋",
    route: "開啟優惠（宿主頁面）",
    close: "關閉小程式",
    counter: "計數器（本地狀態）",
    build: "版本",
    source: { dev: "開發伺服器", network: "網路", cache: "快取" },
  },
} satisfies Record<MiniAppLocale, unknown>;

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Host gọi component default export này với `{ context, bridge }`. */
export default function ExampleMiniApp({ context, bridge }: MiniAppProps) {
  const t = copy[context.locale] ?? copy["vi-VN"];
  const { colors, radius } = context.theme;
  const [count, setCount] = useState(0);
  const [apiState, setApiState] = useState<{ loading: boolean; text?: string }>({ loading: false });
  const user = context.user;

  const callApi = async () => {
    setApiState({ loading: true });
    try {
      const data = await bridge.request<Record<string, unknown> | null>("/api/customer-ui-config");
      setApiState({ loading: false, text: `${t.apiOk}: ${Object.keys(data ?? {}).join(", ") || "{}"}` });
      bridge.haptic("success");
    } catch (error) {
      setApiState({ loading: false, text: error instanceof Error ? error.message : String(error) });
      bridge.haptic("error");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bgSoft }]}>
      <LinearGradient colors={[colors.header, colors.header, colors.bgSoft]} locations={[0, 0.55, 1]} style={styles.headerFade} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: context.capsule.top + context.capsule.height + 18 }]}>
        <Text style={styles.eyebrow}>{t.eyebrow}</Text>
        <Text style={styles.title}>{context.app.name}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        <View style={[styles.card, { borderRadius: radius.lg }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{t.session}</Text>
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: colors.brandSoft }]}>
              <Text style={[styles.avatarText, { color: colors.brandDeep }]}>{(user?.displayName || "?").slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: colors.ink }]} numberOfLines={1}>{user && !user.isGuest ? user.displayName : t.guest}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{context.locale} · {context.host.platform} · runtime {context.host.runtime}</Text>
            </View>
            {!user || user.isGuest ? (
              <Pressable onPress={bridge.requestLogin} style={({ pressed }) => [styles.pill, { backgroundColor: colors.brand, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={styles.pillText}>{t.login}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={[styles.card, { borderRadius: radius.lg }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{t.bridge}</Text>
          <Action icon="cloud-download-outline" label={t.api} tint={colors.brand} onPress={callApi} busy={apiState.loading} />
          {apiState.text ? <Text style={[styles.apiText, { color: colors.textSecondary }]} numberOfLines={3}>{apiState.text}</Text> : null}
          <Action icon="chatbubble-ellipses-outline" label={t.toast} tint={colors.brandDeep} onPress={() => bridge.toast(t.toastText, "info")} />
          <Action icon="pulse-outline" label={t.haptic} tint="#7C3AED" onPress={() => bridge.haptic("medium")} />
          <Action icon="pricetags-outline" label={t.route} tint="#E11D48" onPress={() => bridge.openHostRoute("/coupons")} />
        </View>

        <View style={[styles.card, styles.counterCard, { borderRadius: radius.lg }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary, marginBottom: 0 }]}>{t.counter}</Text>
          <View style={styles.counterRow}>
            <RoundButton icon="remove" onPress={() => setCount((value) => value - 1)} color={colors.ink} />
            <Text style={[styles.count, { color: colors.ink }]}>{count}</Text>
            <RoundButton icon="add" onPress={() => setCount((value) => value + 1)} color={colors.ink} />
          </View>
        </View>

        <Pressable onPress={bridge.close} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.brandDeep, borderRadius: radius.pill, opacity: pressed ? 0.85 : 1 }]}>
          <Ionicons name="close" size={18} color="#FFFFFF" />
          <Text style={styles.closeText}>{t.close}</Text>
        </Pressable>
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          {context.app.id} · {t.build} {context.app.version} · {t.source[context.app.source]}
        </Text>
      </ScrollView>
    </View>
  );
}

function Action({ icon, label, tint, onPress, busy }: { icon: IconName; label: string; tint: string; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [styles.action, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={[styles.actionIcon, { backgroundColor: `${tint}14` }]}>
        {busy ? <ActivityIndicator size="small" color={tint} /> : <Ionicons name={icon} size={19} color={tint} />}
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#A0A7A4" />
    </Pressable>
  );
}

function RoundButton({ icon, onPress, color }: { icon: IconName; onPress: () => void; color: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.round, pressed && { transform: [{ scale: 0.92 }] }]}>
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

// Card không viền, bóng mềm: cùng phong cách với host.
const softShadow = { shadowColor: "#0F2A24", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 } as const;

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerFade: { position: "absolute", left: 0, right: 0, top: 0, height: 300 },
  content: { paddingHorizontal: 16, paddingBottom: 48, gap: 14 },
  eyebrow: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginTop: -6 },
  subtitle: { color: "rgba(255,255,255,0.82)", fontSize: 14, marginTop: -8, marginBottom: 6 },
  card: { backgroundColor: "#FFFFFF", padding: 16, ...softShadow },
  cardTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 19, fontWeight: "800" },
  userName: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 12, marginTop: 2 },
  pill: { paddingHorizontal: 14, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  pillText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  action: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  actionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1E293B" },
  apiText: { fontSize: 12, marginLeft: 50, marginTop: -4, marginBottom: 4 },
  counterCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F1F5F4", alignItems: "center", justifyContent: "center" },
  count: { fontSize: 20, fontWeight: "800", minWidth: 28, textAlign: "center" },
  closeButton: { height: 50, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 4, ...softShadow },
  closeText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  footer: { textAlign: "center", fontSize: 12 },
});
