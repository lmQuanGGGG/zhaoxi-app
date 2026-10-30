import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { createSupportThread } from "../src/api/endpoints";
import { useI18n } from "../src/i18n";
import { colors, font, space } from "../src/theme";
import { Button, Field, GlassCard, Header, Ionicons, Screen, haptic } from "../src/ui";
import { toast } from "../src/ui/toast";

export default function SupportScreen() {
  const params = useLocalSearchParams<{ subject?: string }>();
  const { t } = useI18n();
  const client = useQueryClient();
  const [subject, setSubject] = useState(params.subject || "");
  const [message, setMessage] = useState("");
  const create = useMutation({
    mutationFn: () => createSupportThread(subject.trim(), message.trim()),
    onSuccess: (thread) => {
      haptic.success();
      void client.invalidateQueries({ queryKey: ["threads"] });
      router.replace(thread?.id ? `/chat/${encodeURIComponent(`support:${thread.id}`)}` : "/messages");
    },
    onError: () => toast(t.common.error, "error"),
  });
  return (
    <Screen>
      <Header title={t.messages.newSupport} subtitle={t.home.ai} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
          <GlassCard style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: colors.brandSoft }}>
            <Ionicons name="sparkles" size={22} color={colors.brandStrong} />
            <Text style={[font.small, { flex: 1, color: colors.brandStrong }]}>{t.home.aiHint}</Text>
          </GlassCard>
          <GlassCard style={{ gap: 12 }}>
            <Field label={t.messages.subject} value={subject} onChangeText={setSubject} maxLength={180} />
            <Field label={t.messages.message} value={message} onChangeText={setMessage} multiline style={{ minHeight: 140 }} maxLength={2000} />
            <Button title={t.messages.create} icon="send" loading={create.isPending} disabled={!subject.trim() || !message.trim()} onPress={() => create.mutate()} />
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
