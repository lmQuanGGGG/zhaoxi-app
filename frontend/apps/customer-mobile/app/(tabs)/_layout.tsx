import { Ionicons } from "@expo/vector-icons";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnread } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { colors } from "../../src/theme";
import { Badge, GlassBar, haptic, type IconName } from "../../src/ui";

const icons: Record<string, [IconName, IconName]> = {
  index: ["home-outline", "home"],
  explore: ["compass-outline", "compass"],
  messages: ["chatbubbles-outline", "chatbubbles"],
  orders: ["receipt-outline", "receipt"],
  profile: ["person-circle-outline", "person-circle"],
};

export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false, animation: "shift", lazy: true }}>
      <Tabs.Screen name="index" options={{ title: t.tabs.home }} />
      <Tabs.Screen name="explore" options={{ title: t.tabs.explore }} />
      <Tabs.Screen name="messages" options={{ title: t.tabs.messages }} />
      <Tabs.Screen name="orders" options={{ title: t.tabs.orders }} />
      <Tabs.Screen name="profile" options={{ title: t.tabs.profile }} />
    </Tabs>
  );
}

function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unread = useUnread();
  return (
    <GlassBar style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key]?.options;
        const label = String(options?.title || route.name);
        const badge = route.name === "messages" ? unread.data?.messages || 0 : 0;
        return (
          <TabItem
            key={route.key}
            label={label}
            icon={icons[route.name] || ["ellipse-outline", "ellipse"]}
            focused={focused}
            badge={badge}
            onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                haptic.select();
                navigation.navigate(route.name, route.params);
              }
            }}
          />
        );
      })}
    </GlassBar>
  );
}

function TabItem({ label, icon, focused, badge, onPress }: { label: string; icon: [IconName, IconName]; focused: boolean; badge: number; onPress: () => void }) {
  const progress = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, { damping: 16, stiffness: 220 });
  }, [focused, progress]);
  const pill = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: 0.6 + progress.value * 0.4 }] }));
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: -2 * progress.value }] }));
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} onPress={onPress} style={styles.item}>
      <Animated.View style={[styles.iconWrap, lift]}>
        <Animated.View style={[styles.pill, pill]} />
        <Ionicons name={focused ? icon[1] : icon[0]} size={22} color={focused ? colors.brandStrong : colors.textMuted} />
        {badge ? <Badge value={badge} style={{ position: "absolute", top: -4, right: 2 }} /> : null}
      </Animated.View>
      <Text style={[styles.label, focused && { color: colors.brandStrong, fontWeight: "800" }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", paddingTop: 8, paddingHorizontal: 6, position: "absolute", left: 0, right: 0, bottom: 0 },
  item: { flex: 1, alignItems: "center", gap: 3 },
  iconWrap: { width: 52, height: 32, alignItems: "center", justifyContent: "center" },
  pill: { ...StyleSheet.absoluteFill, borderRadius: 16, backgroundColor: colors.brandSoft },
  label: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
});
