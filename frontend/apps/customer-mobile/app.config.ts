import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "ZhaoXi",
  slug: "zhaoxi",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "zhaoxi",
  backgroundColor: "#F7FAF9",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "vn.zhaoxi.app",
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription: "ZhaoXi dùng vị trí để tìm nhà hàng, dịch vụ gần bạn và tính phí giao hàng.",
      UIApplicationSceneManifest: {
        UIApplicationSupportsMultipleScenes: false,
        UISceneConfigurations: {
          UIWindowSceneSessionRoleApplication: [
            {
              UISceneConfigurationName: "Default Configuration",
              UISceneDelegateClassName: "EXExpoAppSceneDelegate",
            },
          ],
        },
      },
    },
  },
  android: {
    package: "vn.zhaoxi.app",
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#0FAF7A" },
    permissions: ["POST_NOTIFICATIONS", "VIBRATE", "ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
    blockedPermissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    ["expo-splash-screen", { image: "./assets/splash-icon.png", imageWidth: 160, backgroundColor: "#F7FAF9" }],
    ["expo-notifications", { color: "#0FAF7A", defaultChannel: "orders" }],
    ["expo-location", { locationWhenInUsePermission: "ZhaoXi dùng vị trí để tìm nhà hàng, dịch vụ gần bạn và tính phí giao hàng." }],
    ["expo-image-picker", { photosPermission: "ZhaoXi cần truy cập ảnh để bạn gửi ảnh trong tin nhắn đơn hàng.", cameraPermission: "ZhaoXi cần dùng camera để bạn chụp và gửi ảnh trong tin nhắn đơn hàng.", microphonePermission: false }],
    "./plugins/with-ios-scene-lifecycle",
  ],
  experiments: { typedRoutes: false },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://zhaoxi-app-puce.vercel.app",
    eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || undefined },
  },
};

export default config;
