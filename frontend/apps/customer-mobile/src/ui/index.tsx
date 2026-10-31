import { Ionicons } from "@expo/vector-icons";
import { Image, type ImageProps } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import Animated, { Easing, FadeInDown, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font, radius, shadow, space } from "../theme";
import { PageHeader, TopBar } from "./chrome";
import { haptic } from "./haptics";
import { ZxIcon, type ZxIconName } from "./icons";
import { GlassFill } from "./glass";
import { ServiceArt, ServiceTile } from "./service-icons";

export type IconName = ComponentProps<typeof Ionicons>["name"];
export { Ionicons, haptic, ZxIcon, type ZxIconName };
export { BackButton, DOCK_SPACE, PageHeader, ServicesGem, TopBar } from "./chrome";
export { ServiceArt, ServiceTile, servicePalettes } from "./service-icons";
export { Glass, GlassFill, LIQUID_GLASS } from "./glass";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
/** Page shell: PWA top bar + white (or soft grey) page background. */
export function Screen({ children, style, topbar = true, soft = false, edges = [] }: { children: ReactNode; style?: StyleProp<ViewStyle>; topbar?: boolean; soft?: boolean; edges?: Array<"top" | "bottom"> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, backgroundColor: soft ? colors.bgSoft : colors.bg, paddingTop: !topbar && edges.includes("top") ? insets.top : 0, paddingBottom: edges.includes("bottom") ? insets.bottom : 0 }, style]}>
      {topbar ? <TopBar /> : null}
      {children}
    </View>
  );
}

/** Kept for existing screens: same as the PWA `CustomerPageHeader`. */
export const Header = PageHeader;

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------
export function GlassCard({ children, style, padded = true, muted = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; muted?: boolean; blur?: boolean }) {
  return <View style={[styles.card, muted && styles.cardMuted, padded && { padding: 16 }, !muted && shadow("card"), style]}>{children}</View>;
}
export const Card = GlassCard;

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({ children, style, onPress, scaleTo = 0.97, hapticOnPress = true, disabled, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; hapticOnPress?: boolean; children?: ReactNode }) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(pressed.value, [0, 1], [1, scaleTo]) }] }));
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => { pressed.value = withSpring(1, { damping: 20, stiffness: 420 }); rest.onPressIn?.(event); }}
      onPressOut={(event) => { pressed.value = withSpring(0, { damping: 15, stiffness: 300 }); rest.onPressOut?.(event); }}
      onPress={(event) => { if (hapticOnPress) haptic.tap(); onPress?.(event); }}
      style={[style, animated, disabled && { opacity: 0.55 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "soft";
/** Liquid Glass button: tinted glass for prominent variants, clear glass for secondary. */
export function Button({ title, onPress, variant = "primary", icon, loading, disabled, style, small }: { title: string; onPress?: () => void; variant?: ButtonVariant; icon?: IconName; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const palette = {
    primary: { tint: "rgba(7,193,96,0.92)", fg: colors.white },
    secondary: { tint: undefined, fg: colors.ink },
    ghost: { tint: null, fg: colors.brandStrong },
    danger: { tint: "rgba(239,68,68,0.16)", fg: colors.dangerText },
    dark: { tint: "rgba(24,63,53,0.92)", fg: colors.white },
    soft: { tint: "rgba(15,175,122,0.16)", fg: colors.brandStrong },
  }[variant];
  const r = variant === "dark" ? 14 : 999;
  return (
    <PressableScale disabled={disabled || loading} onPress={onPress} style={[styles.button, small && styles.buttonSmall, { borderRadius: r }, style]}>
      {palette.tint !== null ? <GlassFill radius={r} tint={palette.tint} /> : null}
      {loading ? <ActivityIndicator color={palette.fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 14 : 17} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, small && { fontSize: 12 }, { color: palette.fg }]} numberOfLines={1}>{title}</Text>
        </>
      )}
    </PressableScale>
  );
}

export function IconButton({ icon, zx, onPress, badge, color = colors.ink, style, label }: { icon?: IconName; zx?: ZxIconName; onPress?: () => void; badge?: number; color?: string; style?: StyleProp<ViewStyle>; label?: string }) {
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress} style={[styles.iconButton, style]}>
      <GlassFill radius={12} />
      {zx ? <ZxIcon name={zx} size={19} color={color} /> : icon ? <Ionicons name={icon} size={19} color={color} /> : null}
      {badge ? <Badge value={badge} style={{ position: "absolute", top: -5, right: -5 }} /> : null}
    </PressableScale>
  );
}

export function Badge({ value, style, green }: { value: number; style?: StyleProp<ViewStyle>; green?: boolean }) {
  if (!value) return null;
  return <View style={[styles.badge, green && { backgroundColor: "#22C55E" }, style]}><Text style={styles.badgeText}>{value > 99 ? "99+" : value}</Text></View>;
}

/** Filter chip. `green` = services/notifications chips, `dark` = orders chips (with count). */
export function Chip({ label, active, onPress, count, icon, tone = "green", image }: { label: string; active?: boolean; onPress?: () => void; count?: number; icon?: IconName; tone?: "green" | "dark" | "soft"; image?: ReactNode }) {
  const dark = tone === "dark";
  const soft = tone === "soft";
  const activeBg = dark ? "rgba(24,63,53,0.92)" : "rgba(7,193,96,0.9)";
  return (
    <PressableScale onPress={() => { haptic.select(); onPress?.(); }} hapticOnPress={false} style={[styles.chip, dark && styles.chipDark, soft && styles.chipSoft]}>
      <GlassFill radius={999} tint={active ? activeBg : soft ? "rgba(241,245,244,0.6)" : undefined} />
      {image}
      {icon ? <Ionicons name={icon} size={14} color={active ? colors.white : "#475569"} /> : null}
      <Text style={[styles.chipText, dark && { fontSize: 11, fontWeight: "500", color: colors.textSecondary }, active && { color: colors.white }]}>{label}</Text>
      {count !== undefined ? <View style={[styles.chipCount, active && { backgroundColor: "rgba(255,255,255,0.2)" }]}><Text style={[styles.chipCountText, active && { color: colors.white }]}>{count}</Text></View> : null}
    </PressableScale>
  );
}

/** PWA `menuQuantity`: round − / value / green + */
export function QuantityStepper({ value, onChange, min = 0, max = 99, disabled }: { value: number; onChange: (next: number) => void; min?: number; max?: number; disabled?: boolean; compact?: boolean }) {
  return (
    <View style={styles.stepper}>
      <PressableScale disabled={disabled || value <= min} onPress={() => { haptic.select(); onChange(Math.max(min, value - 1)); }} hapticOnPress={false} style={styles.stepMinus}>
        <GlassFill radius={13} />
        <ZxIcon name="minus" size={14} color="#334155" strokeWidth={2.4} />
      </PressableScale>
      <Text style={styles.stepperValue}>{value}</Text>
      <PressableScale disabled={disabled || value >= max} onPress={() => { haptic.select(); onChange(Math.min(max, value + 1)); }} hapticOnPress={false} style={styles.stepPlus}>
        <GlassFill radius={13} tint="rgba(7,193,96,0.9)" />
        <ZxIcon name="plus" size={14} color={colors.white} strokeWidth={2.6} />
      </PressableScale>
    </View>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string; style?: StyleProp<TextStyle> }) {
  return (
    <View style={{ gap: 8 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput placeholderTextColor="#94A3B8" {...props} style={[styles.field, props.multiline && { minHeight: 88, textAlignVertical: "top", paddingTop: 14 }, style]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------
/** Service icon: the native gradient tile set (see `service-icons.tsx`). */
export function ServiceIcon({ code, size = 44 }: { code?: string | null; size?: number }) {
  return <ServiceTile code={code} size={size} shadow={size >= 34} />;
}

/** Same tile at badge size (services hub, module headers, tracker links). */
export function ServiceBadge({ code, size = 52 }: { code?: string | null; size?: number; mint?: boolean }) {
  return <ServiceTile code={code} size={size} />;
}

export function AppImage({ uri, style, fallbackCode, ...props }: Omit<ImageProps, "source"> & { uri?: string; fallbackCode?: string | null }) {
  if (!uri) return <ArtFallback code={fallbackCode} style={style as StyleProp<ViewStyle>} />;
  return <Image source={{ uri }} cachePolicy="memory-disk" transition={200} contentFit="cover" recyclingKey={uri} placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }} style={style} {...props} />;
}

/** No photo: the 3D service illustration scaled to the frame on a clean white backdrop with a faint neutral halo. */
function ArtFallback({ code, style }: { code?: string | null; style?: StyleProp<ViewStyle> }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const size = Math.max(28, Math.min(box.w, box.h) * 0.66);
  return (
    <View onLayout={(event) => setBox({ w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height })} style={[{ alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: colors.white }, style]}>
      <LinearGradient colors={["#FFFFFF", "#F4F6F8"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      {box.w ? (
        <>
          <View style={{ position: "absolute", width: size * 1.25, height: size * 1.25, borderRadius: size, backgroundColor: "#0F172A", opacity: 0.035 }} />
          <ServiceArt code={code} size={size} />
        </>
      ) : null}
    </View>
  );
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
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: "#E9EEF2" }, animated, style]} />;
}

export function SkeletonCard({ lines = 2, image = true }: { lines?: number; image?: boolean }) {
  return (
    <GlassCard style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      {image ? <Skeleton width={56} height={56} radius={15} /> : null}
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

/** PWA empty state (`orders.module.css .empty`). */
export function EmptyState({ icon, zx = "orders", title, body, action, onAction }: { icon?: IconName; zx?: ZxIconName; title: string; body?: string; action?: string; onAction?: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(280)}>
      <View style={[styles.empty, shadow("card")]}>
        <View style={styles.emptyIcon}>{icon ? <Ionicons name={icon} size={20} color={colors.brandDeep} /> : <ZxIcon name={zx} size={20} color={colors.brandDeep} />}</View>
        <Text style={styles.emptyTitle}>{title}</Text>
        {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
        {action ? <Button variant="dark" small title={action} onPress={onAction} style={{ marginTop: 14, alignSelf: "center", minHeight: 36 }} /> : null}
      </View>
    </Animated.View>
  );
}

export function ErrorState({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel: string }) {
  return <EmptyState icon="cloud-offline-outline" title={message} action={onRetry ? retryLabel : undefined} onAction={onRetry} />;
}

export function SectionTitle({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Pressable hitSlop={10} onPress={onAction}><Text style={styles.sectionAction}>{action} ›</Text></Pressable> : null}
    </View>
  );
}

export function Row({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={[{ fontSize: 13, color: colors.slate }, strong && { color: colors.ink, fontWeight: "700", fontSize: 14 }]}>{label}</Text>
      <Text style={[{ fontSize: 13, color: color || colors.ink, fontWeight: strong ? "800" : "600" }, strong && { fontSize: 18 }]}>{value}</Text>
    </View>
  );
}

export function StatusPill({ label, tone = "brand" }: { label: string; tone?: "brand" | "warning" | "danger" | "muted" }) {
  const palette = { brand: ["#D1FAE5", "#065F46"], warning: [colors.warningSoft, colors.warning], danger: [colors.dangerSoft, colors.dangerText], muted: ["#F1F5F9", colors.slate] }[tone];
  return <View style={[styles.pill, { backgroundColor: palette[0] }]}><Text style={[styles.pillText, { color: palette[1] }]}>{label}</Text></View>;
}

/** PWA profile menu row: white card, emoji/icon, label, chevron. */
export function ListRow({ icon, emoji, title, subtitle, onPress, right, tint = colors.brand }: { icon?: IconName; emoji?: string; title: string; subtitle?: string; onPress?: () => void; right?: ReactNode; tint?: string }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={styles.listRow}>
      {emoji ? <Text style={{ fontSize: 18, width: 26, textAlign: "center" }}>{emoji}</Text> : icon ? <Ionicons name={icon} size={19} color={tint} style={{ width: 26, textAlign: "center" }} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[font.tiny, { marginTop: 2, fontSize: 11 }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ?? <Text style={{ fontSize: 20, color: "#94A3B8" }}>›</Text>}
    </PressableScale>
  );
}

export const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, ...shadow("card") },
  cardMuted: { backgroundColor: colors.surfaceMuted },
  button: { minHeight: 48, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 18 },
  buttonSmall: { minHeight: 34, paddingHorizontal: 13 },
  buttonText: { fontSize: 15, fontWeight: "800" },
  iconButton: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badge: { minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.white },
  badgeText: { color: colors.white, fontSize: 8, fontWeight: "900" },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, height: 34, paddingHorizontal: 14, borderRadius: radius.pill },
  chipDark: { height: 30, paddingHorizontal: 9, gap: 6 },
  chipSoft: {},
  chipText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  chipCount: { minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: "#EEF0EE", alignItems: "center", justifyContent: "center" },
  chipCountText: { fontSize: 9, color: colors.textSecondary },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepMinus: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stepPlus: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stepperValue: { minWidth: 18, textAlign: "center", fontWeight: "700", fontSize: 13, color: colors.ink },
  fieldLabel: { fontSize: 13, color: colors.ink },
  field: { minHeight: 52, borderRadius: 18, backgroundColor: "#F2F5F8", paddingHorizontal: 16, fontSize: 15, color: colors.text, ...shadow("card") },
  empty: { alignItems: "center", paddingVertical: 22, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.white, ...shadow("card") },
  emptyIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.brandMint, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "center" },
  emptyBody: { fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 4, lineHeight: 17 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  sectionAction: { color: "#2E7D63", fontWeight: "600", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontSize: 10, fontWeight: "700" },
  listRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.white, ...shadow("card") },
});

void space;
