import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "ZhaoXi Partner",
  slug: "zhaoxi-partner",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "zhaoxi-partner",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "vn.zhaoxi.partner",
    infoPlist: { UIBackgroundModes: ["remote-notification"] },
  },
  android: {
    package: "vn.zhaoxi.partner",
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#063c2b" },
    permissions: ["POST_NOTIFICATIONS", "VIBRATE", "WAKE_LOCK", "RECEIVE_BOOT_COMPLETED"],
  },
  plugins: [
    "expo-secure-store",
    ["expo-notifications", { sounds: ["./assets/order_alert.wav"], color: "#0b8f55", defaultChannel: "new-orders" }],
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://zhaoxi-app-puce.vercel.app",
    eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "" },
  },
};

export default config;
