import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { createSupportThread } from "../src/api/endpoints";
import { useI18n } from "../src/i18n";
import { colors, font, space } from "../src/theme";
import { Button, Field, GlassCard, Header, Ionicons, Screen, haptic } from "../src/ui";

export default function SupportScreen() {
  // `subject` arrives from the screen that sent the customer here (order code, payment, emergency).
  const params = useLocalSearchParams<{ subject?: string }>();
  const { t } = useI18n();
  const client = useQueryClient();
  const subject = (params.subject || "").trim();
  const [message, setMessage] = useState("");
  const create = useMutation({
    mutationFn: () => createSupportThread(message.trim(), subject),
    onSuccess: (thread) => {
      haptic.success();
      void client.invalidateQueries({ queryKey: ["threads"] });
      router.replace(`/chat/${encodeURIComponent(thread.id)}`);
    },
    onError: () => haptic.warn(),
  });
  const canSend = Boolean(message.trim()) && !create.isPending;
  return (
    <Screen>
      <Header title={t.messages.newSupport} subtitle={t.messages.replyHint} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
          <GlassCard style={{ gap: 12 }}>
            {subject ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="pricetag-outline" size={15} color={colors.brandStrong} />
                <Text style={[font.small, { flex: 1, color: colors.brandStrong, fontWeight: "700" }]} numberOfLines={1}>{subject}</Text>
              </View>
            ) : null}
            <Field
              value={message}
              onChangeText={(value) => { setMessage(value); if (create.isError) create.reset(); }}
              placeholder={t.messages.describe}
              multiline
              autoFocus
              style={{ minHeight: 160 }}
              maxLength={2000}
              editable={!create.isPending}
            />
            {create.isError ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="alert-circle" size={16} color={colors.dangerText} />
                <Text style={[font.small, { color: colors.dangerText }]}>{t.messages.failed}</Text>
              </View>
            ) : null}
            <Button title={create.isError ? t.messages.retry : t.messages.create} icon="send" loading={create.isPending} disabled={!canSend} onPress={() => create.mutate()} />
          </GlassCard>
          <View style={{ gap: 10 }}>
            <Button variant="secondary" icon="help-buoy-outline" title={t.profile.help} onPress={() => router.push("/help")} />
            <Button variant="danger" icon="medkit-outline" title={t.profile.emergency} onPress={() => router.push("/emergency")} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
