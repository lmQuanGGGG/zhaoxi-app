import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import { useI18n } from "../../src/i18n";
import { moduleCatalog } from "../../src/modules";
import { colors } from "../../src/theme";
import { ErrorState, Ionicons } from "../../src/ui";

const copy = {
  "vi-VN": { error: "Không mở được trang", retry: "Thử lại" },
  "en-US": { error: "Could not open the page", retry: "Retry" },
  "zh-CN": { error: "无法打开页面", retry: "重试" },
  "zh-TW": { error: "無法打開頁面", retry: "重試" },
} as const;

/** Partner web service (e.g. CocoDrama) embedded full-screen under a slim petrol bar. */
export default function EmbedScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { locale } = useI18n();
  const c = copy[locale];
  const insets = useSafeAreaInsets();
  const entry = moduleCatalog.find((item) => item.code === code);
  const web = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const title = entry?.name?.[locale] || "";
  const close = () => (router.canGoBack() ? router.back() : router.navigate("/"));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.bar, { paddingTop: insets.top }]}>
        {/* Back walks the site's own history first, then leaves the screen. */}
        <Pressable accessibilityLabel="Back" hitSlop={8} onPress={() => (canGoBack ? web.current?.goBack() : close())} style={({ pressed }) => [styles.barButton, pressed && styles.pressed]}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {loading ? <ActivityIndicator color={colors.white} style={styles.barButton} /> : (
          <Pressable accessibilityLabel="Close" hitSlop={8} onPress={close} style={({ pressed }) => [styles.barButton, pressed && styles.pressed]}>
            <Ionicons name="close" size={22} color={colors.white} />
          </Pressable>
        )}
      </View>
      {entry?.url && !failed ? (
        <WebView
          ref={web}
          source={{ uri: entry.url }}
          style={styles.web}
          // Video plays inside the page, with the native fullscreen player on demand.
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          setSupportMultipleWindows={false}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setFailed(true); }}
        />
      ) : (
        <View style={[styles.fallback, { paddingBottom: insets.bottom }]}>
          <ErrorState message={c.error} retryLabel={c.retry} onRetry={() => { setFailed(false); setLoading(true); }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.header },
  bar: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingBottom: 6, backgroundColor: colors.header },
  barButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  pressed: { backgroundColor: "rgba(255,255,255,0.14)" },
  backGlyph: { fontSize: 30, lineHeight: 32, color: colors.white, marginTop: -2 },
  title: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800", color: colors.white },
  web: { flex: 1, backgroundColor: "#000000" },
  fallback: { flex: 1, justifyContent: "center", backgroundColor: colors.bg },
});
