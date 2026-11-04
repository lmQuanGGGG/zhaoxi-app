import { MiniAppProvider, type MiniAppProps } from "@zhaoxi/miniapp-sdk";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/api/client";
import { useI18n } from "../../src/i18n";
import { buildMiniAppContext, createMiniAppBridge } from "../../src/miniapps/bridge";
import { CAPSULE, containerCopy, MiniAppCapsuleButton, MiniAppErrorBoundary, MiniAppFailure, MiniAppLoading } from "../../src/miniapps/container";
import { loadMiniApp, MiniAppIntegrityError, MiniAppLoadError, type LoadedMiniApp, type LoadStep } from "../../src/miniapps/loader";
import { useMiniAppAccess } from "../../src/miniapps/access";
import { decodeLaunchKey } from "../../src/miniapps/launch";
import { findMiniApp, markMiniAppOpen } from "../../src/miniapps/registry";
import { colors } from "../../src/theme";

type State = { phase: "loading"; step: LoadStep } | { phase: "ready"; loaded: LoadedMiniApp } | { phase: "error"; error: unknown };

/** Màn chứa mini app: toàn màn hình, nút kính đóng, chờ tải, error boundary. */
export default function MiniAppScreen() {
  const { id, ...params } = useLocalSearchParams<{ id: string }>();
  const launchKey = JSON.stringify(params);
  // Mọi query param ngoài `id` là tham số mở mini app (deep link / push).
  const launch = useMemo<Record<string, string>>(() => {
    const parsed = JSON.parse(launchKey) as Record<string, string | string[] | undefined>;
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [decodeLaunchKey(key), Array.isArray(value) ? value.join(",") : String(value ?? "")]));
  }, [launchKey]);
  const entry = findMiniApp(id);
  const access = useMiniAppAccess();
  // Deep link / push cũng đi qua đây: mini app có `audience` chỉ tải khi tài khoản thuộc nhóm đó.
  const allowed = entry ? access.canOpen(entry) : false;
  const { locale } = useI18n();
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const c = containerCopy[locale];
  const [state, setState] = useState<State>({ phase: "loading", step: "manifest" });
  const [attempt, setAttempt] = useState(0);
  const capsuleTop = insets.top + CAPSULE.gap;

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, []);

  useEffect(() => (entry ? markMiniAppOpen(entry.id) : undefined), [entry]);

  useEffect(() => {
    if (!entry || !allowed) return;
    let active = true;
    setState({ phase: "loading", step: "manifest" });
    loadMiniApp(entry, (step) => active && setState({ phase: "loading", step }))
      .then((loaded) => active && setState({ phase: "ready", loaded }))
      .catch((error: unknown) => {
        console.warn(`[miniapp] ${entry.id}`, error);
        if (active) setState({ phase: "error", error });
      });
    return () => {
      active = false;
    };
  }, [entry, allowed, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const loaded = state.phase === "ready" ? state.loaded : null;
  const bridge = useMemo(() => (loaded ? createMiniAppBridge(loaded.manifest, close) : null), [loaded, close]);
  const props = useMemo<MiniAppProps | null>(() => {
    if (!loaded || !bridge) return null;
    const capsule = { top: capsuleTop, right: CAPSULE.right, width: CAPSULE.width, height: CAPSULE.height };
    return { context: buildMiniAppContext({ manifest: loaded.manifest, source: loaded.source, locale, auth, capsule, launch }), bridge };
  }, [loaded, bridge, locale, auth, capsuleTop, launch]);

  const showMenu = () => {
    if (!entry) return;
    const about = loaded ? `${c.about} ${loaded.manifest.version} · ${c.source[loaded.source]}${loaded.signed ? "" : ` · ${c.unsigned}`}` : c.steps.manifest;
    Alert.alert(entry.title[locale], `${about}\n${entry.id}`, [
      { text: c.reload, onPress: () => reload() },
      { text: c.close, style: "destructive", onPress: close },
      { text: c.cancel, style: "cancel" },
    ]);
  };

  let body: ReactNode;
  if (!entry) {
    body = <MiniAppFailure locale={locale} title={c.failTitle} message={c.unknown} onClose={close} />;
  } else if (!access.ready) {
    body = <MiniAppLoading entry={entry} locale={locale} step="manifest" />;
  } else if (!allowed) {
    body = <MiniAppFailure entry={entry} locale={locale} title={c.failTitle} message={c.forbidden} onClose={close} />;
  } else if (state.phase === "loading") {
    body = <MiniAppLoading entry={entry} locale={locale} step={state.step} />;
  } else if (state.phase === "error") {
    const error = state.error;
    const message = error instanceof MiniAppIntegrityError || (error instanceof MiniAppLoadError && error.kind === "integrity") ? c.integrity : error instanceof MiniAppLoadError && error.kind === "offline" ? c.offline : c.generic;
    body = <MiniAppFailure entry={entry} locale={locale} title={c.failTitle} message={message} detail={error instanceof Error ? error.message : String(error)} onRetry={() => reload()} onClose={close} />;
  } else if (props && loaded) {
    const MiniApp = loaded.Component;
    body = (
      <MiniAppErrorBoundary
        key={attempt}
        onError={(error, info) => console.warn(`[miniapp] ${entry.id} crashed`, error, info.componentStack)}
        fallback={(error) => <MiniAppFailure entry={entry} locale={locale} title={c.crashTitle} message={c.generic} detail={error.message} onRetry={() => reload()} onClose={close} />}
      >
        <MiniAppProvider value={props}>
          <MiniApp {...props} />
        </MiniAppProvider>
      </MiniAppErrorBoundary>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style={entry?.chrome === "dark" ? "dark" : "light"} />
      {body}
      <MiniAppCapsuleButton top={capsuleTop} chrome={entry?.chrome ?? "light"} onMore={showMenu} onClose={close} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSoft },
});
