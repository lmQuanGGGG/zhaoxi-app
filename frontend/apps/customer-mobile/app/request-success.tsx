import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, ZoomIn } from "react-native-reanimated";
import { createPayment, getPayments, reportPayment } from "../src/api/endpoints";
import { useI18n } from "../src/i18n";
import { registerForPush } from "../src/notifications";
import { colors, font, radius, space } from "../src/theme";
import { Button, GlassCard, Ionicons, Screen, haptic } from "../src/ui";

export default function RequestSuccess() {
  const { id, code, partner, payment, reported } = useLocalSearchParams<{ id: string; code: string; partner?: string; payment?: string; reported?: string }>();
  const { t, locale } = useI18n();
  const ring = useSharedValue(0.6);

  useEffect(() => {
    haptic.success();
    ring.value = withSequence(withSpring(1.08, { damping: 8 }), withDelay(120, withSpring(1)));
    // Good moment to ask for notification permission: the user wants status updates now.
    void registerForPush(locale, true);
    // Bank transfer: make sure a payment record exists and report the transfer (same as the PWA success page).
    if (payment === "bank_transfer" && id) {
      void (async () => {
        const existing = (await getPayments(id).catch(() => []))[0];
        const record = existing || (await createPayment(id, "bank_transfer").catch(() => null));
        if (record && reported === "1") await reportPayment(record.id).catch(() => undefined);
      })();
    }
  }, [id, locale, payment, reported, ring]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ring.value }] }));

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={styles.body}>
        <Animated.View style={[styles.ring, ringStyle]}>
          <Animated.View entering={ZoomIn.delay(52).duration(200)} style={styles.check}>
            <Ionicons name="checkmark" size={54} color={colors.white} />
          </Animated.View>
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(88).duration(200)} style={[font.h1, { textAlign: "center", marginTop: space.xl }]}>{t.success.title}</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(112).duration(200)} style={[font.small, { textAlign: "center", marginTop: 8, lineHeight: 20 }]}>{t.success.body}</Animated.Text>
        <Animated.View entering={FadeInDown.delay(140).duration(200)} style={{ alignSelf: "stretch", marginTop: space.xl }}>
          <GlassCard style={{ gap: 12 }}>
            <View style={styles.line}><Text style={font.small}>{t.success.code}</Text><Text style={styles.code}>{code}</Text></View>
            {partner ? <View style={styles.line}><Text style={font.small}>{t.success.partner}</Text><Text style={font.h3} numberOfLines={1}>{partner}</Text></View> : null}
          </GlassCard>
        </Animated.View>
      </View>
      <View style={{ padding: space.lg, gap: 10 }}>
        <Button title={t.success.track} icon="navigate" onPress={() => router.replace(`/order/${id}`)} />
        <Button title={t.success.home} variant="secondary" onPress={() => router.replace("/")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xl },
  ring: { width: 132, height: 132, borderRadius: 66, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
  check: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  code: { fontSize: 16, fontWeight: "900", color: colors.brandStrong, letterSpacing: 0.5, backgroundColor: colors.brandSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, overflow: "hidden" },
});
