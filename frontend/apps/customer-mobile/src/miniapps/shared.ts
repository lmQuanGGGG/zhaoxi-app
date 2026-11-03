/* eslint-disable @typescript-eslint/no-require-imports */
import sharedManifest from "@zhaoxi/miniapp-sdk/shared-modules.json";

/**
 * Module host chia sẻ cho mini app (tương đương `shared` singleton của Module
 * Federation bên VSP). Mỗi khoá phải trùng một mục trong
 * `@zhaoxi/miniapp-sdk/shared-modules.json`: mini app build ra stub
 * `__zxShared("<khoá>")` và nhận đúng instance của host ở đây.
 *
 * `require` để trong hàm: chỉ nạp khi có mini app cần (expo-notifications,
 * image-picker… không chạy thêm lúc host khởi động). Metro cần chuỗi tĩnh nên
 * không thể sinh bảng này từ file JSON.
 */
const sharedModules: Record<string, () => unknown> = {
  react: () => require("react"),
  "react/jsx-runtime": () => require("react/jsx-runtime"),
  "react/jsx-dev-runtime": () => require("react/jsx-dev-runtime"),
  "react-native": () => require("react-native"),
  "@zhaoxi/miniapp-sdk": () => require("@zhaoxi/miniapp-sdk"),
  "react-native-safe-area-context": () => require("react-native-safe-area-context"),
  "react-native-gesture-handler": () => require("react-native-gesture-handler"),
  "react-native-reanimated": () => require("react-native-reanimated"),
  "react-native-worklets": () => require("react-native-worklets"),
  "react-native-svg": () => require("react-native-svg"),
  "react-native-screens": () => require("react-native-screens"),
  "react-native-webview": () => require("react-native-webview"),
  "@react-native-async-storage/async-storage": () => require("@react-native-async-storage/async-storage"),
  "@expo/vector-icons": () => require("@expo/vector-icons"),
  "@expo/vector-icons/Ionicons": () => require("@expo/vector-icons/Ionicons"),
  "expo-modules-core": () => require("expo-modules-core"),
  "expo-application": () => require("expo-application"),
  "expo-blur": () => require("expo-blur"),
  "expo-clipboard": () => require("expo-clipboard"),
  "expo-constants": () => require("expo-constants"),
  "expo-device": () => require("expo-device"),
  "expo-glass-effect": () => require("expo-glass-effect"),
  "expo-haptics": () => require("expo-haptics"),
  "expo-image": () => require("expo-image"),
  "expo-image-manipulator": () => require("expo-image-manipulator"),
  "expo-image-picker": () => require("expo-image-picker"),
  "expo-linear-gradient": () => require("expo-linear-gradient"),
  "expo-linking": () => require("expo-linking"),
  "expo-localization": () => require("expo-localization"),
  "expo-location": () => require("expo-location"),
  "expo-notifications": () => require("expo-notifications"),
  "expo-secure-store": () => require("expo-secure-store"),
  "expo-status-bar": () => require("expo-status-bar"),
};

export const SHARED_RUNTIME = sharedManifest.runtime;

/** Trả module host cho stub `__zxShared(name)` trong bundle mini app. */
export function requireShared(name: string): unknown {
  const load = sharedModules[name];
  if (!load) throw new Error(`Host ZhaoXi không chia sẻ "${name}" (runtime ${SHARED_RUNTIME}). Thêm vào src/miniapps/shared.ts và shared-modules.json.`);
  return load();
}

if (__DEV__) {
  // Hai danh sách phải khớp: thiếu bên host thì mini app vỡ lúc chạy, thừa thì mini app không build ra stub.
  const declared = new Set(sharedManifest.modules);
  const provided = Object.keys(sharedModules);
  const missing = sharedManifest.modules.filter((name) => !(name in sharedModules));
  const extra = provided.filter((name) => !declared.has(name));
  if (missing.length || extra.length) console.warn(`[miniapp] shared module lệch: thiếu ${missing.join(", ") || "-"}; thừa ${extra.join(", ") || "-"}`);
}
