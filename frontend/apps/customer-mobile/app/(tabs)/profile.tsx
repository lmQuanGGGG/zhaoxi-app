import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { logout } from "../../src/api/client";
import { getProfile } from "../../src/api/endpoints";
import { APP_VERSION } from "../../src/config";
import { TAB_BAR_SPACE } from "../../src/constants";
import { useSession, useUnread } from "../../src/hooks";
import { localeLabels, useI18n } from "../../src/i18n";
import { getPromotionsPreference, pushPermissionGranted, registerForPush, setPromotionsPreference, unregisterPush } from "../../src/notifications";
import { keys } from "../../src/query";
import { colors, font, radius, shadow, space } from "../../src/theme";
import { Badge, GlassCard, Ionicons, ListRow, PressableScale, Screen, haptic } from "../../src/ui";
import { toast } from "../../src/ui/toast";

export default function ProfileScreen() {
  const { t, locale } = useI18n();
  const { session, guest, userId } = useSession();
  const client = useQueryClient();
  const unread = useUnread();
  const profile = useQuery({ queryKey: keys.profile(userId), queryFn: getProfile, enabled: Boolean(userId) && !guest });
  const [push, setPush] = useState(false);
  const [promotions, setPromotions] = useState(true);

  useFocusEffect(useCallback(() => {
    void pushPermissionGranted().then(setPush);
    void getPromotionsPreference().then(setPromotions);
  }, []));

  const name = guest ? t.profile.guest : profile.data?.user?.displayName || session?.displayName || t.profile.guest;
  const phone = guest ? t.profile.guestHint : profile.data?.user?.phone || session?.phone || "";

  const signOut = () => Alert.alert(t.profile.signOut, "", [
    { text: t.common.cancel, style: "cancel" },
    { text: t.profile.signOut, style: "destructive", onPress: async () => {
      await logout(locale, unregisterPush);
      client.clear();
      haptic.success();
    } },
  ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: TAB_BAR_SPACE }}>
        <Animated.View entering={FadeInDown.duration(320)}>
          <PressableScale scaleTo={0.98} onPress={() => router.push(guest ? "/login" : "/account/edit")} style={[styles.hero, shadow(2)]}>
            <LinearGradient colors={["#19C08A", colors.brandStrong]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.heroOrb} />
            <View style={styles.avatar}><Text style={styles.avatarText}>{(name || "喜").slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              <Text style={styles.phone} numberOfLines={2}>{phone}</Text>
              {guest ? <View style={styles.signIn}><Text style={styles.signInText}>{t.profile.signIn}</Text></View> : null}
            </View>
            {guest ? null : <Ionicons name="chevron-forward" size={20} color={colors.white} />}
          </PressableScale>
        </Animated.View>

        <View style={styles.quick}>
          {([
            ["receipt-outline", t.tabs.orders, "/orders"],
            ["heart-outline", t.profile.favorites, "/favorites"],
            ["pricetags-outline", t.profile.coupons, "/coupons"],
            ["notifications-outline", t.profile.notifications, "/notifications"],
          ] as const).map(([icon, label, href]) => (
            <PressableScale key={href} onPress={() => router.push(href)} style={styles.quickItem}>
              <View style={styles.quickIcon}>
                <Ionicons name={icon} size={22} color={colors.brandStrong} />
                {href === "/notifications" ? <Badge value={unread.data?.notifications || 0} style={{ position: "absolute", top: -4, right: -6 }} /> : null}
              </View>
              <Text style={styles.quickLabel} numberOfLines={1}>{label}</Text>
            </PressableScale>
          ))}
        </View>

        <GlassCard padded={false} style={styles.group}>
          <Text style={styles.groupTitle}>{t.profile.account}</Text>
          {!guest ? <ListRow icon="person-outline" title={t.profile.edit} subtitle={t.profile.addresses} onPress={() => router.push("/account/edit")} /> : null}
          {!guest ? <ListRow icon="shield-checkmark-outline" title={t.profile.security} onPress={() => router.push("/account/security")} /> : null}
          <ListRow icon="card-outline" title={t.profile.payments} onPress={() => router.push("/payments")} />
          <ListRow icon="time-outline" title={t.profile.history} onPress={() => router.push("/history")} />
        </GlassCard>

        <GlassCard padded={false} style={styles.group}>
          <Text style={styles.groupTitle}>{t.profile.app}</Text>
          <ListRow icon="language-outline" title={t.profile.language} subtitle={`${localeLabels[locale].flag} ${localeLabels[locale].native}`} onPress={() => router.push("/language")} />
          <ListRow icon="notifications-circle-outline" title={t.profile.push} subtitle={push ? t.profile.pushOn : t.profile.pushOff} onPress={async () => {
            const status = await registerForPush(locale, true);
            setPush(await pushPermissionGranted());
            if (!status.enabled && status.reason === "simulator") toast(t.profile.pushDevice, "info");
          }} right={<Ionicons name={push ? "checkmark-circle" : "ellipse-outline"} size={22} color={push ? colors.brand : colors.textMuted} />} />
          <ListRow icon="megaphone-outline" title={t.profile.promotions} right={<Switch value={promotions} trackColor={{ true: colors.brand }} onValueChange={(value) => { setPromotions(value); void setPromotionsPreference(value, locale); }} />} />
        </GlassCard>

        <GlassCard padded={false} style={styles.group}>
          <Text style={styles.groupTitle}>{t.profile.services}</Text>
          <ListRow icon="help-buoy-outline" title={t.profile.help} onPress={() => router.push("/help")} />
          <ListRow icon="headset-outline" title={t.profile.support} onPress={() => router.push("/support")} />
          <ListRow icon="medkit-outline" title={t.profile.emergency} tint={colors.danger} onPress={() => router.push("/emergency")} />
        </GlassCard>

        {guest ? null : (
          <PressableScale onPress={signOut} style={styles.signOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={{ color: colors.danger, fontWeight: "800" }}>{t.profile.signOut}</Text>
          </PressableScale>
        )}
        <Text style={styles.version}>ZhaoXi · {t.profile.version} {APP_VERSION}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: radius.xl, overflow: "hidden", minHeight: 110 },
  heroOrb: { position: "absolute", right: -40, top: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.12)" },
  avatar: { width: 62, height: 62, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  avatarText: { color: colors.white, fontSize: 26, fontWeight: "900" },
  name: { color: colors.white, fontSize: 20, fontWeight: "900" },
  phone: { color: "rgba(255,255,255,0.86)", fontSize: 13, marginTop: 3 },
  signIn: { alignSelf: "flex-start", marginTop: 10, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  signInText: { color: colors.brandStrong, fontWeight: "800", fontSize: 12 },
  quick: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder, ...shadow(1) },
  quickItem: { flex: 1, alignItems: "center", gap: 6 },
  quickIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 12, fontWeight: "700", color: colors.text },
  group: { paddingHorizontal: 12, paddingVertical: 6 },
  groupTitle: { fontSize: 12, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.6, marginTop: 8, marginLeft: 4, textTransform: "uppercase" },
  signOut: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: radius.lg, backgroundColor: colors.dangerSoft },
  version: { textAlign: "center", color: colors.textMuted, fontSize: 12 },
});
