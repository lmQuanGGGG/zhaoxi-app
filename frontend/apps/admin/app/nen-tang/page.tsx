"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./platform.module.css";
import { ensureLegacyDemoState } from "../demoState";

type Section = "overview" | "restaurants" | "customers";
type Language = "vi" | "en" | "zh";
type Theme = "light" | "dark";
type PeriodFilter = "all" | "today" | "week" | "month";
type StatusFilter = "all" | RestaurantOrder["status"];
type CustomerSegment = "all" | "new" | "returning" | "loyal";
type Dish = { id: string; name: string; price: number; available: boolean; image?: string };
type RestaurantProfile = { id: string; name: string; icon?: string; address: string; phone: string; wechatId: string; voucher: string; openTime: string; closeTime: string; receivingOrders: boolean; refusals: number; dishes: Dish[]; menuPublishedAt?: string };
type RestaurantOrder = { id: string; restaurantId: string; customer: string; customerWechatId?: string; customerPhone?: string; deliveryAddress: string; items: Array<{ name: string; quantity: number; price: number }>; status: "new" | "accepted" | "ready" | "handed_to_grab" | "refused"; createdAt: string; createdTimestamp?: string; prepMinutes?: number; estimatedReadyAt?: string; readyAt?: string; handedToGrabAt?: string; deliveryDistanceKm?: number; deliveryFee?: number };
type CustomerRecord = { id: string; key: string; wechatName: string; wechatId: string; phone: string; address: string; phones: Set<string>; addresses: Set<string>; totalOrders: number; todayOrders: number; weekOrders: number; monthOrders: number; totalValue: number; lastOrder: RestaurantOrder; restaurantNames: Set<string>; restaurantIds: Set<string> };

const PROFILE_KEY = "kuai-dao-restaurant-profiles-v1";
const ORDER_KEY = "kuai-dao-restaurant-orders-v1";
const SETTINGS_KEY = "kuai-dao-platform-settings-v1";
const PLATFORM_WECHAT_ID_KEY = "kuai-dao-platform-wechat-id-v1";
const ISSUER_CODE = "KD-PUB-DN-001";

const translations = {
  vi: {
    appSubtitle: "Ứng dụng quản lý Nền tảng", customerNav: "Khách hàng", restaurantNav: "Nhà hàng", settings: "Cài đặt", theme: "Giao diện", light: "Sáng", dark: "Tối", language: "Ngôn ngữ", done: "Hoàn tất", close: "Đóng",
    heroTitle: "Quản lý Nền tảng", heroBody: "Theo dõi người đặt, đơn hàng và hoạt động của từng nhà hàng trên một màn hình riêng dành cho người phát hành.", issuer: "Mã phát hành", noFees: "Tổng giá trị gồm tiền món và phí giao: 15.000đ/2 km đầu + 8.000đ/km tiếp theo.",
    period: "Khoảng thời gian", orderStatus: "Trạng thái đơn", restaurant: "Nhà hàng", export: "Xuất báo cáo Excel", allRestaurants: "Tất cả nhà hàng",
    periods: { all: "Toàn bộ thời gian", today: "Hôm nay", week: "Tuần này", month: "Tháng này" },
    statuses: { all: "Tất cả trạng thái", new: "Đơn mới", accepted: "Đang chuẩn bị", ready: "Món đã xong", handed_to_grab: "Đã giao Grab", refused: "Đã từ chối" },
    hubKicker: "TRUNG TÂM QUẢN LÝ CHUNG", choose: "Chọn mục để xem chi tiết", viewing: "Đang xem", dataAuto: "Dữ liệu tự cập nhật theo bộ lọc", orders: "đơn", restaurants: "nhà hàng", customers: "khách", overview: "Tổng quan",
    customerInFilter: "Khách hàng trong bộ lọc", returningCustomers: "khách đã quay lại", totalOrderValue: "Tổng giá trị đơn", itemPriceOnly: "Tiền món + phí giao", ordersInFilter: "Đơn trong bộ lọc", restaurantsWithOrders: "Nhà hàng có đơn", totalRestaurants: "Trên tổng số",
    searchRestaurant: "Tìm nhà hàng, mã đơn, khách hoặc món ăn…", searchCustomer: "Tìm tên WeChat, mã khách, SĐT hoặc địa chỉ…", searchAction: "Tìm kiếm", clearSearch: "Xóa tìm kiếm", customerGroup: "Phân nhóm khách", allCustomers: "Tất cả khách", newCustomerOption: "Khách mới · 1 đơn", returningOption: "Quay lại · 2–4 đơn", loyalOption: "Thân thiết · từ 5 đơn",
    detailByRestaurant: "CHI TIẾT THEO NHÀ HÀNG", whereOrders: "Đơn phát sinh từ đâu?", noOrders: "Chưa có đơn hàng nào được ghi nhận.", recentOrder: "Đơn gần nhất", orderCount: "Số đơn", customerOrders: "Khách đặt", dailyPulse: "NHỊP ĐƠN HÔM NAY", todayStatus: "Tình hình trong ngày", todayCustomers: "Khách đặt hôm nay", todayRestaurants: "Nhà hàng có đơn hôm nay", todayValue: "Giá trị đơn hôm nay", waitingOrders: "Đơn đang chờ nhà hàng",
    partnerOrders: "ĐƠN THEO TỪNG ĐỐI TÁC", restaurantDetails: "Nhà hàng và chi tiết đơn", noProfileAddress: "Chưa có địa chỉ hồ sơ", openList: "Bấm để xem danh sách đơn", closeList: "Đóng danh sách đơn", order: "Đơn", customer: "Khách", value: "Giá trị", receivingStatus: "Trạng thái nhận đơn", accepting: "Đang nhận đơn", paused: "Tạm khóa", reopen: "Mở lại nhận đơn", lockOrders: "Khóa nhận đơn", allowOrders: "Cho nhận đơn", orderList: "Danh sách đơn của", currentFilterOrders: "đơn trong bộ lọc", noPhone: "Không có SĐT", day: "Ngày", at: "Lúc", noFilteredOrders: "Nhà hàng này chưa phát sinh đơn trong bộ lọc hiện tại.", noRestaurantMatch: "Không tìm thấy nhà hàng hoặc đơn phù hợp.",
    privateInfo: "THÔNG TIN BẢO MẬT · CHỈ NỀN TẢNG", customersOrdered: "Khách hàng đã đặt đơn", wechatCustomerId: "WeChat / Mã khách", wechatIdLabel: "WeChat ID", customerCode: "Mã khách", contact: "SĐT nhận đơn", latestAddress: "Địa chỉ từng giao", shippingHistory: "Các địa chỉ đã từng ship", contactCustomer: "Liên hệ khách hàng", contactTitle: "Liên hệ với khách hàng", contactHint: "Chọn nhắn tin WeChat hoặc gọi số điện thoại nhận đơn.", messageWechat: "Nhắn tin WeChat", callCustomer: "Gọi điện thoại", wechatNotConnected: "Chưa có WeChat ID thật", unavailableContact: "Chưa có thông tin liên hệ", periodTotals: "Ngày / Tuần / Tháng / Tổng", totalValue: "Tổng giá trị", noProvidedPhone: "Không cung cấp", latestOrder: "Đặt gần nhất", periodOrderLabels: "Ngày / Tuần / Tháng / Tất cả", noCustomerMatch: "Không tìm thấy khách hàng phù hợp.", trialIdNote: "Mã KD-KH là mã khách nội bộ của bản thử. Khi kết nối WeChat chính thức, nên thay bằng OpenID đã mã hóa và chỉ cấp quyền xem cho quản trị viên nền tảng.",
    segments: { new: "Khách mới", returning: "Khách quay lại", loyal: "Khách thân thiết" },
  },
  en: {
    appSubtitle: "Platform management app", customerNav: "Customer", restaurantNav: "Restaurant", settings: "Settings", theme: "Appearance", light: "Light", dark: "Dark", language: "Language", done: "Done", close: "Close",
    heroTitle: "Platform Management", heroBody: "Monitor customers, orders and restaurant activity from one publisher-only dashboard.", issuer: "Publisher code", noFees: "Order value includes food and delivery: 15,000₫ for the first 2 km + 8,000₫ per extra km.",
    period: "Time range", orderStatus: "Order status", restaurant: "Restaurant", export: "Export Excel report", allRestaurants: "All restaurants",
    periods: { all: "All time", today: "Today", week: "This week", month: "This month" },
    statuses: { all: "All statuses", new: "New order", accepted: "Preparing", ready: "Ready", handed_to_grab: "Handed to Grab", refused: "Declined" },
    hubKicker: "UNIFIED MANAGEMENT CENTER", choose: "Choose a section for details", viewing: "Viewing", dataAuto: "Data updates automatically with filters", orders: "orders", restaurants: "restaurants", customers: "customers", overview: "Overview",
    customerInFilter: "Customers in filter", returningCustomers: "returning customers", totalOrderValue: "Total order value", itemPriceOnly: "Food + delivery fee", ordersInFilter: "Orders in filter", restaurantsWithOrders: "Restaurants with orders", totalRestaurants: "Out of",
    searchRestaurant: "Search restaurant, order, customer or dish…", searchCustomer: "Search WeChat name, customer ID, phone or address…", searchAction: "Search", clearSearch: "Clear search", customerGroup: "Customer segment", allCustomers: "All customers", newCustomerOption: "New · 1 order", returningOption: "Returning · 2–4 orders", loyalOption: "Loyal · 5+ orders",
    detailByRestaurant: "BREAKDOWN BY RESTAURANT", whereOrders: "Where did orders come from?", noOrders: "No orders have been recorded.", recentOrder: "Latest order", orderCount: "Orders", customerOrders: "Customers", dailyPulse: "TODAY'S ORDER PULSE", todayStatus: "Today's activity", todayCustomers: "Customers today", todayRestaurants: "Restaurants today", todayValue: "Order value today", waitingOrders: "Waiting for restaurant",
    partnerOrders: "ORDERS BY PARTNER", restaurantDetails: "Restaurants and order details", noProfileAddress: "No profile address", openList: "Tap to view orders", closeList: "Close order list", order: "Orders", customer: "Customers", value: "Value", receivingStatus: "Order receiving status", accepting: "Accepting orders", paused: "Paused", reopen: "Reopen orders", lockOrders: "Pause orders", allowOrders: "Allow orders", orderList: "Orders for", currentFilterOrders: "orders in filter", noPhone: "No phone", day: "Date", at: "Time", noFilteredOrders: "No orders for this restaurant in the current filter.", noRestaurantMatch: "No matching restaurant or order.",
    privateInfo: "PRIVATE INFORMATION · PLATFORM ONLY", customersOrdered: "Customers with orders", wechatCustomerId: "WeChat / Customer ID", wechatIdLabel: "WeChat ID", customerCode: "Customer code", contact: "Order phone", latestAddress: "Delivery history", shippingHistory: "Previous delivery addresses", contactCustomer: "Contact customer", contactTitle: "Contact customer", contactHint: "Choose WeChat messaging or call the order phone number.", messageWechat: "Message on WeChat", callCustomer: "Call phone", wechatNotConnected: "No verified WeChat ID", unavailableContact: "No contact information", periodTotals: "Day / Week / Month / Total", totalValue: "Total value", noProvidedPhone: "Not provided", latestOrder: "Latest order", periodOrderLabels: "Day / Week / Month / All", noCustomerMatch: "No matching customer found.", trialIdNote: "KD-KH is a temporary customer ID for testing. Replace it with an encrypted WeChat OpenID when official integration is available.",
    segments: { new: "New customer", returning: "Returning", loyal: "Loyal customer" },
  },
  zh: {
    appSubtitle: "平台管理应用", customerNav: "顾客端", restaurantNav: "餐厅端", settings: "设置", theme: "显示模式", light: "浅色", dark: "深色", language: "语言", done: "完成", close: "关闭",
    heroTitle: "平台管理", heroBody: "在发布者专用界面中集中查看顾客、订单及各餐厅的运营情况。", issuer: "发布方代码", noFees: "订单总额包含菜品金额和配送费：前2公里15,000₫，超出部分每公里8,000₫。",
    period: "时间范围", orderStatus: "订单状态", restaurant: "餐厅", export: "导出 Excel 报表", allRestaurants: "全部餐厅",
    periods: { all: "全部时间", today: "今天", week: "本周", month: "本月" },
    statuses: { all: "全部状态", new: "新订单", accepted: "准备中", ready: "已完成", handed_to_grab: "已交给 Grab", refused: "已拒绝" },
    hubKicker: "统一运营中心", choose: "选择项目查看详情", viewing: "当前查看", dataAuto: "数据会根据筛选条件自动更新", orders: "笔订单", restaurants: "家餐厅", customers: "位顾客", overview: "总览",
    customerInFilter: "筛选内顾客", returningCustomers: "位回头客", totalOrderValue: "订单总额", itemPriceOnly: "菜品金额 + 配送费", ordersInFilter: "筛选内订单", restaurantsWithOrders: "有订单的餐厅", totalRestaurants: "餐厅总数",
    searchRestaurant: "搜索餐厅、订单、顾客或菜品…", searchCustomer: "搜索微信名、顾客编号、电话或地址…", searchAction: "搜索", clearSearch: "清除搜索", customerGroup: "顾客分类", allCustomers: "全部顾客", newCustomerOption: "新顾客 · 1 单", returningOption: "回头客 · 2–4 单", loyalOption: "忠实顾客 · 5 单以上",
    detailByRestaurant: "按餐厅查看详情", whereOrders: "订单来自哪些餐厅？", noOrders: "尚未记录任何订单。", recentOrder: "最近订单", orderCount: "订单数", customerOrders: "下单顾客", dailyPulse: "今日订单", todayStatus: "今日情况", todayCustomers: "今日顾客", todayRestaurants: "今日有单餐厅", todayValue: "今日订单金额", waitingOrders: "等待餐厅处理",
    partnerOrders: "合作餐厅订单", restaurantDetails: "餐厅及订单详情", noProfileAddress: "尚无餐厅地址", openList: "点击查看订单", closeList: "收起订单列表", order: "订单", customer: "顾客", value: "金额", receivingStatus: "接单状态", accepting: "正在接单", paused: "已暂停", reopen: "恢复接单", lockOrders: "暂停接单", allowOrders: "允许接单", orderList: "订单列表：", currentFilterOrders: "笔筛选订单", noPhone: "无联系电话", day: "日期", at: "时间", noFilteredOrders: "当前筛选条件下该餐厅没有订单。", noRestaurantMatch: "未找到匹配的餐厅或订单。",
    privateInfo: "保密信息 · 仅平台可见", customersOrdered: "已下单顾客", wechatCustomerId: "微信名 / 顾客编号", wechatIdLabel: "微信 ID", customerCode: "顾客编号", contact: "收货电话", latestAddress: "历史配送地址", shippingHistory: "曾用配送地址", contactCustomer: "联系顾客", contactTitle: "联系顾客", contactHint: "选择微信聊天或拨打收货电话。", messageWechat: "微信聊天", callCustomer: "拨打电话", wechatNotConnected: "尚无真实微信 ID", unavailableContact: "暂无联系方式", periodTotals: "日 / 周 / 月 / 总计", totalValue: "总金额", noProvidedPhone: "未提供", latestOrder: "最近下单", periodOrderLabels: "日 / 周 / 月 / 全部", noCustomerMatch: "未找到匹配的顾客。", trialIdNote: "KD-KH 为测试阶段内部顾客编号。正式接入微信后，应改用加密的 OpenID，并仅授权平台管理员查看。",
    segments: { new: "新顾客", returning: "回头客", loyal: "忠实顾客" },
  },
} as const;

const platformHeaderCopy = {
  vi: { manage:"Quản lý nền tảng", login:"Đăng nhập", logout:"Đăng xuất", title:"Quản lý nền tảng", account:"Tài khoản WeChat quản trị", coming:"Các chức năng quản trị chi tiết sẽ được bổ sung ở giai đoạn tiếp theo." },
  en: { manage:"Manage platform", login:"Sign in", logout:"Log out", title:"Platform management", account:"Administrator WeChat account", coming:"Detailed platform administration will be added in the next stage." },
  zh: { manage:"平台管理", login:"登录", logout:"退出", title:"平台管理", account:"管理员微信账号", coming:"平台详细管理功能将在下一阶段补充。" },
} as const;

const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)}₫`;
const normalized = (value: string) => value.toLocaleLowerCase("vi").trim();
const orderValue = (order: RestaurantOrder) => order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) + (order.deliveryFee || 0);

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function customerKey(order: RestaurantOrder) {
  if (order.customerWechatId?.trim()) return `wechat:${order.customerWechatId.trim()}`;
  const phone = order.customerPhone || "";
  return phone && !normalized(phone).includes("chưa cung cấp") ? `phone:${phone}` : `wechat:${order.customer}|${order.deliveryAddress}`;
}

function customerId(key: string) {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `KD-KH-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
}

function orderDate(order: RestaurantOrder) {
  if (order.createdTimestamp) {
    const date = new Date(order.createdTimestamp);
    if (!Number.isNaN(date.getTime())) return date;
  }
  const legacyTime = order.createdAt?.match(/(\d{1,2}):(\d{2})/);
  if (!legacyTime) return null;
  const inferredDate = new Date();
  inferredDate.setHours(Number(legacyTime[1]), Number(legacyTime[2]), 0, 0);
  return inferredDate;
}

function orderTime(order: RestaurantOrder) {
  const date = orderDate(order);
  return date ? date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : order.createdAt;
}

function orderDay(order: RestaurantOrder) {
  const date = orderDate(order);
  return date ? date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "Chưa có ngày";
}

function orderClock(order: RestaurantOrder) {
  const date = orderDate(order);
  return date ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : order.createdAt;
}

function isToday(order: RestaurantOrder, now: Date) {
  const date = orderDate(order);
  return Boolean(date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate());
}

function isThisMonth(order: RestaurantOrder, now: Date) {
  const date = orderDate(order);
  return Boolean(date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth());
}

function isThisWeek(order: RestaurantOrder, now: Date) {
  const date = orderDate(order);
  if (!date) return false;
  const start = new Date(now);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);
  return date >= start && date <= now;
}

export default function PlatformPortal() {
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<Section>("overview");
  const [profiles, setProfiles] = useState<Record<string, RestaurantProfile>>({});
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [restaurantFilter, setRestaurantFilter] = useState("all");
  const [customerSegment, setCustomerSegment] = useState<CustomerSegment>("all");
  const [expandedRestaurantId, setExpandedRestaurantId] = useState("");
  const [language, setLanguage] = useState<Language>("vi");
  const [theme, setTheme] = useState<Theme>("light");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [platformWechatId, setPlatformWechatId] = useState("");
  const [platformManagementOpen, setPlatformManagementOpen] = useState(false);
  const [contactCustomerKey, setContactCustomerKey] = useState("");
  const t = translations[language];

  useEffect(() => {
    ensureLegacyDemoState();
    const load = () => {
      setProfiles(readJson<Record<string, RestaurantProfile>>(PROFILE_KEY, {}));
      setOrders(readJson<RestaurantOrder[]>(ORDER_KEY, []));
    };
    load();
    const savedSettings = readJson<{ language?: Language; theme?: Theme }>(SETTINGS_KEY, {});
    if (savedSettings.language && ["vi", "en", "zh"].includes(savedSettings.language)) setLanguage(savedSettings.language);
    if (savedSettings.theme && ["light", "dark"].includes(savedSettings.theme)) setTheme(savedSettings.theme);
    setPlatformWechatId(window.localStorage.getItem(PLATFORM_WECHAT_ID_KEY) || "");
    setReady(true);
    const sync = (event: StorageEvent) => {
      if ([PROFILE_KEY, ORDER_KEY].includes(event.key || "")) load();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function updateSettings(nextLanguage: Language, nextTheme: Theme) {
    setLanguage(nextLanguage);
    setTheme(nextTheme);
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ language: nextLanguage, theme: nextTheme }));
  }

  const now = new Date();
  const sortedOrders = useMemo(() => [...orders].sort((a, b) => (b.createdTimestamp || "").localeCompare(a.createdTimestamp || "")), [orders]);
  const restaurants = useMemo(() => Object.values(profiles).sort((a, b) => a.name.localeCompare(b.name, "vi")), [profiles]);
  const todayOrders = orders.filter((order) => isToday(order, now));
  const weekOrders = orders.filter((order) => isThisWeek(order, now));
  const monthOrders = orders.filter((order) => isThisMonth(order, now));
  const reportOrders = useMemo(() => sortedOrders.filter((order) => {
    if (periodFilter === "today" && !isToday(order, now)) return false;
    if (periodFilter === "week" && !isThisWeek(order, now)) return false;
    if (periodFilter === "month" && !isThisMonth(order, now)) return false;
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    if (restaurantFilter !== "all" && order.restaurantId !== restaurantFilter) return false;
    return true;
  }), [now, periodFilter, restaurantFilter, sortedOrders, statusFilter]);
  const totalOrderValue = reportOrders.reduce((sum, order) => sum + orderValue(order), 0);

  const restaurantStats = useMemo(() => {
    const ids = new Set([...restaurants.map((restaurant) => restaurant.id), ...orders.map((order) => order.restaurantId)]);
    return Array.from(ids).map((id) => {
      const profile = profiles[id];
      const restaurantOrders = reportOrders.filter((order) => order.restaurantId === id);
      return {
        id,
        profile,
        name: profile?.name || `Nhà hàng ${id}`,
        orders: restaurantOrders,
        customers: new Set(restaurantOrders.map(customerKey)).size,
        value: restaurantOrders.reduce((sum, order) => sum + orderValue(order), 0),
        latestOrder: restaurantOrders[0] || null,
      };
    }).sort((a, b) => b.orders.length - a.orders.length || a.name.localeCompare(b.name, "vi"));
  }, [orders, profiles, reportOrders, restaurants]);

  const customers = useMemo(() => {
    const records = new Map<string, CustomerRecord>();
    sortedOrders.forEach((order) => {
      const key = customerKey(order);
      const phone = order.customerPhone && !normalized(order.customerPhone).includes("chưa cung cấp") ? order.customerPhone : "Không cung cấp";
      const restaurantName = profiles[order.restaurantId]?.name || order.restaurantId;
      const current = records.get(key) || {
        id: customerId(key), key, wechatName: order.customer || "Khách hàng WeChat", wechatId: order.customerWechatId?.trim() || "", phone,
        address: order.deliveryAddress, totalOrders: 0, todayOrders: 0, weekOrders: 0, monthOrders: 0,
        totalValue: 0, lastOrder: order, phones: new Set<string>(), addresses: new Set<string>(), restaurantNames: new Set<string>(), restaurantIds: new Set<string>(),
      };
      current.totalOrders += 1;
      current.totalValue += orderValue(order);
      if (isToday(order, now)) current.todayOrders += 1;
      if (isThisWeek(order, now)) current.weekOrders += 1;
      if (isThisMonth(order, now)) current.monthOrders += 1;
      current.restaurantNames.add(restaurantName);
      current.restaurantIds.add(order.restaurantId);
      if (!current.wechatId && order.customerWechatId?.trim()) current.wechatId = order.customerWechatId.trim();
      if (phone !== "Không cung cấp") current.phones.add(phone);
      if (order.deliveryAddress?.trim()) current.addresses.add(order.deliveryAddress.trim());
      records.set(key, current);
    });
    return Array.from(records.values()).sort((a, b) => b.monthOrders - a.monthOrders || b.totalOrders - a.totalOrders);
  }, [now, profiles, sortedOrders]);

  const query = normalized(search);
  const reportCustomerKeys = new Set(reportOrders.map(customerKey));
  const filteredRestaurants = restaurantStats.filter((restaurant) => !query || normalized(`${restaurant.name} ${restaurant.id} ${restaurant.profile?.address || ""} ${restaurant.orders.map((order) => `${order.id} ${order.customer} ${order.customerPhone || ""} ${order.items.map((item) => item.name).join(" ")}`).join(" ")}`).includes(query));
  const filteredCustomers = customers.filter((customer) => {
    const matchesReport = reportCustomerKeys.has(customer.key);
    const matchesSegment = customerSegment === "all"
      || (customerSegment === "new" && customer.totalOrders === 1)
      || (customerSegment === "returning" && customer.totalOrders >= 2 && customer.totalOrders < 5)
      || (customerSegment === "loyal" && customer.totalOrders >= 5);
    const matchesQuery = !query || normalized(`${customer.id} ${customer.wechatId} ${customer.wechatName} ${Array.from(customer.phones).join(" ")} ${Array.from(customer.addresses).join(" ")} ${Array.from(customer.restaurantNames).join(" ")}`).includes(query);
    return matchesReport && matchesSegment && matchesQuery;
  });
  const restaurantsWithOrders = restaurantStats.filter((restaurant) => restaurant.orders.length > 0);
  const contactCustomer = customers.find((customer) => customer.key === contactCustomerKey) || null;
  const contactPhone = contactCustomer ? Array.from(contactCustomer.phones)[0] || "" : "";
  function exportReport() {
    if (!reportOrders.length) return;
    const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const header = language === "zh"
      ? ["订单号", "时间", "餐厅", "顾客编号", "微信名", "联系电话", "配送地址", "菜品", "配送公里", "配送费", "状态", "总金额"]
      : language === "en"
        ? ["Order ID", "Time", "Restaurant", "Customer ID", "WeChat name", "Phone", "Delivery address", "Items", "Delivery km", "Delivery fee", "Status", "Total value"]
        : ["Mã đơn", "Thời gian", "Nhà hàng", "Mã khách", "Tên WeChat", "Số điện thoại", "Địa chỉ giao", "Món ăn", "Số km giao", "Phí giao", "Trạng thái", "Tổng giá trị"];
    const rows = reportOrders.map((order) => [
      order.id,
      orderTime(order),
      profiles[order.restaurantId]?.name || order.restaurantId,
      customerId(customerKey(order)),
      order.customer,
      order.customerPhone || t.noProvidedPhone,
      order.deliveryAddress,
      order.items.map((item) => `${item.quantity}× ${item.name}`).join("; "),
      order.deliveryDistanceKm || 0,
      order.deliveryFee || 0,
      t.statuses[order.status],
      orderValue(order),
    ]);
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}`;
    const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `kuai-dao-bao-cao-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  function saveProfiles(next: Record<string, RestaurantProfile>) {
    setProfiles(next);
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }

  function toggleReceiving(restaurantId: string) {
    const restaurant = profiles[restaurantId];
    if (!restaurant) return;
    saveProfiles({ ...profiles, [restaurantId]: { ...restaurant, receivingOrders: !restaurant.receivingOrders } });
  }

  function reopenRestaurant(restaurantId: string) {
    const restaurant = profiles[restaurantId];
    if (!restaurant) return;
    saveProfiles({ ...profiles, [restaurantId]: { ...restaurant, receivingOrders: true, refusals: 0 } });
  }

  function openSection(next: Section) {
    setSection(next);
    setSearch("");
    setSearchDraft("");
    window.requestAnimationFrame(() => document.getElementById("platform-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function submitSearch() {
    setSearch(searchDraft.trim());
  }

  function clearSearch() {
    setSearchDraft("");
    setSearch("");
  }

  function togglePlatformWechatLogin() {
    if (platformWechatId) {
      setPlatformWechatId("");
      setPlatformManagementOpen(false);
      window.localStorage.removeItem(PLATFORM_WECHAT_ID_KEY);
      return;
    }
    const entered = window.prompt("Nhập WeChat ID quản trị nền tảng cho bản kiểm tra nội bộ:", "");
    if (entered === null) return;
    const nextId = entered.trim();
    if (!nextId) {
      window.alert("Vui lòng nhập WeChat ID.");
      return;
    }
    setPlatformWechatId(nextId);
    window.localStorage.setItem(PLATFORM_WECHAT_ID_KEY, nextId);
  }

  function openPlatformManagement() {
    if (!platformWechatId) {
      const entered = window.prompt("Nhập WeChat ID quản trị để mở Quản lý nền tảng:", "");
      if (entered === null) return;
      const nextId = entered.trim();
      if (!nextId) {
        window.alert("Vui lòng nhập WeChat ID.");
        return;
      }
      setPlatformWechatId(nextId);
      window.localStorage.setItem(PLATFORM_WECHAT_ID_KEY, nextId);
      setPlatformManagementOpen(true);
      return;
    }
    setPlatformManagementOpen(true);
  }

  if (!ready) return <main className={styles.loading}>Đang mở Trung tâm Nền tảng…</main>;
  const headerText = platformHeaderCopy[language];

  return <main className={`${styles.portal} ${theme === "dark" ? styles.dark : ""}`} lang={language === "zh" ? "zh-CN" : language}>
    <header className={styles.topbar}><div className={styles.topBrand} aria-label="赵喜 · Quản lý Nền tảng"><span className={`${styles.topLogo} ${styles.brandSprite}`} aria-hidden="true" /></div><nav className={styles.topActions} aria-label="Chức năng Nền tảng"><button className={styles.topIconButton} onClick={() => setSettingsOpen(true)} aria-expanded={settingsOpen} aria-label={t.settings} title={t.settings}><span className={`${styles.topActionSprite} ${styles.settingsSprite}`} aria-hidden="true" /></button><button className={styles.topManageButton} onClick={openPlatformManagement} aria-label={headerText.manage} title={headerText.manage}><span className={`${styles.topActionSprite} ${styles.manageSprite}`} aria-hidden="true" /></button><button className={styles.topLoginButton} onClick={togglePlatformWechatLogin} aria-label={platformWechatId ? headerText.logout : headerText.login} title={platformWechatId ? headerText.logout : headerText.login}><span className={`${styles.topActionSprite} ${styles.authSprite}`} aria-hidden="true" /></button></nav></header>
    {settingsOpen && <div className={styles.settingsBackdrop} onClick={() => setSettingsOpen(false)}><section className={styles.settingsDialog} role="dialog" aria-modal="true" aria-label={t.settings} onClick={(event) => event.stopPropagation()}>
      <div className={styles.settingsHead}><div><span className={styles.settingsDialogIcon} aria-hidden="true"><span className={`${styles.topActionSprite} ${styles.settingsSprite}`} /></span><div><small>ZHÀO XǏ</small><h2>{t.settings}</h2></div></div><button className={styles.settingsClose} onClick={() => setSettingsOpen(false)} aria-label={t.done}>×</button></div>
      <div className={styles.settingsGroup}><b>{t.theme}</b><div className={styles.themeChoices}><button className={theme === "light" ? styles.settingSelected : ""} onClick={() => updateSettings(language, "light")} aria-pressed={theme === "light"}><span>☀</span>{t.light}</button><button className={theme === "dark" ? styles.settingSelected : ""} onClick={() => updateSettings(language, "dark")} aria-pressed={theme === "dark"}><span>☾</span>{t.dark}</button></div></div>
      <div className={styles.settingsGroup}><b>{t.language}</b><div className={styles.languageChoices}><button className={language === "vi" ? styles.settingSelected : ""} onClick={() => updateSettings("vi", theme)} aria-pressed={language === "vi"}><span>VI</span>Tiếng Việt</button><button className={language === "en" ? styles.settingSelected : ""} onClick={() => updateSettings("en", theme)} aria-pressed={language === "en"}><span>EN</span>English</button><button className={language === "zh" ? styles.settingSelected : ""} onClick={() => updateSettings("zh", theme)} aria-pressed={language === "zh"}><span>中</span>中文</button></div></div>
      <button className={styles.settingsDone} onClick={() => setSettingsOpen(false)}>{t.done}</button>
    </section></div>}
    {platformManagementOpen && <div className={styles.settingsBackdrop} onClick={() => setPlatformManagementOpen(false)}><section className={`${styles.settingsDialog} ${styles.platformManagementDialog}`} role="dialog" aria-modal="true" aria-label={headerText.title} onClick={(event) => event.stopPropagation()}><div className={styles.platformManagementHead}><div><span>管</span><div><small>ZHÀO XǏ · PLATFORM</small><h2>{headerText.title}</h2></div></div><button onClick={() => setPlatformManagementOpen(false)} aria-label={t.close}>×</button></div><div className={styles.platformWechatAccount}><span>微</span><div><small>{headerText.account}</small><b>{platformWechatId}</b></div></div><p>{headerText.coming}</p><button className={styles.settingsDone} onClick={() => setPlatformManagementOpen(false)}>{t.done}</button></section></div>}

    <div className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.flagWave} aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /></div>
        <div><small>运营中心 · ĐÀ NẴNG</small><h1>{t.heroTitle}</h1><p>{t.heroBody}</p></div>
        <aside><small>{t.issuer}</small><b>{ISSUER_CODE}</b><span>{t.noFees}</span></aside>
      </section>

      <section className={styles.reportToolbar} aria-label={t.period}>
        <label><span>{t.period}</span><select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}>{Object.entries(t.periods).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>{t.orderStatus}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>{Object.entries(t.statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>{t.restaurant}</span><select value={restaurantFilter} onChange={(event) => setRestaurantFilter(event.target.value)}><option value="all">{t.allRestaurants}</option>{restaurants.map((restaurant) => <option value={restaurant.id} key={restaurant.id}>{restaurant.name}</option>)}</select></label>
        <button onClick={exportReport} disabled={!reportOrders.length}><span>⇩</span> {t.export}</button>
      </section>

      <section className={styles.sectionHub} aria-label={t.hubKicker}>
        <div className={styles.sectionHubTitle}><div><small>{t.hubKicker}</small><h2>{t.choose}</h2></div><span>{t.viewing} · {t.periods[periodFilter]}</span></div>
        <p className={styles.sectionScope}>{t.dataAuto}: <b>{reportOrders.length} {t.orders}</b>, <b>{money(totalOrderValue)}</b>, <b>{restaurantsWithOrders.length} {t.restaurants}</b>, <b>{reportCustomerKeys.size} {t.customers}</b> · <b>{t.periods[periodFilter]}</b>.</p>
        <nav className={styles.sectionPicker}>
          <button className={section === "overview" ? styles.sectionButtonActive : ""} onClick={() => openSection("overview")}><span>总</span><div><b>{t.overview}</b><small>{reportOrders.length} {t.orders} · {money(totalOrderValue)}</small></div><em>›</em></button>
          <button className={section === "restaurants" ? styles.sectionButtonActive : ""} onClick={() => openSection("restaurants")}><span>店</span><div><b>{t.restaurant}</b><small>{restaurantsWithOrders.length} {t.restaurants} · {reportOrders.length} {t.orders}</small></div><em>›</em></button>
          <button className={section === "customers" ? styles.sectionButtonActive : ""} onClick={() => openSection("customers")}><span>客</span><div><b>{t.customer}</b><small>{reportCustomerKeys.size} {t.customers} · {reportOrders.length} {t.orders}</small></div><em>›</em></button>
        </nav>
      </section>

      {section === "overview" && <div id="platform-detail" className={`${styles.metrics} ${styles.sectionDetail}`}>
        <article><span>客</span><div><small>{t.customerInFilter}</small><b>{reportCustomerKeys.size}</b><em>{customers.filter((customer) => customer.totalOrders >= 2).length} {t.returningCustomers}</em></div></article>
        <article><span>额</span><div><small>{t.totalOrderValue}</small><b>{money(totalOrderValue)}</b><em>{t.itemPriceOnly}</em></div></article>
        <article><span>单</span><div><small>{t.ordersInFilter}</small><b>{reportOrders.length}</b><em>{todayOrders.length} {t.periods.today} · {weekOrders.length} {t.periods.week} · {monthOrders.length} {t.periods.month}</em></div></article>
        <article><span>店</span><div><small>{t.restaurantsWithOrders}</small><b>{restaurantsWithOrders.length}</b><em>{t.totalRestaurants} {restaurants.length} {t.restaurants}</em></div></article>
      </div>}

      {section !== "overview" && <div className={styles.searchTools}><div className={styles.search}><span>⌕</span><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }} placeholder={section === "restaurants" ? t.searchRestaurant : t.searchCustomer} aria-label={section === "restaurants" ? t.searchRestaurant : t.searchCustomer} /><button className={styles.searchSubmit} onClick={submitSearch}>{t.searchAction}</button><button className={styles.searchClear} onClick={clearSearch} aria-label={t.clearSearch}>×</button></div>{section === "customers" && <label className={styles.segmentFilter}><span>{t.customerGroup}</span><select value={customerSegment} onChange={(event) => setCustomerSegment(event.target.value as CustomerSegment)}><option value="all">{t.allCustomers}</option><option value="new">{t.newCustomerOption}</option><option value="returning">{t.returningOption}</option><option value="loyal">{t.loyalOption}</option></select></label>}</div>}

      {section === "overview" && <div className={styles.overviewGrid}>
        <section className={`${styles.panel} ${styles.overviewWide}`}>
          <div className={styles.panelHead}><div><small>{t.detailByRestaurant}</small><h2>{t.whereOrders}</h2></div><span>{restaurantsWithOrders.length} {t.restaurantsWithOrders.toLocaleLowerCase()}</span></div>
          <div className={styles.restaurantSummaryList}>
            {restaurantsWithOrders.map((restaurant) => <article key={restaurant.id}>
              <div className={styles.miniIcon}>{restaurant.profile?.icon ? <img src={restaurant.profile.icon} alt="" /> : "店"}</div>
              <div><b>{restaurant.name}</b><small>{restaurant.id} · {t.recentOrder} {restaurant.latestOrder ? orderTime(restaurant.latestOrder) : "—"}</small></div>
              <span><small>{t.orderCount}</small><b>{restaurant.orders.length}</b></span>
              <span><small>{t.customerOrders}</small><b>{restaurant.customers}</b></span>
              <strong>{money(restaurant.value)}</strong>
            </article>)}
            {restaurantsWithOrders.length === 0 && <div className={styles.empty}>{t.noOrders}</div>}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}><div><small>{t.dailyPulse}</small><h2>{t.todayStatus}</h2></div><span>{todayOrders.length} {t.orders}</span></div>
          <div className={styles.todaySnapshot}>
            <article><small>{t.todayCustomers}</small><b>{new Set(todayOrders.map(customerKey)).size}</b></article>
            <article><small>{t.todayRestaurants}</small><b>{new Set(todayOrders.map((order) => order.restaurantId)).size}</b></article>
            <article><small>{t.todayValue}</small><b>{money(todayOrders.reduce((sum, order) => sum + orderValue(order), 0))}</b></article>
            <article><small>{t.waitingOrders}</small><b>{todayOrders.filter((order) => order.status === "new").length}</b></article>
          </div>
        </section>
      </div>}

      {section === "restaurants" && <section id="platform-detail" className={`${styles.platformSection} ${styles.sectionDetail}`}>
        <div className={styles.sectionTitle}><div><small>{t.partnerOrders}</small><h2>{t.restaurantDetails}</h2></div><span>{filteredRestaurants.length} {t.restaurants}</span></div>
        <div className={styles.restaurantAdminList}>
          {filteredRestaurants.map((restaurant) => { const expanded = expandedRestaurantId === restaurant.id; return <article className={`${styles.restaurantOrderCard} ${expanded ? styles.restaurantOrderCardOpen : ""}`} key={restaurant.id}>
            <button className={styles.restaurantOrderToggle} onClick={() => setExpandedRestaurantId(expanded ? "" : restaurant.id)} aria-expanded={expanded}>
              {restaurant.profile?.icon ? <img src={restaurant.profile.icon} alt="" /> : <span>店</span>}
              <div className={styles.restaurantOrderIdentity}><small>{restaurant.id}</small><h3>{restaurant.name}</h3><p>{restaurant.profile?.address || t.noProfileAddress}</p><b>{expanded ? t.closeList : t.openList}</b></div>
              <div className={styles.restaurantOrderStats}><span><small>{t.order}</small><b>{restaurant.orders.length}</b></span><span><small>{t.customer}</small><b>{restaurant.customers}</b></span><span><small>{t.value}</small><b>{money(restaurant.value)}</b></span></div>
              <em className={`${styles.restaurantChevron} ${expanded ? styles.restaurantChevronOpen : ""}`}>⌄</em>
            </button>
            {expanded && <div className={styles.restaurantExpanded}>
              {restaurant.profile && <div className={styles.restaurantControlBar}><div><b>{t.receivingStatus}</b><em className={restaurant.profile.receivingOrders && restaurant.profile.refusals < 3 ? styles.online : styles.offline}>{restaurant.profile.receivingOrders && restaurant.profile.refusals < 3 ? t.accepting : t.paused}</em></div>{restaurant.profile.refusals >= 3 ? <button onClick={() => reopenRestaurant(restaurant.id)}>{t.reopen}</button> : <button onClick={() => toggleReceiving(restaurant.id)}>{restaurant.profile.receivingOrders ? t.lockOrders : t.allowOrders}</button>}</div>}
              <div className={styles.restaurantOrderList}>
                <div className={styles.orderListTitle}><b>{t.orderList} {restaurant.name}</b><span>{restaurant.orders.length} {t.currentFilterOrders}</span></div>
                {restaurant.orders.map((order) => <div className={styles.restaurantOrderRow} key={order.id}>
                  <div><b>#{order.id}</b><span className={styles.orderDateTime}><em>{t.day} {orderDay(order)}</em><em>{t.at} {orderClock(order)}</em></span></div>
                  <div><b>{order.customer}</b><small>{order.customerPhone || t.noPhone} · {order.deliveryAddress}</small></div>
                  <div>{order.items.map((item, index) => <span key={index}>{item.quantity}× {item.name}</span>)}{Boolean(order.deliveryFee) && <span>🚗 {order.deliveryDistanceKm} km · {money(order.deliveryFee || 0)}</span>}</div>
                  <span className={styles[order.status]}>{t.statuses[order.status]}</span>
                  <strong>{money(orderValue(order))}</strong>
                </div>)}
                {restaurant.orders.length === 0 && <div className={styles.empty}>{t.noFilteredOrders}</div>}
              </div>
            </div>}
          </article>; })}
          {filteredRestaurants.length === 0 && <div className={styles.empty}>{t.noRestaurantMatch}</div>}
        </div>
      </section>}

      {section === "customers" && <section id="platform-detail" className={`${styles.platformSection} ${styles.sectionDetail}`}>
        <div className={styles.sectionTitle}><div><small>{t.privateInfo}</small><h2>{t.customersOrdered}</h2></div><span>{filteredCustomers.length} {t.customers}</span></div>
        <div className={styles.customerTable}>
          <div className={styles.tableHead}><span>{t.wechatCustomerId}</span><span>{t.contact}</span><span>{t.latestAddress}</span><span>{t.periodTotals}</span><span>{t.totalValue}</span></div>
          {filteredCustomers.map((customer) => { const segment: Exclude<CustomerSegment, "all"> = customer.totalOrders >= 5 ? "loyal" : customer.totalOrders >= 2 ? "returning" : "new"; const phones = Array.from(customer.phones); const addresses = Array.from(customer.addresses); return <article key={customer.key}>
            <div className={styles.customerIdentity}><span className={styles.avatar}>微</span><span><b>{t.wechatIdLabel}: {customer.wechatId || t.wechatNotConnected}</b><small>{t.customerCode}: {customer.id}</small><span className={styles.customerBadgeRow}><em className={styles[`customer${segment[0].toUpperCase()}${segment.slice(1)}`]}>{t.segments[segment]}</em><button className={styles.customerContactButton} onClick={() => setContactCustomerKey(customer.key)}>☏ {t.contactCustomer}</button></span></span></div>
            <span className={styles.customerPhoneList}>{phones.length ? phones.map((phone) => <b key={phone}>{phone}</b>) : t.noProvidedPhone}</span>
            <span className={styles.customerAddressHistory}><b>{t.shippingHistory}</b>{addresses.map((address) => <small key={address}>• {address}</small>)}<small>{t.latestOrder}: {orderTime(customer.lastOrder)}</small></span>
            <span><b>{customer.todayOrders} / {customer.weekOrders} / {customer.monthOrders} / {customer.totalOrders} {t.orders}</b><small>{t.periodOrderLabels}</small></span>
            <span><b>{money(customer.totalValue)}</b><small>{Array.from(customer.restaurantNames).join(", ")}</small></span>
          </article>; })}
          {filteredCustomers.length === 0 && <div className={styles.empty}>{t.noCustomerMatch}</div>}
        </div>
        <p className={styles.dataNote}>{t.trialIdNote}</p>
      </section>}
    </div>
    {contactCustomer && <div className={styles.contactBackdrop} onClick={() => setContactCustomerKey("")}><section className={styles.contactDialog} role="dialog" aria-modal="true" aria-label={t.contactTitle} onClick={(event) => event.stopPropagation()}>
      <div className={styles.contactDialogHead}><span>微</span><div><small>{t.wechatIdLabel}</small><h2>{contactCustomer.wechatId || t.wechatNotConnected}</h2><p>{t.customerCode}: {contactCustomer.id}</p></div><button onClick={() => setContactCustomerKey("")} aria-label={t.close}>×</button></div>
      <p className={styles.contactHint}>{t.contactHint}</p>
      <div className={styles.contactActions}>
        {contactCustomer.wechatId ? <a href={`weixin://dl/chat?${encodeURIComponent(contactCustomer.wechatId)}`} onClick={() => { void navigator.clipboard?.writeText(contactCustomer.wechatId); }}><span>微</span><b>{t.messageWechat}</b><small>{contactCustomer.wechatId}</small></a> : <button disabled><span>微</span><b>{t.messageWechat}</b><small>{t.wechatNotConnected}</small></button>}
        {contactPhone ? <a href={`tel:${contactPhone.replace(/\s+/g, "")}`}><span>☎</span><b>{t.callCustomer}</b><small>{contactPhone}</small></a> : <button disabled><span>☎</span><b>{t.callCustomer}</b><small>{t.unavailableContact}</small></button>}
      </div>
    </section></div>}
  </main>;
}
