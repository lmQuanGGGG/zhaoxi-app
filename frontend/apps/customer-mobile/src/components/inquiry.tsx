import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { ApiError } from "../api/client";
import { createHousingInquiry, createTravelInquiry, getProfile, getTravelAvailability } from "../api/endpoints";
import type { ServiceDetail, TravelPackage } from "../api/types";
import { imageUri, money, num, str } from "../format";
import { useSession } from "../hooks";
import { useI18n } from "../i18n";
import { keys } from "../query";
import { colors, shadow } from "../theme";
import { AppImage, Button, FactArt, Field, PhotoCounter, PressableScale, QuantityStepper, haptic, type FactArtKind } from "../ui";
import { toast } from "../ui/toast";
import { DateStrip, OptionPills, isoDay, nextDays } from "./pickers";

type Locale = "vi-VN" | "en-US" | "zh-CN" | "zh-TW";

// Copy from the PWA HousingListingDetail / TravelExperienceDetail pages.
const housingCopy = {
  "vi-VN": { month: "tháng", bed: "Phòng ngủ", bath: "WC", area: "Diện tích", furnished: "Nội thất", deposit: "Đặt cọc", available: "Có thể vào ở từ", lease: "Thời hạn thuê tối thiểu", district: "Khu vực", amenities: "Tiện ích", property: "Thông tin nhà/phòng", inquiry: "Gửi yêu cầu thuê nhà", moveIn: "Ngày dự kiến vào ở", months: "Thời gian thuê (tháng)", occupants: "Số người ở", budget: "Ngân sách/tháng (VND)", send: "Gửi cho Partner", sent: "Đã gửi yêu cầu thuê nhà", sentHint: "Partner đã nhận nhu cầu của bạn. Bạn có thể theo dõi lịch xem nhà và nhắn tin với Partner.", yes: "Đầy đủ nội thất", partial: "Nội thất một phần", no: "Không nội thất", notSet: "Chưa cập nhật", statusAvailable: "Còn trống", statusReserved: "Đã giữ chỗ", statusRented: "Đã cho thuê", unavailableHint: "Nhà/phòng này hiện chưa nhận thêm yêu cầu thuê mới", guestCta: "Đăng nhập để gửi yêu cầu thuê ›" },
  "en-US": { month: "month", bed: "Bedrooms", bath: "Bathrooms", area: "Area", furnished: "Furnishing", deposit: "Deposit", available: "Available from", lease: "Minimum lease", district: "Area", amenities: "Amenities", property: "Property details", inquiry: "Send rental inquiry", moveIn: "Expected move-in", months: "Lease length (months)", occupants: "Occupants", budget: "Monthly budget (VND)", send: "Send to Partner", sent: "Rental inquiry sent", sentHint: "The provider has received your request. Track viewings and message the provider anytime.", yes: "Fully furnished", partial: "Partly furnished", no: "Unfurnished", notSet: "Not specified", statusAvailable: "Available", statusReserved: "Reserved", statusRented: "Rented", unavailableHint: "This property is not accepting new rental inquiries", guestCta: "Sign in to send a rental inquiry ›" },
  "zh-CN": { month: "月", bed: "卧室", bath: "卫生间", area: "面积", furnished: "家具", deposit: "押金", available: "可入住日期", lease: "最短租期", district: "区域", amenities: "配套设施", property: "房源信息", inquiry: "发送租房意向", moveIn: "预计入住日期", months: "预计租期（月）", occupants: "入住人数", budget: "月预算（VND）", send: "发送给房源方", sent: "已发送租房意向", sentHint: "房源方已收到您的需求，可继续跟进看房预约并与房源方沟通。", yes: "全家具", partial: "部分家具", no: "无家具", notSet: "未填写", statusAvailable: "可租", statusReserved: "已预订", statusRented: "已出租", unavailableHint: "该房源暂不接受新的租房意向", guestCta: "登录后发送租房意向 ›" },
  "zh-TW": { month: "月", bed: "臥室", bath: "衛浴", area: "面積", furnished: "家具", deposit: "押金", available: "可入住日期", lease: "最短租期", district: "區域", amenities: "配套設施", property: "房源資訊", inquiry: "發送租房意向", moveIn: "預計入住日期", months: "預計租期（月）", occupants: "入住人數", budget: "月預算（VND）", send: "發送給房源方", sent: "已發送租房意向", sentHint: "房源方已收到您的需求，可繼續跟進看房預約並與房源方溝通。", yes: "全家具", partial: "部分家具", no: "無家具", notSet: "未填寫", statusAvailable: "可租", statusReserved: "已預訂", statusRented: "已出租", unavailableHint: "該房源目前不接受新的租房意向", guestCta: "登入後發送租房意向 ›" },
} as const;

const travelCopy = {
  "vi-VN": { duration: "Thời lượng", destination: "Điểm đến", departure: "Điểm khởi hành", guests: "Số khách tối đa", language: "Ngôn ngữ phục vụ", includes: "Bao gồm", excludes: "Không bao gồm", start: "Giờ khởi hành", inquiry: "Đặt lịch tour / trải nghiệm", date: "Ngày dự kiến", time: "Khung giờ còn chỗ", send: "Gửi booking request", sent: "Đã gửi yêu cầu booking", sentHint: "Partner sẽ xác nhận lịch. Sau khi xác nhận bạn có thể thanh toán trực tiếp cho Partner.", remaining: "còn chỗ", noSlot: "Ngày này chưa có khung giờ còn chỗ", package: "Gói giá", adults: "Người lớn", children: "Trẻ em", quote: "Giá dự kiến", group: "Theo nhóm", perPerson: "Theo người", guestCta: "Đăng nhập để gửi yêu cầu ›" },
  "en-US": { duration: "Duration", destination: "Destination", departure: "Departure point", guests: "Maximum guests", language: "Service language", includes: "Includes", excludes: "Excludes", start: "Start time", inquiry: "Book tour / experience", date: "Preferred date", time: "Available time", send: "Send booking request", sent: "Booking request sent", sentHint: "The Partner will confirm the schedule. Once confirmed you can pay the Partner directly.", remaining: "spots left", noSlot: "No available times for this date", package: "Package", adults: "Adults", children: "Children", quote: "Estimated price", group: "Per group", perPerson: "Per person", guestCta: "Sign in to send a booking request ›" },
  "zh-CN": { duration: "时长", destination: "目的地", departure: "出发地点", guests: "最多人数", language: "服务语言", includes: "费用包含", excludes: "费用不含", start: "出发时间", inquiry: "预约意向", date: "计划日期", time: "可预约时间", send: "发送给旅行服务商", sent: "已发送旅游预约", sentHint: "服务商确认后，您可直接向服务商付款。", remaining: "剩余名额", noSlot: "当天暂无可预约时间", package: "价格套餐", adults: "成人", children: "儿童", quote: "预计金额", group: "按团", perPerson: "按人", guestCta: "登录后发送预约 ›" },
  "zh-TW": { duration: "時長", destination: "目的地", departure: "出發地點", guests: "最多人數", language: "服務語言", includes: "費用包含", excludes: "費用不含", start: "出發時間", inquiry: "預約意向", date: "計畫日期", time: "可預約時間", send: "傳送給旅遊服務商", sent: "已傳送旅遊預約", sentHint: "服務商確認後，您可直接向服務商付款。", remaining: "剩餘名額", noSlot: "當天暫無可預約時間", package: "價格套餐", adults: "成人", children: "兒童", quote: "預計金額", group: "按團", perPerson: "按人", guestCta: "登入後發送預約 ›" },
} as const;

const shared = {
  "vi-VN": { name: "Họ tên", phone: "Số điện thoại đã xác minh", contactBy: "Ưu tiên liên hệ", phoneOpt: "Điện thoại", notes: "Nhu cầu bổ sung", requestCode: "Mã yêu cầu", track: "Theo dõi yêu cầu", needPhone: "Tài khoản cần số điện thoại đã xác minh. Vui lòng đăng nhập bằng OTP.", unavailable: "Dịch vụ này tạm thời không nhận yêu cầu mới", failed: "Không gửi được yêu cầu, vui lòng thử lại" },
  "en-US": { name: "Name", phone: "Verified phone", contactBy: "Preferred contact", phoneOpt: "Phone", notes: "Additional needs", requestCode: "Request code", track: "Track request", needPhone: "Your account needs a verified phone. Please sign in with OTP.", unavailable: "This service is not accepting new requests right now", failed: "Could not send the request, please try again" },
  "zh-CN": { name: "姓名", phone: "已验证手机号", contactBy: "优先联系方式", phoneOpt: "电话", notes: "补充需求", requestCode: "咨询编号", track: "跟进需求", needPhone: "账号需要已验证的手机号，请使用验证码登录。", unavailable: "该服务暂不接受新的需求", failed: "发送失败，请重试" },
  "zh-TW": { name: "姓名", phone: "已驗證手機號", contactBy: "優先聯絡方式", phoneOpt: "電話", notes: "補充需求", requestCode: "諮詢編號", track: "跟進需求", needPhone: "帳號需要已驗證的手機號，請使用驗證碼登入。", unavailable: "該服務暫不接受新的需求", failed: "傳送失敗，請重試" },
} as const;

type Contact = "phone" | "wechat" | "whatsapp";

const list = (value: unknown) => (Array.isArray(value) ? value.map(String) : String(value || "").split(/[,;\n]/).map((x) => x.trim()).filter(Boolean));

export function housingStatus(metadata: Record<string, unknown> = {}) {
  const status = String(metadata.housingAvailabilityStatus || "available");
  return (["available", "reserved", "rented"].includes(status) ? status : "available") as "available" | "reserved" | "rented";
}

/** Swipeable photo gallery (PWA `galleryUrls` strip). */
export function Gallery({ data }: { data: ServiceDetail }) {
  const m = data.metadata || {};
  const urls = [...new Set([str(m.imageUrl), ...(Array.isArray(m.galleryUrls) ? m.galleryUrls.map(String) : [])].filter(Boolean))].map((url) => imageUri(url)).filter((url): url is string => Boolean(url));
  const width = Dimensions.get("window").width;
  const [index, setIndex] = useState(0);
  if (urls.length < 2) return null;
  return (
    <View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / (width - 32)))} style={{ borderRadius: 18 }} snapToInterval={width - 32} decelerationRate="fast">
        {urls.map((url) => <AppImage key={url} uri={url} style={{ width: width - 32, height: (width - 32) / 1.4 }} />)}
      </ScrollView>
      <PhotoCounter index={index} total={urls.length} />
    </View>
  );
}

function Fact({ kind, icon, label, value }: { kind?: FactArtKind; icon?: string; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      {kind ? <FactArt kind={kind} size={40} /> : <Text style={{ fontSize: 18 }}>{icon}</Text>}
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function HousingFacts({ data }: { data: ServiceDetail }) {
  const { locale } = useI18n();
  const t = housingCopy[locale as Locale];
  const m = data.metadata || {};
  const furnished = str(m.furnished);
  const amenities = list(m.amenities);
  const status = housingStatus(m);
  const statusLabel = status === "reserved" ? t.statusReserved : status === "rented" ? t.statusRented : t.statusAvailable;
  // Only show the rows the Partner actually filled in; a wall of "not specified" reads as broken.
  const rows = [
    [t.furnished, furnished === "yes" ? t.yes : furnished === "partial" ? t.partial : furnished === "no" ? t.no : ""],
    [t.district, str(m.district)],
    [t.deposit, num(m.depositMonths) > 0 ? `${m.depositMonths} ${t.month}` : ""],
    [t.available, str(m.availableFrom)],
    [t.lease, num(m.minLeaseMonths) > 0 ? `${m.minLeaseMonths} ${t.month}` : ""],
  ].filter(([, value]) => value);
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 12 }}>
      <View style={[styles.statusBadge, status !== "available" && { backgroundColor: "#F1F5F9" }]}>
        <Text style={[styles.statusText, status !== "available" && { color: colors.slate }]}>{statusLabel}</Text>
      </View>
      <View style={styles.facts}>
        <Fact kind="bed" label={t.bed} value={num(m.bedrooms) > 0 ? String(m.bedrooms) : "—"} />
        <Fact kind="bath" label={t.bath} value={num(m.bathrooms) > 0 ? String(m.bathrooms) : "—"} />
        <Fact kind="area" label={t.area} value={num(m.areaSqm) > 0 ? `${m.areaSqm} m²` : "—"} />
      </View>
      {rows.length || str(m.propertyAddress) ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.property}</Text>
          {rows.map(([label, value]) => <Info key={label} label={label!} value={value!} />)}
          {str(m.propertyAddress) ? <Text style={styles.address}>📍 {str(m.propertyAddress)}</Text> : null}
        </View>
      ) : null}
      {amenities.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.amenities}</Text>
          <View style={styles.tags}>{amenities.map((item) => <View key={item} style={styles.tag}><Text style={styles.tagText}>{item}</Text></View>)}</View>
        </View>
      ) : null}
    </Animated.View>
  );
}

export function TravelFacts({ data }: { data: ServiceDetail }) {
  const { locale } = useI18n();
  const t = travelCopy[locale as Locale];
  const m = data.metadata || {};
  const includes = list(m.includes);
  const excludes = list(m.excludes);
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 12 }}>
      <View style={styles.facts}>
        <Fact icon="📍" label={t.destination} value={str(m.destination) || "—"} />
        <Fact icon="⏱" label={t.duration} value={str(m.duration) || "—"} />
        <Fact icon="👥" label={t.guests} value={str(m.maxGuests) || "—"} />
      </View>
      {str(m.departurePoint) || str(m.serviceLanguage) || str(m.startTimes || m.startTime) ? (
        <View style={styles.card}>
          {str(m.departurePoint) ? <Info label={t.departure} value={str(m.departurePoint)} /> : null}
          {str(m.serviceLanguage) ? <Info label={t.language} value={str(m.serviceLanguage)} /> : null}
          {str(m.startTimes || m.startTime) ? <Info label={t.start} value={str(m.startTimes || m.startTime)} /> : null}
        </View>
      ) : null}
      {includes.length ? <View style={styles.card}><Text style={styles.cardTitle}>✓ {t.includes}</Text><Text style={styles.listText}>{includes.join(" · ")}</Text></View> : null}
      {excludes.length ? <View style={styles.card}><Text style={styles.cardTitle}>✕ {t.excludes}</Text><Text style={styles.listText}>{excludes.join(" · ")}</Text></View> : null}
    </Animated.View>
  );
}

/** Contact fields shared by both forms: name, verified phone (read-only), preferred channel. */
function useContactForm() {
  const { userId } = useSession();
  const profile = useQuery({ queryKey: keys.profile(userId), queryFn: getProfile, enabled: Boolean(userId) });
  const [name, setName] = useState("");
  const [contact, setContact] = useState<Contact>("phone");
  const [handle, setHandle] = useState("");
  useEffect(() => {
    const user = profile.data?.user;
    if (user && !name) setName(str(user.displayName));
  }, [profile.data]);
  return { profile, name, setName, contact, setContact, handle, setHandle, phone: str(profile.data?.user?.phone) };
}

function ContactFields({ form }: { form: ReturnType<typeof useContactForm> }) {
  const { locale } = useI18n();
  const s = shared[locale as Locale];
  return (
    <>
      <Field label={s.name} value={form.name} onChangeText={form.setName} autoComplete="name" />
      <Field label={s.phone} value={form.phone || "—"} editable={false} style={{ color: colors.slate }} />
      <Text style={styles.label}>{s.contactBy}</Text>
      <OptionPills<Contact> value={form.contact} onChange={form.setContact} options={[{ value: "phone", label: s.phoneOpt }, { value: "wechat", label: "WeChat" }, { value: "whatsapp", label: "WhatsApp" }]} />
      {form.contact !== "phone" ? <Animated.View entering={FadeIn}><Field placeholder={form.contact === "wechat" ? "WeChat ID" : "WhatsApp"} value={form.handle} onChangeText={form.setHandle} autoCapitalize="none" /></Animated.View> : null}
    </>
  );
}

function GuestGate({ label }: { label: string }) {
  return (
    <PressableScale onPress={() => router.push("/login")} style={styles.guest}>
      <Text style={styles.guestText}>{label}</Text>
    </PressableScale>
  );
}

function SentCard({ title, hint, code, kind }: { title: string; hint: string; code: string; kind: "housing" | "travel" }) {
  const { locale } = useI18n();
  const s = shared[locale as Locale];
  return (
    <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.sent}>
      <View style={styles.sentIcon}><Text style={{ fontSize: 22, color: colors.white }}>✓</Text></View>
      <Text style={styles.sentTitle}>{title}</Text>
      <Text style={styles.sentHint}>{hint}</Text>
      {code ? <Text style={styles.sentCode}>{s.requestCode}: <Text style={{ fontWeight: "800", color: colors.ink }}>{code}</Text></Text> : null}
      <Button title={s.track} onPress={() => router.push(`/inquiries/${kind}`)} style={{ alignSelf: "stretch", marginTop: 6 }} />
    </Animated.View>
  );
}

function useErrorText() {
  const { locale } = useI18n();
  const s = shared[locale as Locale];
  return (error: unknown) => {
    const code = error instanceof ApiError ? error.code : "";
    if (code === "IDENTITY_UPGRADE_REQUIRED" || code === "VERIFIED_PHONE_REQUIRED") return s.needPhone;
    if (code.includes("UNAVAILABLE")) return s.unavailable;
    return s.failed;
  };
}

export function HousingInquiryForm({ data }: { data: ServiceDetail }) {
  const { locale } = useI18n();
  const t = housingCopy[locale as Locale];
  const s = shared[locale as Locale];
  const { guest } = useSession();
  const client = useQueryClient();
  const errorText = useErrorText();
  const contact = useContactForm();
  const m = data.metadata || {};
  const available = housingStatus(m) === "available" && m.isAvailable !== false;
  const days = useMemo(() => {
    const from = str(m.availableFrom);
    return nextDays(75).filter((day) => !from || day >= from).slice(0, 60);
  }, [m.availableFrom]);
  const [moveIn, setMoveIn] = useState("");
  const [months, setMonths] = useState(String(Math.max(num(m.minLeaseMonths), 6)));
  const [occupants, setOccupants] = useState(1);
  const [budget, setBudget] = useState(num(data.priceFrom) > 0 ? String(Math.round(num(data.priceFrom))) : "");
  const [notes, setNotes] = useState("");
  const mutation = useMutation({
    mutationFn: () => createHousingInquiry({
      serviceId: data.id, locale, customerName: contact.name.trim(), moveInDate: moveIn || days[0], leaseMonths: Number(months || 0), occupants, budget: Number(budget.replace(/\D/g, "") || 0),
      preferredContact: contact.contact, wechat: contact.contact === "wechat" ? contact.handle : "", whatsapp: contact.contact === "whatsapp" ? contact.handle : "", notes,
    }),
    onSuccess: () => { haptic.success(); void client.invalidateQueries({ queryKey: ["housing-inquiries"] }); },
    onError: (error) => { haptic.warn(); toast(errorText(error), "error"); },
  });
  if (!available) return <View style={styles.unavailable}><Text style={styles.unavailableText}>{t.unavailableHint}</Text></View>;
  if (mutation.data) return <SentCard title={t.sent} hint={t.sentHint} code={mutation.data.requestCode} kind="housing" />;
  const leaseOptions = [...new Set([num(m.minLeaseMonths), 3, 6, 12, 24].filter((value) => value > 0 && value >= num(m.minLeaseMonths)))].sort((a, b) => a - b);
  return (
    <View style={[styles.form, shadow("card")]}>
      <Text style={styles.formTitle}>{t.inquiry}</Text>
      {guest ? <GuestGate label={t.guestCta} /> : (
        <>
          <ContactFields form={contact} />
          <Text style={styles.label}>{t.moveIn}</Text>
          <DateStrip days={days} value={moveIn || days[0] || ""} onChange={setMoveIn} locale={locale} />
          <Text style={styles.label}>{t.months}</Text>
          <OptionPills value={months} onChange={setMonths} options={leaseOptions.map((value) => ({ value: String(value), label: `${value} ${t.month}` }))} />
          <View style={styles.stepRow}><Text style={styles.label}>{t.occupants}</Text><QuantityStepper value={occupants} onChange={setOccupants} min={1} max={12} /></View>
          <Field label={t.budget} value={budget} onChangeText={(value) => setBudget(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="8000000" />
          <Field label={s.notes} value={notes} onChangeText={setNotes} multiline maxLength={1000} />
          <Button title={t.send} loading={mutation.isPending} disabled={!contact.name.trim()} onPress={() => mutation.mutate()} />
        </>
      )}
    </View>
  );
}

export function TravelBookingForm({ data }: { data: ServiceDetail }) {
  const { locale } = useI18n();
  const t = travelCopy[locale as Locale];
  const s = shared[locale as Locale];
  const { guest } = useSession();
  const client = useQueryClient();
  const errorText = useErrorText();
  const contact = useContactForm();
  const m = data.metadata || {};
  const packages = (Array.isArray(m.travelPackages) ? m.travelPackages : []).filter((x): x is TravelPackage => Boolean(x) && typeof x === "object" && (x as TravelPackage).isEnabled !== false);
  const [packageId, setPackageId] = useState(packages[0]?.id || "");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const from = isoDay(new Date());
  const availability = useQuery({ queryKey: keys.travelAvailability(data.id, from), queryFn: () => getTravelAvailability(data.id, from), staleTime: 60_000 });
  const slots = availability.data?.slots || [];
  const guests = adults + children;
  const openDays = useMemo(() => new Set(slots.filter((slot) => slot.available && slot.remainingGuests >= guests).map((slot) => slot.date)), [slots, guests]);
  const days = useMemo(() => nextDays(30), []);
  // Same as the PWA: jump to the first bookable date and the first slot of that day.
  useEffect(() => { if ((!date || !openDays.has(date)) && openDays.size) setDate([...openDays].sort()[0] || ""); }, [openDays]);
  const daySlots = slots.filter((slot) => slot.date === date && slot.available && slot.remainingGuests >= guests);
  useEffect(() => {
    if (daySlots.length && !daySlots.some((slot) => slot.time === time)) setTime(daySlots[0]!.time);
    if (!daySlots.length && time) setTime("");
  }, [date, guests, slots]);
  const selected = packages.find((x) => x.id === packageId) || packages[0] || null;
  const quoted = selected
    ? Math.round((selected.pricingMode === "group" ? num(selected.groupPrice) : num(selected.adultPrice) * adults + num(selected.childPrice) * children) + num(selected.surchargePerBooking))
    : num(data.priceFrom) * guests;
  const maxGuests = selected?.maxGuests || num(m.maxGuests) || 20;
  const mutation = useMutation({
    mutationFn: () => createTravelInquiry({
      serviceId: data.id, locale, customerName: contact.name.trim(), visitDate: date, visitTime: time, guests, adults, children, packageId: selected?.id || "",
      preferredContact: contact.contact, wechat: contact.contact === "wechat" ? contact.handle : "", whatsapp: contact.contact === "whatsapp" ? contact.handle : "", notes,
    }),
    onSuccess: () => { haptic.success(); void client.invalidateQueries({ queryKey: ["travel-bookings"] }); },
    onError: (error) => { haptic.warn(); toast(errorText(error), "error"); },
  });
  if (mutation.data) return <SentCard title={t.sent} hint={t.sentHint} code={mutation.data.requestCode} kind="travel" />;
  return (
    <View style={[styles.form, shadow("card")]}>
      <Text style={styles.formTitle}>{t.inquiry}</Text>
      {packages.length ? (
        <>
          <Text style={styles.label}>{t.package}</Text>
          <OptionPills value={selected?.id || ""} onChange={setPackageId} options={packages.map((item) => ({ value: item.id, label: item.name, hint: item.pricingMode === "group" ? `${money(item.groupPrice)} · ${t.group}` : `${money(item.adultPrice)} · ${t.perPerson}` }))} />
        </>
      ) : null}
      <View style={styles.stepRow}><Text style={styles.label}>{t.adults}</Text><QuantityStepper value={adults} onChange={setAdults} min={1} max={Math.max(1, maxGuests - children)} /></View>
      <View style={styles.stepRow}><Text style={styles.label}>{t.children}</Text><QuantityStepper value={children} onChange={setChildren} min={0} max={Math.max(0, maxGuests - adults)} /></View>
      <Text style={styles.label}>{t.date}</Text>
      <DateStrip days={days} value={date} onChange={setDate} locale={locale} enabled={availability.isSuccess && slots.length ? openDays : undefined} />
      <Text style={styles.label}>{t.time}</Text>
      {daySlots.length ? (
        <OptionPills value={time} onChange={setTime} options={daySlots.map((slot) => ({ value: slot.time, label: slot.time, hint: `${slot.remainingGuests} ${t.remaining}` }))} />
      ) : <Text style={styles.noSlot}>{availability.isPending ? "…" : t.noSlot}</Text>}
      <View style={styles.quote}><Text style={styles.quoteLabel}>{t.quote}</Text><Text style={styles.quoteValue}>{money(quoted, data.currency)}</Text></View>
      {guest ? <GuestGate label={t.guestCta} /> : (
        <>
          <ContactFields form={contact} />
          <Field label={s.notes} value={notes} onChangeText={setNotes} multiline maxLength={1000} />
          <Button title={t.send} loading={mutation.isPending} disabled={!contact.name.trim() || !date || !time} onPress={() => mutation.mutate()} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  facts: { flexDirection: "row", gap: 8 },
  fact: { flex: 1, alignItems: "center", gap: 3, paddingTop: 10, paddingBottom: 12, paddingHorizontal: 6, borderRadius: 16, backgroundColor: colors.surfaceMuted, ...shadow("card") },
  factLabel: { fontSize: 10, color: colors.slate, fontWeight: "600" },
  factValue: { fontSize: 15, color: colors.ink, fontWeight: "800" },
  card: { padding: 16, borderRadius: 20, backgroundColor: colors.surfaceMuted, gap: 8, ...shadow("card") },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  infoLabel: { fontSize: 12.5, color: colors.slate },
  infoValue: { flexShrink: 1, fontSize: 12.5, color: colors.ink, fontWeight: "700", textAlign: "right" },
  address: { fontSize: 12.5, color: "#475569", lineHeight: 18, marginTop: 2 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  tagText: { fontSize: 11.5, color: "#334155", fontWeight: "600" },
  listText: { fontSize: 12.5, color: "#475569", lineHeight: 19 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.brandSoft },
  statusText: { fontSize: 11, fontWeight: "800", color: colors.brandStrong },
  form: { padding: 16, borderRadius: 22, backgroundColor: colors.white, gap: 12, ...shadow("card") },
  formTitle: { fontSize: 17, fontWeight: "800", color: colors.ink },
  label: { fontSize: 13, color: colors.ink, fontWeight: "600" },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  noSlot: { fontSize: 12, color: colors.warning, backgroundColor: colors.warningSoft, padding: 10, borderRadius: 12, overflow: "hidden" },
  quote: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 14, backgroundColor: colors.brandSoft },
  quoteLabel: { fontSize: 13, color: colors.brandStrong, fontWeight: "700" },
  quoteValue: { fontSize: 18, color: colors.priceRose, fontWeight: "800" },
  guest: { minHeight: 48, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandDeep },
  guestText: { color: colors.white, fontWeight: "800", fontSize: 14 },
  unavailable: { padding: 14, borderRadius: 16, backgroundColor: "#F1F5F9" },
  unavailableText: { fontSize: 13, color: colors.slate, textAlign: "center", fontWeight: "600" },
  sent: { alignItems: "center", gap: 8, padding: 20, borderRadius: 22, backgroundColor: colors.brandSoft, ...shadow("card") },
  sentIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.wechat, alignItems: "center", justifyContent: "center" },
  sentTitle: { fontSize: 17, fontWeight: "800", color: colors.brandStrong },
  sentHint: { fontSize: 12.5, color: "#3F6B57", textAlign: "center", lineHeight: 18 },
  sentCode: { fontSize: 12.5, color: colors.slate },
});
