import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image, type ImageProps } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import Animated, { Easing, FadeInDown, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font, radius, serviceColors, shadow, space } from "../theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];
export { Ionicons };

export const haptic = {
  tap: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); },
  select: () => { void Haptics.selectionAsync().catch(() => undefined); },
  success: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined); },
  warn: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined); },
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={["#E9F7F1", colors.bg, colors.bg]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.orb, { top: -120, right: -90, backgroundColor: "rgba(15,175,122,0.14)" }]} />
      <View style={[styles.orb, { top: 160, left: -140, width: 260, height: 260, backgroundColor: "rgba(56,133,184,0.08)" }]} />
    </View>
  );
}

export function Screen({ children, style, edges = ["top"] }: { children: ReactNode; style?: StyleProp<ViewStyle>; edges?: Array<"top" | "bottom"> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg, paddingTop: edges.includes("top") ? insets.top : 0, paddingBottom: edges.includes("bottom") ? insets.bottom : 0 }, style]}>
      <Backdrop />
      {children}
    </View>
  );
}

export function Header({ title, subtitle, eyebrow = "ZHAOXI", back = true, right, onBack }: { title: string; subtitle?: string; eyebrow?: string | null; back?: boolean; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {back && (
        <PressableScale accessibilityLabel="Back" onPress={() => (onBack ? onBack() : router.canGoBack() ? router.back() : router.replace("/"))} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={[font.h1, { fontSize: 24 }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[font.small, { marginTop: 2 }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={{ flexDirection: "row", gap: 8 }}>{right}</View> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------
export function GlassCard({ children, style, padded = true, blur = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; blur?: boolean }) {
  return (
    <View style={[styles.card, padded && { padding: space.lg }, shadow(1), style]}>
      {blur && Platform.OS === "ios" ? <BlurView intensity={30} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]} /> : null}
      {children}
    </View>
  );
}

export function GlassBar({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.glassBar, style]}>
      {Platform.OS === "ios" ? <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.96)" }]} />}
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({ children, style, onPress, scaleTo = 0.96, hapticOnPress = true, disabled, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; hapticOnPress?: boolean; children?: ReactNode }) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(pressed.value, [0, 1], [1, scaleTo]) }], opacity: interpolate(pressed.value, [0, 1], [1, 0.92]) }));
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => { pressed.value = withSpring(1, { damping: 20, stiffness: 400 }); rest.onPressIn?.(event); }}
      onPressOut={(event) => { pressed.value = withSpring(0, { damping: 15, stiffness: 300 }); rest.onPressOut?.(event); }}
      onPress={(event) => { if (hapticOnPress) haptic.tap(); onPress?.(event); }}
      style={[style, animated, disabled && { opacity: 0.5 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({ title, onPress, variant = "primary", icon, loading, disabled, style, small }: { title: string; onPress?: () => void; variant?: ButtonVariant; icon?: IconName; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const palette = {
    primary: { bg: colors.brand, fg: colors.white, border: colors.brand },
    secondary: { bg: colors.white, fg: colors.brandStrong, border: colors.border },
    ghost: { bg: "transparent", fg: colors.brandStrong, border: "transparent" },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  }[variant];
  return (
    <PressableScale disabled={disabled || loading} onPress={onPress} style={[styles.button, small && styles.buttonSmall, { backgroundColor: palette.bg, borderColor: palette.border }, variant === "primary" && shadow(2), style]}>
      {variant === "primary" && <LinearGradient colors={["#19C08A", colors.brandStrong]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: small ? radius.md : radius.lg }]} />}
      {loading ? <ActivityIndicator color={palette.fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 15 : 18} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: palette.fg }]} numberOfLines={1}>{title}</Text>
        </>
      )}
    </PressableScale>
  );
}

export function IconButton({ icon, onPress, badge, color = colors.text, style, label }: { icon: IconName; onPress?: () => void; badge?: number; color?: string; style?: StyleProp<ViewStyle>; label?: string }) {
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress} style={[styles.iconButton, style]}>
      <Ionicons name={icon} size={20} color={color} />
      {badge ? <Badge value={badge} style={{ position: "absolute", top: -3, right: -3 }} /> : null}
    </PressableScale>
  );
}

export function Badge({ value, style }: { value: number; style?: StyleProp<ViewStyle> }) {
  if (!value) return null;
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{value > 99 ? "99+" : value}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress, count, icon }: { label: string; active?: boolean; onPress?: () => void; count?: number; icon?: IconName }) {
  return (
    <PressableScale onPress={() => { haptic.select(); onPress?.(); }} hapticOnPress={false} style={[styles.chip, active && styles.chipActive]}>
      {icon ? <Ionicons name={icon} size={14} color={active ? colors.white : colors.textSecondary} /> : null}
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}</Text>
      {count ? <Text style={[styles.chipCount, active && { color: "rgba(255,255,255,0.85)" }]}>{count}</Text> : null}
    </PressableScale>
  );
}

export function QuantityStepper({ value, onChange, min = 0, max = 99, disabled, compact }: { value: number; onChange: (next: number) => void; min?: number; max?: number; disabled?: boolean; compact?: boolean }) {
  const size = compact ? 28 : 34;
  return (
    <View style={styles.stepper}>
      <PressableScale disabled={disabled || value <= min} onPress={() => { haptic.select(); onChange(Math.max(min, value - 1)); }} hapticOnPress={false} style={[styles.stepperButton, { width: size, height: size }]}>
        <Ionicons name="remove" size={18} color={colors.brandStrong} />
      </PressableScale>
      <Text style={styles.stepperValue}>{value}</Text>
      <PressableScale disabled={disabled || value >= max} onPress={() => { haptic.select(); onChange(Math.min(max, value + 1)); }} hapticOnPress={false} style={[styles.stepperButton, styles.stepperPlus, { width: size, height: size }]}>
        <Ionicons name="add" size={18} color={colors.white} />
      </PressableScale>
    </View>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string; style?: StyleProp<TextStyle> }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.textMuted} {...props} style={[styles.field, props.multiline && { minHeight: 84, textAlignVertical: "top", paddingTop: 12 }, style]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------
const serviceAssets: Record<string, number> = {
  food: require("../../assets/services/food.webp"),
  housing: require("../../assets/services/housing.webp"),
  visa: require("../../assets/services/visa.webp"),
  "car-rental": require("../../assets/services/car-rental.webp"),
  translation: require("../../assets/services/translation.webp"),
  travel: require("../../assets/services/travel.webp"),
  payment: require("../../assets/services/payment.webp"),
  community: require("../../assets/services/community.webp"),
  market: require("../../assets/services/market.webp"),
  emergency: require("../../assets/services/emergency.webp"),
};

export function ServiceIcon({ code, size = 44 }: { code?: string | null; size?: number }) {
  const asset = serviceAssets[code || ""];
  if (!asset) return <Ionicons name="grid" size={size * 0.6} color={colors.brand} />;
  return <Image source={asset} style={{ width: size, height: size }} contentFit="contain" />;
}

export function ServiceBadge({ code, size = 52 }: { code?: string | null; size?: number }) {
  const palette = serviceColors[code || ""] || { accent: colors.brand, tint: colors.brandSoft };
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: palette.tint, alignItems: "center", justifyContent: "center" }}>
      <ServiceIcon code={code} size={size * 0.72} />
    </View>
  );
}

export function AppImage({ uri, style, fallbackCode, ...props }: Omit<ImageProps, "source"> & { uri?: string; fallbackCode?: string | null }) {
  if (!uri) {
    const palette = serviceColors[fallbackCode || ""] || { accent: colors.brand, tint: colors.brandSoft };
    return (
      <View style={[{ backgroundColor: palette.tint, alignItems: "center", justifyContent: "center", overflow: "hidden" }, style as StyleProp<ViewStyle>]}>
        <ServiceIcon code={fallbackCode} size={36} />
      </View>
    );
  }
  return <Image source={{ uri }} cachePolicy="memory-disk" transition={220} contentFit="cover" recyclingKey={uri} placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }} style={style} {...props} />;
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------
export function Skeleton({ width = "100%", height = 16, radius: r = 10, style }: { width?: ViewStyle["width"]; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [progress]);
  const animated = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [0.45, 1]) }));
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: "#E4ECE9" }, animated, style]} />;
}

export function SkeletonCard({ lines = 2, image = true }: { lines?: number; image?: boolean }) {
  return (
    <GlassCard style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      {image ? <Skeleton width={64} height={64} radius={16} /> : null}
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="70%" height={14} />
        {Array.from({ length: lines }).map((_, index) => <Skeleton key={index} width={`${85 - index * 20}%`} height={11} />)}
      </View>
    </GlassCard>
  );
}

export function SkeletonList({ count = 4, image = true }: { count?: number; image?: boolean }) {
  return <View style={{ gap: 12 }}>{Array.from({ length: count }).map((_, index) => <SkeletonCard key={index} image={image} />)}</View>;
}

export function EmptyState({ icon = "sparkles-outline", title, body, action, onAction }: { icon?: IconName; title: string; body?: string; action?: string; onAction?: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(320)}>
      <GlassCard style={{ alignItems: "center", paddingVertical: 36, gap: 10 }}>
        <View style={styles.emptyIcon}><Ionicons name={icon} size={30} color={colors.brand} /></View>
        <Text style={[font.h2, { textAlign: "center" }]}>{title}</Text>
        {body ? <Text style={[font.small, { textAlign: "center", lineHeight: 18 }]}>{body}</Text> : null}
        {action ? <Button title={action} onPress={onAction} style={{ marginTop: 8, alignSelf: "stretch" }} /> : null}
      </GlassCard>
    </Animated.View>
  );
}

export function ErrorState({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel: string }) {
  return <EmptyState icon="cloud-offline-outline" title={message} action={onRetry ? retryLabel : undefined} onAction={onRetry} />;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={font.h2}>{title}</Text>
      {action ? (
        <Pressable hitSlop={10} onPress={onAction}><Text style={styles.sectionAction}>{action} ›</Text></Pressable>
      ) : null}
    </View>
  );
}

export function Row({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={[font.small, strong && { color: colors.text, fontWeight: "700", fontSize: 14 }]}>{label}</Text>
      <Text style={[{ fontSize: 13, color: color || colors.text, fontWeight: strong ? "800" : "600" }, strong && { fontSize: 17 }]}>{value}</Text>
    </View>
  );
}

export function StatusPill({ label, tone = "brand" }: { label: string; tone?: "brand" | "warning" | "danger" | "muted" }) {
  const palette = { brand: [colors.brandSoft, colors.brandStrong], warning: [colors.warningSoft, colors.warning], danger: [colors.dangerSoft, colors.danger], muted: ["#EEF2F1", colors.textSecondary] }[tone];
  return <View style={[styles.pill, { backgroundColor: palette[0] }]}><Text style={[styles.pillText, { color: palette[1] }]}>{label}</Text></View>;
}

export function ListRow({ icon, title, subtitle, onPress, right, tint = colors.brand }: { icon: IconName; title: string; subtitle?: string; onPress?: () => void; right?: ReactNode; tint?: string }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.listRow}>
      <View style={[styles.listIcon, { backgroundColor: `${tint}1A` }]}><Ionicons name={icon} size={19} color={tint} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={font.h3} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[font.tiny, { marginTop: 2 }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </PressableScale>
  );
}

export const styles = StyleSheet.create({
  orb: { position: "absolute", width: 320, height: 320, borderRadius: 999 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4, color: colors.brand },
  backButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft, alignItems: "center", justifyContent: "center", ...shadow(1) },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.glassBorder, overflow: Platform.OS === "android" ? "hidden" : "visible" },
  glassBar: { overflow: "hidden", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  button: { minHeight: 50, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18, overflow: "hidden" },
  buttonSmall: { minHeight: 36, borderRadius: radius.md, paddingHorizontal: 12 },
  buttonText: { fontSize: 15, fontWeight: "800" },
  iconButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.borderSoft, ...shadow(1) },
  badge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.white },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  chipCount: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepperButton: { borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandSoft },
  stepperPlus: { backgroundColor: colors.brand },
  stepperValue: { minWidth: 20, textAlign: "center", fontWeight: "800", fontSize: 15, color: colors.text },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  field: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 14, fontSize: 15, color: colors.text },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.xl, marginBottom: space.md },
  sectionAction: { color: colors.brandStrong, fontWeight: "700", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontSize: 11, fontWeight: "800" },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  listIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
