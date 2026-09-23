import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Image, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, TouchableWithoutFeedback, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { getOrderHistory, getPartnerOrganizations, getQueue, fulfill, loadAuth, login, loginWithPhone, logout, registerPush, switchPartnerOrganization, updateKitchen } from "./src/api";
import { configureNotifications, getPushToken, notifyNewOrder } from "./src/notifications";
import { C, s } from "./src/styles";
import type { AuthState, Order, OrderStage, PartnerOrganization, QueueData } from "./src/types";

const EMPTY: QueueData = { generatedAt: "", counts: { waiting: 0, preparing: 0, ready: 0, courier: 0, late: 0 }, items: [] };
const stageLabel: Record<OrderStage, string> = { assigned: "Chờ nhận", preparing: "Đang chuẩn bị", ready_for_pickup: "Chờ lấy món", courier_booked: "Đã gọi ship", handed_off: "Đang giao" };
const nextAction: Partial<Record<OrderStage, { action: string; label: string }>> = {
  preparing: { action: "ready_for_pickup", label: "Món đã sẵn sàng" },
  ready_for_pickup: { action: "courier_booked", label: "Đã gọi tài xế" },
  courier_booked: { action: "handed_off", label: "Đã bàn giao" },
  handed_off: { action: "delivered", label: "Đã giao xong" },
};
const money = (value: number) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

async function deviceId() {
  return (Platform.OS === "android" ? Application.getAndroidId() : await Application.getIosIdForVendorAsync()) || `partner-${Platform.OS}`;
}

function Login({ onDone }: { onDone: (value: AuthState) => void }) {
  const [mode, setMode] = useState<"account" | "phone">("phone"); const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [phone, setPhone] = useState(""); const [pin, setPin] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit() {
    if (mode === "account" && (username.trim().length < 3 || password.length < 6)) return setError("Nhập tài khoản và mật khẩu tối thiểu 6 ký tự.");
    const digits = phone.replace(/\D/g, "").replace(/^84/, "").replace(/^0/, "");
    if (mode === "phone" && (digits.length < 8 || digits.length > 10 || !/^\d{6}$/.test(pin))) return setError("Nhập số điện thoại Việt Nam và mã PIN đủ 6 số.");
    setBusy(true); setError("");
    try { const id = await deviceId(); onDone(mode === "phone" ? await loginWithPhone(`+84${digits}`, pin, id) : await login(username, password, id)); } catch (e) { setError(e instanceof Error ? e.message : "Không thể đăng nhập."); } finally { setBusy(false); }
  }
  return <KeyboardAvoidingView style={s.login} behavior={Platform.OS === "ios" ? "padding" : "height"}><StatusBar style="light"/><TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}><ScrollView style={s.flex} contentContainerStyle={s.loginScroll} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}><View style={s.loginCard}>
    <Image source={require("./assets/icon.png")} style={s.logo}/><Text style={s.loginTitle}>ZhaoXi Partner</Text><Text style={s.loginSub}>Nhận đơn, xác nhận và theo dõi bếp ngay trên điện thoại.</Text>
    <View style={s.loginTabs}><Pressable onPress={() => { setMode("phone"); setError(""); }} style={[s.loginTab, mode === "phone" && s.loginTabOn]}><Text style={[s.loginTabText, mode === "phone" && s.loginTabTextOn]}>Số điện thoại</Text></Pressable><Pressable onPress={() => { setMode("account"); setError(""); }} style={[s.loginTab, mode === "account" && s.loginTabOn]}><Text style={[s.loginTabText, mode === "account" && s.loginTabTextOn]}>Tài khoản</Text></Pressable></View>
    {mode === "phone" ? <><Text style={s.label}>Số điện thoại</Text><View style={s.phoneRow}><View style={s.dialCode}><Text style={s.dialCodeText}>🇻🇳 +84</Text></View><TextInput value={phone} onChangeText={value => setPhone(value.replace(/\D/g, ""))} style={[s.input, s.phoneInput]} keyboardType="phone-pad" placeholder="094 241 1045" maxLength={11}/></View>
      <Text style={s.label}>Mã PIN 6 số</Text><TextInput value={pin} onChangeText={value => setPin(value.replace(/\D/g, "").slice(0, 6))} style={s.input} secureTextEntry keyboardType="number-pad" placeholder="••••••" maxLength={6} onSubmitEditing={() => void submit()}/><Text style={s.loginHint}>Dùng mã PIN 6 số đã thiết lập trên ZhaoXi Partner.</Text></> : <><Text style={s.label}>Tài khoản partner</Text><TextInput value={username} onChangeText={setUsername} style={s.input} autoCapitalize="none" autoCorrect={false} placeholder="Tên đăng nhập"/>
      <Text style={s.label}>Mật khẩu</Text><TextInput value={password} onChangeText={setPassword} style={s.input} secureTextEntry placeholder="Tối thiểu 6 ký tự" onSubmitEditing={() => void submit()}/></>}
    {!!error && <Text style={s.error}>{error}</Text>}<Pressable style={[s.button, s.buttonGreen]} disabled={busy} onPress={() => void submit()}>{busy ? <ActivityIndicator color="white"/> : <Text style={s.buttonText}>Đăng nhập cửa hàng</Text>}</Pressable>
  </View></ScrollView></TouchableWithoutFeedback></KeyboardAvoidingView>;
}

function OrderCard({ order, onOpen, onAction, onCancel, busy = false, onPriority, onEta, interactive = true }: { order: Order; onOpen: () => void; onAction?: () => void; onCancel?: () => void; busy?: boolean; onPriority: (priority: Order["priority"]) => void; onEta: (minutes: number) => void; interactive?: boolean }) {
  const provider = order.deliveryProvider === "grab" ? "Grab" : order.deliveryProvider === "green_sm" ? "Xanh SM" : "";
  const completed = order.status === "completed";
  const cancelled = ["cancelled", "rejected"].includes(order.status);
  const statusText = completed ? "Đã hoàn thành" : cancelled ? "Đã hủy" : stageLabel[order.stage];
  return <View style={[s.card, order.late && s.cardLate]}>
    <Pressable onPress={onOpen} accessible={false}>
      <View style={s.between}><Text style={s.code}>{order.requestCode}</Text>{order.late && !completed && !cancelled ? <Text style={[s.meta, { color: C.red, fontWeight: "900" }]}>Trễ {order.overdueMinutes}m</Text> : <View style={s.pill}><Text style={s.pillText}>{statusText}</Text></View>}</View>
      <Text style={s.itemName}>{order.serviceName} · ×{order.quantity}</Text><View style={s.between}><View style={s.row}><Ionicons name="person" size={16} color={C.ink}/><Text style={s.meta}>{order.customerName} · ×{order.quantity}</Text></View>{!!order.customerPhone && <Pressable style={s.phoneBadge} onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}><Ionicons name="call" size={14} color={C.green}/><Text style={s.phoneText}>{order.customerPhone}</Text></Pressable>}</View>
      {!!order.addressText && <View style={s.row}><Ionicons name="location" size={16} color={C.muted}/><Text style={[s.meta, { flex: 1 }]}>{order.addressText}</Text></View>}
    </Pressable>
    {interactive && <View style={s.externalBadge}><Text style={s.externalBadgeText}>Giao hàng bên ngoài · {order.stage === "ready_for_pickup" ? "ready_for_pickup" : order.stage}</Text></View>}
    {provider && <View style={[s.providerBadge, order.deliveryProvider === "grab" && { backgroundColor: "#dcfce7" }]}><Image source={order.deliveryProvider === "grab" ? require("./assets/grab.png") : require("./assets/green-sm.png")} style={s.providerLogo}/><Text style={s.providerText}>{provider} (Khách tự trả ship)</Text></View>}
    <View style={s.row}><Ionicons name="stopwatch-outline" size={16} color={C.muted}/><Text style={s.meta}>Đã xử lý: {order.elapsedMinutes} phút</Text></View>
    <View style={s.detailGrid}><View style={s.detailTile}><Text style={s.detailLabel}>Số lượng:</Text><Text style={s.detailValue}>{order.quantity}</Text></View><View style={s.detailTile}><Text style={s.detailLabel}>Tiền món:</Text><Text style={s.detailValue}>{money(order.itemSubtotal || order.totalAmount)}</Text></View><View style={s.detailTile}><Text style={s.detailLabel}>Phí giao hàng gốc:</Text><Text style={s.detailValue}>{money(order.deliveryGrossFee || 0)}</Text></View><View style={s.detailTile}><Text style={s.detailLabel}>Khách trả phí giao:</Text><Text style={s.detailValue}>{money(order.customerDeliveryFee || 0)}</Text></View><View style={s.detailTile}><Text style={s.detailLabel}>Quãng đường:</Text><Text style={s.detailValue}>{order.deliveryDistanceKm ? `${order.deliveryDistanceKm.toFixed(1)} km` : "—"}</Text></View><View style={s.detailTile}><Text style={s.detailLabel}>Tổng đơn:</Text><Text style={[s.detailValue, s.detailValueGreen]}>{money(order.totalAmount)}</Text></View>{order.paymentMethod && <View style={s.detailTile}><Text style={s.detailLabel}>Thanh toán:</Text><Text style={s.detailValue}>{order.paymentMethod === "bank_transfer" ? "Chuyển khoản" : "Tiền mặt"}{order.paymentStatus === "paid" ? " · Đã thanh toán" : ""}</Text></View>}</View>
    {interactive && <View style={s.priorityRow}>{(["normal", "high", "urgent"] as const).map(level => <Pressable key={level} onPress={() => onPriority(level)} style={[s.priorityButton, order.priority === level && (level === "urgent" ? s.priorityUrgentOn : s.priorityOn)]}><Text style={[s.priorityText, order.priority === level && (level === "urgent" ? s.priorityUrgentTextOn : s.priorityTextOn)]}>{level === "normal" ? "Bình thường" : level === "high" ? "Ưu tiên" : "Khẩn"}</Text></Pressable>)}</View>}
    {interactive && order.stage === "preparing" && <Pressable style={s.etaSelect} onPress={() => onEta(order.estimatedMinutes || 15)}><View style={s.between}><Text style={s.meta}>Điều chỉnh thời gian: <Text style={{ color: C.ink, fontWeight: "900" }}>{order.estimatedMinutes || 15} phút</Text></Text><Ionicons name="chevron-down" size={20} color={C.ink}/></View></Pressable>}
    {interactive && !cancelled && !completed && <View style={s.actions}><Pressable disabled={busy} style={[s.button, s.buttonGreen, { flex: 1, opacity: busy ? 0.65 : 1 }]} onPress={onAction}>{busy ? <ActivityIndicator color="white"/> : <Text style={s.buttonText}>{order.stage === "assigned" ? "Nhận đơn" : nextAction[order.stage]?.label || "Cập nhật đơn"}</Text>}</Pressable><Pressable disabled={busy} style={[s.button, s.buttonRed, { flex: 0.85, opacity: busy ? 0.65 : 1 }]} onPress={onCancel}><Text style={s.buttonRedText}>Hủy đơn</Text></Pressable></View>}
  </View>;
}

function OrderModal({
  order,
  onClose,
  onRefresh,
  waitingCount = 1,
  waitingIndex = 1,
  onSelectOrder,
}: {
  order: Order | null;
  onClose: () => void;
  onRefresh: () => Promise<QueueData | null>;
  waitingCount?: number;
  waitingIndex?: number;
  onSelectOrder?: (order: Order) => void;
}) {
  const [eta, setEta] = useState(15); const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (order) { setEta(order.estimatedMinutes || 15); setError(""); } }, [order]);
  async function run(payload: Record<string, unknown>) {
    if (!order || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await fulfill(order.requestId, payload);
      const nextQueue = await onRefresh();
      if (order.stage === "assigned") {
        const remaining = (nextQueue?.items || []).filter(x => x.stage === "assigned" && x.requestId !== order.requestId);
        const nextWaiting = remaining[0];
        if (nextWaiting && onSelectOrder) {
          onSelectOrder(nextWaiting);
          return;
        }
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể cập nhật đơn.");
    } finally {
      setSubmitting(false);
    }
  }
  if (!order) return null;
  const next = nextAction[order.stage];
  const remainingBehind = Math.max(0, waitingCount - waitingIndex);
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={s.centerModalBackdrop}><ScrollView style={s.centerModal} contentContainerStyle={{ paddingBottom: 34 }}><View style={s.modalHandle}/>
    {order.stage === "assigned" && <View style={[s.pill, { alignSelf: "flex-start", backgroundColor: "#fee2e2", marginBottom: 10 }]}><Text style={{ color: "#b91c1c", fontWeight: "900", fontSize: 13 }}>{waitingCount > 1 ? `🔔 ĐƠN MỚI (${waitingIndex}/${waitingCount})${remainingBehind > 0 ? ` · CÒN ${remainingBehind} ĐƠN TIẾP THEO` : " · ĐƠN CUỐI CẦN DUYỆT"}` : "🔔 ĐƠN HÀNG MỚI CẦN NHẬN"}</Text></View>}
    <View style={s.between}><View style={{ flex: 1, paddingRight: 8 }}><Text style={s.code}>{order.requestCode}</Text><Text style={s.modalTitle}>{order.serviceName} · ×{order.quantity}</Text></View><Pressable onPress={onClose} hitSlop={10}><Ionicons name="close-circle" size={32} color={C.muted}/></Pressable></View>
    <View style={s.row}><Ionicons name="person-outline" size={16} color={C.muted}/><Text style={s.meta}>{order.customerName}</Text></View>{!!order.customerPhone && <Pressable style={s.row} onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}><Ionicons name="call-outline" size={16} color={C.green}/><Text style={[s.meta, { color: C.green, fontWeight: "900" }]}>{order.customerPhone}</Text></Pressable>}
    {!!order.addressText && <View style={s.row}><Ionicons name="location-outline" size={16} color={C.muted}/><Text style={s.meta}>{order.addressText}</Text></View>}{order.deliveryProvider && <View style={[s.providerBadge, order.deliveryProvider === "grab" && { backgroundColor: "#dcfce7" }]}><Image source={order.deliveryProvider === "grab" ? require("./assets/grab.png") : require("./assets/green-sm.png")} style={s.providerLogo}/><Text style={s.providerText}>{order.deliveryProvider === "grab" ? "Grab" : "Xanh SM"} · Khách tự trả ship</Text></View>}<View style={s.detailGrid}><View style={s.detailTile}><Text style={s.detailLabel}>Số lượng:</Text><Text style={s.detailValue}>{order.quantity}</Text></View><View style={s.detailTile}><Text style={s.detailLabel}>Tiền món:</Text><Text style={s.detailValue}>{money(order.itemSubtotal || order.totalAmount)}</Text></View><View style={s.detailTile}><Text style={s.detailLabel}>Phí giao hàng gốc:</Text><Text style={s.detailValue}>{money(order.deliveryGrossFee || 0)}</Text></View><View style={s.detailTile}><Text style={s.detailLabel}>Khách trả phí giao:</Text><Text style={s.detailValue}>{money(order.customerDeliveryFee || 0)}</Text></View><View style={s.detailTile}><Text style={s.detailLabel}>Quãng đường:</Text><Text style={s.detailValue}>{order.deliveryDistanceKm ? `${order.deliveryDistanceKm.toFixed(1)} km` : "—"}</Text></View><View style={s.detailTile}><Text style={[s.detailLabel, s.detailValueGreen]}>Tổng đơn:</Text><Text style={[s.detailValue, s.detailValueGreen]}>{money(order.totalAmount)}</Text></View>{order.paymentMethod && <View style={s.detailTile}><Text style={s.detailLabel}>Thanh toán:</Text><Text style={s.detailValue}>{order.paymentMethod === "bank_transfer" ? "Chuyển khoản" : "Tiền mặt"}{order.paymentStatus === "paid" ? " · Đã thanh toán" : ""}</Text></View>}</View>
    {order.stage === "assigned" && <><Text style={[s.sectionTitle, { marginTop: 22, marginBottom: 0 }]}>Thời gian chuẩn bị</Text><View style={s.modalGrid}>{[10, 15, 20, 25, 30, 45].map(value => <Pressable key={value} onPress={() => setEta(value)} style={[s.eta, eta === value && s.etaOn]}><Text style={[s.etaText, eta === value && s.etaTextOn]}>{value} phút</Text></Pressable>)}</View></>}
    {!!error && <Text style={[s.error, { marginTop: 15 }]}>{error}</Text>}
    <View style={s.actions}>{order.stage === "assigned" ? <><Pressable disabled={submitting} style={[s.button, s.buttonRed, { flex: 1 }]} onPress={() => void run({ action: "cancelled", note: "partner_mobile_rejected" })}><Text style={s.buttonRedText}>Từ chối</Text></Pressable><Pressable disabled={submitting} style={[s.button, s.buttonGreen, { flex: 1.5 }]} onPress={() => void run({ action: "accept", estimatedMinutes: eta, note: `partner_mobile_accept_eta:${eta}` })}>{submitting ? <ActivityIndicator color="white"/> : <Text style={s.buttonText}>Nhận đơn ({eta}p)</Text>}</Pressable></> : next ? <Pressable disabled={submitting} style={[s.button, s.buttonGreen, { flex: 1 }]} onPress={() => void run({ action: next.action })}>{submitting ? <ActivityIndicator color="white"/> : <Text style={s.buttonText}>{next.label}</Text>}</Pressable> : null}</View>
  </ScrollView></View></Modal>;
}

function extractOrderId(data: unknown): string {
  if (!data) return "";
  let obj = data;
  if (typeof data === "string") {
    try { obj = JSON.parse(data); } catch { return ""; }
  }
  if (typeof obj !== "object" || obj === null) return "";
  const record = obj as Record<string, unknown>;
  const directId = record.orderId || record.requestId || record.id || record.requestCode;
  if (directId) return String(directId);
  if (record.body && typeof record.body === "object") {
    const bodyRecord = record.body as Record<string, unknown>;
    const bodyId = bodyRecord.orderId || bodyRecord.requestId || bodyRecord.id || bodyRecord.requestCode;
    if (bodyId) return String(bodyId);
  }
  return "";
}

function Main({ auth, onLogout, onAuth }: { auth: AuthState; onLogout: () => void; onAuth: (value: AuthState) => void }) {
  const orgId = auth.session.organizationId!; const [data, setData] = useState(EMPTY); const [history, setHistory] = useState<Order[]>([]); const [selected, setSelected] = useState<Order | null>(null);
  const selectedRef = useRef<Order | null>(null); selectedRef.current = selected;
  const [successOrder, setSuccessOrder] = useState<Order | null>(null); const [loading, setLoading] = useState(true); const [historyLoading, setHistoryLoading] = useState(false); const [orderView, setOrderView] = useState<"new" | "history">("new"); const [activeStage, setActiveStage] = useState<"waiting" | "preparing" | "ready">("waiting"); const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "cancelled">("all"); const [tab, setTab] = useState<"orders" | "settings">("orders"); const [pushStatus, setPushStatus] = useState("Đang thiết lập thông báo…"); const [actionError, setActionError] = useState(""); const [actionBusy, setActionBusy] = useState(""); const [confirmAction, setConfirmAction] = useState<{ order: Order; kind: "advance" | "cancel" } | null>(null);
  const [organizations, setOrganizations] = useState<PartnerOrganization[]>([]); const [storeModal, setStoreModal] = useState(false); const [switchingStore, setSwitchingStore] = useState(false);
  const initialized = useRef(false); const seen = useRef(new Set<string>()); const notified = useRef(new Set<string>()); const pushToken = useRef<string | undefined>(undefined); const pushReady = useRef(false); const pendingOrderId = useRef("");
  useEffect(() => { void getPartnerOrganizations().then(x => setOrganizations(x.organizations || [])).catch(() => undefined); }, []);
  async function switchStore(id: string) { if (id === orgId || switchingStore) return; setSwitchingStore(true); try { const next = await switchPartnerOrganization(id); setStoreModal(false); onAuth(next); } catch (e) { setPushStatus(e instanceof Error ? e.message : "Không thể đổi gian hàng."); } finally { setSwitchingStore(false); } }
  const load = useCallback(async () => {
    try {
      const next = await getQueue(orgId); setData(next); await AsyncStorage.setItem(`queue:${orgId}`, JSON.stringify(next));
      const waiting = next.items.filter(x => x.stage === "assigned");
      const incoming = waiting.filter(x => !seen.current.has(x.requestId));
      const firstIncoming = incoming[0];
      const firstWaiting = waiting[0];
      if (firstIncoming) {
        setTab("orders"); setOrderView("new"); setActiveStage("waiting");
        if (!selectedRef.current) setSelected(firstIncoming);
        if (!notified.current.has(firstIncoming.requestId) && !notified.current.has(firstIncoming.requestCode)) {
          notified.current.add(firstIncoming.requestId);
          notified.current.add(firstIncoming.requestCode);
          if (!pushReady.current) {
            void notifyNewOrder(firstIncoming);
          }
        }
      } else if (!initialized.current && firstWaiting) {
        setTab("orders"); setOrderView("new"); setActiveStage("waiting");
        if (!selectedRef.current) setSelected(firstWaiting);
      }
      if (selectedRef.current) {
        const curId = selectedRef.current.requestId;
        const fresh = next.items.find(x => x.requestId === curId);
        if (fresh) setSelected(fresh);
      }
      next.items.forEach(x => seen.current.add(x.requestId));
      initialized.current = true;
      if (pendingOrderId.current) {
        const id = pendingOrderId.current;
        pendingOrderId.current = "";
        const tapped = next.items.find(x => x.requestId === id || x.requestCode === id);
        if (tapped) {
          setTab("orders"); setOrderView("new");
          if (tapped.stage === "assigned") setActiveStage("waiting");
          else if (tapped.stage === "preparing") setActiveStage("preparing");
          else setActiveStage("ready");
          setSelected(tapped);
        } else if (firstWaiting) {
          setTab("orders"); setOrderView("new"); setActiveStage("waiting"); setSelected(firstWaiting);
        }
      }
      return next;
    } catch {
      const cached = await AsyncStorage.getItem(`queue:${orgId}`);
      if (cached && !initialized.current) {
        const parsed = JSON.parse(cached) as QueueData;
        setData(parsed);
        return parsed;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [orgId]);
  const handleNotificationTarget = useCallback(async (targetId?: string) => {
    setTab("orders"); setOrderView("new"); setActiveStage("waiting");
    if (targetId) {
      pendingOrderId.current = targetId;
      seen.current.add(targetId);
      notified.current.add(targetId);
    }
    const currentQueue = await load();
    let items = currentQueue?.items || [];
    if (targetId) {
      let match = items.find(x => x.requestId === targetId || x.requestCode === targetId);
      if (!match) {
        await new Promise(r => setTimeout(r, 1000));
        const retryQueue = await load();
        items = retryQueue?.items || [];
        match = items.find(x => x.requestId === targetId || x.requestCode === targetId);
      }
      if (match) {
        if (match.stage === "assigned") setActiveStage("waiting");
        else if (match.stage === "preparing") setActiveStage("preparing");
        else setActiveStage("ready");
        setSelected(match);
        return;
      }
    }
    const waiting = items.find(x => x.stage === "assigned");
    if (waiting) {
      setActiveStage("waiting");
      setSelected(waiting);
    }
  }, [load]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (AppState.currentState === "active") void load(); }, 4000);
    const appStateSub = AppState.addEventListener("change", nextState => {
      if (nextState === "active") {
        void load();
        void Notifications.getLastNotificationResponseAsync().then(resp => {
          if (resp) {
            const id = extractOrderId(resp.notification.request.content.data);
            if (id) {
              seen.current.add(id);
              notified.current.add(id);
            }
            void handleNotificationTarget(id);
          }
        });
      }
    });
    return () => { clearInterval(timer); appStateSub.remove(); };
  }, [load, handleNotificationTarget]);
  useEffect(() => { if (orderView !== "history") return; setHistoryLoading(true); void getOrderHistory(orgId).then(setHistory).catch(() => setHistory([])).finally(() => setHistoryLoading(false)); }, [orgId, orderView]);
  useEffect(() => { let alive = true; void (async () => { await configureNotifications(); const result = await getPushToken(); if (!alive) return; if (!result.token) return setPushStatus(result.reason); pushToken.current = result.token; try { await registerPush(orgId, result.token, Platform.OS, await deviceId()); pushReady.current = true; setPushStatus("Push server đang bật"); } catch (e) { pushReady.current = false; setPushStatus("Chuông trên máy đang bật · Push server chưa nối"); } })().catch(e => setPushStatus(e instanceof Error ? e.message : "Không thể bật thông báo.")); return () => { alive = false; }; }, [orgId]);
  useEffect(() => {
    const onResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = extractOrderId(response.notification.request.content.data);
      if (id) {
        seen.current.add(id);
        notified.current.add(id);
      }
      void handleNotificationTarget(id);
    };
    const onReceived = (notification: Notifications.Notification) => {
      const id = extractOrderId(notification.request.content.data);
      if (id) {
        seen.current.add(id);
        notified.current.add(id);
      }
      if (!selectedRef.current) {
        void handleNotificationTarget(id);
      } else {
        void load();
      }
    };
    void Notifications.getLastNotificationResponseAsync().then(onResponse);
    const responseSub = Notifications.addNotificationResponseReceivedListener(onResponse);
    const receivedSub = Notifications.addNotificationReceivedListener(onReceived);
    return () => { responseSub.remove(); receivedSub.remove(); };
  }, [handleNotificationTarget]);
  const setPriority = async (order: Order, priority: Order["priority"]) => { if (order.priority === priority) return; try { await updateKitchen(orgId, order.requestId, { action: "priority", priority }); await load(); } catch {} };
  const advanceOrder = async (order: Order) => { const next = nextAction[order.stage]; const action = order.stage === "assigned" ? "accept" : next?.action || "ready_for_pickup"; setActionBusy(order.requestId); setActionError(""); if (action === "delivered") { setSuccessOrder(order); setTimeout(() => setSuccessOrder(null), 3000); } setData(current => { const items = action === "delivered" ? current.items.filter(item => item.requestId !== order.requestId) : current.items.map(item => item.requestId === order.requestId ? { ...item, status: "in_progress", stage: action === "accept" ? "preparing" : action as Order["stage"], estimatedMinutes: action === "accept" ? 15 : item.estimatedMinutes } : item); return { ...current, items, counts: { ...current.counts, waiting: items.filter(item => item.stage === "assigned").length, preparing: items.filter(item => item.stage === "preparing").length, ready: items.filter(item => item.stage === "ready_for_pickup").length, courier: items.filter(item => ["courier_booked", "handed_off"].includes(item.stage)).length } }; }); try { await fulfill(order.requestId, action === "accept" ? { action, estimatedMinutes: 15, note: "partner_mobile_accept" } : { action }); void load(); } catch (e) { await load(); setActionError(e instanceof Error ? e.message : "Không thể chuyển trạng thái đơn."); } finally { setActionBusy(""); } };
  const cancelOrder = async (order: Order) => { setActionBusy(order.requestId); setActionError(""); setData(current => { const items = current.items.filter(item => item.requestId !== order.requestId); return { ...current, items, counts: { ...current.counts, waiting: items.filter(item => item.stage === "assigned").length, preparing: items.filter(item => item.stage === "preparing").length, ready: items.filter(item => item.stage === "ready_for_pickup").length, courier: items.filter(item => ["courier_booked", "handed_off"].includes(item.stage)).length } }; }); try { await fulfill(order.requestId, { action: "cancelled", note: "partner_mobile_cancelled" }); void load(); } catch (e) { await load(); setActionError(e instanceof Error ? e.message : "Không thể hủy đơn."); } finally { setActionBusy(""); } };
  const confirmAdvance = (order: Order) => { if (order.stage === "assigned") { setSelected(order); } else { setConfirmAction({ order, kind: "advance" }); } };
  const confirmCancel = (order: Order) => setConfirmAction({ order, kind: "cancel" });
  const setEta = (order: Order) => setSelected(order);
  const waiting = data.items.filter(order => order.stage === "assigned");
  const preparing = data.items.filter(order => order.stage === "preparing");
  const readyOrCourier = data.items.filter(order => ["ready_for_pickup", "courier_booked", "handed_off"].includes(order.stage));
  const statsTabs = [
    { key: "waiting" as const, count: waiting.length, label: "Chờ nhận", alert: waiting.length > 0 },
    { key: "preparing" as const, count: preparing.length, label: "Đang làm", alert: false },
    { key: "ready" as const, count: readyOrCourier.length, label: "Chờ lấy", alert: false },
  ];
  return <SafeAreaView style={s.safe} edges={["top"]}><StatusBar style="dark"/>{tab === "orders" ? <><View style={s.webHeader}><View style={s.row}><Image source={require("./assets/icon.png")} style={s.brandMark}/><View style={{ marginLeft: 10 }}><Text style={s.brandName}>ZHAOXI</Text><Text style={s.brandSub}>Đối tác · {auth.session.displayName || "Partner"}</Text></View></View><View style={s.headerActions}><Pressable style={s.headerAction}><Text style={{ color: C.ink, fontWeight: "900" }}>VI</Text></Pressable><Pressable style={s.headerAction} onPress={() => setPushStatus("Thông báo đơn hàng đang bật")}><Ionicons name="notifications-outline" size={25} color={C.ink}/></Pressable><Pressable style={s.headerAction} onPress={() => void logout(pushToken.current).finally(onLogout)}><Ionicons name="log-out-outline" size={26} color="#ef4444"/></Pressable></View></View><ScrollView style={s.flex} contentContainerStyle={s.page} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={C.green}/> }>
    <View style={s.stats}>
      {statsTabs.map(tabItem => {
        const isSelected = orderView === "new" && activeStage === tabItem.key;
        const isAlert = tabItem.alert && isSelected;
        return (
          <Pressable
            key={tabItem.key}
            style={[
              s.stat,
              isSelected && s.statActive,
              isAlert && s.statAlert,
            ]}
            onPress={() => {
              setOrderView("new");
              setActiveStage(tabItem.key);
            }}
          >
            <Text
              style={[
                s.statNumber,
                isSelected && s.statNumberActive,
                isAlert && { color: C.red },
              ]}
            >
              {tabItem.count}
            </Text>
            <Text
              style={[
                s.statLabel,
                isSelected && s.statLabelActive,
                isAlert && { color: C.red, fontWeight: "900" },
              ]}
            >
              {tabItem.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
    <View style={s.segment}><Pressable style={[s.segmentButton, orderView === "new" && s.segmentOn]} onPress={() => setOrderView("new")}><Text style={[s.segmentText, orderView === "new" && s.segmentTextOn]}>Đang xử lý</Text></Pressable><Pressable style={[s.segmentButton, orderView === "history" && s.segmentOn]} onPress={() => setOrderView("history")}><Text style={[s.segmentText, orderView === "history" && s.segmentTextOn]}>Đã xử lý</Text></Pressable></View>
    {!!actionError && <Text style={s.error}>{actionError}</Text>}
    {orderView === "history" ? <><View style={s.historyFilter}>{([['all', 'Tất cả'], ['completed', 'Đã hoàn thành'], ['cancelled', 'Đã hủy']] as const).map(([value, label]) => <Pressable key={value} style={[s.historyFilterButton, historyFilter === value && s.historyFilterOn]} onPress={() => setHistoryFilter(value)}><Text style={[s.historyFilterText, historyFilter === value && s.historyFilterTextOn]}>{label}</Text></Pressable>)}</View>{historyLoading ? <ActivityIndicator color={C.green}/> : !history.filter(order => historyFilter === "all" || (historyFilter === "completed" ? order.status === "completed" : ["cancelled", "rejected"].includes(order.status))).length ? <View style={s.empty}><Ionicons name="archive-outline" size={38} color={C.green}/><Text style={s.emptyTitle}>Chưa có đơn {historyFilter === "completed" ? "hoàn thành" : historyFilter === "cancelled" ? "đã hủy" : "lịch sử"}</Text><Text style={s.emptyText}>Các đơn đã xử lý sẽ xuất hiện ở đây.</Text></View> : history.filter(order => historyFilter === "all" || (historyFilter === "completed" ? order.status === "completed" : ["cancelled", "rejected"].includes(order.status))).map(order => <OrderCard key={order.requestId} order={order} interactive={false} onOpen={() => undefined} onPriority={() => undefined} onEta={() => undefined}/>)}</> : <>
      {activeStage === "waiting" && <>
        <View style={s.between}><View style={s.row}><Ionicons name="alert-circle" size={22} color={waiting.length ? C.red : C.green} style={{ marginRight: 6 }}/><Text style={[s.webSection, { color: waiting.length ? C.red : C.ink, marginBottom: 0 }]}>Đơn mới chờ nhận</Text></View><View style={[s.pill, { backgroundColor: waiting.length ? "#fee2e2" : C.mint }]}><Text style={{ color: waiting.length ? C.red : C.green, fontWeight: "900", fontSize: 13 }}>{waiting.length} đơn cần nhận</Text></View></View>
        {waiting.map(order => <OrderCard key={order.requestId} order={order} onOpen={() => setSelected(order)} onAction={() => setSelected(order)} onCancel={() => confirmCancel(order)} busy={actionBusy === order.requestId} onPriority={priority => void setPriority(order, priority)} onEta={() => setEta(order)}/>)}
        {!waiting.length && <View style={s.empty}><Ionicons name="checkmark-done-circle-outline" size={42} color={C.green}/><Text style={s.emptyTitle}>Chưa có đơn chờ nhận</Text><Text style={s.emptyText}>Khi khách đặt món, đơn mới sẽ xuất hiện ở đây và phát chuông thông báo.</Text></View>}
      </>}
      {activeStage === "preparing" && <>
        <View style={s.between}><View style={s.row}><Ionicons name="flame" size={22} color={C.amber} style={{ marginRight: 6 }}/><Text style={[s.webSection, { marginBottom: 0 }]}>Đang chuẩn bị</Text></View><View style={s.pill}><Text style={s.pillText}>{preparing.length} đơn</Text></View></View>
        {preparing.map(order => <OrderCard key={order.requestId} order={order} onOpen={() => setSelected(order)} onAction={() => confirmAdvance(order)} onCancel={() => confirmCancel(order)} busy={actionBusy === order.requestId} onPriority={priority => void setPriority(order, priority)} onEta={() => setEta(order)}/>)}
        {!preparing.length && <View style={s.empty}><Ionicons name="restaurant-outline" size={42} color={C.green}/><Text style={s.emptyTitle}>Chưa có món đang làm</Text><Text style={s.emptyText}>Nhận đơn ở mục "Chờ nhận" để chuyển đơn sang khu vực bếp.</Text></View>}
      </>}
      {activeStage === "ready" && <>
        <View style={s.between}><View style={s.row}><Ionicons name="bicycle" size={22} color={C.green} style={{ marginRight: 6 }}/><Text style={[s.webSection, { marginBottom: 0 }]}>Chờ giao & Đang giao</Text></View>{data.counts.late > 0 ? <Text style={{ color: C.red, fontWeight: "900" }}>{data.counts.late} đơn trễ</Text> : <View style={s.pill}><Text style={s.pillText}>{readyOrCourier.length} đơn</Text></View>}</View>
        {readyOrCourier.map(order => <OrderCard key={order.requestId} order={order} onOpen={() => setSelected(order)} onAction={() => confirmAdvance(order)} onCancel={() => confirmCancel(order)} busy={actionBusy === order.requestId} onPriority={priority => void setPriority(order, priority)} onEta={() => setEta(order)}/>)}
        {!readyOrCourier.length && <View style={s.empty}><Ionicons name="cube-outline" size={42} color={C.green}/><Text style={s.emptyTitle}>Chưa có đơn chờ lấy</Text><Text style={s.emptyText}>Khi làm xong món, bấm "Sẵn sàng giao" để chuyển đơn sang đây chờ tài xế.</Text></View>}
      </>}
    </>}
  </ScrollView></> : <ScrollView style={s.flex} contentContainerStyle={s.page}><Text style={s.sectionTitle}>Cài đặt cửa hàng</Text><View style={s.card}><Text style={s.itemName}>{auth.session.displayName}</Text><Text style={s.meta}>{auth.session.organizationName}</Text><Text style={[s.meta, { color: C.green, fontWeight: "800" }]}>{pushStatus}</Text></View>{organizations.length > 1 && <Pressable style={[s.button, s.buttonGhost, { marginBottom: 10 }]} onPress={() => setStoreModal(true)}><Text style={s.buttonGhostText}>⌂  Đổi gian hàng đang quản lý</Text></Pressable>}<Pressable style={[s.button, s.buttonGhost, { marginBottom: 10 }]} onPress={() => void configureNotifications()}><Text style={s.buttonGhostText}>Kiểm tra kênh thông báo</Text></Pressable><Pressable style={[s.button, s.buttonRed]} onPress={() => void logout(pushToken.current).finally(onLogout)}><Text style={s.buttonRedText}>Đăng xuất</Text></Pressable></ScrollView>}
    <View style={s.tabs}><Pressable style={s.tab} onPress={() => setTab("orders")}><Ionicons name={tab === "orders" ? "receipt" : "receipt-outline"} size={23} color={tab === "orders" ? C.green : C.muted}/><Text style={[s.tabText, tab === "orders" && s.tabOn]}>Đơn hàng</Text></Pressable><Pressable style={s.tab} onPress={() => setTab("settings")}><Ionicons name={tab === "settings" ? "settings" : "settings-outline"} size={23} color={tab === "settings" ? C.green : C.muted}/><Text style={[s.tabText, tab === "settings" && s.tabOn]}>Cài đặt</Text></Pressable></View>
    <OrderModal
      order={selected}
      onClose={() => setSelected(null)}
      onRefresh={load}
      waitingCount={waiting.length}
      waitingIndex={selected ? Math.max(1, waiting.findIndex(x => x.requestId === selected.requestId) + 1) : 1}
      onSelectOrder={setSelected}
    />
    <Modal visible={Boolean(confirmAction)} transparent animationType="fade" onRequestClose={() => setConfirmAction(null)}><View style={s.confirmBackdrop}><View style={s.confirmCard}><View style={s.confirmIcon}><Ionicons name={confirmAction?.kind === "cancel" ? "alert-outline" : "checkmark-circle-outline"} size={28} color={confirmAction?.kind === "cancel" ? C.red : C.green}/></View><Text style={s.confirmTitle}>{confirmAction?.kind === "cancel" ? "Hủy đơn này?" : "Chuyển trạng thái đơn?"}</Text><Text style={s.confirmText}>{confirmAction?.kind === "cancel" ? "Đơn sẽ được chuyển sang trạng thái đã hủy." : `Xác nhận: ${confirmAction?.order.stage === "assigned" ? "Nhận đơn" : nextAction[confirmAction?.order.stage || "assigned"]?.label || "cập nhật đơn"}?`}</Text><View style={s.confirmActions}><Pressable style={s.confirmCancel} onPress={() => setConfirmAction(null)}><Text style={s.confirmCancelText}>{confirmAction?.kind === "cancel" ? "Không" : "Để sau"}</Text></Pressable><Pressable style={[s.confirmOk, confirmAction?.kind === "cancel" && s.confirmDanger]} onPress={() => { const pending = confirmAction; setConfirmAction(null); if (pending) void (pending.kind === "cancel" ? cancelOrder(pending.order) : advanceOrder(pending.order)); }}><Text style={s.confirmOkText}>{confirmAction?.kind === "cancel" ? "Hủy đơn" : "Xác nhận"}</Text></Pressable></View></View></View></Modal>
    <Modal visible={Boolean(successOrder)} transparent animationType="fade" onRequestClose={() => setSuccessOrder(null)}><View style={s.successBackdrop}><View style={s.successToast}><View style={s.successBurst}><Text style={s.partyPopper}>🎉</Text></View><Text style={s.successTitle}>Đơn hàng đã hoàn thành</Text><Text style={s.successText}>{successOrder?.requestCode}</Text></View></View></Modal>
    <Modal visible={storeModal} transparent animationType="slide" onRequestClose={() => setStoreModal(false)}><View style={s.modalBackdrop}><View style={s.modal}><View style={s.modalHandle}/><Text style={s.modalTitle}>Đổi gian hàng</Text><Text style={s.meta}>Chọn gian hàng mà tài khoản này được cấp quyền quản lý.</Text>{organizations.map(org => <Pressable key={org.id} style={s.storeRow} disabled={switchingStore} onPress={() => void switchStore(org.id)}><Text style={s.storeName}>{org.name}</Text>{org.id === orgId ? <Text style={s.storeActive}>Đang chọn</Text> : <Ionicons name="chevron-forward" size={20} color={C.muted}/>}</Pressable>)}<Pressable style={[s.button, s.buttonGhost, { marginTop: 18 }]} onPress={() => setStoreModal(false)}><Text style={s.buttonGhostText}>Đóng</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>();
  useEffect(() => { void loadAuth().then(setAuth); }, []);
  if (auth === undefined) return <View style={[s.login, { alignItems: "center" }]}><ActivityIndicator size="large" color="white"/></View>;
  return <SafeAreaProvider>{auth ? <Main auth={auth} onAuth={setAuth} onLogout={() => setAuth(null)}/> : <Login onDone={setAuth}/>}</SafeAreaProvider>;
}
