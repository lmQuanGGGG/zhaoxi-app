import type { ImageSourcePropType } from "react-native";

// Ảnh dùng trong giao diện Partner. Bản mini app (images.miniapp.ts) nhúng bản thu nhỏ dạng base64
// vì runtime mini app chưa hỗ trợ asset cục bộ.
export const images: Record<"icon" | "grab" | "greenSm", ImageSourcePropType> = {
  icon: require("../assets/icon.png"),
  grab: require("../assets/grab.png"),
  greenSm: require("../assets/green-sm.png"),
};
