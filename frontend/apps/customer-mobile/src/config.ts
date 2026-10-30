import Constants from "expo-constants";

const configured = String(process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || "https://zhaoxi-app-puce.vercel.app");
export const API_URL = configured.replace(/\/+$/, "");
export const APP_VERSION = Constants.expoConfig?.version || "1.0.0";
