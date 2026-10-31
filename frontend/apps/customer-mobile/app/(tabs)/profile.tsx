import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getProfile } from "../../src/api/endpoints";
import { APP_VERSION } from "../../src/config";
import { TAB_BAR_SPACE } from "../../src/constants";
import { str } from "../../src/format";
import { useSession } from "../../src/hooks";
import { localeLabels, useI18n } from "../../src/i18n";
import { getPromotionsPreference, pushPermissionGranted, registerForPush, setPromotionsPreference } from "../../src/notifications";
import { profileCopy } from "../../src/profile-copy";
import { keys } from "../../src/query";
import { colors, shadow } from "../../src/theme";
import { HeaderFade, ListRow, PressableScale, Screen, type MenuArtKind } from "../../src/ui";
import { toast } from "../../src/ui/toast";

const feedbackLabel = { "vi-VN": "Gửi phản hồi Beta", "en-US": "Beta feedback", "zh-CN": "Beta 反馈", "zh-TW": "Beta 回饋" } as const;

export default function ProfileScreen() {
  const { t, locale } = useI18n();
  const c = profileCopy[locale];
  const { session, userId } = useSession();
  const profile = useQuery({ queryKey: keys.profile(userId), queryFn: getProfile, enabled: Boolean(userId) });
  const [push, setPush] = useState(false);
  const [promotions, setPromotions] = useState(true);

  useFocusEffect(useCallback(() => {
    void pushPermissionGranted().then(setPush);
    void getPromotionsPreference().then(setPromotions);
  }, []));

  const data = profile.data;
  const isGuest = data?.identity?.isGuest ?? session?.authMethod === "guest";
  const name = str(data?.user?.displayName || session?.displayName, "ZhaoXi Guest");
  const unnamed = !data?.user?.displayName || /guest/i.test(name);
  const fields = [data?.user?.displayName, data?.user?.phone, data?.profile?.nationality, data?.profile?.cityName, data?.profile?.addressText];
  const completion = Math.round((fields.filter((x) => Boolean(x && String(x).trim())).length / fields.length) * 100);
  const menu: Array<[MenuArtKind, string, string]> = [
    ["orders", c.orders, "/orders"], ["favorites", c.favorites, "/favorites"], ["history", c.history, "/history"], ["coupons", c.coupons, "/coupons"],
    ["notifications", c.notifications, "/notifications"], ["language", c.language, "/language"], ["security", c.security, "/account/security"], ["emergency", c.emergency, "/emergency"],
  ];
  const info: Array<[string, string]> = [
    [c.phone, str(data?.user?.phone)], [c.nationality, str(data?.profile?.nationality)], [c.city, str(data?.profile?.cityName)],
    [c.address, str(data?.profile?.addressText)], [c.whatsapp, str(data?.profile?.whatsapp)], [c.wechat, str(data?.profile?.wechatContactId)],
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: TAB_BAR_SPACE }}>
        {/* The fade lives on an unshadowed wrapper: iOS would cast the hero's shadow from the whole gradient */}
        <View>
        <HeaderFade />
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.hero, { shadowColor: "#00323A", shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 14 } }]}>
          <LinearGradient colors={["#0E5A63", "#0A4A52", "#167A80"]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
          <View style={[StyleSheet.absoluteFill, { borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }]} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.heroSmall}>{isGuest ? c.guest : c.persistent}</Text>
              <Text style={styles.heroName} numberOfLines={1}>{name}</Text>
              <Text style={styles.heroId} numberOfLines={1}>{c.identity}: {data?.identity?.zhaoxiId || "—"}</Text>
              {unnamed ? <PressableScale onPress={() => router.push("/account/edit")} style={styles.namePill}><Text style={styles.namePillText}>✏️ {c.nameNow}</Text></PressableScale> : null}
            </View>
            <PressableScale onPress={() => router.push(isGuest ? "/login" : "/account/edit")} style={styles.editButton}><Text style={styles.editText}>{isGuest ? t.common.signIn : c.edit}</Text></PressableScale>
          </View>
          <View style={styles.completionRow}><Text style={styles.completionText}>{c.completion}</Text><Text style={styles.completionText}>{completion}%</Text></View>
          <View style={styles.track}><View style={[styles.trackFill, { width: `${completion}%` }]} /></View>
        </Animated.View>
        </View>

        {unnamed ? (
          <View style={styles.nameCard}>
            <LinearGradient colors={["#FFFBEB", "#FEF3C7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nameTitle}>👋 {c.nameTitle}</Text>
              <Text style={styles.nameHint}>{c.nameHint}</Text>
            </View>
            <PressableScale onPress={() => router.push("/account/edit")} style={styles.nameButton}><Text style={styles.nameButtonText}>{c.nameNow}</Text></PressableScale>
          </View>
        ) : null}

        {isGuest ? (
          <PressableScale onPress={() => router.push("/login")} scaleTo={0.99} style={styles.guestNotice}><Text style={styles.guestText}>{c.guestHint}</Text></PressableScale>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{c.profile}</Text>
          {info.map(([label, value]) => (
            <View key={label} style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue} numberOfLines={2}>{value || "—"}</Text></View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={styles.sectionTitle}>{c.addressBook}</Text>
            <PressableScale onPress={() => router.push("/account/edit")} style={styles.addButton}><Text style={styles.addText}>{c.addAddress}</Text></PressableScale>
          </View>
          {data?.addresses?.length ? data.addresses.map((address) => (
            <Text key={address.id} style={styles.infoValue} numberOfLines={2}>{address.isDefault ? "★ " : ""}{address.label} · {address.addressText}</Text>
          )) : <Text style={[styles.infoLabel, { width: "auto" }]}>{c.noAddress}</Text>}
        </View>

        <Text style={styles.groupTitle}>{c.personal}</Text>
        <View style={{ gap: 8 }}>
          {menu.map(([art, label, href]) => <ListRow key={href} art={art} title={label} subtitle={href === "/language" ? `${localeLabels[locale].flag} ${localeLabels[locale].native}` : undefined} onPress={() => router.push(href as never)} />)}
        </View>

        <Text style={styles.groupTitle}>{c.app}</Text>
        <View style={{ gap: 8 }}>
          <ListRow art="push" title={c.push} subtitle={push ? t.profile.pushOn : t.profile.pushOff} onPress={async () => {
            const status = await registerForPush(locale, true);
            setPush(await pushPermissionGranted());
            if (!status.enabled && status.reason === "simulator") toast(t.profile.pushDevice, "info");
          }} right={<Text style={{ color: push ? colors.wechat : colors.textMuted, fontSize: 16 }}>{push ? "✓" : "○"}</Text>} />
          <ListRow art="promotions" title={c.promotions} right={<Switch value={promotions} trackColor={{ true: colors.wechat }} onValueChange={(value) => { setPromotions(value); void setPromotionsPreference(value, locale); }} />} />
          <ListRow art="help" title={t.profile.help} onPress={() => router.push("/help")} />
          <ListRow art="feedback" title={feedbackLabel[locale]} onPress={() => router.push("/feedback")} />
        </View>
        <Text style={styles.version}>ZhaoXi · {t.profile.version} {APP_VERSION}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: 20, paddingHorizontal: 18, borderRadius: 24 },
  avatar: { width: 62, height: 62, borderRadius: 18, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#0A4A52", fontSize: 26, fontWeight: "800" },
  heroSmall: { fontSize: 12, color: "rgba(255,255,255,0.9)" },
  heroName: { fontSize: 21, fontWeight: "800", color: colors.white, marginTop: 2 },
  heroId: { fontSize: 11, color: "rgba(255,255,255,0.92)", marginTop: 3 },
  namePill: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.white },
  namePillText: { fontSize: 11, fontWeight: "800", color: "#0A4A52" },
  editButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)" },
  editText: { fontSize: 12, fontWeight: "800", color: colors.white },
  completionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  completionText: { fontSize: 11, color: "rgba(255,255,255,0.92)", fontWeight: "600" },
  track: { height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.28)", marginTop: 6, overflow: "hidden" },
  trackFill: { height: 7, borderRadius: 4, backgroundColor: colors.white },
  nameCard: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, ...shadow("card") },
  nameTitle: { fontSize: 13.5, fontWeight: "800", color: "#78350F" },
  nameHint: { fontSize: 11, color: "#92400E", marginTop: 3, lineHeight: 15 },
  nameButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#D97706" },
  nameButtonText: { fontSize: 11.5, fontWeight: "800", color: colors.white },
  guestNotice: { paddingVertical: 13, paddingHorizontal: 15, borderRadius: 18, backgroundColor: "#FFF7ED", ...shadow("card") },
  guestText: { fontSize: 11.5, color: "#9A5B13", lineHeight: 17 },
  section: { padding: 16, borderRadius: 20, backgroundColor: colors.white, gap: 10, ...shadow("card") },
  sectionTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  infoRow: { flexDirection: "row", gap: 12 },
  infoLabel: { width: 120, fontSize: 12.5, color: colors.textSecondary },
  infoValue: { flex: 1, fontSize: 12.5, color: colors.text },
  addButton: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.brandSoft },
  addText: { fontSize: 11, fontWeight: "800", color: "#078343" },
  groupTitle: { fontSize: 16, fontWeight: "800", color: colors.ink, marginTop: 4, marginLeft: 2 },
  version: { textAlign: "center", color: colors.textMuted, fontSize: 11, marginTop: 6 },
});
