import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getThread, markThreadRead, sendMessage } from "../../src/api/endpoints";
import type { ChatMessage, MessageThread } from "../../src/api/types";
import { shortDate } from "../../src/format";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { colors, font, radius, space } from "../../src/theme";
import { EmptyState, Header, Ionicons, PressableScale, Screen, SkeletonList, haptic } from "../../src/ui";
import { toast } from "../../src/ui/toast";

const mine = (m: ChatMessage) => (m.senderRole || m.sender) === "customer";

export default function ChatScreen() {
  const params = useLocalSearchParams<{ threadId: string }>();
  const threadId = decodeURIComponent(params.threadId || "");
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [text, setText] = useState("");
  const thread = useQuery({ queryKey: keys.thread(threadId), queryFn: () => getThread(threadId), refetchInterval: 6_000 });

  useEffect(() => {
    if (!thread.data) return;
    void markThreadRead(threadId).then(() => {
      void client.invalidateQueries({ queryKey: ["threads"] });
      void client.invalidateQueries({ queryKey: ["unread"] });
    }).catch(() => undefined);
  }, [thread.data?.messages.length, threadId, client]);

  // Optimistic send: the bubble appears immediately and is reconciled on refetch.
  const send = useMutation({
    mutationFn: (body: string) => sendMessage(threadId, body),
    onMutate: async (body) => {
      await client.cancelQueries({ queryKey: keys.thread(threadId) });
      const previous = client.getQueryData<MessageThread>(keys.thread(threadId));
      client.setQueryData<MessageThread>(keys.thread(threadId), (current) => current ? { ...current, messages: [...current.messages, { id: `local-${Date.now()}`, body, createdAt: new Date().toISOString(), senderRole: "customer" }] } : current);
      haptic.tap();
      return { previous };
    },
    onError: (_e, body, context) => {
      client.setQueryData(keys.thread(threadId), context?.previous);
      setText(body);
      toast(t.common.error, "error");
    },
    onSettled: () => void client.invalidateQueries({ queryKey: keys.thread(threadId) }),
  });

  const messages = (thread.data?.messages || []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const title = thread.data?.thread.kind === "support" ? thread.data.thread.title || t.messages.support : thread.data?.thread.title || t.messages.title;

  return (
    <Screen>
      <Header title={title} subtitle={thread.data?.thread.kind === "support" ? t.messages.support : undefined} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {thread.isPending ? <View style={{ padding: space.lg }}><SkeletonList count={3} image={false} /></View> : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: space.lg, gap: 8, flexGrow: 1, justifyContent: messages.length ? "flex-end" : "center" }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={<EmptyState icon="chatbubble-ellipses-outline" title={t.messages.empty} />}
            renderItem={({ item }) => {
              const own = mine(item);
              return (
                <Animated.View entering={FadeInUp.springify().damping(18)} style={[styles.bubbleWrap, own ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
                  <View style={[styles.bubble, own ? styles.own : styles.other]}>
                    <Text style={[font.body, own && { color: colors.white }]}>{item.body}</Text>
                  </View>
                  <Text style={[font.tiny, { marginTop: 3 }]}>{own ? t.messages.you : item.senderRole === "admin" ? t.messages.support : ""} {shortDate(item.createdAt, locale)}</Text>
                </Animated.View>
              );
            }}
          />
        )}
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput value={text} onChangeText={setText} placeholder={t.messages.placeholder} placeholderTextColor={colors.textMuted} style={styles.input} multiline maxLength={2000} />
          <PressableScale disabled={!text.trim() || send.isPending} onPress={() => { const body = text.trim(); setText(""); send.mutate(body); }} style={styles.send}>
            <Ionicons name="send" size={18} color={colors.white} />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: { maxWidth: "100%" },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  own: { backgroundColor: colors.brand, borderBottomRightRadius: 6 },
  other: { backgroundColor: colors.white, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.borderSoft },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: space.lg, paddingTop: 10, backgroundColor: "rgba(255,255,255,0.97)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: radius.lg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.bg, fontSize: 15, color: colors.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
});
