import { router, useLocalSearchParams } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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

// Samples the colours along the page's top and bottom edges every half second (the site is a SPA
// and switches between a white catalogue and a black player) so the notch and home-bar bands can
// wear them and the site looks edge to edge.
const sampleEdgeColors = `(function () {
  var last = "";
  function bg(el) {
    while (el && el !== document.documentElement) {
      var c = getComputedStyle(el).backgroundColor;
      if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
      el = el.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || "rgb(0, 0, 0)";
  }
  function at(y) {
    var el = document.elementFromPoint(window.innerWidth / 2, y);
    return el && el.tagName !== "VIDEO" && el.tagName !== "IMG" && el.tagName !== "CANVAS" ? bg(el) : "rgb(0, 0, 0)";
  }
  function check() {
    var next = JSON.stringify({ top: at(2), bottom: at(window.innerHeight - 2) });
    if (next !== last) { last = next; window.ReactNativeWebView.postMessage(next); }
  }
  check(); setInterval(check, 500); window.addEventListener("scroll", check, { passive: true });
})(); true;`;

// Hold the left or right third of a playing video for ~0.4 s to watch at 2x (like short-video apps);
// lifting the finger restores the speed. The click that ends the hold is swallowed so the site's own
// tap (pause / show controls) does not fire too.
const holdForDoubleSpeed = `(function () {
  var timer = null, boosted = [], swallow = false, badge = null;
  function playingVideos() {
    return Array.prototype.filter.call(document.querySelectorAll("video"), function (v) { return !v.paused && !v.ended; });
  }
  function showBadge(on) {
    if (!badge) {
      badge = document.createElement("div");
      badge.textContent = "2x \u25B6\u25B6";
      badge.style.cssText = "position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:6px 14px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font:700 14px -apple-system,system-ui;letter-spacing:.5px;pointer-events:none;transition:opacity .15s";
      document.body.appendChild(badge);
    }
    badge.style.opacity = on ? "1" : "0";
  }
  function stop() {
    clearTimeout(timer); timer = null;
    if (boosted.length) {
      boosted.forEach(function (b) { b.v.playbackRate = b.rate; });
      boosted = []; showBadge(false); swallow = true;
      setTimeout(function () { swallow = false; }, 400);
    }
  }
  document.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return stop();
    var x = e.touches[0].clientX, w = window.innerWidth;
    if (x > w * 0.3 && x < w * 0.7) return;
    timer = setTimeout(function () {
      var vids = playingVideos();
      if (!vids.length) return;
      boosted = vids.map(function (v) { var b = { v: v, rate: v.playbackRate }; v.playbackRate = 2; return b; });
      showBadge(true);
    }, 400);
  }, { passive: true, capture: true });
  document.addEventListener("touchmove", function () { if (!boosted.length) { clearTimeout(timer); timer = null; } }, { passive: true, capture: true });
  document.addEventListener("touchend", stop, { capture: true });
  document.addEventListener("touchcancel", stop, { capture: true });
  document.addEventListener("click", function (e) { if (swallow) { e.stopPropagation(); e.preventDefault(); swallow = false; } }, true);
  var style = document.createElement("style");
  style.textContent = "video{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}";
  document.head.appendChild(style);
})(); true;`;

/** Perceived brightness of an \`rgb()/rgba()\` string, 0–255. */
function brightness(color: string) {
  const [r = 0, g = 0, b = 0] = (color.match(/\d+(\.\d+)?/g) || []).map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Same colour at a given alpha, for the soft fade under the band. */
function withAlpha(color: string, alpha: number) {
  const [r = 0, g = 0, b = 0] = (color.match(/\d+(\.\d+)?/g) || []).map(Number);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
  // Colours of the page's top and bottom edges, worn by the notch and home-bar bands.
  const [edges, setEdges] = useState({ top: "rgb(0, 0, 0)", bottom: "rgb(0, 0, 0)" });
  const top = edges.top;
  const close = () => (router.canGoBack() ? router.back() : router.navigate("/"));

  return (
    <View style={[styles.root, { backgroundColor: top }]}>
      <StatusBar style={brightness(top) < 140 ? "light" : "dark"} animated />
      {entry?.url && !failed ? (
        <WebView
          ref={web}
          source={{ uri: entry.url }}
          // Framed between the notch and the home bar: the site pins its player controls and sheets to
          // the bottom without safe-area padding, and a content inset would push them off screen.
          style={[styles.web, { marginTop: insets.top, marginBottom: insets.bottom }]}
          injectedJavaScript={`${sampleEdgeColors}\n${holdForDoubleSpeed}`}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data) as { top?: string; bottom?: string };
              if (data.top && data.bottom) setEdges({ top: data.top, bottom: data.bottom });
            } catch { /* not ours */ }
          }}
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
      {/* The notch and home-bar bands wear the page's edge colours and melt a few points into it. */}
      <LinearGradient pointerEvents="none" colors={[withAlpha(top, 0.85), withAlpha(top, 0)]} style={[styles.fade, { top: insets.top }]} />
      <View pointerEvents="none" style={[styles.band, { bottom: 0, height: insets.bottom, backgroundColor: edges.bottom }]} />
      <LinearGradient pointerEvents="none" colors={[withAlpha(edges.bottom, 0), withAlpha(edges.bottom, 0.85)]} style={[styles.fade, { bottom: insets.bottom }]} />
      {loading && !failed ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.header} /> : null}
      {/* Just under the status bar, top right, where it is always in reach. */}
      <View style={[styles.pill, { top: insets.top + 6 }]}>
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
  root: { flex: 1 },
  web: { flex: 1, backgroundColor: "#000000" },
  band: { position: "absolute", left: 0, right: 0 },
  fade: { position: "absolute", left: 0, right: 0, height: 10 },
  fallback: { flex: 1, justifyContent: "center", backgroundColor: colors.bg },
  pill: { position: "absolute", right: 10, flexDirection: "row", alignItems: "center", height: 36, borderRadius: 18, paddingHorizontal: 2, backgroundColor: "rgba(15,23,42,0.38)", shadowColor: "#0F172A", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  pillBlur: { borderRadius: 18, overflow: "hidden" },
  pillButton: { width: 38, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  pressed: { backgroundColor: "rgba(255,255,255,0.18)" },
  divider: { width: StyleSheet.hairlineWidth, height: 16, backgroundColor: "rgba(255,255,255,0.45)" },
});
