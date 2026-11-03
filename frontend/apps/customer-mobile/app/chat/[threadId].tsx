import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getThread, markThreadRead, sendMessage } from "../../src/api/endpoints";
import type { ChatMessage } from "../../src/api/types";
import { shortDate } from "../../src/format";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { colors, font, radius, shadow, space } from "../../src/theme";
import { EmptyState, Header, Ionicons, PressableScale, Screen, SkeletonList, haptic } from "../../src/ui";
import { toast } from "../../src/ui/toast";

const mine = (m: ChatMessage) => (m.senderRole || m.sender) === "customer";
const time = (m: ChatMessage) => new Date(m.createdAt).getTime();
const newClientId = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function ChatScreen() {
  const params = useLocalSearchParams<{ threadId: string }>();
  const threadId = decodeURIComponent(params.threadId || "");
  const isOrder = threadId.startsWith("order:");
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [text, setText] = useState("");
  // Messages on their way to the server, shown right away and dropped once the refetch has them.
  const [pending, setPending] = useState<ChatMessage[]>([]);
  // Order chats are live conversations with a store, so they poll faster than inquiry threads.
  const thread = useQuery({ queryKey: keys.thread(threadId), queryFn: () => getThread(threadId), refetchInterval: isOrder ? 4_000 : 6_000 });

  const loaded = Boolean(thread.data);
  const incoming = useMemo(() => (thread.data?.messages || []).filter((m) => !mine(m)).length, [thread.data?.messages]);
  useEffect(() => {
    if (!loaded) return;
    void markThreadRead(threadId).then(() => {
      void client.invalidateQueries({ queryKey: ["threads"] });
      void client.invalidateQueries({ queryKey: ["unread"] });
    }).catch(() => undefined);
  }, [incoming, threadId, client, loaded]);

  const send = useMutation({
    mutationFn: (message: ChatMessage) => sendMessage(threadId, message.body, message.clientMessageId || undefined),
    onMutate: (message) => {
      setPending((current) => [...current, message]);
      haptic.tap();
    },
    onSuccess: async (_saved, message) => {
      await client.refetchQueries({ queryKey: keys.thread(threadId) });
      setPending((current) => current.filter((m) => m.id !== message.id));
    },
    onError: (_e, message) => {
      setPending((current) => current.filter((m) => m.id !== message.id));
      setText(message.body);
      toast(t.common.error, "error");
    },
  });

  const messages = useMemo(() => {
    const saved = (thread.data?.messages || []).slice().sort((a, b) => time(a) - time(b));
    const savedIds = new Set(saved.map((m) => m.clientMessageId).filter(Boolean));
    return [...saved, ...pending.filter((m) => !savedIds.has(m.clientMessageId))];
  }, [thread.data?.messages, pending]);

  const info = thread.data?.thread;
  const title = info?.kind === "support" ? info.title || t.messages.support : info?.title || t.messages.title;
  const subtitle = info?.kind === "support" ? t.messages.support : info?.kind === "order" ? info.requestCode : undefined;
  const canSend = info?.canSend !== false;
  // "Seen" sits under the newest own message the store has read.
  const readAt = info?.counterpartReadAt ? new Date(info.counterpartReadAt).getTime() : 0;
  const seenId = readAt ? messages.filter((m) => mine(m) && !m.pending && time(m) <= readAt).at(-1)?.id : undefined;

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    const clientMessageId = newClientId();
    send.mutate({ id: `local-${clientMessageId}`, clientMessageId, body, createdAt: new Date().toISOString(), senderRole: "customer", pending: true });
  };

  return (
    <Screen>
      <Header
        title={title}
        subtitle={subtitle}
        right={info?.kind === "order" && info.requestId ? (
          <Pressable accessibilityLabel={t.messages.viewOrder} onPress={() => router.push(`/order/${info.requestId}`)} style={({ pressed }) => [styles.orderButton, pressed && { transform: [{ scale: 0.94 }] }]}>
            <Ionicons name="receipt-outline" size={18} color={colors.white} />
          </Pressable>
        ) : undefined}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {thread.isPending ? <View style={{ padding: space.lg }}><SkeletonList count={3} image={false} /></View> : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.clientMessageId || item.id}
            contentContainerStyle={{ padding: space.lg, gap: 8, flexGrow: 1, justifyContent: messages.length ? "flex-end" : "center" }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardDismissMode="interactive"
            ListEmptyComponent={<EmptyState icon="chatbubble-ellipses-outline" title={isOrder ? t.messages.storeChat : t.messages.empty} />}
            renderItem={({ item }) => {
              const own = mine(item);
              return (
                <Animated.View entering={FadeInUp.springify().damping(18)} style={[styles.bubbleWrap, own ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
                  <View style={[styles.bubble, own ? styles.own : styles.other, item.pending && { opacity: 0.6 }]}>
                    <Text style={[font.body, own && { color: colors.white }]}>{item.body}</Text>
                  </View>
                  <Text style={[font.tiny, { marginTop: 3 }]}>
                    {own ? t.messages.you : item.senderRole === "admin" ? t.messages.support : ""} {item.pending ? "…" : shortDate(item.createdAt, locale)}
                    {item.id === seenId ? ` · ${t.messages.seen}` : ""}
                  </Text>
                </Animated.View>
              );
            }}
          />
        )}
        {canSend ? (
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput value={text} onChangeText={setText} placeholder={t.messages.placeholder} placeholderTextColor={colors.textMuted} style={styles.input} multiline maxLength={2000} />
            <PressableScale disabled={!text.trim()} onPress={submit} style={styles.send}>
              <Ionicons name="send" size={18} color={colors.white} />
            </PressableScale>
          </View>
        ) : (
          <View style={[styles.closed, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Text style={font.small}>{t.messages.noStore}</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: { maxWidth: "100%" },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  own: { backgroundColor: colors.brand, borderBottomRightRadius: 6 },
  other: { backgroundColor: colors.white, borderBottomLeftRadius: 6, ...shadow("card") },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: space.lg, paddingTop: 10, backgroundColor: "rgba(255,255,255,0.97)", ...shadow("card") },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: radius.lg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.bgSoft, fontSize: 15, color: colors.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  closed: { alignItems: "center", paddingTop: 12, paddingHorizontal: space.lg },
  orderButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.22)" },
});
