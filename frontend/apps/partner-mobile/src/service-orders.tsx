import { useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { runServiceOrderAction } from "./api";
import type { I18N } from "./i18n";
import { C, s } from "./styles";
import type { Order, OrderFact, PartnerOrderAction } from "./types";

// Non-food orders (housing, travel, visa, car rental, translation, ...). The backend sends the
// order kind, the facts worth showing and the next actions; this file labels and runs them.

type Copy = typeof I18N["vi"];

function factValue(fact: OrderFact, t: Copy) {
  if (fact.format === "money") return `${Number(fact.value || 0).toLocaleString("vi-VN")} ₫`;
  if (fact.format === "months") return `${fact.value} ${t.serviceOrder.months}`;
  if (fact.format === "payment") return fact.value === "bank_transfer" ? t.bankTransfer : t.cashOnDelivery;
  if (fact.format === "date" && /^\d{4}-\d{2}-\d{2}$/.test(String(fact.value))) {
    const [y, m, d] = String(fact.value).split("-");
    return `${d}/${m}/${y}`;
  }
  return String(fact.value);
}

function orderTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function statusText(order: Order, t: Copy) {
  if (order.status === "completed") return t.statusCompleted;
  if (["cancelled", "rejected"].includes(order.status)) return t.statusCancelled;
  return t.stageLabel[order.stage] || order.stage;
}

function Facts({ order, t }: { order: Order; t: Copy }) {
  return (
    <View style={s.detailGrid}>
      {order.facts.map(fact => (
        <View key={fact.key} style={[s.detailTile, fact.key === "customerNote" && { width: "100%" }]}>
          <Text style={s.detailLabel}>{t.serviceOrder.facts[fact.key] || fact.key}</Text>
          <Text style={[s.detailValue, fact.format === "money" && s.detailValueGreen]}>{factValue(fact, t)}</Text>
        </View>
      ))}
      <View style={s.detailTile}>
        <Text style={s.detailLabel}>{t.orderTime}</Text>
        <Text style={s.detailValue} numberOfLines={1} adjustsFontSizeToFit>{orderTime(order.createdAt)}</Text>
      </View>
    </View>
  );
}

function Contact({ order }: { order: Order }) {
  return (
    <>
      <View style={s.between}>
        <View style={s.row}>
          <Ionicons name="person" size={16} color={C.ink}/>
          <Text style={s.meta}>{order.customerName}</Text>
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
    </>
  );
}

/** Action buttons; reject/cancel ask for confirmation first. */
function Actions({ order, t, onDone }: { order: Order; t: Copy; onDone: () => void }) {
  const [busy, setBusy] = useState<PartnerOrderAction | "">("");
  const [error, setError] = useState("");
  const labels = t.serviceOrder.actions[order.kind];
  async function run(action: PartnerOrderAction) {
    setBusy(action);
    setError("");
    try {
      await runServiceOrderAction(order, action);
      onDone();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t.serviceOrder.actionFailed);
    } finally {
      setBusy("");
    }
  }
  function press(action: PartnerOrderAction) {
    if (action !== "reject" && action !== "cancel") return void run(action);
    Alert.alert(t.serviceOrder.confirmTitle, t.serviceOrder.confirmDesc(labels[action], order.requestCode), [
      { text: t.serviceOrder.confirmNo, style: "cancel" },
      { text: t.serviceOrder.confirmYes, style: "destructive", onPress: () => void run(action) },
    ]);
  }
  if (!order.actions.length) return null;
  return (
    <>
      {!!error && <Text style={[s.error, { marginTop: 12 }]}>{error}</Text>}
      <View style={s.actions}>
        {order.actions.map(action => {
          const negative = action === "reject" || action === "cancel";
          return (
            <Pressable
              key={action}
              disabled={Boolean(busy)}
              style={[s.button, negative ? s.buttonRed : s.buttonGreen, { flex: negative ? 0.85 : 1.3, opacity: busy && busy !== action ? 0.65 : 1 }]}
              onPress={() => press(action)}
            >
              {busy === action ? <ActivityIndicator color={negative ? C.red : "white"}/> : <Text style={negative ? s.buttonRedText : s.buttonText}>{labels[action]}</Text>}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

export function ServiceOrderCard({ order, t, interactive = true, onOpen, onChanged }: { order: Order; t: Copy; interactive?: boolean; onOpen: () => void; onChanged?: () => void }) {
  return (
    <View style={s.card}>
      <Pressable onPress={onOpen} accessible={false}>
        <View style={s.between}>
          <Text style={s.code}>{order.requestCode}</Text>
          <View style={s.pill}><Text style={s.pillText}>{statusText(order, t)}</Text></View>
        </View>
        <Text style={s.itemName}>{order.serviceName}</Text>
        <Contact order={order}/>
      </Pressable>
      <View style={s.externalBadge}>
        <Text style={s.externalBadgeText}>{order.moduleName ? `${order.moduleName} · ` : ""}{t.serviceOrder.kind[order.kind]}</Text>
      </View>
      <Facts order={order} t={t}/>
      {interactive && <Actions order={order} t={t} onDone={() => onChanged?.()}/>}
    </View>
  );
}

export function ServiceOrderModal({ order, t, onClose, onRefresh }: { order: Order; t: Copy; onClose: () => void; onRefresh: () => Promise<unknown> }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.centerModalBackdrop}>
        <ScrollView style={s.centerModal} contentContainerStyle={{ paddingBottom: 34 }}>
          <View style={s.modalHandle}/>
          {order.stage === "assigned" && (
            <View style={[s.pill, { alignSelf: "flex-start", backgroundColor: "#fee2e2", marginBottom: 10 }]}>
              <Text style={{ color: "#b91c1c", fontWeight: "900", fontSize: 13 }}>{t.serviceOrder.newTitle[order.kind]}</Text>
            </View>
          )}
          <View style={s.between}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={s.code}>{order.requestCode}</Text>
              <Text style={s.modalTitle}>{order.serviceName}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close-circle" size={32} color={C.muted}/></Pressable>
          </View>
          <Contact order={order}/>
          <View style={s.externalBadge}>
            <Text style={s.externalBadgeText}>{order.moduleName ? `${order.moduleName} · ` : ""}{t.serviceOrder.kind[order.kind]} · {statusText(order, t)}</Text>
          </View>
          <Facts order={order} t={t}/>
          <Actions order={order} t={t} onDone={() => { void onRefresh(); onClose(); }}/>
        </ScrollView>
      </View>
    </Modal>
  );
}
