"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createZhaoXiSdk, type ServiceRequestRow } from "@zhaoxi/sdk";
import { localizeOrganizationName, statusLabels, useZhaoXiLocale } from "@zhaoxi/i18n";
import { ActionButton, EmptyState, MetricCard, StatusBadge, Surface } from "@zhaoxi/ui";
import { paymentMethodLabel, paymentStatusLabel } from "@zhaoxi/payment";
import { LiveDeliveryPanel } from "@zhaoxi/driver";
import { getCached, setCached } from "./_lib/client-cache";

const sdk = createZhaoXiSdk();
const copy = {
  "zh-CN": { title: "平台交易监管", subtitle: "管理员只监管客户与商家之间的服务交易。", total: "总交易", waiting: "等待商家", active: "处理中", done: "已完成", exceptions: "异常", search: "搜索订单、客户、服务或商家", all: "全部状态", allModules: "全部服务类型", refresh: "刷新", empty: "暂无交易", slow: "笔交易超时未接单", slowHint: "商家超过10分钟仍未响应。", cancel: "管理员取消", noPartner: "未关联商家", noAddress: "暂无地址", quantity: "数量", delivery: "配送费", totalAmount: "订单总额", transactions: "笔交易", expand: "展开", collapse: "收起", other: "其他服务" },
  "zh-TW": { title: "平台交易監管", subtitle: "管理員只監管客戶與商家之間的服務交易。", total: "總交易", waiting: "等待商家", active: "處理中", done: "已完成", exceptions: "異常", search: "搜尋訂單、客戶、服務或商家", all: "全部狀態", allModules: "全部服務類型", refresh: "重新整理", empty: "暫無交易", slow: "筆交易逾時未接單", slowHint: "商家超過10分鐘仍未回應。", cancel: "管理員取消", noPartner: "未關聯商家", noAddress: "暫無地址", quantity: "數量", delivery: "配送費", totalAmount: "訂單總額", transactions: "筆交易", expand: "展開", collapse: "收起", other: "其他服務" },
  "vi-VN": { title: "Giám sát giao dịch dịch vụ", subtitle: "Admin chỉ giám sát giao dịch giữa Customer và Partner, không phân công đơn thông thường.", total: "Tổng giao dịch", waiting: "Chờ Partner", active: "Đang xử lý", done: "Hoàn thành", exceptions: "Bất thường", search: "Tìm mã đơn, khách hàng, dịch vụ hoặc đối tác", all: "Tất cả trạng thái", allModules: "Tất cả mảng dịch vụ", refresh: "Làm mới", empty: "Chưa có giao dịch", slow: "giao dịch quá hạn tiếp nhận", slowHint: "Partner chưa phản hồi sau hơn 10 phút.", cancel: "Admin hủy", noPartner: "Chưa liên kết Partner", noAddress: "Chưa có địa chỉ", quantity: "Số lượng", delivery: "Phí giao hàng", totalAmount: "Tổng đơn", transactions: "giao dịch", expand: "Mở danh sách", collapse: "Thu gọn", other: "Dịch vụ khác" },
  "en-US": { title: "Service transaction oversight", subtitle: "Admin monitors transactions between customers and partners without routine dispatching.", total: "Total", waiting: "Waiting for partner", active: "In progress", done: "Completed", exceptions: "Exceptions", search: "Search code, customer, service or partner", all: "All statuses", allModules: "All service areas", refresh: "Refresh", empty: "No transactions", slow: "overdue transactions", slowHint: "Partner has not responded for more than 10 minutes.", cancel: "Admin cancel", noPartner: "No partner linked", noAddress: "No address", quantity: "Quantity", delivery: "Delivery fee", totalAmount: "Order total", transactions: "transactions", expand: "Expand", collapse: "Collapse", other: "Other services" },
} as const;

type Alert = { id: string; requestCode: string; status: string; customerName: string; title: string; createdAt: string };

function moduleKey(row: ServiceRequestRow) {
  const detailsCode = typeof row.details?.moduleCode === "string" ? row.details.moduleCode : "";
  return detailsCode || row.moduleName || "other";
}

export default function OperationsBoard() {
  const { locale } = useZhaoXiLocale();
  const t = copy[locale];
  const [statusFilter, setStatusFilter] = useState("all");
  const cacheKeyRows = `admin_ops_rows_${locale}_${statusFilter}`;
  const cacheKeyAlerts = `admin_ops_alerts_${locale}`;
  const [rows, setRows] = useState<ServiceRequestRow[]>(() => getCached<ServiceRequestRow[]>(cacheKeyRows) || []);
  const [alerts, setAlerts] = useState<Alert[]>(() => getCached<Alert[]>(cacheKeyAlerts) || []);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<string>("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = { scope: "operations", locale };
      if (statusFilter !== "all") params.status = statusFilter;
      const [requests, notifications] = await Promise.all([
        sdk.listRequests(params),
        sdk.listNotifications({ audience: "admin", locale }),
      ]);
      const nextRows = requests.data || [];
      const nextAlerts = notifications.alerts || [];
      setRows(nextRows);
      setAlerts(nextAlerts);
      setCached(cacheKeyRows, nextRows);
      setCached(cacheKeyAlerts, nextAlerts);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Load failed");
    }
  }, [statusFilter, locale, cacheKeyRows, cacheKeyAlerts]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, [load]);

  const searched = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const byText = normalized
      ? rows.filter((row) => [row.requestCode, row.customerName, row.customerPhone, row.serviceName, row.title, row.organizationName, row.moduleName].some((value) => value?.toLowerCase().includes(normalized)))
      : rows;
    return moduleFilter === "all" ? byText : byText.filter((row) => moduleKey(row) === moduleFilter);
  }, [rows, query, moduleFilter]);

  const groups = useMemo(() => {
    const result = new Map<string, ServiceRequestRow[]>();
    for (const row of searched) {
      const key = moduleKey(row);
      result.set(key, [...(result.get(key) || []), row]);
    }
    return [...result.entries()].sort((left, right) => right[1].length - left[1].length);
  }, [searched]);

  const moduleOptions = useMemo(() => {
    const result = new Map<string, string>();
    for (const row of rows) result.set(moduleKey(row), row.moduleName || moduleKey(row));
    return [...result.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [rows]);

  useEffect(() => {
    if (groups.length && !groups.some(([key]) => key === openGroup)) setOpenGroup(groups[0][0]);
    if (!groups.length) setOpenGroup("");
  }, [groups, openGroup]);

  const metrics = useMemo(() => ({
    total: rows.length,
    waiting: rows.filter((row) => row.status === "assigned").length,
    active: rows.filter((row) => ["accepted", "in_progress", "waiting_customer"].includes(row.status)).length,
    done: rows.filter((row) => row.status === "completed").length,
    exceptions: rows.filter((row) => ["rejected", "cancelled", "new", "reviewing"].includes(row.status) || !row.organizationName).length,
  }), [rows]);

  async function cancel(id: string) {
    setBusy(id);
    try {
      await sdk.updateStatus(id, "cancelled", t.cancel);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Update failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <section>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap", marginBottom: 18 }}>
        <div><h1 style={{ margin: "0 0 6px" }}>{t.title}</h1><p style={{ margin: 0, color: "#64748b" }}>{t.subtitle}</p></div>
      </header>

      {alerts.length > 0 && <Surface style={{ background: "#fff7ed", borderColor: "#fed7aa", marginBottom: 16 }}><b style={{ color: "#c2410c" }}>⚠ {alerts.length} {t.slow}</b><p style={{ color: "#9a3412" }}>{t.slowHint}</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{alerts.slice(0, 8).map((alert) => <button key={alert.id} onClick={() => setQuery(alert.requestCode)} style={{ border: "1px solid #fdba74", background: "#fff", padding: "7px 10px", borderRadius: 999 }}>{alert.requestCode}</button>)}</div></Surface>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 18 }}><MetricCard label={t.total} value={metrics.total} /><MetricCard label={t.waiting} value={metrics.waiting} /><MetricCard label={t.active} value={metrics.active} /><MetricCard label={t.done} value={metrics.done} /><MetricCard label={t.exceptions} value={metrics.exceptions} /></div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} style={{ flex: "1 1 300px", padding: 12, borderRadius: 12, border: "1px solid #dbe3df" }} />
        <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #dbe3df" }}><option value="all">{t.allModules}</option>{moduleOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #dbe3df" }}><option value="all">{t.all}</option>{Object.keys(statusLabels[locale]).map((status) => <option key={status} value={status}>{statusLabels[locale][status]}</option>)}</select>
        <ActionButton tone="neutral" onClick={load}>{t.refresh}</ActionButton>
      </div>

      {error && <p style={{ background: "#fff1f2", color: "#be123c", padding: 12, borderRadius: 12 }}>{error}</p>}
      {!searched.length ? <EmptyState title={t.empty} /> : <div style={{ display: "grid", gap: 12 }}>
        {groups.map(([key, groupRows]) => {
          const label = groupRows[0]?.moduleName || (key === "other" ? t.other : key);
          const isOpen = openGroup === key;
          const activeCount = groupRows.filter((row) => !["completed", "cancelled", "rejected"].includes(row.status)).length;
          return (
            <section key={key} style={{ border: "1px solid #dfe7e3", borderRadius: 18, overflow: "hidden", background: "#fff" }}>
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? "" : key)}
                style={{ width: "100%", border: 0, background: isOpen ? "#eefbf4" : "#fff", padding: "15px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}
              >
                <span><b style={{ fontSize: 17 }}>{label}</b><small style={{ display: "block", color: "#64748b", marginTop: 4 }}>{groupRows.length} {t.transactions} · {activeCount} {t.active.toLowerCase()}</small></span>
                <span style={{ color: "#087a42", fontWeight: 800 }}>{isOpen ? `− ${t.collapse}` : `＋ ${t.expand}`}</span>
              </button>
              {isOpen && <div style={{ display: "grid", gap: 10, padding: 12, background: "#f8faf9" }}>
                {groupRows.map((row) => <Surface key={row.id}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><b>{row.requestCode}</b><StatusBadge tone={["rejected", "cancelled"].includes(row.status) ? "orange" : "green"}>{statusLabels[locale][row.status] || row.status}</StatusBadge></div><h3>{row.serviceName || row.title}</h3><p>{row.customerName} · {row.customerPhone}</p><p style={{ color: "#64748b" }}>{row.addressText || t.noAddress}</p><p><b>{localizeOrganizationName(locale, row.organizationCode, row.organizationName) || t.noPartner}</b></p>{row.details && <p style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "#475569" }}><span>{t.quantity}: <b>{String(row.details.quantity || 1)}</b></span>{row.details.deliveryFee != null && <span>{t.delivery}: <b>{Number(row.details.deliveryFee).toLocaleString("vi-VN")} VND</b></span>}{row.details.totalAmount != null && <span>{t.totalAmount}: <b style={{ color: "#07a856" }}>{Number(row.details.totalAmount).toLocaleString("vi-VN")} VND</b></span>}{Boolean(row.details.paymentStatus) && <span>💳 <b>{paymentMethodLabel(String(row.details.paymentMethod || "cash_on_delivery"), locale)}</b> · {paymentStatusLabel(String(row.details.paymentStatus), locale)}</span>}</p>}{Boolean(row.details?.deliveryJobId)&&<LiveDeliveryPanel requestId={row.id} locale={locale} compact/>}{!["completed", "cancelled", "rejected"].includes(row.status) && <ActionButton tone="danger" disabled={busy === row.id} onClick={() => cancel(row.id)}>{t.cancel}</ActionButton>}</Surface>)}
              </div>}
            </section>
          );
        })}
      </div>}
    </section>
  );
}
