import { Tabs } from "expo-router/js-tabs";

// The PWA's floating dock (src/ui/chrome.tsx `Dock`) is rendered once in the
// root layout so it also floats over pushed screens, exactly like the web app.
export default function TabsLayout() {
  return (
    <Tabs tabBar={() => null} screenOptions={{ headerShown: false, animation: "fade", lazy: true }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
