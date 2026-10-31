import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useEffect, useMemo, useState } from "react";
import { Linking, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import {
  getTravelPayment, housingAppointment, markHousingMessagesRead, markPaymentSupportRead, markTravelMessagesRead,
  openPaymentSupport, sendHousingMessage, sendPaymentSupportMessage, sendTravelMessage, startTravelPayment,
} from "../api/endpoints";
import type { FollowupEntry, HousingAppointment, InquiryMessage, PartnerPaymentState, PaymentSupportTicket } from "../api/types";
import { money, shortDate } from "../format";
import { useI18n } from "../i18n";
import { keys } from "../query";
import { colors } from "../theme";
import { Button, PressableScale, ZxIcon, haptic } from "../ui";
import { toast } from "../ui/toast";
import { DateStrip, OptionPills, nextDays } from "./pickers";

type Locale = "vi-VN" | "en-US" | "zh-CN" | "zh-TW";

// Copy from the PWA HousingInquiryTracker / HousingMessageThread / TravelMessageThread /
// TravelPartnerPayment / PaymentSupportPanel.
export const trackerCopy = {
  "vi-VN": {
    housingTitle: "Yêu cầu thuê nhà của tôi", travelTitle: "Yêu cầu du lịch của tôi", housingEmpty: "Bạn chưa gửi yêu cầu thuê nhà", travelEmpty: "Chưa có yêu cầu du lịch", browse: "Xem nhà/phòng", browseTravel: "Khám phá tour",
    new: "Đã gửi", contacted: "Partner đã liên hệ", viewing: "Đang hẹn xem nhà", negotiating: "Đang thương lượng", won: "Đã chốt", lost: "Đã kết thúc",
    requested: "Chờ Partner xác nhận", confirmed: "Đã xác nhận", completed: "Đã hoàn tất", cancelled: "Đã hủy", rejected: "Partner không thể tiếp nhận",
    moveIn: "Ngày vào ở", budget: "Ngân sách", open: "Xem nhà/phòng", code: "Mã yêu cầu", date: "Ngày", time: "Giờ", guests: "Số khách", contact: "Liên hệ",
    appointment: "Lịch xem nhà", propose: "Đề xuất lịch xem nhà", note: "Ghi chú", send: "Gửi đề xuất", proposed: "Chờ xác nhận", apptConfirmed: "Đã xác nhận", apptCompleted: "Đã xem nhà", apptCancelled: "Đã hủy",
    partnerProposed: "Partner đề xuất một thời gian xem nhà mới", accept: "Xác nhận thời gian này", cancelAppt: "Hủy lịch", reminder: "Hệ thống nhắc trước 2 giờ", noAppointment: "Chưa có lịch xem nhà",
    history: "Lịch sử trao đổi", me: "Tôi", partner: "Partner", system: "Hệ thống", cancelBooking: "Hủy yêu cầu",
    chat: "Trao đổi với Partner", placeholder: "Nhập tin nhắn…", sendMsg: "Gửi", noMessages: "Chưa có tin nhắn", unread: "Tin mới",
    payTitle: "Thanh toán cho Partner", payDirect: "Tiền đi trực tiếp vào tài khoản/merchant của Partner; ZhaoXi không giữ khoản thanh toán này.", payStart: "Bắt đầu thanh toán", payRefresh: "Cập nhật trạng thái", paid: "Đã thanh toán", payPending: "Đang chờ thanh toán", payFailed: "Thanh toán thất bại", payCancelled: "Thanh toán đã hủy", checkout: "Mở checkout của Partner", qr: "Nội dung QR của Partner", copy: "Sao chép", copied: "Đã sao chép",
    supportTitle: "Hỗ trợ thanh toán & hoàn tiền", supportOpen: "Gửi yêu cầu hỗ trợ", supportMessage: "Mô tả vấn đề", refund: "Vấn đề hoàn tiền", payment: "Vấn đề thanh toán", status: "Trạng thái", sla: "Dự kiến xử lý", refundEta: "Dự kiến hoàn tiền", supportDirect: "ZhaoXi chỉ hỗ trợ điều phối; tiền vẫn do Partner xử lý trực tiếp", reply: "Nhắn cho Partner",
    failed: "Không thực hiện được, vui lòng thử lại", timeline: "Tiến trình",
  },
  "en-US": {
    housingTitle: "My rental inquiries", travelTitle: "My travel bookings", housingEmpty: "No rental inquiries yet", travelEmpty: "No travel bookings yet", browse: "Browse homes", browseTravel: "Explore tours",
    new: "Submitted", contacted: "Provider contacted you", viewing: "Viewing scheduled", negotiating: "Negotiating", won: "Agreed", lost: "Closed",
    requested: "Awaiting Partner", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", rejected: "Unavailable",
    moveIn: "Move-in", budget: "Budget", open: "View property", code: "Inquiry code", date: "Date", time: "Time", guests: "Guests", contact: "Contact",
    appointment: "Viewing appointment", propose: "Propose viewing time", note: "Note", send: "Send proposal", proposed: "Awaiting confirmation", apptConfirmed: "Confirmed", apptCompleted: "Completed", apptCancelled: "Cancelled",
    partnerProposed: "The provider proposed a new viewing time", accept: "Confirm this time", cancelAppt: "Cancel appointment", reminder: "Reminder 2 hours before", noAppointment: "No viewing scheduled",
    history: "Follow-up history", me: "Me", partner: "Provider", system: "System", cancelBooking: "Cancel",
    chat: "Message the Partner", placeholder: "Type a message…", sendMsg: "Send", noMessages: "No messages yet", unread: "New",
    payTitle: "Pay Partner", payDirect: "Funds go directly to the Partner merchant; ZhaoXi never holds this payment.", payStart: "Start payment", payRefresh: "Refresh status", paid: "Paid", payPending: "Awaiting payment", payFailed: "Payment failed", payCancelled: "Payment cancelled", checkout: "Open Partner checkout", qr: "Partner QR payload", copy: "Copy", copied: "Copied",
    supportTitle: "Payment & refund support", supportOpen: "Open support request", supportMessage: "Describe the issue", refund: "Refund issue", payment: "Payment issue", status: "Status", sla: "Expected response", refundEta: "Refund ETA", supportDirect: "ZhaoXi only coordinates support; funds remain handled directly by Partner", reply: "Message Partner",
    failed: "Something went wrong, please try again", timeline: "Timeline",
  },
  "zh-CN": {
    housingTitle: "我的租房意向", travelTitle: "我的旅游预约", housingEmpty: "暂无租房意向", travelEmpty: "暂无旅游预约", browse: "浏览房源", browseTravel: "探索旅游",
    new: "已提交", contacted: "房源方已联系", viewing: "预约看房", negotiating: "洽谈中", won: "已达成", lost: "已结束",
    requested: "待确认", confirmed: "已确认", completed: "已完成", cancelled: "已取消", rejected: "无法接待",
    moveIn: "入住日期", budget: "预算", open: "查看房源", code: "咨询编号", date: "日期", time: "时间", guests: "人数", contact: "联系方式",
    appointment: "看房预约", propose: "提出看房时间", note: "备注", send: "发送时间", proposed: "待确认", apptConfirmed: "已确认", apptCompleted: "已完成", apptCancelled: "已取消",
    partnerProposed: "房源方建议了新的看房时间", accept: "确认这个时间", cancelAppt: "取消预约", reminder: "看房前 2 小时提醒", noAppointment: "尚未安排看房",
    history: "跟进记录", me: "我", partner: "房源方", system: "系统", cancelBooking: "取消预约",
    chat: "与服务方沟通", placeholder: "输入消息…", sendMsg: "发送", noMessages: "暂无消息", unread: "新消息",
    payTitle: "向合作伙伴付款", payDirect: "款项直接进入旅行服务商账户，赵喜不持有您的付款。", payStart: "开始付款", payRefresh: "刷新状态", paid: "已付款", payPending: "等待付款", payFailed: "付款失败", payCancelled: "付款已取消", checkout: "打开合作伙伴收银台", qr: "合作伙伴 QR 内容", copy: "复制", copied: "已复制",
    supportTitle: "支付与退款支持", supportOpen: "提交支持请求", supportMessage: "问题说明", refund: "退款问题", payment: "支付问题", status: "状态", sla: "预计处理时间", refundEta: "预计退款完成", supportDirect: "赵喜仅协助处理，款项仍由合作伙伴直接处理", reply: "发送消息",
    failed: "操作失败，请重试", timeline: "进度",
  },
  "zh-TW": {
    housingTitle: "我的租房意向", travelTitle: "我的旅遊預約", housingEmpty: "暫無租房意向", travelEmpty: "暫無旅遊預約", browse: "瀏覽房源", browseTravel: "探索旅遊",
    new: "已提交", contacted: "房源方已聯絡", viewing: "預約看房", negotiating: "洽談中", won: "已達成", lost: "已結束",
    requested: "待確認", confirmed: "已確認", completed: "已完成", cancelled: "已取消", rejected: "無法接待",
    moveIn: "入住日期", budget: "預算", open: "查看房源", code: "諮詢編號", date: "日期", time: "時間", guests: "人數", contact: "聯絡方式",
    appointment: "看房預約", propose: "提出看房時間", note: "備註", send: "送出時間", proposed: "待確認", apptConfirmed: "已確認", apptCompleted: "已完成", apptCancelled: "已取消",
    partnerProposed: "房源方建議了新的看房時間", accept: "確認這個時間", cancelAppt: "取消預約", reminder: "看房前 2 小時提醒", noAppointment: "尚未安排看房",
    history: "跟進記錄", me: "我", partner: "房源方", system: "系統", cancelBooking: "取消預約",
    chat: "與服務方溝通", placeholder: "輸入訊息…", sendMsg: "傳送", noMessages: "暫無訊息", unread: "新訊息",
    payTitle: "向合作夥伴付款", payDirect: "款項直接進入旅遊服務商帳戶，趙喜不持有您的付款。", payStart: "開始付款", payRefresh: "重新整理狀態", paid: "已付款", payPending: "等待付款", payFailed: "付款失敗", payCancelled: "付款已取消", checkout: "開啟合作夥伴收銀台", qr: "合作夥伴 QR 內容", copy: "複製", copied: "已複製",
    supportTitle: "支付與退款支援", supportOpen: "提交支援請求", supportMessage: "問題說明", refund: "退款問題", payment: "支付問題", status: "狀態", sla: "預計處理時間", refundEta: "預計退款完成", supportDirect: "趙喜僅協助處理，款項仍由合作夥伴直接處理", reply: "傳送訊息",
    failed: "操作失敗，請重試", timeline: "進度",
  },
} as const;

export function useTrackerCopy() {
  const { locale } = useI18n();
  return trackerCopy[locale as Locale];
}

const useRefresh = (kind: "housing" | "travel") => {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: [kind === "housing" ? "housing-inquiries" : "travel-bookings"] });
};

/** Inline chat with the Partner (housingMessages / travelMessages on the request). */
export function InquiryThread({ kind, requestId, messages }: { kind: "housing" | "travel"; requestId: string; messages: InquiryMessage[] }) {
  const t = useTrackerCopy();
  const { locale } = useI18n();
  const refresh = useRefresh(kind);
  const [text, setText] = useState("");
  const unread = useMemo(() => messages.filter((m) => m.senderRole === "partner" && !m.customerReadAt).length, [messages]);
  useEffect(() => {
    if (!unread) return;
    void (kind === "housing" ? markHousingMessagesRead(requestId) : markTravelMessagesRead(requestId)).then(refresh).catch(() => undefined);
  }, [requestId, unread]);
  const send = useMutation({
    mutationFn: () => (kind === "housing" ? sendHousingMessage(requestId, text.trim()) : sendTravelMessage(requestId, text.trim())),
    onSuccess: () => { haptic.success(); setText(""); void refresh(); },
    onError: () => toast(t.failed, "error"),
  });
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}><ZxIcon name="messages" size={16} color={colors.brandDeep} /><Text style={styles.sectionTitle}>{t.chat}</Text></View>
        {unread > 0 ? <View style={styles.unread}><Text style={styles.unreadText}>{t.unread} {unread}</Text></View> : null}
      </View>
      {messages.length ? (
        <View style={{ gap: 6 }}>
          {messages.slice(-30).map((m) => {
            const mine = m.senderRole === "customer";
            return (
              <Animated.View key={m.id} entering={FadeIn} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={styles.bubbleText}>{m.body}</Text>
                <Text style={styles.bubbleMeta}>{mine ? t.me : t.partner} · {shortDate(m.createdAt, locale)}</Text>
              </Animated.View>
            );
          })}
        </View>
      ) : <Text style={styles.muted}>{t.noMessages}</Text>}
      <View style={styles.composer}>
        <TextInput value={text} onChangeText={setText} placeholder={t.placeholder} placeholderTextColor="#94A3B8" maxLength={2000} style={styles.input} multiline />
        <PressableScale disabled={!text.trim() || send.isPending} onPress={() => send.mutate()} style={[styles.sendButton, (!text.trim() || send.isPending) && { opacity: 0.45 }]}>
          <Text style={styles.sendText}>{t.sendMsg}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const viewingTimes = Array.from({ length: 25 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

/** Viewing appointment block of the PWA housing tracker. */
export function AppointmentSection({ requestId, appointment }: { requestId: string; appointment: HousingAppointment | null }) {
  const t = useTrackerCopy();
  const { locale } = useI18n();
  const refresh = useRefresh("housing");
  const days = useMemo(() => nextDays(21), []);
  const [day, setDay] = useState(days[0] || "");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const minimum = Date.now() + 5 * 60_000;
  const times = viewingTimes.filter((value) => new Date(`${day}T${value}:00`).getTime() > minimum);
  useEffect(() => { if (time && !times.includes(time)) setTime(""); }, [day]);
  const act = useMutation({
    mutationFn: (input: { action: "propose" | "confirm" | "cancel"; scheduledAt?: string }) => housingAppointment(requestId, { ...input, note }),
    onSuccess: () => { haptic.success(); setNote(""); setTime(""); void refresh(); },
    onError: () => toast(t.failed, "error"),
  });
  const status = appointment?.status;
  const label = !appointment ? t.noAppointment : status === "confirmed" ? t.apptConfirmed : status === "completed" ? t.apptCompleted : status === "cancelled" ? t.apptCancelled : t.proposed;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}><Text style={{ fontSize: 15 }}>📅</Text><Text style={styles.sectionTitle}>{t.appointment}</Text></View>
        <Text style={[styles.sectionStatus, { color: status === "confirmed" ? colors.brandStrong : status === "cancelled" || !appointment ? colors.slate : "#1D4ED8" }]}>{label}</Text>
      </View>
      {appointment ? (
        <View style={{ gap: 6 }}>
          <Text style={styles.line}>{t.time}: <Text style={styles.strong}>{shortDate(appointment.scheduledAt, locale)}</Text></Text>
          {appointment.reminderAt && status === "confirmed" ? <Text style={[styles.line, { color: colors.brandStrong }]}>⏰ {t.reminder}</Text> : null}
          {status === "proposed" && appointment.proposedBy === "partner" ? <Text style={styles.notice}>{t.partnerProposed}</Text> : null}
          <View style={styles.actions}>
            {status === "proposed" && appointment.proposedBy === "partner" ? <Button small title={t.accept} loading={act.isPending} onPress={() => act.mutate({ action: "confirm" })} /> : null}
            {status && !["completed", "cancelled"].includes(status) ? <Button small variant="danger" title={t.cancelAppt} disabled={act.isPending} onPress={() => act.mutate({ action: "cancel" })} /> : null}
          </View>
        </View>
      ) : null}
      {!appointment || status === "cancelled" ? (
        <Animated.View entering={FadeInDown} style={{ gap: 10 }}>
          <Text style={styles.label}>{t.propose}</Text>
          <DateStrip days={days} value={day} onChange={setDay} locale={locale} />
          <OptionPills value={time} onChange={setTime} options={times.map((value) => ({ value, label: value }))} />
          <TextInput value={note} onChangeText={setNote} placeholder={t.note} placeholderTextColor="#94A3B8" style={styles.input} maxLength={500} />
          <Button small title={t.send} loading={act.isPending} disabled={!time} onPress={() => act.mutate({ action: "propose", scheduledAt: new Date(`${day}T${time}:00`).toISOString() })} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Collapsible follow-up history / timeline. */
export function HistoryList({ title, entries }: { title: string; entries: FollowupEntry[] }) {
  const t = useTrackerCopy();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  if (!entries.length) return null;
  return (
    <Animated.View layout={LinearTransition} style={{ gap: 6 }}>
      <PressableScale onPress={() => setOpen((v) => !v)} style={styles.historyToggle}>
        <Text style={styles.historyTitle}>{title} · {entries.length}</Text>
        <Text style={styles.historyChevron}>{open ? "⌃" : "⌄"}</Text>
      </PressableScale>
      {open ? [...entries].reverse().slice(0, 12).map((entry, index) => (
        <Animated.View key={entry.id || index} entering={FadeInDown.delay(index * 25)} style={styles.historyRow}>
          <Text style={styles.historyLine}>
            <Text style={styles.strong}>{entry.actorRole === "customer" ? t.me : entry.actorRole === "partner" ? t.partner : t.system}</Text>
            {entry.action ? ` · ${entry.action}` : ""}{entry.at ? ` · ${shortDate(entry.at, locale)}` : ""}{entry.scheduledAt ? ` · ${shortDate(entry.scheduledAt, locale)}` : ""}
          </Text>
          {entry.note ? <Text style={styles.muted}>{entry.note}</Text> : null}
        </Animated.View>
      )) : null}
    </Animated.View>
  );
}

/** PWA TravelPartnerPayment: direct-to-Partner checkout once the booking is confirmed. */
export function PartnerPayment({ requestId, stage, details }: { requestId: string; stage: string; details: Record<string, unknown> }) {
  const t = useTrackerCopy();
  const refresh = useRefresh("travel");
  const initial: PartnerPaymentState = { status: String(details.travelPaymentStatus || "not_started"), intent: (details.partnerPaymentIntent as PartnerPaymentState["intent"]) || null };
  const status = useQuery({ queryKey: keys.travelPayment(requestId), queryFn: () => getTravelPayment(requestId), enabled: stage === "confirmed", placeholderData: initial });
  const start = useMutation({
    mutationFn: () => startTravelPayment(requestId),
    onSuccess: () => { haptic.success(); void status.refetch(); void refresh(); },
    onError: () => toast(t.failed, "error"),
  });
  const state = status.data || initial;
  if (stage !== "confirmed" && state.status !== "paid") return null;
  const intent = state.intent || {};
  const label = state.status === "paid" ? t.paid : state.status === "failed" ? t.payFailed : state.status === "cancelled" ? t.payCancelled : t.payPending;
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}><Text style={{ fontSize: 15 }}>💳</Text><Text style={styles.sectionTitle}>{t.payTitle}</Text></View>
      <Text style={[styles.line, { color: colors.brandStrong }]}>✓ {t.payDirect}</Text>
      {state.status !== "not_started" ? <Text style={styles.line}><Text style={styles.strong}>{label}</Text>{intent.amount ? ` · ${money(intent.amount, intent.currency || "VND")}` : ""}</Text> : null}
      <View style={styles.actions}>
        {state.status === "not_started" ? <Button small title={t.payStart} loading={start.isPending} onPress={() => start.mutate()} /> : null}
        {state.status !== "not_started" && state.status !== "paid" ? <Button small variant="secondary" title={t.payRefresh} loading={status.isFetching} onPress={() => void status.refetch()} /> : null}
        {intent.checkoutUrl ? <Button small variant="dark" title={t.checkout} onPress={() => void Linking.openURL(String(intent.checkoutUrl))} /> : null}
      </View>
      {intent.qrPayload ? (
        <View style={styles.qr}>
          <Text style={styles.label}>{t.qr}</Text>
          <Text style={styles.qrText} selectable>{String(intent.qrPayload)}</Text>
          <Button small variant="secondary" title={t.copy} onPress={() => { void Clipboard.setStringAsync(String(intent.qrPayload)); haptic.success(); toast(t.copied); }} />
        </View>
      ) : null}
    </View>
  );
}

/** PWA PaymentSupportPanel: open a payment/refund ticket and chat about it. */
export function PaymentSupport({ requestId, ticket }: { requestId: string; ticket: PaymentSupportTicket | null }) {
  const t = useTrackerCopy();
  const { locale } = useI18n();
  const refresh = useRefresh("travel");
  const [category, setCategory] = useState<"payment" | "refund">("payment");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(Boolean(ticket));
  const messages = ticket?.messages || [];
  const unread = messages.filter((m) => m.sender === "partner" && !m.customerReadAt).length;
  useEffect(() => { if (ticket && unread) void markPaymentSupportRead(requestId).then(refresh).catch(() => undefined); }, [requestId, unread]);
  const submit = useMutation({
    mutationFn: () => (ticket ? sendPaymentSupportMessage(requestId, message.trim()) : openPaymentSupport(requestId, category, message.trim())),
    onSuccess: () => { haptic.success(); setMessage(""); void refresh(); },
    onError: () => toast(t.failed, "error"),
  });
  const closed = ticket && ["resolved", "closed"].includes(ticket.stage);
  return (
    <Animated.View layout={LinearTransition} style={styles.section}>
      <PressableScale onPress={() => setOpen((v) => !v)} hapticOnPress={false} style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}><Text style={{ fontSize: 15 }}>🛟</Text><Text style={styles.sectionTitle}>{t.supportTitle}</Text></View>
        {unread > 0 ? <View style={styles.unread}><Text style={styles.unreadText}>{t.unread} {unread}</Text></View> : <Text style={styles.historyChevron}>{open ? "⌃" : "⌄"}</Text>}
      </PressableScale>
      {open ? (
        <Animated.View entering={FadeInDown} style={{ gap: 8 }}>
          <Text style={[styles.line, { color: colors.brandStrong }]}>✓ {t.supportDirect}</Text>
          {ticket ? (
            <>
              <Text style={styles.line}>{t.status}: <Text style={styles.strong}>{ticket.stage}</Text></Text>
              {ticket.slaDueAt ? <Text style={styles.line}>{t.sla}: {shortDate(ticket.slaDueAt, locale)}</Text> : null}
              {ticket.refundEtaAt ? <Text style={[styles.line, { color: colors.warning }]}>{t.refundEta}: {shortDate(ticket.refundEtaAt, locale)}</Text> : null}
              {messages.slice(-20).map((m) => (
                <View key={m.id} style={[styles.bubble, m.sender === "customer" ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={styles.bubbleText}>{m.body}</Text>
                  <Text style={styles.bubbleMeta}>{shortDate(m.createdAt, locale)}</Text>
                </View>
              ))}
            </>
          ) : <OptionPills value={category} onChange={setCategory} options={[{ value: "payment", label: t.payment }, { value: "refund", label: t.refund }]} />}
          {!closed ? (
            <View style={styles.composer}>
              <TextInput value={message} onChangeText={setMessage} placeholder={ticket ? t.reply : t.supportMessage} placeholderTextColor="#94A3B8" style={styles.input} multiline maxLength={2000} />
              <PressableScale disabled={!message.trim() || submit.isPending} onPress={() => submit.mutate()} style={[styles.sendButton, (!message.trim() || submit.isPending) && { opacity: 0.45 }]}>
                <Text style={styles.sendText}>{ticket ? t.sendMsg : t.supportOpen}</Text>
              </PressableScale>
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export const trackerStyles = StyleSheet.create({
  card: { padding: 14, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft, gap: 10 },
  top: { flexDirection: "row", gap: 12 },
  thumb: { width: 72, height: 72, borderRadius: 14 },
  code: { fontSize: 12, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12, color: colors.slate, marginTop: 3 },
  link: { fontSize: 12, fontWeight: "800", color: colors.brandStrong, marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 6 },
  gridItem: { width: "50%", fontSize: 12, color: colors.slate },
});

const styles = StyleSheet.create({
  section: { padding: 12, borderRadius: 16, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: "#EDF1EF", gap: 8 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  sectionTitle: { fontSize: 13.5, fontWeight: "700", color: colors.ink },
  sectionStatus: { fontSize: 11, fontWeight: "800" },
  line: { fontSize: 12, color: colors.slate, lineHeight: 17 },
  strong: { fontWeight: "800", color: colors.ink },
  notice: { fontSize: 12, color: "#9A3412", backgroundColor: "#FFF7ED", padding: 8, borderRadius: 10, overflow: "hidden" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  label: { fontSize: 12.5, fontWeight: "700", color: colors.ink },
  muted: { fontSize: 12, color: colors.textMuted },
  unread: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.dangerSoft },
  unreadText: { fontSize: 10, fontWeight: "900", color: "#B42318" },
  bubble: { maxWidth: "86%", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14 },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: "#DCFCE7", borderBottomRightRadius: 4 },
  bubbleTheirs: { alignSelf: "flex-start", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 13, color: colors.text, lineHeight: 18 },
  bubbleMeta: { fontSize: 9.5, color: colors.slate, marginTop: 3 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: { flex: 1, minHeight: 40, maxHeight: 110, borderRadius: 12, borderWidth: 1, borderColor: "#DBE5DF", backgroundColor: colors.white, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, fontSize: 13.5, color: colors.text },
  sendButton: { height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.wechat, alignItems: "center", justifyContent: "center" },
  sendText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  historyToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  historyTitle: { fontSize: 12.5, fontWeight: "800", color: colors.ink },
  historyChevron: { fontSize: 14, color: colors.slate, fontWeight: "800" },
  historyRow: { padding: 9, borderRadius: 10, backgroundColor: colors.surfaceMuted, gap: 2 },
  historyLine: { fontSize: 11.5, color: colors.slate },
  qr: { gap: 6, padding: 10, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft },
  qrText: { fontSize: 11, color: colors.ink, fontFamily: "Menlo" },
});
