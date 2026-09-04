"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import { useZhaoXiSession } from "@zhaoxi/auth";
import MiniTabBar from "../../_components/MiniTabBar";
import CrossModuleRecommendations from "../../_components/CrossModuleRecommendations";
import FavoriteServiceButton from "../../_components/FavoriteServiceButton";
import { CustomerServiceIcon } from "../../_components/CustomerServiceIcon";
import { getCached, setCached } from "../../_lib/client-cache";
type Listing = {
  id: string;
  code: string;
  moduleCode: string;
  name?: string;
  summary?: string;
  description?: string;
  priceFrom?: string | null;
  currency?: string;
  metadata?: Record<string, unknown>;
  organization?: {
    name?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  };
};
type Slot = {
  date: string;
  time: string;
  maxGuests: number;
  remainingGuests: number;
  available: boolean;
};
type Package = {
  id: string;
  name: string;
  pricingMode: "per_person" | "group";
  adultPrice: number;
  childPrice: number;
  groupPrice: number;
  surchargePerBooking: number;
  minGuests: number;
  maxGuests: number;
  isEnabled: boolean;
};
const C = {
  "zh-CN": {
    back: "旅游",
    from: "起",
    duration: "时长",
    destination: "目的地",
    departure: "出发地点",
    guests: "最多人数",
    language: "服务语言",
    includes: "费用包含",
    excludes: "费用不含",
    start: "出发时间",
    inquiry: "预约意向",
    name: "姓名",
    phone: "联系电话",
    date: "计划日期",
    time: "可预约时间",
    people: "人数",
    contact: "优先联系",
    note: "补充需求",
    send: "发送给旅行服务商",
    sent: "已发送旅游预约",
    phoneOpt: "电话",
    wechat: "微信",
    whatsapp: "WhatsApp",
    remaining: "剩余名额",
    noSlot: "当天暂无可预约时间",
    package: "价格套餐",
    adults: "成人",
    children: "儿童",
    quote: "预计金额",
  },
  "zh-TW": {
    back: "旅遊",
    from: "起",
    duration: "時長",
    destination: "目的地",
    departure: "出發地點",
    guests: "最多人數",
    language: "服務語言",
    includes: "費用包含",
    excludes: "費用不含",
    start: "出發時間",
    inquiry: "預約意向",
    name: "姓名",
    phone: "聯絡電話",
    date: "計畫日期",
    time: "可預約時間",
    people: "人數",
    contact: "優先聯絡",
    note: "補充需求",
    send: "傳送給旅遊服務商",
    sent: "已傳送旅遊預約",
    phoneOpt: "電話",
    wechat: "微信",
    whatsapp: "WhatsApp",
    remaining: "剩餘名額",
    noSlot: "當天暫無可預約時間",
    package: "價格套餐",
    adults: "成人",
    children: "兒童",
    quote: "預計金額",
  },
  "vi-VN": {
    back: "Du lịch",
    from: "từ",
    duration: "Thời lượng",
    destination: "Điểm đến",
    departure: "Điểm khởi hành",
    guests: "Số khách tối đa",
    language: "Ngôn ngữ phục vụ",
    includes: "Bao gồm",
    excludes: "Không bao gồm",
    start: "Giờ khởi hành",
    inquiry: "Đặt lịch tour / trải nghiệm",
    name: "Họ tên",
    phone: "Số điện thoại",
    date: "Ngày dự kiến",
    time: "Khung giờ còn chỗ",
    people: "Số khách",
    contact: "Ưu tiên liên hệ",
    note: "Nhu cầu bổ sung",
    send: "Gửi booking request",
    sent: "Đã gửi yêu cầu booking",
    phoneOpt: "Điện thoại",
    wechat: "WeChat",
    whatsapp: "WhatsApp",
    remaining: "còn chỗ",
    noSlot: "Ngày này chưa có khung giờ còn chỗ",
    package: "Gói giá",
    adults: "Người lớn",
    children: "Trẻ em",
    quote: "Giá dự kiến",
  },
  "en-US": {
    back: "Travel",
    from: "from",
    duration: "Duration",
    destination: "Destination",
    departure: "Departure point",
    guests: "Maximum guests",
    language: "Service language",
    includes: "Includes",
    excludes: "Excludes",
    start: "Start time",
    inquiry: "Book tour / experience",
    name: "Name",
    phone: "Phone",
    date: "Preferred date",
    time: "Available time",
    people: "Guests",
    contact: "Preferred contact",
    note: "Additional needs",
    send: "Send booking request",
    sent: "Booking request sent",
    phoneOpt: "Phone",
    wechat: "WeChat",
    whatsapp: "WhatsApp",
    remaining: "spots left",
    noSlot: "No available times for this date",
    package: "Package",
    adults: "Adults",
    children: "Children",
    quote: "Estimated price",
  },
} as const;
const guestCta = { "zh-CN": "登录后发送预约 ›", "zh-TW": "登入後發送預約 ›", "vi-VN": "Đăng nhập để gửi yêu cầu ›", "en-US": "Sign in to send a booking request ›" } as const;
const money = (v: number, c = "VND") =>
  `${Math.round(v).toLocaleString("vi-VN")} ${c}`;
export default function TravelExperienceDetail({ id }: { id: string }) {
  const router = useRouter();
  const session = useZhaoXiSession();
  const isGuest = !session || session.authMethod === "guest";
  useEffect(() => {
    if (id)
      fetch(`/api/customer-discovery/views/${id}`, { method: "POST" }).catch(
        () => {},
      );
  }, [id]);
  const { locale } = useZhaoXiLocale(),
    t = C[locale];
  const cacheKey = `travel_exp_${id}_${locale}`;
  const initialData = getCached<Listing>(cacheKey);
  const [data, setData] = useState<Listing | null>(() => initialData),
    [sent, setSent] = useState(false),
    [slots, setSlots] = useState<Slot[]>([]),
    [form, setForm] = useState({
      customerName: "",
      customerPhone: "",
      visitDate: "",
      visitTime: "",
      guests: "1",
      adults: "1",
      children: "0",
      packageId: "",
      preferredContact: "phone",
      wechat: "",
      whatsapp: "",
      notes: "",
    });
  useEffect(() => {
    fetch(`/api/platform-services/${id}?locale=${locale}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((j) => {
        if (j?.data) {
          setData(j.data);
          setCached(cacheKey, j.data);
        }
      });
  }, [cacheKey, id, locale]);
  useEffect(() => {
    fetch("/api/customer-profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok || !j.data) return;
        setForm((v) => ({
          ...v,
          customerName: j.data.user?.displayName || v.customerName,
          customerPhone: j.data.user?.phone || v.customerPhone,
        }));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!id) return;
    const from = form.visitDate || new Date().toISOString().slice(0, 10);
    fetch(
      `/api/travel-availability?serviceId=${encodeURIComponent(id)}&from=${encodeURIComponent(from)}&days=30`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((j) => setSlots(Array.isArray(j?.data?.slots) ? j.data.slots : []))
      .catch(() => setSlots([]));
  }, [id, form.visitDate]);
  const daySlots = useMemo(
    () =>
      slots.filter(
        (x) =>
          x.date === form.visitDate &&
          x.available &&
          x.remainingGuests >= Number(form.guests || 1),
      ),
    [slots, form.visitDate, form.guests],
  );
  useEffect(() => {
    if (
      form.visitDate &&
      daySlots.length &&
      !daySlots.some((x) => x.time === form.visitTime)
    )
      setForm((v) => ({ ...v, visitTime: daySlots[0].time }));
    if (form.visitDate && !daySlots.length && form.visitTime)
      setForm((v) => ({ ...v, visitTime: "" }));
  }, [form.visitDate, form.visitTime, daySlots]);
  async function submit() {
    if (
      !data ||
      !form.customerName.trim() ||
      !form.customerPhone.trim() ||
      !form.visitDate ||
      !form.visitTime
    )
      return;
    const { customerPhone: verifiedPhone, ...transactionForm } = form;
    void verifiedPhone;
    const r = await fetch("/api/travel-inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        serviceId: data.id,
        locale,
        ...transactionForm,
        guests: guestCount,
        adults: adultCount,
        children: childCount,
        packageId: selected?.id || "",
      }),
    });
    if (r.ok) {
      const j = await r.json().catch(() => null);
      setSent(true);
      try {
        const code = String(j?.data?.requestCode || "");
        if (code) {
          const current = JSON.parse(
            localStorage.getItem("zhaoxi-request-codes") || "[]",
          ) as string[];
          localStorage.setItem(
            "zhaoxi-request-codes",
            JSON.stringify(Array.from(new Set([...current, code])).slice(-100)),
          );
        }
      } catch {}
    }
  }
  if (!data) return <main style={shell}>…</main>;
  const m = data.metadata || {},
    packages = Array.isArray(m.travelPackages)
      ? (m.travelPackages.filter(
          (x) => x && typeof x === "object" && (x as any).isEnabled !== false,
        ) as Package[])
      : [],
    selected =
      packages.find((x) => x.id === form.packageId) || packages[0] || null,
    adultCount = Math.max(1, Number(form.adults || 1)),
    childCount = Math.max(0, Number(form.children || 0)),
    guestCount = adultCount + childCount,
    quoted = selected
      ? Math.round(
          (selected.pricingMode === "group"
            ? Number(selected.groupPrice || 0)
            : Number(selected.adultPrice || 0) * adultCount +
              Number(selected.childPrice || 0) * childCount) +
            Number(selected.surchargePerBooking || 0),
        )
      : Number(data.priceFrom || 0) * guestCount,
    gallery = [
      ...new Set(
        [
          String(m.imageUrl || ""),
          ...(Array.isArray(m.galleryUrls) ? m.galleryUrls.map(String) : []),
        ].filter(Boolean),
      ),
    ];
  const list = (v: unknown) =>
    Array.isArray(v)
      ? v.map(String)
      : String(v || "")
          .split(/[,;\n]/)
          .map((x) => x.trim())
          .filter(Boolean);
  return (
    <main style={shell}>
      <header style={{...top, alignItems: "center"}}>
        <Link href="/du-lich" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:12,background:"#FFF",border:"1px solid #E2E8F0",textDecoration:"none",color:"#1E293B",fontSize:20,lineHeight:1,boxShadow:"none"}}>‹</Link>
        <b><CustomerServiceIcon serviceId="travel" size={40} /></b>
      </header>
      <section
        style={{
          display: "flex",
          overflowX: "auto",
          gap: 7,
          padding: 10,
          scrollSnapType: "x mandatory",
        }}
      >
        {gallery.length ? (
          gallery.map((x, i) => (
            <img
              key={x + i}
              src={x}
              alt=""
              style={{
                flex: "0 0 88%",
                aspectRatio: "1.4",
                objectFit: "cover",
                borderRadius: 18,
                scrollSnapAlign: "center",
              }}
            />
          ))
        ) : (
          <div
            style={{
              height: 220,
              width: "100%",
              display: "grid",
              placeItems: "center",
              fontSize: 50,
            }}
          >
            <CustomerServiceIcon serviceId="travel" size={56} />
          </div>
        )}
      </section>
      <section style={{ maxWidth: 720, margin: "0 auto", padding: 12 }}>
        <h1 style={{ margin: "0 0 5px", fontSize: 22 }}>
          {data.name || data.code}
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: 10 }}>
          {data.summary}
        </p>
        <strong style={{ display: "block", marginTop: 9, color: "#ef5a3c" }}>
          {t.from} {money(Number(data.priceFrom || 0), data.currency)}
        </strong>
        <section style={card}>
          <I l={t.destination} v={String(m.destination || "—")} />
          <I l={t.duration} v={String(m.duration || "—")} />
          <I l={t.departure} v={String(m.departurePoint || "—")} />
          <I l={t.guests} v={String(m.maxGuests || "—")} />
          <I l={t.language} v={String(m.serviceLanguage || "—")} />
          <I l={t.start} v={String(m.startTimes || m.startTime || "—")} />
          {data.description && (
            <p style={{ fontSize: 10, lineHeight: 1.6 }}>{data.description}</p>
          )}
        </section>
        {list(m.includes).length > 0 && (
          <section style={card}>
            <b style={{ fontSize: 11 }}>{t.includes}</b>
            <p style={{ fontSize: 9 }}>{list(m.includes).join(" · ")}</p>
          </section>
        )}
        {list(m.excludes).length > 0 && (
          <section style={card}>
            <b style={{ fontSize: 11 }}>{t.excludes}</b>
            <p style={{ fontSize: 9 }}>{list(m.excludes).join(" · ")}</p>
          </section>
        )}
        <section style={card}>
          <b style={{ fontSize: 11 }}>{t.inquiry}</b>
          {sent ? (
            <p
              style={{
                padding: 10,
                borderRadius: 10,
                background: "#ecfdf5",
                color: "#067647",
              }}
            >
              ✓ {t.sent}
            </p>
          ) : (
            <div style={grid}>
              <F l={t.name}>
                <input
                  value={form.customerName}
                  onChange={(e) =>
                    setForm({ ...form, customerName: e.target.value })
                  }
                />
              </F>
              <F l={t.phone}>
                <input
                  value={form.customerPhone}
                  inputMode="tel"
                  readOnly
                  aria-readonly="true"
                />
              </F>
              <F l={t.date}>
                <input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.visitDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      visitDate: e.target.value,
                      visitTime: "",
                    })
                  }
                />
              </F>
              <F l={t.package}>
                <select
                  value={selected?.id || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      packageId: e.target.value,
                      visitTime: "",
                    })
                  }
                >
                  {packages.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </F>
              <F l={t.adults}>
                <input
                  type="number"
                  min={1}
                  max={Number(selected?.maxGuests || m.maxGuests || 50)}
                  value={form.adults}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      adults: e.target.value,
                      guests: String(
                        Number(e.target.value || 1) +
                          Number(form.children || 0),
                      ),
                      visitTime: "",
                    })
                  }
                />
              </F>
              <F l={t.children}>
                <input
                  type="number"
                  min={0}
                  max={Number(selected?.maxGuests || m.maxGuests || 50)}
                  value={form.children}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      children: e.target.value,
                      guests: String(
                        Number(form.adults || 1) + Number(e.target.value || 0),
                      ),
                      visitTime: "",
                    })
                  }
                />
              </F>
              <div
                style={{
                  alignSelf: "end",
                  padding: 8,
                  borderRadius: 9,
                  background: "#fff7ed",
                  fontSize: 9,
                }}
              >
                {t.quote}: <b>{money(quoted, data.currency)}</b>
              </div>
              <label style={{ ...field, gridColumn: "1/-1" }}>
                {t.time}
                {form.visitDate && daySlots.length ? (
                  <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                    {daySlots.map((s) => (
                      <button
                        type="button"
                        key={s.time}
                        onClick={() => setForm({ ...form, visitTime: s.time })}
                        style={{
                          border: "1px solid #dbe5df",
                          borderRadius: 999,
                          padding: "7px 9px",
                          background:
                            form.visitTime === s.time ? "#07c160" : "#fff",
                          color: form.visitTime === s.time ? "#fff" : "#475569",
                          fontSize: 8,
                          fontWeight: 850,
                        }}
                      >
                        {s.time} · {s.remainingGuests} {t.remaining}
                      </button>
                    ))}
                  </div>
                ) : form.visitDate ? (
                  <small style={{ color: "#b42318" }}>{t.noSlot}</small>
                ) : null}
              </label>
              <F l={t.contact}>
                <select
                  value={form.preferredContact}
                  onChange={(e) =>
                    setForm({ ...form, preferredContact: e.target.value })
                  }
                >
                  <option value="phone">{t.phoneOpt}</option>
                  <option value="wechat">{t.wechat}</option>
                  <option value="whatsapp">{t.whatsapp}</option>
                </select>
              </F>
              {form.preferredContact === "wechat" && (
                <F l={t.wechat}>
                  <input
                    value={form.wechat}
                    onChange={(e) =>
                      setForm({ ...form, wechat: e.target.value })
                    }
                  />
                </F>
              )}
              {form.preferredContact === "whatsapp" && (
                <F l={t.whatsapp}>
                  <input
                    value={form.whatsapp}
                    onChange={(e) =>
                      setForm({ ...form, whatsapp: e.target.value })
                    }
                  />
                </F>
              )}
              <label style={{ ...field, gridColumn: "1/-1" }}>
                {t.note}
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
              {isGuest ? (
                <button
                  type="button"
                  onClick={() => router.push(`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/travel")}`)}
                  style={send}
                >
                  {guestCta[locale]}
                </button>
              ) : (
                <button
                  disabled={!form.visitTime}
                  onClick={() => void submit()}
                  style={send}
                >
                  {t.send}
                </button>
              )}
            </div>
          )}
        </section>
      </section>
      <div
        style={{ display: "flex", justifyContent: "flex-end", margin: "8px 0" }}
      >
        <FavoriteServiceButton serviceId={id} />
      </div>
      <CrossModuleRecommendations serviceId={id} />
      <MiniTabBar />
    </main>
  );
}
function I({ l, v }: { l: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        padding: "7px 0",
        borderBottom: "1px solid #edf1ef",
        fontSize: 9,
      }}
    >
      <span style={{ color: "#64748b" }}>{l}</span>
      <b>{v}</b>
    </div>
  );
}
function F({ l, children }: { l: string; children: ReactNode }) {
  return (
    <label style={field}>
      {l}
      {children}
    </label>
  );
}
const shell = {
    minHeight: "100vh",
    background: "var(--zx-bg)",
    color: "var(--zx-text)",
    paddingBottom: "calc(66px + env(safe-area-inset-bottom))",
    fontFamily: "Inter,Arial,sans-serif",
  } as const,
  top = {
    position: "sticky",
    top: 0,
    zIndex: 10,
    padding: "10px 14px",
    display: "flex",
    justifyContent: "space-between",
    background: "var(--zx-header-bg)",
    borderBottom: "1px solid var(--zx-border)",
  } as const,
  card = {
    marginTop: 10,
    padding: 11,
    border: "1px solid var(--zx-border)",
    borderRadius: 12,
    background: "var(--zx-surface)",
  } as const,
  grid = {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 7,
    marginTop: 8,
  } as const,
  field = { display: "grid", gap: 4, fontSize: 8, color: "var(--zx-text-secondary)" } as const,
  send = {
    gridColumn: "1/-1",
    border: 0,
    borderRadius: 11,
    padding: 10,
    background: "var(--zx-brand)",
    color: "#fff",
    fontWeight: 900,
  } as const;
