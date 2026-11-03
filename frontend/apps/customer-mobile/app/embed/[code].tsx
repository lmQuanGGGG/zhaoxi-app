import { router, useLocalSearchParams } from "expo-router";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
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

/**
 * Partner web service (e.g. CocoDrama) edge to edge: the site owns the whole screen and
 * only a small floating pill (back + close) stays on top, where it is always reachable.
 */
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
  const close = () => (router.canGoBack() ? router.back() : router.navigate("/"));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {entry?.url && !failed ? (
        <WebView
          ref={web}
          source={{ uri: entry.url }}
          style={styles.web}
          // Edge to edge: the page starts clear of the notch and home bar, then scrolls under their blur.
          automaticallyAdjustContentInsets={false}
          contentInset={{ top: insets.top, bottom: insets.bottom }}
          // Video plays inside the page, with the native fullscreen player on demand.
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures
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
      {/* Dark frosted bands behind the status bar and home indicator: content scrolling under them stays faintly visible. */}
      <BlurView pointerEvents="none" intensity={30} tint="dark" style={[styles.band, { top: 0, height: insets.top }]} />
      <BlurView pointerEvents="none" intensity={30} tint="dark" style={[styles.band, { bottom: 0, height: insets.bottom }]} />
      {loading && !failed ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.header} /> : null}
      {/* Level with the site's tab row, whose right side is empty, so it hides no controls. */}
      <View style={[styles.pill, { top: insets.top + 58 }]}>
        <BlurView intensity={40} tint="dark" style={[StyleSheet.absoluteFill, styles.pillBlur]} />
        {/* Back walks the site's own history first, then leaves the screen. */}
        <Pressable accessibilityLabel="Back" hitSlop={6} onPress={() => (canGoBack ? web.current?.goBack() : close())} style={({ pressed }) => [styles.pillButton, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={19} color={colors.white} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable accessibilityLabel="Close" hitSlop={6} onPress={close} style={({ pressed }) => [styles.pillButton, pressed && styles.pressed]}>
          <Ionicons name="close" size={20} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Black like a video app: the notch and home-bar bands stay dark over any page.
  root: { flex: 1, backgroundColor: "#000000" },
  web: { flex: 1, backgroundColor: "#000000" },
  band: { position: "absolute", left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.55)" },
  fallback: { flex: 1, justifyContent: "center", backgroundColor: colors.bg },
  pill: { position: "absolute", right: 10, flexDirection: "row", alignItems: "center", height: 36, borderRadius: 18, paddingHorizontal: 2, backgroundColor: "rgba(15,23,42,0.38)", shadowColor: "#0F172A", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  pillBlur: { borderRadius: 18, overflow: "hidden" },
  pillButton: { width: 38, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  pressed: { backgroundColor: "rgba(255,255,255,0.18)" },
  divider: { width: StyleSheet.hairlineWidth, height: 16, backgroundColor: "rgba(255,255,255,0.45)" },
});
