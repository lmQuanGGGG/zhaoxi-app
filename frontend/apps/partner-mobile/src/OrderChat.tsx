import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getOrderChat, getOrderChatUnread, getOrderChats, markOrderChatRead, sendOrderChat } from "./api";
import type { Language } from "./i18n";
import { C, s } from "./styles";
import type { OrderChatMessage, OrderChatSummary, OrderChatThread } from "./types";

// Order chat with customers: the "Tin nhắn" tab list and the full-screen thread.
// Realtime is polling (4s in an open thread, 10s on the list, 15s for the badge)
// plus a refresh whenever a chat push arrives.

const COPY = {
  vi: { title: "Tin nhắn", empty: "Chưa có tin nhắn", emptyDesc: "Khách nhắn theo đơn sẽ hiện ở đây.", placeholder: "Nhắn khách…", you: "Bạn", seen: "Đã xem", start: "Nhắn cho khách về đơn này", noStore: "Đơn không còn thuộc gian hàng này", error: "Không gửi được, thử lại." },
  en: { title: "Messages", empty: "No messages yet", emptyDesc: "Customer messages about orders appear here.", placeholder: "Message the customer…", you: "You", seen: "Seen", start: "Message the customer about this order", noStore: "This order no longer belongs to this store", error: "Could not send, try again." },
  zh: { title: "消息", empty: "暂无消息", emptyDesc: "客户关于订单的消息会显示在这里。", placeholder: "回复客户…", you: "我", seen: "已读", start: "就此订单联系客户", noStore: "该订单已不属于本店", error: "发送失败，请重试。" },
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

export function OrderChatModal({ orgId, requestId, lang, refreshKey, onClose, onChanged }: { orgId: string; requestId: string | null; lang: Language; refreshKey: number; onClose: () => void; onChanged: () => void }) {
  const t = orderChatCopy(lang);
  const [data, setData] = useState<OrderChatThread | null>(null);
  const [pending, setPending] = useState<OrderChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<FlatList<OrderChatMessage>>(null);

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
    setPending([]);
    setError("");
    setText("");
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

  const messages = useMemo(() => {
    const saved = data?.messages || [];
    const savedIds = new Set(saved.map((m) => m.clientMessageId).filter(Boolean));
    return [...saved, ...pending.filter((m) => !savedIds.has(m.clientMessageId))];
  }, [data?.messages, pending]);

  const readAt = data?.thread.counterpartReadAt ? new Date(data.thread.counterpartReadAt).getTime() : 0;
  const seenId = readAt ? messages.filter((m) => m.senderRole === "partner" && !m.pending && new Date(m.createdAt).getTime() <= readAt).at(-1)?.id : undefined;

  async function submit() {
    const body = text.trim();
    if (!body || !requestId) return;
    const clientMessageId = newClientId();
    const local: OrderChatMessage = { id: `local-${clientMessageId}`, clientMessageId, body, senderRole: "partner", createdAt: new Date().toISOString(), pending: true };
    setText("");
    setError("");
    setPending((current) => [...current, local]);
    try {
      await sendOrderChat(orgId, requestId, body, clientMessageId);
      await load();
      onChanged();
    } catch (e) {
      setText(body);
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setPending((current) => current.filter((m) => m.id !== local.id));
    }
  }

  return (
    <Modal visible={Boolean(requestId)} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
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
              data={messages}
              keyExtractor={(item) => item.clientMessageId || item.id}
              contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, justifyContent: messages.length ? "flex-end" : "center" }}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              keyboardDismissMode="interactive"
              ListEmptyComponent={<View style={{ alignItems: "center", gap: 8 }}><Ionicons name="chatbubble-ellipses-outline" size={36} color={C.green} /><Text style={s.emptyText}>{t.start}</Text></View>}
              renderItem={({ item }) => {
                const own = item.senderRole === "partner";
                return (
                  <View style={{ alignItems: own ? "flex-end" : "flex-start" }}>
                    <View style={[styles.bubble, own ? styles.own : styles.other, item.pending && { opacity: 0.6 }]}>
                      <Text style={[styles.bubbleText, own && { color: C.white }]}>{item.body}</Text>
                    </View>
                    <Text style={styles.time}>{item.pending ? "…" : clock(item.createdAt)}{item.id === seenId ? ` · ${t.seen}` : ""}</Text>
                  </View>
                );
              }}
            />
          )}
          {!!error && <Text style={[s.error, { marginHorizontal: 16, marginTop: 8, marginBottom: 0 }]}>{error}</Text>}
          {data?.thread.canSend !== false ? (
            <View style={styles.composer}>
              <TextInput value={text} onChangeText={setText} placeholder={t.placeholder} placeholderTextColor={C.muted} style={styles.input} multiline maxLength={2000} />
              <Pressable disabled={!text.trim()} onPress={() => void submit()} style={[styles.send, !text.trim() && { opacity: 0.5 }]}>
                <Ionicons name="send" size={18} color={C.white} />
              </Pressable>
            </View>
          ) : null}
        </KeyboardAvoidingView>
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
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.white },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: "#f1f6f3", fontSize: 15, color: C.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
});
