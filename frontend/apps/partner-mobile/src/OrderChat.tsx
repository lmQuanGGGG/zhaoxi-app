import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authHeaders, getOrderChat, getOrderChatUnread, getOrderChats, markOrderChatRead, orderChatPhotoUrl, sendOrderChat, uploadOrderChatPhoto } from "./api";
import { MAX_CHAT_PHOTOS, compressPhoto, loadPhotoModules, pickPhotos, takePhoto, type LocalPhoto } from "./chat-photos";
import type { Language } from "./i18n";
import { C, s } from "./styles";
import type { OrderChatMessage, OrderChatSummary, OrderChatThread } from "./types";

// Order chat with customers: the "Tin nhắn" tab list and the full-screen thread.
// Realtime is polling (4s in an open thread, 10s on the list, 15s for the badge)
// plus a refresh whenever a chat push arrives.

const COPY = {
  vi: { title: "Tin nhắn", empty: "Chưa có tin nhắn", emptyDesc: "Khách nhắn theo đơn sẽ hiện ở đây.", placeholder: "Nhắn khách…", you: "Bạn", seen: "Đã xem", start: "Nhắn cho khách về đơn này", noStore: "Đơn không còn thuộc gian hàng này", error: "Không gửi được, thử lại.", photo: "Ảnh", camera: "Chụp ảnh", photoLimit: "Tối đa 5 ảnh mỗi lần gửi", cameraDenied: "Hãy cho phép dùng camera trong Cài đặt", failed: "Chưa gửi được", retry: "Gửi lại", discard: "Xoá" },
  en: { title: "Messages", empty: "No messages yet", emptyDesc: "Customer messages about orders appear here.", placeholder: "Message the customer…", you: "You", seen: "Seen", start: "Message the customer about this order", noStore: "This order no longer belongs to this store", error: "Could not send, try again.", photo: "Photo", camera: "Take photo", photoLimit: "Up to 5 photos per message", cameraDenied: "Allow camera access in Settings", failed: "Not sent", retry: "Retry", discard: "Delete" },
  zh: { title: "消息", empty: "暂无消息", emptyDesc: "客户关于订单的消息会显示在这里。", placeholder: "回复客户…", you: "我", seen: "已读", start: "就此订单联系客户", noStore: "该订单已不属于本店", error: "发送失败，请重试。", photo: "图片", camera: "拍照", photoLimit: "每次最多 5 张图片", cameraDenied: "请在设置中允许使用相机", failed: "发送失败", retry: "重发", discard: "删除" },
} as const;

export const orderChatCopy = (lang: Language) => COPY[lang] || COPY.vi;

/** True for the push the backend sends when a customer writes in an order chat. */
export function isOrderMessagePush(data: unknown): data is { orderId: string; kind: "order_message" } {
  return Boolean(data && typeof data === "object" && (data as Record<string, unknown>).kind === "order_message" && (data as Record<string, unknown>).orderId);
}

function clock(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const today = new Date().toDateString() === d.toDateString();
  return today ? `${hh}:${mm}` : `${hh}:${mm} · ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const newClientId = () => `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Unread customer messages for the store, for the tab badge. */
export function useOrderChatUnread(orgId: string, refreshKey = 0) {
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(() => {
    void getOrderChatUnread(orgId).then((x) => setUnread(x.unread)).catch(() => undefined);
  }, [orgId]);
  useEffect(() => {
    refresh();
    const timer = setInterval(() => { if (AppState.currentState === "active") refresh(); }, 15_000);
    return () => clearInterval(timer);
  }, [refresh, refreshKey]);
  return unread;
}

export function OrderChatList({ orgId, lang, refreshKey, onOpen }: { orgId: string; lang: Language; refreshKey: number; onOpen: (requestId: string) => void }) {
  const t = orderChatCopy(lang);
  const [threads, setThreads] = useState<OrderChatSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      const data = await getOrderChats(orgId);
      setThreads(data.threads);
    } catch {
      setThreads((current) => current || []);
    }
  }, [orgId]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (AppState.currentState === "active") void load(); }, 10_000);
    return () => clearInterval(timer);
  }, [load, refreshKey]);

  if (!threads) return <View style={[s.flex, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={C.green} /></View>;
  return (
    <FlatList
      style={s.flex}
      data={threads}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[s.page, { paddingBottom: 110 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={C.green} />}
      ListHeaderComponent={<Text style={s.webSection}>{t.title}</Text>}
      ListEmptyComponent={
        <View style={s.empty}>
          <Ionicons name="chatbubbles-outline" size={42} color={C.green} />
          <Text style={s.emptyTitle}>{t.empty}</Text>
          <Text style={s.emptyText}>{t.emptyDesc}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => onOpen(item.requestId)} style={({ pressed }) => [s.card, styles.thread, pressed && { opacity: 0.85 }]}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(item.title || "?").trim().charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.between}>
              <Text style={[styles.name, item.unreadCount > 0 && { color: C.ink }]} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.time}>{clock(item.lastMessageAt)}</Text>
            </View>
            <Text style={styles.code} numberOfLines={1}>{item.subtitle}</Text>
            <View style={s.between}>
              <Text style={[styles.preview, item.unreadCount > 0 && styles.previewUnread]} numberOfLines={1}>
                {item.lastSenderRole === "partner" ? `${t.you}: ` : ""}{item.lastMessage}
              </Text>
              {item.unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text></View> : null}
            </View>
          </View>
        </Pressable>
      )}
    />
  );
}

type Outgoing = { clientMessageId: string; body: string; photos: LocalPhoto[]; createdAt: string; failed: boolean };
type Row = OrderChatMessage & { photos: GridPhoto[]; outgoing?: Outgoing };
type GridPhoto = { key: string; uri: string; width: number | null; height: number | null; remote: boolean };

/** Chat photos are private: the backend only serves them with the store's token. */
const photoSource = (photo: GridPhoto) => (photo.remote ? { uri: photo.uri, headers: authHeaders() } : { uri: photo.uri });

function PhotoGrid({ photos, dim, onOpen }: { photos: GridPhoto[]; dim: boolean; onOpen: (index: number) => void }) {
  const [first] = photos;
  if (photos.length === 1 && first) {
    const ratio = first.width && first.height ? first.height / first.width : 0.75;
    return (
      <Pressable onPress={() => onOpen(0)} style={[styles.photoSingle, { height: Math.min(300, Math.max(140, 220 * ratio)) }, dim && { opacity: 0.6 }]}>
        <Image source={photoSource(first)} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </Pressable>
    );
  }
  return (
    <View style={[styles.photoGrid, dim && { opacity: 0.6 }]}>
      {photos.map((photo, index) => (
        <Pressable key={photo.key} onPress={() => onOpen(index)} style={[styles.photoCell, photos.length % 2 === 1 && index === photos.length - 1 && { width: 220 }]}>
          <Image source={photoSource(photo)} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </Pressable>
      ))}
    </View>
  );
}

export function OrderChatModal({ orgId, requestId, lang, refreshKey, onClose, onChanged }: { orgId: string; requestId: string | null; lang: Language; refreshKey: number; onClose: () => void; onChanged: () => void }) {
  const t = orderChatCopy(lang);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [data, setData] = useState<OrderChatThread | null>(null);
  const [outbox, setOutbox] = useState<Outgoing[]>([]);
  const [drafts, setDrafts] = useState<LocalPhoto[]>([]);
  const [viewer, setViewer] = useState<{ photos: GridPhoto[]; index: number } | null>(null);
  const [photosReady, setPhotosReady] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<FlatList<Row>>(null);
  // Uploaded photo ids per outgoing message, so a retry only sends what is missing.
  const uploaded = useRef(new Map<string, Record<string, string>>());

  useEffect(() => { void loadPhotoModules().then((m) => setPhotosReady(Boolean(m))); }, []);

  const load = useCallback(async () => {
    if (!requestId) return null;
    try {
      const next = await getOrderChat(orgId, requestId);
      setData(next);
      setError("");
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : t.noStore);
      return null;
    }
  }, [orgId, requestId, t.noStore]);

  useEffect(() => {
    setData(null);
    setOutbox([]);
    setDrafts([]);
    setViewer(null);
    setError("");
    setText("");
    uploaded.current.clear();
  }, [requestId]);
  useEffect(() => {
    if (!requestId) return;
    void load();
    const timer = setInterval(() => { if (AppState.currentState === "active") void load(); }, 4_000);
    return () => clearInterval(timer);
  }, [requestId, load]);
  // A chat push or a send elsewhere: refresh in place, never reset the open thread.
  useEffect(() => {
    if (refreshKey) void load();
  }, [refreshKey, load]);

  // Mark read on open and whenever a new customer message arrives, not on every poll.
  const loaded = Boolean(data);
  const incoming = useMemo(() => (data?.messages || []).filter((m) => m.senderRole === "customer").length, [data?.messages]);
  useEffect(() => {
    if (!requestId || !loaded) return;
    void markOrderChatRead(orgId, requestId).then(onChanged).catch(() => undefined);
  }, [incoming, requestId, orgId, loaded, onChanged]);

  const rows = useMemo<Row[]>(() => {
    const saved = data?.messages || [];
    const savedIds = new Set(saved.map((m) => m.clientMessageId).filter(Boolean));
    return [
      ...saved.map((m) => ({ ...m, photos: (m.attachments || []).map((a) => ({ key: a.id, uri: orderChatPhotoUrl(a, orgId), width: a.width, height: a.height, remote: true })) })),
      ...outbox.filter((m) => !savedIds.has(m.clientMessageId)).map((m) => ({
        id: `local-${m.clientMessageId}`, clientMessageId: m.clientMessageId, body: m.body, senderRole: "partner" as const, createdAt: m.createdAt, pending: true, outgoing: m,
        photos: m.photos.map((p) => ({ key: p.key, uri: p.uri, width: p.width, height: p.height, remote: false })),
      })),
    ];
  }, [data?.messages, outbox, orgId]);

  const readAt = data?.thread.counterpartReadAt ? new Date(data.thread.counterpartReadAt).getTime() : 0;
  const seenId = readAt ? rows.filter((m) => m.senderRole === "partner" && !m.pending && new Date(m.createdAt).getTime() <= readAt).at(-1)?.id : undefined;

  async function deliver(message: Outgoing) {
    if (!requestId) return;
    setOutbox((current) => current.map((m) => (m.clientMessageId === message.clientMessageId ? { ...m, failed: false } : m)));
    const done = uploaded.current.get(message.clientMessageId) || {};
    uploaded.current.set(message.clientMessageId, done);
    try {
      for (const photo of message.photos) {
        if (done[photo.key]) continue;
        done[photo.key] = (await uploadOrderChatPhoto(orgId, requestId, await compressPhoto(photo))).id;
      }
      await sendOrderChat(orgId, requestId, message.body, message.clientMessageId, message.photos.map((p) => done[p.key]).filter((id): id is string => Boolean(id)));
      await load();
      uploaded.current.delete(message.clientMessageId);
      setOutbox((current) => current.filter((m) => m.clientMessageId !== message.clientMessageId));
      onChanged();
    } catch {
      setOutbox((current) => current.map((m) => (m.clientMessageId === message.clientMessageId ? { ...m, failed: true } : m)));
    }
  }

  function submit() {
    const body = text.trim();
    if ((!body && !drafts.length) || !requestId) return;
    const message: Outgoing = { clientMessageId: newClientId(), body, photos: drafts, createdAt: new Date().toISOString(), failed: false };
    setText("");
    setDrafts([]);
    setError("");
    setOutbox((current) => [...current, message]);
    void deliver(message);
  }

  function discard(message: Outgoing) {
    uploaded.current.delete(message.clientMessageId);
    setOutbox((current) => current.filter((m) => m.clientMessageId !== message.clientMessageId));
  }

  async function addPhotos(camera: boolean) {
    const room = MAX_CHAT_PHOTOS - drafts.length;
    if (room <= 0) return setError(t.photoLimit);
    try {
      const picked = camera ? [await takePhoto()].filter((x): x is LocalPhoto => Boolean(x)) : await pickPhotos(room);
      if (picked.length) setDrafts((current) => [...current, ...picked].slice(0, MAX_CHAT_PHOTOS));
    } catch (e) {
      setError(e instanceof Error && e.message === "CAMERA_DENIED" ? t.cameraDenied : t.error);
    }
  }

  const canSend = data?.thread.canSend !== false;
  return (
    <Modal visible={Boolean(requestId)} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => (viewer ? setViewer(null) : onClose())}>
      <SafeAreaView style={[s.safe, { backgroundColor: C.white }]} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.back}><Ionicons name="chevron-back" size={26} color={C.ink} /></Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{data?.thread.title || " "}</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{data?.thread.subtitle || ""}</Text>
          </View>
        </View>
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {!data && !error ? <View style={[s.flex, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={C.green} /></View> : (
            <FlatList
              ref={listRef}
              style={{ flex: 1, backgroundColor: C.bg }}
              data={rows}
              keyExtractor={(item) => item.clientMessageId || item.id}
              contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, justifyContent: rows.length ? "flex-end" : "center" }}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              keyboardDismissMode="interactive"
              ListEmptyComponent={<View style={{ alignItems: "center", gap: 8 }}><Ionicons name="chatbubble-ellipses-outline" size={36} color={C.green} /><Text style={s.emptyText}>{t.start}</Text></View>}
              renderItem={({ item }) => {
                const own = item.senderRole === "partner";
                const failed = item.outgoing?.failed;
                return (
                  <View style={{ alignItems: own ? "flex-end" : "flex-start" }}>
                    {item.photos.length ? <PhotoGrid photos={item.photos} dim={Boolean(item.pending && !failed)} onOpen={(index) => setViewer({ photos: item.photos, index })} /> : null}
                    {item.body ? (
                      <View style={[styles.bubble, own ? styles.own : styles.other, item.photos.length > 0 && { marginTop: 4 }, item.pending && !failed && { opacity: 0.6 }]}>
                        <Text style={[styles.bubbleText, own && { color: C.white }]}>{item.body}</Text>
                      </View>
                    ) : null}
                    {failed && item.outgoing ? (
                      <View style={styles.failedRow}>
                        <Ionicons name="alert-circle" size={14} color={C.red} />
                        <Text style={[styles.time, { color: C.red, marginTop: 0 }]}>{t.failed}</Text>
                        <Pressable hitSlop={8} onPress={() => void deliver(item.outgoing!)}><Text style={styles.failedAction}>{t.retry}</Text></Pressable>
                        <Pressable hitSlop={8} onPress={() => discard(item.outgoing!)}><Text style={[styles.failedAction, { color: C.muted }]}>{t.discard}</Text></Pressable>
                      </View>
                    ) : (
                      <Text style={styles.time}>{item.pending ? "…" : clock(item.createdAt)}{item.id === seenId ? ` · ${t.seen}` : ""}</Text>
                    )}
                  </View>
                );
              }}
            />
          )}
          {!!error && <Text style={[s.error, { marginHorizontal: 16, marginTop: 8, marginBottom: 0 }]}>{error}</Text>}
          {canSend ? (
            <View style={styles.composerWrap}>
              {drafts.length ? (
                <View style={styles.drafts}>
                  {drafts.map((photo) => (
                    <View key={photo.key} style={styles.draft}>
                      <Image source={{ uri: photo.uri }} style={styles.draftImage} />
                      <Pressable hitSlop={8} onPress={() => setDrafts((current) => current.filter((p) => p.key !== photo.key))} style={styles.draftRemove}>
                        <Ionicons name="close" size={12} color={C.white} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.composer}>
                {photosReady && drafts.length < MAX_CHAT_PHOTOS ? (
                  <>
                    <Pressable accessibilityLabel={t.camera} hitSlop={6} onPress={() => void addPhotos(true)} style={styles.tool}><Ionicons name="camera-outline" size={23} color={C.green} /></Pressable>
                    <Pressable accessibilityLabel={t.photo} hitSlop={6} onPress={() => void addPhotos(false)} style={styles.tool}><Ionicons name="image-outline" size={23} color={C.green} /></Pressable>
                  </>
                ) : null}
                <TextInput value={text} onChangeText={setText} placeholder={t.placeholder} placeholderTextColor={C.muted} style={styles.input} multiline maxLength={2000} />
                <Pressable disabled={!text.trim() && !drafts.length} onPress={submit} style={[styles.send, !text.trim() && !drafts.length && { opacity: 0.5 }]}>
                  <Ionicons name="send" size={18} color={C.white} />
                </Pressable>
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
        {viewer ? (
          <View style={styles.viewer}>
            <FlatList
              data={viewer.photos}
              keyExtractor={(photo) => photo.key}
              horizontal
              pagingEnabled
              initialScrollIndex={viewer.index}
              getItemLayout={(_, i) => ({ length: screenWidth, offset: screenWidth * i, index: i })}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <Image source={photoSource(item)} style={{ width: screenWidth, height: screenHeight }} resizeMode="contain" />}
            />
            <Pressable onPress={() => setViewer(null)} hitSlop={12} style={styles.viewerClose}><Ionicons name="close" size={24} color={C.white} /></Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  thread: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" },
  avatarText: { color: C.green, fontSize: 18, fontWeight: "900" },
  name: { flex: 1, color: C.ink, fontSize: 16, fontWeight: "900", paddingRight: 8 },
  code: { color: C.green, fontSize: 12, fontWeight: "800", marginTop: 2 },
  preview: { flex: 1, color: C.muted, fontSize: 14, marginTop: 4, paddingRight: 8 },
  previewUnread: { color: C.ink, fontWeight: "800" },
  time: { color: C.muted, fontSize: 11, marginTop: 3 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: C.red, alignItems: "center", justifyContent: "center", marginTop: 4 },
  badgeText: { color: C.white, fontSize: 11, fontWeight: "900" },
  header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: C.white, shadowColor: "#173c2c", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3, zIndex: 1 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: C.ink, fontSize: 18, fontWeight: "900" },
  headerSub: { color: C.muted, fontSize: 12, marginTop: 1 },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  own: { backgroundColor: C.green, borderBottomRightRadius: 6 },
  other: { backgroundColor: C.white, borderBottomLeftRadius: 6, shadowColor: "#173c2c", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  bubbleText: { color: C.ink, fontSize: 15, lineHeight: 21 },
  composerWrap: { backgroundColor: C.white },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  tool: { width: 34, height: 44, alignItems: "center", justifyContent: "center" },
  drafts: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingTop: 10 },
  draft: { width: 56, height: 56 },
  draftImage: { width: 56, height: 56, borderRadius: 12 },
  draftRemove: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(15,23,42,0.85)", alignItems: "center", justifyContent: "center" },
  photoSingle: { width: 220, borderRadius: 16, overflow: "hidden", backgroundColor: "#eef2f0" },
  photoGrid: { width: 220, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  photoCell: { width: 108, height: 108, borderRadius: 12, overflow: "hidden", backgroundColor: "#eef2f0" },
  failedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  failedAction: { fontSize: 12, fontWeight: "900", color: C.green },
  viewer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.96)" },
  viewerClose: { position: "absolute", top: 54, right: 18, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: "#f1f6f3", fontSize: 15, color: C.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
});
