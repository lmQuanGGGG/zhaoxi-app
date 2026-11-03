import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { updateSessionProfile } from "../../src/api/client";
import { addAddress, deleteAddress, getProfile, setDefaultAddress, updateProfile } from "../../src/api/endpoints";
import type { Point } from "../../src/api/types";
import { str } from "../../src/format";
import { useSession } from "../../src/hooks";
import { useI18n } from "../../src/i18n";
import { getLocationState, locate } from "../../src/location";
import { keys } from "../../src/query";
import { colors, font, space } from "../../src/theme";
import { Button, Field, GlassCard, Header, IconButton, Ionicons, Screen, SkeletonList, StatusPill, haptic } from "../../src/ui";
import { toast } from "../../src/ui/toast";

export default function EditProfile() {
  const { t } = useI18n();
  const { userId } = useSession();
  const client = useQueryClient();
  const key = keys.profile(userId);
  const profile = useQuery({ queryKey: key, queryFn: getProfile, enabled: Boolean(userId) });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ label: string; addressText: string; point: Point | null }>({ label: "", addressText: "", point: null });

  useEffect(() => {
    if (profile.data?.user) {
      setName(str(profile.data.user.displayName));
      setPhone(str(profile.data.user.phone));
    }
  }, [profile.data?.user]);

  const refresh = () => void client.invalidateQueries({ queryKey: ["profile"] });
  const save = useMutation({
    mutationFn: () => updateProfile({ displayName: name.trim(), phone: phone.trim() || undefined }),
    onSuccess: () => { haptic.success(); updateSessionProfile({ displayName: name.trim() }); toast(t.profile.saved); refresh(); },
    onError: () => toast(t.common.error, "error"),
  });
  const create = useMutation({
    mutationFn: () => addAddress({ label: draft.label.trim() || "🏠", addressText: draft.addressText.trim(), recipientName: name.trim(), recipientPhone: phone.trim(), latitude: draft.point?.latitude ?? null, longitude: draft.point?.longitude ?? null, isDefault: !profile.data?.addresses?.length }),
    onSuccess: () => { haptic.success(); setAdding(false); setDraft({ label: "", addressText: "", point: null }); refresh(); },
    onError: () => toast(t.common.error, "error"),
  });
  const makeDefault = useMutation({ mutationFn: setDefaultAddress, onSuccess: refresh });
  const remove = useMutation({ mutationFn: deleteAddress, onSuccess: refresh });

  return (
    <Screen>
      <Header title={t.profile.edit} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 4, gap: space.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          {profile.isPending ? <SkeletonList count={3} image={false} /> : (
            <>
              <GlassCard style={{ gap: 12 }}>
                <Field label={t.profile.displayName} value={name} onChangeText={setName} autoComplete="name" />
                <Field label={t.profile.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
                <Button title={t.common.save} icon="checkmark" loading={save.isPending} disabled={!name.trim()} onPress={() => save.mutate()} />
              </GlassCard>

              <GlassCard style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={[font.h2, { flex: 1 }]}>{t.profile.addresses}</Text>
                  <IconButton icon={adding ? "close" : "add"} onPress={() => setAdding((v) => !v)} />
                </View>
                {adding ? (
                  <Animated.View entering={FadeInDown.duration(200)} style={{ gap: 10 }}>
                    <Field label={t.profile.label} value={draft.label} onChangeText={(label) => setDraft((d) => ({ ...d, label }))} />
                    <Field label={t.checkout.address} value={draft.addressText} onChangeText={(addressText) => setDraft((d) => ({ ...d, addressText }))} multiline style={{ minHeight: 60 }} />
                    <Button small variant="secondary" icon="navigate" title={draft.point ? t.checkout.pointSet : t.checkout.useLocation} onPress={async () => {
                      const point = await locate(true);
                      if (point) setDraft((d) => ({ ...d, point, addressText: d.addressText || getLocationState().label }));
                    }} />
                    <Button title={t.profile.addAddress} icon="add-circle" loading={create.isPending} disabled={!draft.addressText.trim()} onPress={() => create.mutate()} />
                  </Animated.View>
                ) : null}
                {(profile.data?.addresses || []).map((address) => (
                  <Animated.View key={address.id} exiting={FadeOut} layout={LinearTransition.duration(180)} style={styles.address}>
                    <Ionicons name={address.isDefault ? "home" : "location-outline"} size={20} color={address.isDefault ? colors.brand : colors.textSecondary} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={font.h3}>{address.label}</Text>
                        {address.isDefault ? <StatusPill label={t.profile.default} /> : null}
                      </View>
                      <Text style={font.tiny} numberOfLines={2}>{address.addressText}</Text>
                      {!address.isDefault ? <Text onPress={() => makeDefault.mutate(address.id)} style={styles.link}>{t.profile.setDefault}</Text> : null}
                    </View>
                    <IconButton icon="trash-outline" color={colors.danger} onPress={() => Alert.alert(t.common.delete, address.addressText, [{ text: t.common.cancel, style: "cancel" }, { text: t.common.delete, style: "destructive", onPress: () => remove.mutate(address.id) }])} />
                  </Animated.View>
                ))}
              </GlassCard>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  address: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  link: { color: colors.brandStrong, fontWeight: "700", fontSize: 12, marginTop: 2 },
});

