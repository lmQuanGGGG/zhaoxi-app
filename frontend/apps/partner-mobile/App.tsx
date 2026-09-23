import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, AppState, Easing, Image, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, TouchableWithoutFeedback, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { getOrderHistory, getPartnerOrganizations, getQueue, getRestaurantAnalytics, fulfill, loadAuth, login, loginWithPhone, logout, registerPush, switchPartnerOrganization, updateKitchen } from "./src/api";
import { configureNotifications, getPushToken, notifyNewOrder } from "./src/notifications";
import { C, s } from "./src/styles";
import type { AnalyticsData, AuthState, Order, OrderStage, PartnerOrganization, QueueData } from "./src/types";
import { Language, LANGUAGES, LANGUAGE_STORAGE_KEY, I18N } from "./src/i18n";

const EMPTY: QueueData = { generatedAt: "", counts: { waiting: 0, preparing: 0, ready: 0, courier: 0, late: 0 }, items: [] };
const money = (value: number) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

function formatOrderTime(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const normalized = dateStr.includes(" ") && !dateStr.includes("T") ? dateStr.replace(" ", "T") : dateStr;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return "—";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    return `${hh}:${mm} · ${dd}/${mo}`;
  } catch {
    return "—";
  }
}

async function deviceId() {
  return (Platform.OS === "android" ? Application.getAndroidId() : await Application.getIosIdForVendorAsync()) || `partner-${Platform.OS}`;
}

function Login({
  onDone,
  lang,
  onChangeLanguage,
  t,
}: {
  onDone: (value: AuthState) => void;
  lang: Language;
  onChangeLanguage: (lang: Language) => void;
  t: typeof I18N["vi"];
}) {
  const [mode, setMode] = useState<"account" | "phone">("phone");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (mode === "account" && (username.trim().length < 3 || password.length < 6)) {
      return setError(lang === "vi" ? "Nhập tài khoản và mật khẩu tối thiểu 6 ký tự." : lang === "en" ? "Enter username and password (min 6 characters)." : "请输入账号和密码（至少6位）。");
    }
    const digits = phone.replace(/\D/g, "").replace(/^84/, "").replace(/^0/, "");
    if (mode === "phone" && (digits.length < 8 || digits.length > 10 || !/^\d{6}$/.test(pin))) {
      return setError(lang === "vi" ? "Nhập số điện thoại Việt Nam và mã PIN đủ 6 số." : lang === "en" ? "Enter valid Vietnam phone number and 6-digit PIN." : "请输入有效的越南手机号和6位PIN码。");
    }
    setBusy(true); setError("");
    try {
      const id = await deviceId();
      onDone(mode === "phone" ? await loginWithPhone(`+84${digits}`, pin, id) : await login(username, password, id));
    } catch (e) {
      setError(e instanceof Error ? e.message : (lang === "vi" ? "Không thể đăng nhập." : lang === "en" ? "Unable to log in." : "无法登录。"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView style={s.login} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar style="light"/>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView style={s.flex} contentContainerStyle={s.loginScroll} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
          <View style={s.loginCard}>
            <View style={s.between}>
              <Image source={require("./assets/icon.png")} style={s.logo}/>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 18 }}>
                {LANGUAGES.map(item => (
                  <Pressable
                    key={item.code}
                    onPress={() => onChangeLanguage(item.code)}
                    style={[
                      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, borderColor: "#d1ddd6", backgroundColor: "#f6f9f7" },
                      lang === item.code && { backgroundColor: C.mint, borderColor: C.green }
                    ]}
                  >
                    <Text style={[{ fontSize: 12, fontWeight: "900", color: C.muted }, lang === item.code && { color: C.green }]}>{item.sub}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Text style={s.loginTitle}>{t.loginTitle}</Text>
            <Text style={s.loginSub}>{t.loginSub}</Text>
            <View style={s.loginTabs}>
              <Pressable onPress={() => { setMode("phone"); setError(""); }} style={[s.loginTab, mode === "phone" && s.loginTabOn]}>
                <Text style={[s.loginTabText, mode === "phone" && s.loginTabTextOn]}>{t.loginTabPhone}</Text>
              </Pressable>
              <Pressable onPress={() => { setMode("account"); setError(""); }} style={[s.loginTab, mode === "account" && s.loginTabOn]}>
                <Text style={[s.loginTabText, mode === "account" && s.loginTabTextOn]}>{t.loginTabPassword}</Text>
              </Pressable>
            </View>
            {mode === "phone" ? (
              <>
                <Text style={s.label}>{t.phoneNumberLabel}</Text>
                <View style={s.phoneRow}>
                  <View style={s.dialCode}><Text style={s.dialCodeText}>🇻🇳 +84</Text></View>
                  <TextInput value={phone} onChangeText={value => setPhone(value.replace(/\D/g, ""))} style={[s.input, s.phoneInput]} keyboardType="phone-pad" placeholder="094 241 1045" maxLength={11}/>
                </View>
                <Text style={s.label}>PIN</Text>
                <TextInput value={pin} onChangeText={value => setPin(value.replace(/\D/g, "").slice(0, 6))} style={s.input} secureTextEntry keyboardType="number-pad" placeholder="••••••" maxLength={6} onSubmitEditing={() => void submit()}/>
                <Text style={s.loginHint}>{t.loginNotice}</Text>
              </>
            ) : (
              <>
                <Text style={s.label}>{t.accountOrEmail}</Text>
                <TextInput value={username} onChangeText={setUsername} style={s.input} autoCapitalize="none" autoCorrect={false} placeholder={t.accountPlaceholder}/>
                <Text style={s.label}>{t.passwordLabel}</Text>
                <TextInput value={password} onChangeText={setPassword} style={s.input} secureTextEntry placeholder="••••••••" onSubmitEditing={() => void submit()}/>
              </>
            )}
            {!!error && <Text style={s.error}>{error}</Text>}
            <Pressable style={[s.button, s.buttonGreen]} disabled={busy} onPress={() => void submit()}>
              {busy ? <ActivityIndicator color="white"/> : <Text style={s.buttonText}>{t.loginButton}</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function OrderCard({
  order,
  onOpen,
  onAction,
  onCancel,
  busy = false,
  onPriority,
  onEta,
  interactive = true,
  t,
}: {
  order: Order;
  onOpen: () => void;
  onAction?: () => void;
  onCancel?: () => void;
  busy?: boolean;
  onPriority: (priority: Order["priority"]) => void;
  onEta: (minutes: number) => void;
  interactive?: boolean;
  t: typeof I18N["vi"];
}) {
  const provider = order.deliveryProvider === "grab" ? "Grab" : order.deliveryProvider === "green_sm" ? "Xanh SM" : "";
  const completed = order.status === "completed";
  const cancelled = ["cancelled", "rejected"].includes(order.status);
  const statusText = completed ? t.statusCompleted : cancelled ? t.statusCancelled : t.stageLabel[order.stage] || order.stage;
  const next = t.nextAction[order.stage];
  return (
    <View style={[s.card, order.late && s.cardLate]}>
      <Pressable onPress={onOpen} accessible={false}>
        <View style={s.between}>
          <Text style={s.code}>{order.requestCode}</Text>
          {order.late && !completed && !cancelled ? (
            <Text style={[s.meta, { color: C.red, fontWeight: "900" }]}>{t.lateTime(order.overdueMinutes)}</Text>
          ) : (
            <View style={s.pill}><Text style={s.pillText}>{statusText}</Text></View>
          )}
        </View>
        <Text style={s.itemName}>{order.serviceName} · ×{order.quantity}</Text>
        <View style={s.between}>
          <View style={s.row}>
            <Ionicons name="person" size={16} color={C.ink}/>
            <Text style={s.meta}>{order.customerName} · ×{order.quantity}</Text>
          </View>
          {!!order.customerPhone && (
            <Pressable style={s.phoneBadge} onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}>
              <Ionicons name="call" size={14} color={C.green}/>
              <Text style={s.phoneText}>{order.customerPhone}</Text>
            </Pressable>
          )}
        </View>
        {!!order.addressText && (
          <View style={s.row}>
            <Ionicons name="location" size={16} color={C.muted}/>
            <Text style={[s.meta, { flex: 1 }]}>{order.addressText}</Text>
          </View>
        )}
      </Pressable>
      {interactive && (
        <View style={s.externalBadge}>
          <Text style={s.externalBadgeText}>{t.externalDelivery} · {t.stageLabel[order.stage] || order.stage}</Text>
        </View>
      )}
      {provider && (
        <View style={[s.providerBadge, order.deliveryProvider === "grab" && { backgroundColor: "#dcfce7" }]}>
          <Image source={order.deliveryProvider === "grab" ? require("./assets/grab.png") : require("./assets/green-sm.png")} style={s.providerLogo}/>
          <Text style={s.providerText}>{provider} ({t.customerPaysDelivery})</Text>
        </View>
      )}
      <View style={s.row}>
        <Ionicons name="stopwatch-outline" size={16} color={C.muted}/>
        <Text style={s.meta}>{t.elapsedTime(order.elapsedMinutes)}</Text>
      </View>
      <View style={s.detailGrid}>
        <View style={s.detailTile}><Text style={s.detailLabel}>{t.quantity}</Text><Text style={s.detailValue}>{order.quantity}</Text></View>
        <View style={s.detailTile}><Text style={s.detailLabel}>{t.itemSubtotal}</Text><Text style={s.detailValue}>{money(order.itemSubtotal || order.totalAmount)}</Text></View>
        <View style={s.detailTile}><Text style={s.detailLabel}>{t.grossDeliveryFee}</Text><Text style={s.detailValue}>{money(order.deliveryGrossFee || 0)}</Text></View>
        <View style={s.detailTile}><Text style={s.detailLabel}>{t.customerDeliveryFee}</Text><Text style={s.detailValue}>{money(order.customerDeliveryFee || 0)}</Text></View>
        <View style={s.detailTile}><Text style={s.detailLabel}>{t.deliveryDistance}</Text><Text style={s.detailValue}>{order.deliveryDistanceKm ? `${order.deliveryDistanceKm.toFixed(1)} km` : "—"}</Text></View>
        <View style={s.detailTile}><Text style={[s.detailLabel, s.detailValueGreen]}>{t.totalAmount}</Text><Text style={[s.detailValue, s.detailValueGreen]}>{money(order.totalAmount)}</Text></View>
        <View style={s.detailTile}>
          <Text style={s.detailLabel}>{t.payment}</Text>
          <Text style={s.detailValue}>
            {order.paymentMethod === "bank_transfer" ? t.bankTransfer : t.cashOnDelivery}
            {order.paymentStatus === "paid" ? ` · ${t.paid}` : ""}
          </Text>
        </View>
        <View style={s.detailTile}>
          <Text style={s.detailLabel}>{t.orderTime}</Text>
          <Text style={s.detailValue} numberOfLines={1} adjustsFontSizeToFit>{formatOrderTime(order.createdAt)}</Text>
        </View>
      </View>
      {interactive && (
        <View style={s.priorityRow}>
          {(["normal", "high", "urgent"] as const).map(level => (
            <Pressable
              key={level}
              onPress={() => onPriority(level)}
              style={[s.priorityButton, order.priority === level && (level === "urgent" ? s.priorityUrgentOn : s.priorityOn)]}
            >
              <Text style={[s.priorityText, order.priority === level && (level === "urgent" ? s.priorityUrgentTextOn : s.priorityTextOn)]}>
                {level === "normal" ? t.priorityNormal : level === "high" ? t.priorityHigh : t.priorityUrgent}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {interactive && order.stage === "preparing" && (
        <Pressable style={s.etaSelect} onPress={() => onEta(order.estimatedMinutes || 15)}>
          <View style={s.between}>
            <Text style={s.meta}>{t.adjustTimeLabel} <Text style={{ color: C.ink, fontWeight: "900" }}>{order.estimatedMinutes || 15} {t.minutesSuffix}</Text></Text>
            <Ionicons name="chevron-down" size={20} color={C.ink}/>
          </View>
        </Pressable>
      )}
      {interactive && !cancelled && !completed && (
        <View style={s.actions}>
          <Pressable disabled={busy} style={[s.button, s.buttonGreen, { flex: 1, opacity: busy ? 0.65 : 1 }]} onPress={onAction}>
            {busy ? <ActivityIndicator color="white"/> : <Text style={s.buttonText}>{order.stage === "assigned" ? (t.nextAction.assigned?.label || "Nhận đơn") : next?.label || t.stageLabel[order.stage] || "OK"}</Text>}
          </Pressable>
          <Pressable disabled={busy} style={[s.button, s.buttonRed, { flex: 0.85, opacity: busy ? 0.65 : 1 }]} onPress={onCancel}>
            <Text style={s.buttonRedText}>{t.cancelOrder}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function OrderModal({
  order,
  onClose,
  onRefresh,
  waitingCount = 1,
  waitingIndex = 1,
  onSelectOrder,
  t,
}: {
  order: Order | null;
  onClose: () => void;
  onRefresh: () => Promise<QueueData | null>;
  waitingCount?: number;
  waitingIndex?: number;
  onSelectOrder?: (order: Order) => void;
  t: typeof I18N["vi"];
}) {
  const [eta, setEta] = useState(15);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
  const next = t.nextAction[order.stage];
  const remainingBehind = Math.max(0, waitingCount - waitingIndex);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.centerModalBackdrop}>
        <ScrollView style={s.centerModal} contentContainerStyle={{ paddingBottom: 34 }}>
          <View style={s.modalHandle}/>
          {order.stage === "assigned" && (
            <View style={[s.pill, { alignSelf: "flex-start", backgroundColor: "#fee2e2", marginBottom: 10 }]}>
              <Text style={{ color: "#b91c1c", fontWeight: "900", fontSize: 13 }}>
                {waitingCount > 1 ? t.modalQueueOrderProgress(waitingIndex, waitingCount, remainingBehind) : t.modalSingleNewOrder}
              </Text>
            </View>
          )}
          <View style={s.between}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={s.code}>{order.requestCode}</Text>
              <Text style={s.modalTitle}>{order.serviceName} · ×{order.quantity}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close-circle" size={32} color={C.muted}/></Pressable>
          </View>
          <View style={s.row}>
            <Ionicons name="person-outline" size={16} color={C.muted}/>
            <Text style={s.meta}>{order.customerName}</Text>
          </View>
          {!!order.customerPhone && (
            <Pressable style={s.row} onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}>
              <Ionicons name="call-outline" size={16} color={C.green}/>
              <Text style={[s.meta, { color: C.green, fontWeight: "900" }]}>{order.customerPhone}</Text>
            </Pressable>
          )}
          {!!order.addressText && (
            <View style={s.row}>
              <Ionicons name="location-outline" size={16} color={C.muted}/>
              <Text style={s.meta}>{order.addressText}</Text>
            </View>
          )}
          {order.deliveryProvider && (
            <View style={[s.providerBadge, order.deliveryProvider === "grab" && { backgroundColor: "#dcfce7" }]}>
              <Image source={order.deliveryProvider === "grab" ? require("./assets/grab.png") : require("./assets/green-sm.png")} style={s.providerLogo}/>
              <Text style={s.providerText}>{order.deliveryProvider === "grab" ? "Grab" : "Xanh SM"} · {t.customerPaysDelivery}</Text>
            </View>
          )}
          <View style={s.detailGrid}>
            <View style={s.detailTile}><Text style={s.detailLabel}>{t.quantity}</Text><Text style={s.detailValue}>{order.quantity}</Text></View>
            <View style={s.detailTile}><Text style={s.detailLabel}>{t.itemSubtotal}</Text><Text style={s.detailValue}>{money(order.itemSubtotal || order.totalAmount)}</Text></View>
            <View style={s.detailTile}><Text style={s.detailLabel}>{t.grossDeliveryFee}</Text><Text style={s.detailValue}>{money(order.deliveryGrossFee || 0)}</Text></View>
            <View style={s.detailTile}><Text style={s.detailLabel}>{t.customerDeliveryFee}</Text><Text style={s.detailValue}>{money(order.customerDeliveryFee || 0)}</Text></View>
            <View style={s.detailTile}><Text style={s.detailLabel}>{t.deliveryDistance}</Text><Text style={s.detailValue}>{order.deliveryDistanceKm ? `${order.deliveryDistanceKm.toFixed(1)} km` : "—"}</Text></View>
            <View style={s.detailTile}><Text style={[s.detailLabel, s.detailValueGreen]}>{t.totalAmount}</Text><Text style={[s.detailValue, s.detailValueGreen]}>{money(order.totalAmount)}</Text></View>
        <View style={s.detailTile}>
          <Text style={s.detailLabel}>{t.payment}</Text>
          <Text style={s.detailValue}>
            {order.paymentMethod === "bank_transfer" ? t.bankTransfer : t.cashOnDelivery}
            {order.paymentStatus === "paid" ? ` · ${t.paid}` : ""}
          </Text>
        </View>
        <View style={s.detailTile}>
          <Text style={s.detailLabel}>{t.orderTime}</Text>
          <Text style={s.detailValue} numberOfLines={1} adjustsFontSizeToFit>{formatOrderTime(order.createdAt)}</Text>
        </View>
      </View>
          {order.stage === "assigned" && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 22, marginBottom: 0 }]}>{t.prepTimeSection}</Text>
              <View style={s.modalGrid}>
                {[10, 15, 20, 25, 30, 45].map(value => (
                  <Pressable key={value} onPress={() => setEta(value)} style={[s.eta, eta === value && s.etaOn]}>
                    <Text style={[s.etaText, eta === value && s.etaTextOn]}>{value} {t.minutesSuffix}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {!!error && <Text style={[s.error, { marginTop: 15 }]}>{error}</Text>}
          <View style={s.actions}>
            {order.stage === "assigned" ? (
              <>
                <Pressable disabled={submitting} style={[s.button, s.buttonRed, { flex: 1 }]} onPress={() => void run({ action: "cancelled", note: "partner_mobile_rejected" })}>
                  <Text style={s.buttonRedText}>{t.rejectButton}</Text>
                </Pressable>
                <Pressable disabled={submitting} style={[s.button, s.buttonGreen, { flex: 1.5 }]} onPress={() => void run({ action: "accept", estimatedMinutes: eta, note: `partner_mobile_accept_eta:${eta}` })}>
                  {submitting ? <ActivityIndicator color="white"/> : <Text style={s.buttonText}>{t.acceptButton(eta)}</Text>}
                </Pressable>
              </>
            ) : next ? (
              <Pressable disabled={submitting} style={[s.button, s.buttonGreen, { flex: 1 }]} onPress={() => void run({ action: next.action })}>
                {submitting ? <ActivityIndicator color="white"/> : <Text style={s.buttonText}>{next.label}</Text>}
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
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

function GreenSphereAnalysisLoader({ visible, title, desc }: { visible: boolean; title: string; desc: string }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const tiltAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const sparkAnim1 = useRef(new Animated.Value(0)).current;
  const sparkAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Bobbing / Floating loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Liquid wave tilting loop (sloshing effect)
    const tiltLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tiltAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tiltAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Outer radar glow
    const pulseLoop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );

    // "Chớp chớp phân tích" core flashing loop
    const flashLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 0.25,
          duration: 350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 0.9,
          duration: 250,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 0.1,
          duration: 450,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Blinking sparkle node 1
    const sparkLoop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkAnim1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(sparkAnim1, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.delay(250),
      ])
    );

    // Blinking sparkle node 2
    const sparkLoop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(350),
        Animated.timing(sparkAnim2, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(sparkAnim2, { toValue: 0, duration: 450, useNativeDriver: true }),
      ])
    );

    floatLoop.start();
    tiltLoop.start();
    pulseLoop.start();
    flashLoop.start();
    sparkLoop1.start();
    sparkLoop2.start();

    return () => {
      floatLoop.stop();
      tiltLoop.stop();
      pulseLoop.stop();
      flashLoop.stop();
      sparkLoop1.stop();
      sparkLoop2.stop();
    };
  }, [visible, floatAnim, tiltAnim, pulseAnim, flashAnim, sparkAnim1, sparkAnim2]);

  if (!visible) return null;

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
  });

  const rotate = tiltAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-3.5deg", "3.5deg"],
  });

  const shadowScale = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1.18],
  });

  const shadowOpacity = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.42],
  });

  const radarScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.45],
  });

  const radarOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.7, 0.35, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.analysisBackdrop}>
        <View style={s.analysisCard}>
          <View style={s.analysisBadge}>
            <Ionicons name="sparkles" size={13} color={C.green} />
            <Text style={s.analysisBadgeText}>ZHAOXI ANALYTICS AI</Text>
          </View>

          {/* 3D Translucent Glass Liquid Cyber Orb */}
          <View style={s.sphereWrapper}>
            {/* Glowing outer radar pulse */}
            <Animated.View
              style={[
                s.spherePulseRing1,
                {
                  transform: [{ scale: radarScale }],
                  opacity: radarOpacity,
                },
              ]}
            />

            {/* Floating & Tilting 3D Cyber Sphere */}
            <Animated.View
              style={{
                width: 146,
                height: 146,
                borderRadius: 73,
                transform: [{ translateY }, { rotate }],
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                shadowColor: "#10b981",
                shadowOpacity: 0.6,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 10 },
                elevation: 10,
              }}
            >
              {/* Ultra-realistic 3D Cyber Glass Sphere Image */}
              <Image
                source={require("./assets/green_cyber_glass_sphere.jpg")}
                style={{ width: 146, height: 146, borderRadius: 73 }}
                resizeMode="cover"
              />

              {/* Glowing animated core overlay ("chớp chớp phân tích") */}
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 110,
                  height: 75,
                  bottom: 12,
                  borderRadius: 45,
                  backgroundColor: "rgba(52, 211, 153, 0.35)",
                  opacity: flashAnim,
                }}
              />

              {/* Sparkling data nodes chớp chớp 1 */}
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: "#ffffff",
                  bottom: 38,
                  left: 46,
                  opacity: sparkAnim1,
                  shadowColor: "#34d399",
                  shadowRadius: 8,
                  shadowOpacity: 1,
                }}
              />

              {/* Sparkling data nodes chớp chớp 2 */}
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#ffffff",
                  bottom: 52,
                  right: 42,
                  opacity: sparkAnim2,
                  shadowColor: "#34d399",
                  shadowRadius: 8,
                  shadowOpacity: 1,
                }}
              />
            </Animated.View>

            {/* Ground Shadow */}
            <Animated.View
              style={[
                s.sphereShadow,
                {
                  transform: [{ scale: shadowScale }],
                  opacity: shadowOpacity,
                },
              ]}
            />
          </View>

          <Text style={s.analysisTitle}>{title}</Text>
          <Text style={s.analysisDesc}>{desc}</Text>

          {/* Clean status pill instead of progress bar */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#f0fdf4", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 }}>
            <ActivityIndicator size="small" color={C.green} />
            <Text style={{ color: C.green, fontSize: 13, fontWeight: "800" }}>
              Đang phân tích số liệu kinh doanh…
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Main({
  auth,
  onLogout,
  onAuth,
  lang,
  onChangeLanguage,
  t,
}: {
  auth: AuthState;
  onLogout: () => void;
  onAuth: (value: AuthState) => void;
  lang: Language;
  onChangeLanguage: (lang: Language) => void;
  t: typeof I18N["vi"];
}) {
  const orgId = auth.session.organizationId!;
  const [data, setData] = useState(EMPTY);
  const [history, setHistory] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const selectedRef = useRef<Order | null>(null);
  selectedRef.current = selected;
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [orderView, setOrderView] = useState<"new" | "history">("new");
  const [activeStage, setActiveStage] = useState<"waiting" | "preparing" | "ready">("waiting");
  const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "cancelled">("all");
  const [tab, setTab] = useState<"orders" | "revenue" | "settings">("orders");
  type PeriodType = 1 | 7 | 30 | 90 | "custom";
  const [analyticsPeriod, setAnalyticsPeriod] = useState<PeriodType>(30);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customInputFrom, setCustomInputFrom] = useState("");
  const [customInputTo, setCustomInputTo] = useState("");
  const [customError, setCustomError] = useState("");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const analyticsCacheRef = useRef<Map<string, { data: AnalyticsData; fetchedAt: number }>>(new Map());
  const [pushStatus, setPushStatus] = useState(t.pushSettingUp);
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ order: Order; kind: "advance" | "cancel" } | null>(null);
  const [organizations, setOrganizations] = useState<PartnerOrganization[]>([]);
  const [storeModal, setStoreModal] = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [languageModal, setLanguageModal] = useState(false);
  const [switchingStore, setSwitchingStore] = useState(false);
  const [switchedStoreName, setSwitchedStoreName] = useState<string | null>(null);
  const initialized = useRef(false);
  const seen = useRef(new Set<string>());
  const notified = useRef(new Set<string>());
  const pushToken = useRef<string | undefined>(undefined);
  const pushReady = useRef(false);
  const pendingOrderId = useRef("");

  useEffect(() => {
    void getPartnerOrganizations().then(x => setOrganizations(x.organizations || [])).catch(() => undefined);
  }, []);

  async function switchStore(id: string) {
    if (id === orgId || switchingStore) return;
    setSwitchingStore(true);
    try {
      const next = await switchPartnerOrganization(id);
      const targetStoreName = next?.session?.organizationName || organizations.find(x => x.id === id)?.name || "Gian hàng mới";
      setStoreModal(false);
      setStoreDropdownOpen(false);
      onAuth(next);
      setSwitchedStoreName(targetStoreName);
      setTimeout(() => setSwitchedStoreName(null), 3000);
    } catch (e) {
      setPushStatus(e instanceof Error ? e.message : "Không thể đổi gian hàng.");
    } finally {
      setSwitchingStore(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const next = await getQueue(orgId);
      setData(next);
      await AsyncStorage.setItem(`queue:${orgId}`, JSON.stringify(next));
      const waiting = next.items.filter(x => x.stage === "assigned");
      const incoming = waiting.filter(x => !seen.current.has(x.requestId));
      const firstIncoming = incoming[0];
      const firstWaiting = waiting[0];
      if (firstIncoming) {
        analyticsCacheRef.current.clear();
        setTab("orders");
        setOrderView("new");
        setActiveStage("waiting");
        if (!selectedRef.current) setSelected(firstIncoming);
        if (!notified.current.has(firstIncoming.requestId) && !notified.current.has(firstIncoming.requestCode)) {
          notified.current.add(firstIncoming.requestId);
          notified.current.add(firstIncoming.requestCode);
          if (!pushReady.current) {
            void notifyNewOrder(firstIncoming);
          }
        }
      } else if (!initialized.current && firstWaiting) {
        setTab("orders");
        setOrderView("new");
        setActiveStage("waiting");
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
          setTab("orders");
          setOrderView("new");
          if (tapped.stage === "assigned") setActiveStage("waiting");
          else if (tapped.stage === "preparing") setActiveStage("preparing");
          else setActiveStage("ready");
          setSelected(tapped);
        } else if (firstWaiting) {
          setTab("orders");
          setOrderView("new");
          setActiveStage("waiting");
          setSelected(firstWaiting);
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
    analyticsCacheRef.current.clear();
    setTab("orders");
    setOrderView("new");
    setActiveStage("waiting");
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

  useEffect(() => {
    if (orderView !== "history") return;
    setHistoryLoading(true);
    void getOrderHistory(orgId).then(setHistory).catch(() => setHistory([])).finally(() => setHistoryLoading(false));
  }, [orgId, orderView]);

  const getAnalyticsCacheKey = useCallback((org: string, period: PeriodType, from?: string, to?: string) => {
    return `${org}:${period}:${from || ""}:${to || ""}`;
  }, []);

  const loadAnalytics = useCallback(async (
    period: PeriodType = analyticsPeriod,
    from = customFrom,
    to = customTo,
    forceRefresh = false
  ) => {
    if (!orgId) return;
    const key = getAnalyticsCacheKey(orgId, period, from, to);
    const cached = analyticsCacheRef.current.get(key);

    if (cached && !forceRefresh) {
      // 0ms instant display from cache
      setAnalyticsData(cached.data);
      if (Date.now() - cached.fetchedAt < 60000) {
        return;
      }
      // Silently revalidate in background without blocking screen
    } else {
      setAnalyticsLoading(true);
    }

    setAnalyticsError("");
    try {
      const daysNum = period === "custom" ? 30 : period;
      const res = await getRestaurantAnalytics(
        orgId,
        daysNum,
        period === "custom" ? from : undefined,
        period === "custom" ? to : undefined
      );
      analyticsCacheRef.current.set(key, { data: res, fetchedAt: Date.now() });
      setAnalyticsData(res);
    } catch (e) {
      if (!cached) setAnalyticsError(e instanceof Error ? e.message : "ANALYTICS_FAILED");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [orgId, analyticsPeriod, customFrom, customTo, getAnalyticsCacheKey]);

  const invalidateAnalyticsCache = useCallback(() => {
    analyticsCacheRef.current.clear();
    if (tab === "revenue") {
      void loadAnalytics(analyticsPeriod, customFrom, customTo, true);
    }
  }, [tab, analyticsPeriod, customFrom, customTo, loadAnalytics]);

  useEffect(() => {
    if (tab === "revenue") {
      void loadAnalytics(analyticsPeriod, customFrom, customTo);
    }
  }, [tab, analyticsPeriod, customFrom, customTo, loadAnalytics]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await configureNotifications();
      const result = await getPushToken();
      if (!alive) return;
      if (!result.token) return setPushStatus(result.reason);
      pushToken.current = result.token;
      try {
        await registerPush(orgId, result.token, Platform.OS, await deviceId());
        pushReady.current = true;
        setPushStatus(t.pushReady);
      } catch {
        pushReady.current = false;
        setPushStatus(t.pushLocalOnly);
      }
    })().catch(e => setPushStatus(e instanceof Error ? e.message : "Không thể bật thông báo."));
    return () => { alive = false; };
  }, [orgId, t]);

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

  const setPriority = async (order: Order, priority: Order["priority"]) => {
    if (order.priority === priority) return;
    try {
      await updateKitchen(orgId, order.requestId, { action: "priority", priority });
      await load();
    } catch {}
  };

  const advanceOrder = async (order: Order) => {
    const next = t.nextAction[order.stage];
    const action = order.stage === "assigned" ? "accept" : next?.action || "ready_for_pickup";
    setActionBusy(order.requestId);
    setActionError("");
    if (action === "delivered") {
      setSuccessOrder(order);
      setTimeout(() => setSuccessOrder(null), 3000);
    }
    setData(current => {
      const items = action === "delivered"
        ? current.items.filter(item => item.requestId !== order.requestId)
        : current.items.map(item => item.requestId === order.requestId
          ? { ...item, status: "in_progress", stage: action === "accept" ? "preparing" : action as Order["stage"], estimatedMinutes: action === "accept" ? 15 : item.estimatedMinutes }
          : item
        );
      return {
        ...current,
        items,
        counts: {
          ...current.counts,
          waiting: items.filter(item => item.stage === "assigned").length,
          preparing: items.filter(item => item.stage === "preparing").length,
          ready: items.filter(item => item.stage === "ready_for_pickup").length,
          courier: items.filter(item => ["courier_booked", "handed_off"].includes(item.stage)).length,
        },
      };
    });
    try {
      await fulfill(order.requestId, action === "accept" ? { action, estimatedMinutes: 15, note: "partner_mobile_accept" } : { action });
      void load();
      invalidateAnalyticsCache();
    } catch (e) {
      await load();
      setActionError(e instanceof Error ? e.message : "Không thể chuyển trạng thái đơn.");
    } finally {
      setActionBusy("");
    }
  };

  const cancelOrder = async (order: Order) => {
    setActionBusy(order.requestId);
    setActionError("");
    setData(current => {
      const items = current.items.filter(item => item.requestId !== order.requestId);
      return {
        ...current,
        items,
        counts: {
          ...current.counts,
          waiting: items.filter(item => item.stage === "assigned").length,
          preparing: items.filter(item => item.stage === "preparing").length,
          ready: items.filter(item => item.stage === "ready_for_pickup").length,
          courier: items.filter(item => ["courier_booked", "handed_off"].includes(item.stage)).length,
        },
      };
    });
    try {
      await fulfill(order.requestId, { action: "cancelled", note: "partner_mobile_cancelled" });
      void load();
      invalidateAnalyticsCache();
    } catch (e) {
      await load();
      setActionError(e instanceof Error ? e.message : "Không thể hủy đơn.");
    } finally {
      setActionBusy("");
    }
  };

  const confirmAdvance = (order: Order) => {
    if (order.stage === "assigned") {
      setSelected(order);
    } else {
      setConfirmAction({ order, kind: "advance" });
    }
  };
  const confirmCancel = (order: Order) => setConfirmAction({ order, kind: "cancel" });
  const setEta = (order: Order) => setSelected(order);

  const waiting = data.items.filter(order => order.stage === "assigned");
  const preparing = data.items.filter(order => order.stage === "preparing");
  const readyOrCourier = data.items.filter(order => ["ready_for_pickup", "courier_booked", "handed_off"].includes(order.stage));

  const statsTabs = [
    { key: "waiting" as const, count: waiting.length, label: t.stageWaiting, alert: waiting.length > 0 },
    { key: "preparing" as const, count: preparing.length, label: t.stagePreparing, alert: false },
    { key: "ready" as const, count: readyOrCourier.length, label: t.stageReady, alert: false },
  ];

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar style="dark"/>
      <View style={s.webHeader}>
        <View style={s.row}>
          <Image source={require("./assets/icon.png")} style={s.brandMark}/>
          <View style={{ marginLeft: 10 }}>
            <Text style={s.brandName}>ZHAOXI</Text>
            <Text style={s.brandSub}>
              {(tab === "orders" ? t.orders : tab === "revenue" ? t.revenue : t.settings)} · {auth.session.displayName || "Partner"}
            </Text>
          </View>
        </View>
        <View style={s.headerActions}>
          <Pressable style={s.headerAction} onPress={() => setLanguageModal(true)}>
            <Text style={{ color: C.green, fontWeight: "900", fontSize: 13 }}>
              {LANGUAGES.find(x => x.code === lang)?.sub || "VI"}
            </Text>
          </Pressable>
          <Pressable style={s.headerAction} onPress={() => void logout(pushToken.current).finally(onLogout)}>
            <Ionicons name="log-out-outline" size={26} color="#ef4444"/>
          </Pressable>
        </View>
      </View>
      {tab === "orders" ? (
          <ScrollView
            style={s.flex}
            contentContainerStyle={s.page}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={C.green}/>}
          >
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
            <View style={s.segment}>
              <Pressable style={[s.segmentButton, orderView === "new" && s.segmentOn]} onPress={() => setOrderView("new")}>
                <Text style={[s.segmentText, orderView === "new" && s.segmentTextOn]}>{t.processingView}</Text>
              </Pressable>
              <Pressable style={[s.segmentButton, orderView === "history" && s.segmentOn]} onPress={() => setOrderView("history")}>
                <Text style={[s.segmentText, orderView === "history" && s.segmentTextOn]}>{t.historyView}</Text>
              </Pressable>
            </View>
            {!!actionError && <Text style={s.error}>{actionError}</Text>}
            {orderView === "history" ? (
              <>
                <View style={s.historyFilter}>
                  {([['all', t.filterAll], ['completed', t.filterCompleted], ['cancelled', t.filterCancelled]] as const).map(([value, label]) => (
                    <Pressable
                      key={value}
                      style={[s.historyFilterButton, historyFilter === value && s.historyFilterOn]}
                      onPress={() => setHistoryFilter(value)}
                    >
                      <Text style={[s.historyFilterText, historyFilter === value && s.historyFilterTextOn]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                {historyLoading ? (
                  <ActivityIndicator color={C.green}/>
                ) : !history.filter(order => historyFilter === "all" || (historyFilter === "completed" ? order.status === "completed" : ["cancelled", "rejected"].includes(order.status))).length ? (
                  <View style={s.empty}>
                    <Ionicons name="archive-outline" size={38} color={C.green}/>
                    <Text style={s.emptyTitle}>
                      {t.emptyHistoryTitle(historyFilter === "completed" ? t.filterCompleted : historyFilter === "cancelled" ? t.filterCancelled : "")}
                    </Text>
                    <Text style={s.emptyText}>{t.emptyHistoryDesc}</Text>
                  </View>
                ) : (
                  history.filter(order => historyFilter === "all" || (historyFilter === "completed" ? order.status === "completed" : ["cancelled", "rejected"].includes(order.status))).map(order => (
                    <OrderCard
                      key={order.requestId}
                      order={order}
                      interactive={false}
                      onOpen={() => undefined}
                      onPriority={() => undefined}
                      onEta={() => undefined}
                      t={t}
                    />
                  ))
                )}
              </>
            ) : (
              <>
                {activeStage === "waiting" && (
                  <>
                    <View style={s.between}>
                      <View style={s.row}>
                        <Ionicons name="alert-circle" size={22} color={waiting.length ? C.red : C.green} style={{ marginRight: 6 }}/>
                        <Text style={[s.webSection, { color: waiting.length ? C.red : C.ink, marginBottom: 0 }]}>{t.waitingOrdersTitle}</Text>
                      </View>
                      <View style={[s.pill, { backgroundColor: waiting.length ? "#fee2e2" : C.mint }]}>
                        <Text style={{ color: waiting.length ? C.red : C.green, fontWeight: "900", fontSize: 13 }}>{t.waitingOrdersCount(waiting.length)}</Text>
                      </View>
                    </View>
                    {waiting.map(order => (
                      <OrderCard
                        key={order.requestId}
                        order={order}
                        onOpen={() => setSelected(order)}
                        onAction={() => setSelected(order)}
                        onCancel={() => confirmCancel(order)}
                        busy={actionBusy === order.requestId}
                        onPriority={priority => void setPriority(order, priority)}
                        onEta={() => setEta(order)}
                        t={t}
                      />
                    ))}
                    {!waiting.length && (
                      <View style={s.empty}>
                        <Ionicons name="checkmark-done-circle-outline" size={42} color={C.green}/>
                        <Text style={s.emptyTitle}>{t.emptyWaitingTitle}</Text>
                        <Text style={s.emptyText}>{t.emptyWaitingDesc}</Text>
                      </View>
                    )}
                  </>
                )}
                {activeStage === "preparing" && (
                  <>
                    <View style={s.between}>
                      <View style={s.row}>
                        <Ionicons name="flame" size={22} color={C.amber} style={{ marginRight: 6 }}/>
                        <Text style={[s.webSection, { marginBottom: 0 }]}>{t.preparingOrdersTitle}</Text>
                      </View>
                      <View style={s.pill}><Text style={s.pillText}>{t.preparingOrdersCount(preparing.length)}</Text></View>
                    </View>
                    {preparing.map(order => (
                      <OrderCard
                        key={order.requestId}
                        order={order}
                        onOpen={() => setSelected(order)}
                        onAction={() => confirmAdvance(order)}
                        onCancel={() => confirmCancel(order)}
                        busy={actionBusy === order.requestId}
                        onPriority={priority => void setPriority(order, priority)}
                        onEta={() => setEta(order)}
                        t={t}
                      />
                    ))}
                    {!preparing.length && (
                      <View style={s.empty}>
                        <Ionicons name="restaurant-outline" size={42} color={C.green}/>
                        <Text style={s.emptyTitle}>{t.emptyPreparingTitle}</Text>
                        <Text style={s.emptyText}>{t.emptyPreparingDesc}</Text>
                      </View>
                    )}
                  </>
                )}
                {activeStage === "ready" && (
                  <>
                    <View style={s.between}>
                      <View style={s.row}>
                        <Ionicons name="bicycle" size={22} color={C.green} style={{ marginRight: 6 }}/>
                        <Text style={[s.webSection, { marginBottom: 0 }]}>{t.readyOrdersTitle}</Text>
                      </View>
                      {data.counts.late > 0 ? (
                        <Text style={{ color: C.red, fontWeight: "900" }}>{t.lateOrdersCount(data.counts.late)}</Text>
                      ) : (
                        <View style={s.pill}><Text style={s.pillText}>{t.ordersCount(readyOrCourier.length)}</Text></View>
                      )}
                    </View>
                    {readyOrCourier.map(order => (
                      <OrderCard
                        key={order.requestId}
                        order={order}
                        onOpen={() => setSelected(order)}
                        onAction={() => confirmAdvance(order)}
                        onCancel={() => confirmCancel(order)}
                        busy={actionBusy === order.requestId}
                        onPriority={priority => void setPriority(order, priority)}
                        onEta={() => setEta(order)}
                        t={t}
                      />
                    ))}
                    {!readyOrCourier.length && (
                      <View style={s.empty}>
                        <Ionicons name="cube-outline" size={42} color={C.green}/>
                        <Text style={s.emptyTitle}>{t.emptyReadyTitle}</Text>
                        <Text style={s.emptyText}>{t.emptyReadyDesc}</Text>
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </ScrollView>
      ) : tab === "revenue" ? (
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.page}
          refreshControl={<RefreshControl refreshing={analyticsLoading} onRefresh={() => void loadAnalytics(analyticsPeriod, customFrom, customTo, true)} tintColor={C.green}/>}
        >
          {/* Period Selector */}
          <View style={s.periodRow}>
            {(
              [
                { key: 1 as const, label: t.d1 },
                { key: 7 as const, label: t.d7 },
                { key: 30 as const, label: t.d30 },
                { key: 90 as const, label: t.d90 },
                { key: "custom" as const, label: t.customPeriod },
              ] as const
            ).map(item => {
              const active = analyticsPeriod === item.key;
              return (
                <Pressable
                  key={String(item.key)}
                  style={[s.periodBtn, active && s.periodBtnOn]}
                  onPress={() => {
                    if (item.key === "custom") {
                      if (!customFrom || !customTo) {
                        const now = new Date();
                        const past7 = new Date(Date.now() - 7 * 86400000);
                        setCustomInputFrom(past7.toISOString().slice(0, 10));
                        setCustomInputTo(now.toISOString().slice(0, 10));
                      } else {
                        setCustomInputFrom(customFrom);
                        setCustomInputTo(customTo);
                      }
                      setCustomError("");
                      setCustomModalVisible(true);
                    } else {
                      setAnalyticsPeriod(item.key);
                      void loadAnalytics(item.key, customFrom, customTo);
                    }
                  }}
                >
                  <Text style={[s.periodBtnText, active && s.periodBtnTextOn]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Active Custom Range Badge */}
          {analyticsPeriod === "custom" && Boolean(customFrom && customTo) && (
            <Pressable
              style={[s.customDateBadge, { marginBottom: 14 }]}
              onPress={() => {
                setCustomInputFrom(customFrom);
                setCustomInputTo(customTo);
                setCustomError("");
                setCustomModalVisible(true);
              }}
            >
              <Ionicons name="calendar-outline" size={14} color={C.green} />
              <Text style={s.customDateBadgeText}>{t.customRangeBadge(customFrom, customTo)}</Text>
              <Ionicons name="create-outline" size={13} color={C.green} />
            </Pressable>
          )}

          {/* Key Revenue & Operations Card (Shadow Card, No Border) */}
          <View style={s.shadowCard}>
            <View style={s.cardHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={s.cardTitle}>{t.revenueTitle}</Text>
                <Text style={s.cardSub}>
                  {analyticsPeriod === 1
                    ? t.d1
                    : analyticsPeriod === 7
                    ? t.d7
                    : analyticsPeriod === 30
                    ? t.d30
                    : analyticsPeriod === 90
                    ? t.d90
                    : t.customRangeBadge(analyticsData?.from || customFrom, analyticsData?.to || customTo)}
                </Text>
              </View>
              <Pressable onPress={() => void loadAnalytics(analyticsPeriod, customFrom, customTo, true)} style={{ padding: 6 }}>
                <Ionicons name="refresh-outline" size={20} color={C.green}/>
              </Pressable>
            </View>

            <View style={s.metricHero}>
              <Text style={s.metricHeroLabel}>{t.revenueFood}</Text>
              <Text style={s.metricHeroValue}>{money(analyticsData?.revenue?.foodRevenue || 0)}</Text>
            </View>

            <View style={s.metricGrid}>
              <View style={s.metricBox}>
                <Text style={s.metricBoxLabel}>{t.revenueGmv}</Text>
                <Text style={s.metricBoxValue}>{money(analyticsData?.revenue?.gmv || 0)}</Text>
              </View>
              <View style={s.metricBox}>
                <Text style={s.metricBoxLabel}>{t.revenueAov}</Text>
                <Text style={s.metricBoxValue}>{money(analyticsData?.revenue?.averageOrderValue || 0)}</Text>
              </View>
              <View style={s.metricBox}>
                <Text style={s.metricBoxLabel}>{t.ordersTotal}</Text>
                <Text style={s.metricBoxValue}>{analyticsData?.orders?.total || 0}</Text>
              </View>
              <View style={s.metricBox}>
                <Text style={s.metricBoxLabel}>{t.completionRate}</Text>
                <Text style={[s.metricBoxValue, { color: C.green }]}>
                  {analyticsData?.orders?.completionRate || 0}% ({analyticsData?.orders?.completed || 0})
                </Text>
              </View>
              <View style={s.metricBox}>
                <Text style={s.metricBoxLabel}>{t.cancellationRate}</Text>
                <Text style={[s.metricBoxValue, (analyticsData?.orders?.cancelled || 0) > 0 && { color: C.red }]}>
                  {analyticsData?.orders?.cancellationRate || 0}% ({analyticsData?.orders?.cancelled || 0})
                </Text>
              </View>
              <View style={s.metricBox}>
                <Text style={s.metricBoxLabel}>{t.avgPrepMinutes}</Text>
                <Text style={s.metricBoxValue}>
                  {analyticsData?.operations?.averagePreparationMinutes || 0} {t.minutesSuffix}
                </Text>
              </View>
            </View>
          </View>

          {/* Financial Breakdown Card (Shadow Card, No Border) */}
          <View style={s.shadowCard}>
            <Text style={[s.cardTitle, { marginBottom: 12 }]}>{t.financialBreakdown}</Text>
            <View style={s.metricGrid}>
              <View style={s.metricBox}>
                <Text style={s.metricBoxLabel}>{t.itemPromotionDiscount}</Text>
                <Text style={[s.metricBoxValue, { color: "#c2410c" }]}>
                  −{money(analyticsData?.revenue?.itemPromotionDiscount || 0)}
                </Text>
              </View>
              <View style={s.metricBox}>
                <Text style={s.metricBoxLabel}>{t.couponDiscount}</Text>
                <Text style={[s.metricBoxValue, { color: "#c2410c" }]}>
                  −{money(analyticsData?.revenue?.couponDiscount || 0)}
                </Text>
              </View>
              <View style={s.metricBox}>
                <Text style={s.metricBoxLabel}>{t.deliverySubsidy}</Text>
                <Text style={[s.metricBoxValue, { color: "#c2410c" }]}>
                  −{money(analyticsData?.revenue?.deliverySubsidy || 0)}
                </Text>
              </View>
              <View style={s.metricBox}>
                <Text style={s.metricBoxLabel}>{t.analyticsCustomerShipping}</Text>
                <Text style={s.metricBoxValue}>
                  {money(analyticsData?.revenue?.customerDeliveryFee || 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Daily Revenue Trend Card (Shadow Card, No Border) */}
          {Boolean(analyticsData?.daily?.length) && (
            <View style={s.shadowCard}>
              <Text style={s.cardTitle}>{t.dailyTrend}</Text>
              <Text style={s.cardSub}>
                {analyticsPeriod === 1
                  ? t.d1
                  : analyticsPeriod === 7
                  ? t.d7
                  : analyticsPeriod === 30
                  ? t.d30
                  : analyticsPeriod === 90
                  ? t.d90
                  : t.customRangeBadge(analyticsData?.from || customFrom, analyticsData?.to || customTo)}
              </Text>
              {(() => {
                const list = analyticsData!.daily.slice(-14);
                const maxVal = Math.max(1, ...list.map(x => x.gmv));
                return (
                  <View style={s.chartRow}>
                    {list.map(day => {
                      const h = Math.max(4, Math.round((day.gmv / maxVal) * 90));
                      const label = day.date.length >= 10 ? `${day.date.slice(8, 10)}/${day.date.slice(5, 7)}` : day.date;
                      return (
                        <View key={day.date} style={s.chartCol}>
                          <View style={[s.chartBar, { height: h }, day.gmv === 0 && { backgroundColor: "#d1ddd6" }]}/>
                          <Text style={s.chartLabel} numberOfLines={1}>{label}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          )}

          {/* Top Selling Items (Shadow Card, No Border) */}
          <View style={s.shadowCard}>
            <Text style={[s.cardTitle, { marginBottom: 8 }]}>{t.topItems}</Text>
            {!analyticsData?.topItems?.length ? (
              <Text style={[s.meta, { paddingVertical: 12 }]}>{t.emptyAnalytics}</Text>
            ) : (
              analyticsData.topItems.map((item, idx) => (
                <View key={item.serviceId || idx} style={[s.topItemRow, idx === analyticsData.topItems.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={s.topItemRank}>
                    <Text style={s.topItemRankText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={s.topItemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.topItemMeta}>{t.quantitySold(item.quantity, item.orders)}</Text>
                  </View>
                  <Text style={s.topItemRevenue}>{money(item.revenue)}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={s.flex} contentContainerStyle={s.page}>
          <Text style={s.sectionTitle}>{t.storeSettings}</Text>
          <View style={s.card}>
            <Text style={s.itemName}>{auth.session.displayName}</Text>
            <Text style={s.meta}>{auth.session.organizationName}</Text>
            <Text style={[s.meta, { color: C.green, fontWeight: "800" }]}>{pushStatus}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.itemName}>{t.language}</Text>
            <Text style={s.meta}>{t.languageDesc}</Text>
            <View style={s.languageGrid}>
              {LANGUAGES.map(item => (
                <Pressable
                  key={item.code}
                  style={[s.languageButton, lang === item.code && s.languageButtonActive]}
                  onPress={() => void onChangeLanguage(item.code)}
                >
                  <Text style={[s.languageBadge, lang === item.code && s.languageBadgeActive]}>{item.sub}</Text>
                  <Text style={[s.languageText, lang === item.code && s.languageTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {organizations.length > 1 && (
            <>
              <Pressable
                style={s.storeDropdownBtn}
                onPress={() => setStoreDropdownOpen(prev => !prev)}
              >
                <Text style={s.storeDropdownText}>{t.switchStore}</Text>
                <Ionicons
                  name={storeDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={C.ink}
                />
              </Pressable>
              {storeDropdownOpen && (
                <View style={s.storeDropdownList}>
                  {organizations.map(org => {
                    const isSelected = org.id === orgId;
                    return (
                      <Pressable
                        key={org.id}
                        style={[s.storeDropdownItem, isSelected && s.storeDropdownItemActive]}
                        disabled={switchingStore}
                        onPress={() => {
                          void switchStore(org.id);
                          setStoreDropdownOpen(false);
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={[s.storeDropdownName, isSelected && s.storeDropdownNameActive]}>
                            {org.name}
                          </Text>
                        </View>
                        {isSelected ? (
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <View style={s.storeDropdownActiveBadge}>
                              <Text style={s.storeDropdownActiveText}>{t.currentStore}</Text>
                            </View>
                            <Ionicons name="checkmark-circle" size={20} color={C.green} />
                          </View>
                        ) : (
                          <Ionicons name="chevron-forward" size={18} color={C.muted} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          )}
          <Pressable style={[s.button, s.buttonGhost, { marginBottom: 10 }]} onPress={() => void configureNotifications()}>
            <Text style={s.buttonGhostText}>{t.testPushChannel}</Text>
          </Pressable>
          <Pressable style={[s.button, s.buttonRed]} onPress={() => void logout(pushToken.current).finally(onLogout)}>
            <Text style={s.buttonRedText}>{t.logout}</Text>
          </Pressable>
        </ScrollView>
      )}
      <View style={s.tabs}>
        <Pressable style={s.tab} onPress={() => setTab("orders")}>
          <Ionicons name={tab === "orders" ? "receipt" : "receipt-outline"} size={23} color={tab === "orders" ? C.green : C.muted}/>
          <Text style={[s.tabText, tab === "orders" && s.tabOn]}>{t.orders}</Text>
        </Pressable>
        <Pressable style={s.tab} onPress={() => setTab("revenue")}>
          <Ionicons name={tab === "revenue" ? "bar-chart" : "bar-chart-outline"} size={23} color={tab === "revenue" ? C.green : C.muted}/>
          <Text style={[s.tabText, tab === "revenue" && s.tabOn]}>{t.revenue}</Text>
        </Pressable>
        <Pressable style={s.tab} onPress={() => setTab("settings")}>
          <Ionicons name={tab === "settings" ? "settings" : "settings-outline"} size={23} color={tab === "settings" ? C.green : C.muted}/>
          <Text style={[s.tabText, tab === "settings" && s.tabOn]}>{t.settings}</Text>
        </Pressable>
      </View>
      <OrderModal
        order={selected}
        onClose={() => setSelected(null)}
        onRefresh={load}
        waitingCount={waiting.length}
        waitingIndex={selected ? Math.max(1, waiting.findIndex(x => x.requestId === selected.requestId) + 1) : 1}
        onSelectOrder={setSelected}
        t={t}
      />
      <Modal visible={Boolean(confirmAction)} transparent animationType="fade" onRequestClose={() => setConfirmAction(null)}>
        <View style={s.confirmBackdrop}>
          <View style={s.confirmCard}>
            <View style={s.confirmIcon}>
              <Ionicons name={confirmAction?.kind === "cancel" ? "alert-outline" : "checkmark-circle-outline"} size={28} color={confirmAction?.kind === "cancel" ? C.red : C.green}/>
            </View>
            <Text style={s.confirmTitle}>{confirmAction?.kind === "cancel" ? t.confirmCancelTitle : t.confirmAdvanceTitle}</Text>
            <Text style={s.confirmText}>
              {confirmAction?.kind === "cancel"
                ? t.confirmCancelDesc
                : t.confirmAdvanceDesc(confirmAction?.order.stage === "assigned" ? (t.nextAction.assigned?.label || "Nhận đơn") : (t.nextAction[confirmAction?.order.stage || "assigned"]?.label || ""))}
            </Text>
            <View style={s.confirmActions}>
              <Pressable style={s.confirmCancel} onPress={() => setConfirmAction(null)}>
                <Text style={s.confirmCancelText}>{confirmAction?.kind === "cancel" ? t.btnNo : t.btnLater}</Text>
              </Pressable>
              <Pressable
                style={[s.confirmOk, confirmAction?.kind === "cancel" && s.confirmDanger]}
                onPress={() => {
                  const pending = confirmAction;
                  setConfirmAction(null);
                  if (pending) void (pending.kind === "cancel" ? cancelOrder(pending.order) : advanceOrder(pending.order));
                }}
              >
                <Text style={s.confirmOkText}>{confirmAction?.kind === "cancel" ? t.btnCancelAction : t.btnConfirm}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={Boolean(successOrder)} transparent animationType="fade" onRequestClose={() => setSuccessOrder(null)}>
        <View style={s.successBackdrop}>
          <View style={s.successToast}>
            <View style={s.successBurst}><Text style={s.partyPopper}>🎉</Text></View>
            <Text style={s.successTitle}>{t.successTitle}</Text>
            <Text style={s.successText}>{successOrder?.requestCode}</Text>
          </View>
        </View>
      </Modal>
      <Modal visible={Boolean(switchedStoreName)} transparent animationType="fade" onRequestClose={() => setSwitchedStoreName(null)}>
        <View style={s.successBackdrop}>
          <View style={s.successToast}>
            <View style={[s.confirmIcon, { width: 68, height: 68, borderRadius: 34, marginBottom: 14 }]}>
              <Ionicons name="storefront" size={36} color={C.green} />
            </View>
            <Text style={s.successTitle}>{t.switchStoreSuccessTitle}</Text>
            <Text style={[s.meta, { textAlign: "center", marginTop: 8, fontSize: 15, color: C.ink }]}>
              {t.switchStoreSuccessDesc(switchedStoreName || "")}
            </Text>
            <Pressable
              style={[s.button, s.buttonGreen, { marginTop: 18, width: "100%" }]}
              onPress={() => setSwitchedStoreName(null)}
            >
              <Text style={s.buttonText}>{t.close}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={storeModal} transparent animationType="slide" onRequestClose={() => setStoreModal(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modal}>
            <View style={s.modalHandle}/>
            <Text style={s.modalTitle}>{t.switchStoreTitle}</Text>
            <Text style={s.meta}>{t.switchStoreDesc}</Text>
            {organizations.map(org => (
              <Pressable key={org.id} style={s.storeRow} disabled={switchingStore} onPress={() => void switchStore(org.id)}>
                <Text style={s.storeName}>{org.name}</Text>
                {org.id === orgId ? <Text style={s.storeActive}>{t.currentStore}</Text> : <Ionicons name="chevron-forward" size={20} color={C.muted}/>}
              </Pressable>
            ))}
            <Pressable style={[s.button, s.buttonGhost, { marginTop: 18 }]} onPress={() => setStoreModal(false)}>
              <Text style={s.buttonGhostText}>{t.close}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={languageModal} transparent animationType="fade" onRequestClose={() => setLanguageModal(false)}>
        <View style={s.confirmBackdrop}>
          <View style={[s.confirmCard, { paddingVertical: 22, maxWidth: 360 }]}>
            <Text style={s.confirmTitle}>{t.language}</Text>
            <Text style={s.confirmText}>{t.languageDesc}</Text>
            <View style={{ width: "100%", gap: 10, marginBottom: 18 }}>
              {LANGUAGES.map(item => (
                <Pressable
                  key={item.code}
                  style={[
                    s.languageButton,
                    { width: "100%", minHeight: 52, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 },
                    lang === item.code && s.languageButtonActive
                  ]}
                  onPress={() => {
                    void onChangeLanguage(item.code);
                    setLanguageModal(false);
                  }}
                >
                  <View style={s.row}>
                    <Text style={[s.languageBadge, { marginBottom: 0, marginRight: 12, fontSize: 14 }, lang === item.code && s.languageBadgeActive]}>{item.sub}</Text>
                    <Text style={[s.languageText, { fontSize: 15 }, lang === item.code && s.languageTextActive]}>{item.label}</Text>
                  </View>
                  {lang === item.code && <Ionicons name="checkmark-circle" size={22} color={C.green}/>}
                </Pressable>
              ))}
            </View>
            <Pressable style={[s.button, s.buttonGhost, { width: "100%" }]} onPress={() => setLanguageModal(false)}>
              <Text style={s.buttonGhostText}>{t.close}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <GreenSphereAnalysisLoader
        visible={analyticsLoading}
        title={t.analyzingTitle}
        desc={t.analyzingDesc}
      />
      <Modal visible={customModalVisible} transparent animationType="slide" onRequestClose={() => setCustomModalVisible(false)}>
        <View style={s.centerModalBackdrop}>
          <View style={s.centerModal}>
            <View style={s.modalHandle}/>
            <Text style={s.modalTitle}>{t.selectDateRange}</Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14, marginBottom: 8 }}>
              {[
                {
                  label: t.d1,
                  action: () => {
                    const d = new Date().toISOString().slice(0, 10);
                    setCustomInputFrom(d);
                    setCustomInputTo(d);
                  },
                },
                {
                  label: "7 ngày",
                  action: () => {
                    const to = new Date().toISOString().slice(0, 10);
                    const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
                    setCustomInputFrom(from);
                    setCustomInputTo(to);
                  },
                },
                {
                  label: "30 ngày",
                  action: () => {
                    const to = new Date().toISOString().slice(0, 10);
                    const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
                    setCustomInputFrom(from);
                    setCustomInputTo(to);
                  },
                },
                {
                  label: "Tháng này",
                  action: () => {
                    const now = new Date();
                    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
                    const to = now.toISOString().slice(0, 10);
                    setCustomInputFrom(from);
                    setCustomInputTo(to);
                  },
                },
              ].map(preset => (
                <Pressable
                  key={preset.label}
                  style={{ backgroundColor: "#f0f5f2", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
                  onPress={preset.action}
                >
                  <Text style={{ color: C.green, fontSize: 12, fontWeight: "800" }}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.dateInputLabel}>{t.fromDate}</Text>
            <TextInput
              style={s.dateInput}
              value={customInputFrom}
              onChangeText={setCustomInputFrom}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={s.dateInputLabel}>{t.toDate}</Text>
            <TextInput
              style={s.dateInput}
              value={customInputTo}
              onChangeText={setCustomInputTo}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
            />

            {Boolean(customError) && (
              <Text style={[s.error, { marginTop: 10 }]}>{customError}</Text>
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <Pressable
                style={[s.button, s.buttonGhost, { flex: 1 }]}
                onPress={() => setCustomModalVisible(false)}
              >
                <Text style={s.buttonGhostText}>{t.btnNo}</Text>
              </Pressable>
              <Pressable
                style={[s.button, s.buttonGreen, { flex: 1.5 }]}
                onPress={() => {
                  const f = customInputFrom.trim();
                  const tVal = customInputTo.trim();
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^\d{4}-\d{2}-\d{2}$/.test(tVal) || f > tVal) {
                    setCustomError(t.invalidDateRange);
                    return;
                  }
                  setCustomError("");
                  setCustomFrom(f);
                  setCustomTo(tVal);
                  setAnalyticsPeriod("custom");
                  setCustomModalVisible(false);
                  void loadAnalytics("custom", f, tVal, true);
                }}
              >
                <Text style={s.buttonText}>{t.apply}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>();
  const [lang, setLang] = useState<Language>("vi");

  useEffect(() => {
    void loadAuth().then(setAuth);
    void AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then(saved => {
      if (saved === "vi" || saved === "en" || saved === "zh") setLang(saved);
    });
  }, []);

  const changeLanguage = useCallback(async (next: Language) => {
    setLang(next);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  }, []);

  const t = I18N[lang];

  if (auth === undefined) return <View style={[s.login, { alignItems: "center" }]}><ActivityIndicator size="large" color="white"/></View>;
  return (
    <SafeAreaProvider>
      {auth ? (
        <Main
          auth={auth}
          onAuth={setAuth}
          onLogout={() => setAuth(null)}
          lang={lang}
          onChangeLanguage={changeLanguage}
          t={t}
        />
      ) : (
        <Login
          onDone={setAuth}
          lang={lang}
          onChangeLanguage={changeLanguage}
          t={t}
        />
      )}
    </SafeAreaProvider>
  );
}
