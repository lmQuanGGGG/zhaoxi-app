import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "../../src/api/client";
import { getThread, markThreadRead, sendMessage, uploadChatPhoto } from "../../src/api/endpoints";
import type { ChatMessage } from "../../src/api/types";
import { MAX_CHAT_PHOTOS, compressPhoto, loadPhotoModules, pickPhotos, takePhoto, type LocalPhoto } from "../../src/chat-photos";
import { DraftStrip, PhotoGrid, PhotoViewer, remotePhotos, type BubblePhoto } from "../../src/components/chat-photos";
import { shortDate } from "../../src/format";
import { useI18n } from "../../src/i18n";
import { keys } from "../../src/query";
import { colors, font, radius, shadow, space } from "../../src/theme";
import { EmptyState, Header, Ionicons, PressableScale, Screen, SkeletonList, haptic } from "../../src/ui";
import { toast } from "../../src/ui/toast";

const mine = (m: ChatMessage) => (m.senderRole || m.sender) === "customer";
const time = (m: ChatMessage) => new Date(m.createdAt).getTime();
const newClientId = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** A message on its way: shown at once, retried with the same id so it never doubles. */
type Outgoing = { clientMessageId: string; body: string; photos: LocalPhoto[]; createdAt: string; failed: boolean };
type Row = ChatMessage & { outgoing?: Outgoing; photos: BubblePhoto[] };

export default function ChatScreen() {
  const params = useLocalSearchParams<{ threadId: string }>();
  const threadId = decodeURIComponent(params.threadId || "");
  const isOrder = threadId.startsWith("order:");
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const listRef = useRef<FlatList<Row>>(null);
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<LocalPhoto[]>([]);
  const [outbox, setOutbox] = useState<Outgoing[]>([]);
  const [viewer, setViewer] = useState<{ photos: BubblePhoto[]; index: number } | null>(null);
  const [photosReady, setPhotosReady] = useState(false);
  // Photos already uploaded for an outgoing message, so a retry only sends what is missing.
  const uploaded = useRef(new Map<string, Record<string, string>>());
  // Order chats are live conversations with a store, so they poll faster than inquiry threads.
  const thread = useQuery({ queryKey: keys.thread(threadId), queryFn: () => getThread(threadId), refetchInterval: isOrder ? 4_000 : 6_000 });

  useEffect(() => {
    if (isOrder) void loadPhotoModules().then((m) => setPhotosReady(Boolean(m)));
  }, [isOrder]);

  const loaded = Boolean(thread.data);
  const incoming = useMemo(() => (thread.data?.messages || []).filter((m) => !mine(m)).length, [thread.data?.messages]);
  useEffect(() => {
    if (!loaded) return;
    void markThreadRead(threadId).then(() => {
      void client.invalidateQueries({ queryKey: ["threads"] });
      void client.invalidateQueries({ queryKey: ["unread"] });
    }).catch(() => undefined);
  }, [incoming, threadId, client, loaded]);

  async function deliver(message: Outgoing) {
    setOutbox((current) => current.map((m) => (m.clientMessageId === message.clientMessageId ? { ...m, failed: false } : m)));
    const done = uploaded.current.get(message.clientMessageId) || {};
    uploaded.current.set(message.clientMessageId, done);
    try {
      for (const photo of message.photos) {
        if (done[photo.key]) continue;
        done[photo.key] = (await uploadChatPhoto(threadId, await compressPhoto(photo))).id;
      }
      await sendMessage(threadId, message.body, message.clientMessageId, message.photos.map((photo) => done[photo.key]));
      await client.refetchQueries({ queryKey: keys.thread(threadId) });
      uploaded.current.delete(message.clientMessageId);
      setOutbox((current) => current.filter((m) => m.clientMessageId !== message.clientMessageId));
    } catch (error) {
      // Uploads that can no longer be attached are sent again on retry.
      if (error instanceof ApiError && error.code === "ATTACHMENT_INVALID") uploaded.current.set(message.clientMessageId, {});
      setOutbox((current) => current.map((m) => (m.clientMessageId === message.clientMessageId ? { ...m, failed: true } : m)));
      haptic.warn();
    }
  }

  const submit = () => {
    const body = text.trim();
    if (!body && !drafts.length) return;
    const message: Outgoing = { clientMessageId: newClientId(), body, photos: drafts, createdAt: new Date().toISOString(), failed: false };
    setText("");
    setDrafts([]);
    setOutbox((current) => [...current, message]);
    haptic.tap();
    void deliver(message);
  };

  const discard = (message: Outgoing) => {
    uploaded.current.delete(message.clientMessageId);
    setOutbox((current) => current.filter((m) => m.clientMessageId !== message.clientMessageId));
  };

  const addPhotos = async (camera: boolean) => {
    const room = MAX_CHAT_PHOTOS - drafts.length;
    if (room <= 0) return toast(t.messages.photoLimit, "info");
    try {
      const picked = camera ? [await takePhoto()].filter((x): x is LocalPhoto => Boolean(x)) : await pickPhotos(room);
      if (picked.length) setDrafts((current) => [...current, ...picked].slice(0, MAX_CHAT_PHOTOS));
    } catch (error) {
      toast(error instanceof Error && error.message === "CAMERA_DENIED" ? t.messages.cameraDenied : t.common.error, "error");
    }
  };

  const rows = useMemo<Row[]>(() => {
    const saved = (thread.data?.messages || []).slice().sort((a, b) => time(a) - time(b));
    const savedIds = new Set(saved.map((m) => m.clientMessageId).filter(Boolean));
    return [
      ...saved.map((m) => ({ ...m, photos: remotePhotos(m.attachments) })),
      ...outbox.filter((m) => !savedIds.has(m.clientMessageId)).map((m) => ({
        id: `local-${m.clientMessageId}`,
        clientMessageId: m.clientMessageId,
        body: m.body,
        createdAt: m.createdAt,
        senderRole: "customer",
        pending: true,
        outgoing: m,
        photos: m.photos.map((p) => ({ key: p.key, uri: p.uri, width: p.width, height: p.height, remote: false })),
      })),
    ];
  }, [thread.data?.messages, outbox]);

  const info = thread.data?.thread;
  const title = info?.kind === "support" ? info.title || t.messages.support : info?.title || t.messages.title;
  const subtitle = info?.kind === "support" ? t.messages.support : info?.kind === "order" ? info.requestCode : undefined;
  const canSend = info?.canSend !== false;
  const canAttach = isOrder && photosReady && drafts.length < MAX_CHAT_PHOTOS;
  // "Seen" sits under the newest own message the store has read.
  const readAt = info?.counterpartReadAt ? new Date(info.counterpartReadAt).getTime() : 0;
  const seenId = readAt ? rows.filter((m) => mine(m) && !m.pending && time(m) <= readAt).at(-1)?.id : undefined;

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
            data={rows}
            keyExtractor={(item) => item.clientMessageId || item.id}
            contentContainerStyle={{ padding: space.lg, gap: 8, flexGrow: 1, justifyContent: rows.length ? "flex-end" : "center" }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardDismissMode="interactive"
            ListEmptyComponent={<EmptyState icon="chatbubble-ellipses-outline" title={isOrder ? t.messages.storeChat : t.messages.empty} />}
            renderItem={({ item }) => {
              const own = mine(item);
              const failed = item.outgoing?.failed;
              return (
                <Animated.View entering={FadeInUp.springify().damping(18)} style={[styles.bubbleWrap, own ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
                  {item.photos.length ? (
                    <PhotoGrid photos={item.photos} dim={item.pending && !failed} onOpen={(index) => setViewer({ photos: item.photos, index })} />
                  ) : null}
                  {item.body ? (
                    <View style={[styles.bubble, own ? styles.own : styles.other, item.photos.length > 0 && { marginTop: 4 }, item.pending && !failed && { opacity: 0.6 }]}>
                      <Text style={[font.body, own && { color: colors.white }]}>{item.body}</Text>
                    </View>
                  ) : null}
                  {failed && item.outgoing ? (
                    <View style={styles.failedRow}>
                      <Ionicons name="alert-circle" size={14} color={colors.dangerText} />
                      <Text style={[font.tiny, { color: colors.dangerText }]}>{t.messages.failed}</Text>
                      <Pressable hitSlop={8} onPress={() => void deliver(item.outgoing!)}><Text style={styles.failedAction}>{t.messages.retry}</Text></Pressable>
                      <Pressable hitSlop={8} onPress={() => discard(item.outgoing!)}><Text style={[styles.failedAction, { color: colors.textSecondary }]}>{t.messages.discard}</Text></Pressable>
                    </View>
                  ) : (
                    <Text style={[font.tiny, { marginTop: 3 }]}>
                      {own ? t.messages.you : item.senderRole === "admin" ? t.messages.support : ""} {item.pending ? "…" : shortDate(item.createdAt, locale)}
                      {item.id === seenId ? ` · ${t.messages.seen}` : ""}
                    </Text>
                  )}
                </Animated.View>
              );
            }}
          />
        )}
        {canSend ? (
          <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <DraftStrip photos={drafts} onRemove={(key) => setDrafts((current) => current.filter((p) => p.key !== key))} />
            <View style={styles.composer}>
              {canAttach ? (
                <>
                  <Pressable accessibilityLabel={t.messages.camera} hitSlop={6} onPress={() => void addPhotos(true)} style={styles.tool}>
                    <Ionicons name="camera-outline" size={22} color={colors.brandStrong} />
                  </Pressable>
                  <Pressable accessibilityLabel={t.messages.photo} hitSlop={6} onPress={() => void addPhotos(false)} style={styles.tool}>
                    <Ionicons name="image-outline" size={22} color={colors.brandStrong} />
                  </Pressable>
                </>
              ) : null}
              <TextInput value={text} onChangeText={setText} placeholder={t.messages.placeholder} placeholderTextColor={colors.textMuted} style={styles.input} multiline maxLength={2000} />
              <PressableScale disabled={!text.trim() && !drafts.length} onPress={submit} style={styles.send}>
                <Ionicons name="send" size={18} color={colors.white} />
              </PressableScale>
            </View>
          </View>
        ) : (
          <View style={[styles.closed, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Text style={font.small}>{t.messages.noStore}</Text>
          </View>
        )}
      </KeyboardAvoidingView>
      <PhotoViewer photos={viewer?.photos || []} index={viewer ? viewer.index : null} onClose={() => setViewer(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: { maxWidth: "100%" },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  own: { backgroundColor: colors.brand, borderBottomRightRadius: 6 },
  other: { backgroundColor: colors.white, borderBottomLeftRadius: 6, ...shadow("card") },
  failedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  failedAction: { fontSize: 12, fontWeight: "800", color: colors.brandStrong },
  composerWrap: { backgroundColor: "rgba(255,255,255,0.97)", ...shadow("card") },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: space.lg, paddingTop: 10 },
  tool: { width: 36, height: 44, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: radius.lg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.bgSoft, fontSize: 15, color: colors.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  closed: { alignItems: "center", paddingTop: 12, paddingHorizontal: space.lg },
  orderButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.22)" },
});
