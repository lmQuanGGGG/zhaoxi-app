import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ensureSession, loadAuth, useAuth, isGuest } from "../src/api/client";
import { hydrateCart } from "../src/cart";
import { deviceLocale, I18nProvider, loadStoredLocale, type ZhaoXiLocale } from "../src/i18n";
import { hydrateLocation } from "../src/location";
import { configureNotificationChannels, registerForPush, useNotificationRouting } from "../src/notifications";
import { CACHE_BUSTER, persister, queryClient } from "../src/query";
import { ONBOARDING_KEY } from "../src/constants";
import { colors } from "../src/theme";
import { ToastHost } from "../src/ui/toast";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 250, fade: true });

export default function RootLayout() {
  const [boot, setBoot] = useState<{ locale: ZhaoXiLocale; onboarded: boolean } | null>(null);

  useEffect(() => {
    // Everything local first: the UI renders from cache immediately, network follows.
    void Promise.all([loadStoredLocale(), loadAuth(), hydrateCart(), hydrateLocation(), AsyncStorage.getItem(ONBOARDING_KEY)])
      .then(([storedLocale, , , , onboarded]) => {
        const locale = storedLocale || deviceLocale();
        setBoot({ locale, onboarded: onboarded === "1" });
        void ensureSession(locale);
        void configureNotificationChannels();
      })
      .catch(() => setBoot({ locale: deviceLocale(), onboarded: true }));
  }, []);

  if (!boot) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, buster: CACHE_BUSTER, maxAge: 1000 * 60 * 60 * 24 * 3 }}
          onSuccess={() => void SplashScreen.hideAsync().catch(() => undefined)}
        >
          <I18nProvider initialLocale={boot.locale}>
            <AppNavigator onboarded={boot.onboarded} locale={boot.locale} />
          </I18nProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppNavigator({ onboarded, locale }: { onboarded: boolean; locale: ZhaoXiLocale }) {
  const auth = useAuth();
  const [navigationReady, setNavigationReady] = useState(false);
  useNotificationRouting(navigationReady);

  useEffect(() => {
    setNavigationReady(true);
    // Re-check storage: the boot snapshot is stale if this navigator remounts after onboarding.
    if (!onboarded) void AsyncStorage.getItem(ONBOARDING_KEY).then((done) => { if (done !== "1") router.replace("/onboarding"); });
    const timer = setTimeout(() => void SplashScreen.hideAsync().catch(() => undefined), 600);
    return () => clearTimeout(timer);
  }, [onboarded]);

  // Re-bind the push token whenever the identity changes (guest → signed in).
  useEffect(() => {
    if (auth?.session.userId) void registerForPush(locale, false);
  }, [auth?.session.userId, isGuest(auth), locale]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: "default", gestureEnabled: true }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="login" options={{ presentation: "modal" }} />
        <Stack.Screen name="cart" options={{ presentation: "card" }} />
        <Stack.Screen name="request-success" options={{ animation: "fade_from_bottom", gestureEnabled: false }} />
        <Stack.Screen name="language" options={{ presentation: "formSheet", sheetAllowedDetents: [0.55, 0.9], sheetGrabberVisible: true, sheetCornerRadius: 28 }} />
      </Stack>
      <ToastHost />
    </>
  );
}
