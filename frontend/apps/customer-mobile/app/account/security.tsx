import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { setPin } from "../../src/api/client";
import { getDevices, revokeDevice } from "../../src/api/endpoints";
import { relativeTime } from "../../src/format";
import { useI18n } from "../../src/i18n";
import { colors, font, space } from "../../src/theme";
import { Button, Field, GlassCard, Header, Ionicons, Screen, SkeletonList, StatusPill, haptic } from "../../src/ui";
import { toast } from "../../src/ui/toast";

export default function SecurityScreen() {
  const { t, locale } = useI18n();
  const client = useQueryClient();
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const devices = useQuery({ queryKey: ["devices"], queryFn: getDevices });
  const savePin = useMutation({
    mutationFn: () => setPin(pin),
    onSuccess: () => { haptic.success(); setPinValue(""); setConfirm(""); toast(t.security.pinSaved); },
    onError: () => toast(t.common.error, "error"),
  });
  const revoke = useMutation({ mutationFn: revokeDevice, onSuccess: () => void client.invalidateQueries({ queryKey: ["devices"] }) });
  const valid = pin.length === 6 && pin === confirm;
  return (
    <Screen>
      <Header title={t.security.title} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 4, gap: space.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <GlassCard style={{ gap: 12 }}>
          <Text style={font.h2}>{t.security.pin}</Text>
          <Text style={font.small}>{t.security.pinHint}</Text>
          <Field label={t.security.newPin} value={pin} onChangeText={(v) => setPinValue(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" secureTextEntry maxLength={6} />
          <Field label={t.security.confirmPin} value={confirm} onChangeText={(v) => setConfirm(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" secureTextEntry maxLength={6} />
          {confirm.length === 6 && pin !== confirm ? <Text style={{ color: colors.danger, fontWeight: "700" }}>{t.security.mismatch}</Text> : null}
          <Button title={t.security.savePin} icon="lock-closed" loading={savePin.isPending} disabled={!valid} onPress={() => savePin.mutate()} />
        </GlassCard>
        <GlassCard style={{ gap: 4 }}>
          <Text style={[font.h2, { marginBottom: 6 }]}>{t.security.devices}</Text>
          {devices.isPending ? <SkeletonList count={2} image={false} /> : (devices.data || []).map((device) => (
            <View key={device.sessionId} style={styles.device}>
              <Ionicons name="phone-portrait-outline" size={22} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={font.h3} numberOfLines={1}>{device.deviceName || device.role}</Text>
                <Text style={font.tiny}>{t.security.lastSeen} {relativeTime(device.lastSeenAt, locale)}</Text>
              </View>
              {device.isCurrent ? <StatusPill label={t.security.current} /> : <Button small variant="danger" title={t.security.revoke} onPress={() => revoke.mutate(device.sessionId)} />}
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  device: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
