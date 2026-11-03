import { SafeAreaProvider } from "react-native-safe-area-context";
import { installNotificationHandler } from "./src/notifications";
import { PartnerApp } from "./src/PartnerApp";

// App ZhaoXi Partner độc lập. Cùng giao diện chạy như mini app trong ZhaoXi qua src/miniapp.tsx.
installNotificationHandler();

export default function App() {
  return (
    <SafeAreaProvider>
      <PartnerApp/>
    </SafeAreaProvider>
  );
}
