"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import styles from "./restaurant.module.css";
import { ensureLegacyDemoState } from "../demoState";

type Dish = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  image?: string;
};

type RestaurantProfile = {
  id: string;
  name: string;
  icon?: string;
  address: string;
  phone: string;
  wechatId: string;
  accountWechatId?: string;
  voucher: string;
  openTime: string;
  closeTime: string;
  receivingOrders: boolean;
  refusals: number;
  dishes: Dish[];
  editPasswordHash?: string;
  menuPublishedAt?: string;
};

type DeletedRestaurant = {
  profile: RestaurantProfile;
  deletedAt: string;
  expiresAt: string;
};

type RestaurantOrder = {
  id: string;
  restaurantId: string;
  customer: string;
  customerPhone: string;
  deliveryAddress: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  status: "new" | "accepted" | "ready" | "handed_to_grab" | "refused";
  createdAt: string;
  createdTimestamp?: string;
  prepMinutes?: number;
  estimatedReadyAt?: string;
  readyAt?: string;
  handedToGrabAt?: string;
  wechatMessage?: string;
  deliveryDistanceKm?: number;
  deliveryFee?: number;
  refusalReason?: string;
};

type CustomerWechatNotification = {
  id: string;
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  message: string;
  createdAt: string;
};

type RestaurantLanguage = "vi" | "en" | "zh";
type RestaurantTheme = "light" | "dark";

const RESTAURANT_COPY = {
  vi: {
    settings: "Cài đặt", language: "Ngôn ngữ", appearance: "Giao diện", light: "Sáng", dark: "Tối", done: "Hoàn tất",
    customerPortal: "← Khách hàng", restaurantEdition: "Bản Nhà hàng riêng", switchRestaurant: "Quản lý thông tin nhà hàng", logout: "Đăng xuất",
    portalTitle: "Cổng dành riêng cho Nhà hàng", portalDescription: "Mỗi hồ sơ chỉ quản lý thực đơn, giờ hoạt động và đơn hàng của chính nhà hàng đó.",
    register: "Đăng ký nhà hàng", registerHint: "Tạo hồ sơ riêng miễn phí, không ký quỹ.", restaurantName: "Tên nhà hàng", address: "Địa chỉ",
    phone: "Số điện thoại", optional: "Không bắt buộc", createProfile: "Tạo hồ sơ Nhà hàng", existingProfile: "Đã có hồ sơ",
    existingHint: "Nhập mã riêng để tiếp tục quản lý.", restaurantCode: "Mã nhà hàng", openManager: "Mở trang quản lý",
    privateOnly: "🔒 Không hiển thị nhà hàng khác", privateOnlyHint: "Trang này không chứa công cụ quản lý Nền tảng của người phát hành.",
    wechatAccount: "TÀI KHOẢN WECHAT", saveCode: "Lưu mã này để đăng nhập lại", restaurantOrders: "Đơn của nhà hàng", sellingDishes: "Món đang bán",
    todayRevenue: "Doanh thu hôm nay", customerRating: "Đánh giá từ Khách hàng", noneYet: "Chưa có", salesReport: "BÁO CÁO BÁN HÀNG",
    appRevenue: "Doanh thu qua ứng dụng", confirmedOnly: "Chỉ tính đơn đã xác nhận", dailyRevenue: "Doanh thu trong ngày",
    monthlyRevenue: "Doanh thu trong tháng", topDish: "Món bán chạy nhất tháng", noData: "Chưa có dữ liệu", myProfile: "HỒ SƠ CỦA TÔI",
    restaurantInfo: "Thông tin nhà hàng", onlyProfile: "Chỉ hồ sơ này", voucher: "Voucher", restaurantIcon: "Icon nhà hàng (tùy chọn)",
    iconHint: "Chọn logo hoặc ảnh vuông. Icon sẽ tự thu gọn và hiển thị ở cả ứng dụng Nhà hàng lẫn Khách hàng.", removeIcon: "Xóa icon",
    privateMenu: "THỰC ĐƠN RIÊNG", dishesOf: "Món ăn của", dishes: "món", publish: "✓ Xác nhận đã đăng món", edit: "✎ Chỉnh sửa",
    menuProtected: "🔒 Thực đơn đang được bảo vệ", menuEditing: "Đang chỉnh sửa thực đơn", addDish: "Thêm món", available: "Còn món", soldOut: "Hết món",
    status: "TRẠNG THÁI", orderHours: "Giờ nhận đơn", openNow: "Đang mở", notOpen: "Chưa mở cửa", opensAt: "Mở cửa", closesAt: "Đóng cửa",
    overnight: "Giờ đóng nhỏ hơn giờ mở sẽ được hiểu là ngày hôm sau, ví dụ 10:00 sáng → 02:00 sáng hôm sau.", receiveOrders: "Cho phép nhận đơn",
    outsideHours: "Ngoài giờ mở cửa, khách sẽ thấy “Chưa mở cửa”.", freePlan: "Gói thử nghiệm miễn phí", freePlanHint: "Không ký quỹ · Không phí nền tảng",
    privateOrders: "ĐƠN RIÊNG", testOrder: "＋ Đơn test", noOrders: "Chưa có đơn nào gửi đến nhà hàng này.", rejectionCount: "Số lần từ chối",
  },
  en: {
    settings: "Settings", language: "Language", appearance: "Appearance", light: "Light", dark: "Dark", done: "Done",
    customerPortal: "← Customer", restaurantEdition: "Restaurant portal", switchRestaurant: "Manage restaurant information", logout: "Log out",
    portalTitle: "Restaurant Management Portal", portalDescription: "Each profile manages only its own menu, opening hours and orders.",
    register: "Register a restaurant", registerHint: "Create a free profile with no deposit.", restaurantName: "Restaurant name", address: "Address",
    phone: "Phone number", optional: "Optional", createProfile: "Create restaurant profile", existingProfile: "Existing profile",
    existingHint: "Enter your private code to continue.", restaurantCode: "Restaurant code", openManager: "Open management page",
    privateOnly: "🔒 Other restaurants are hidden", privateOnlyHint: "This page does not include the publisher’s platform tools.",
    wechatAccount: "WECHAT ACCOUNT", saveCode: "Save this code to sign in again", restaurantOrders: "Restaurant orders", sellingDishes: "Active dishes",
    todayRevenue: "Revenue today", customerRating: "Customer rating", noneYet: "Not yet", salesReport: "SALES REPORT",
    appRevenue: "Revenue from the app", confirmedOnly: "Confirmed orders only", dailyRevenue: "Daily revenue",
    monthlyRevenue: "Monthly revenue", topDish: "Top dish this month", noData: "No data", myProfile: "MY PROFILE",
    restaurantInfo: "Restaurant information", onlyProfile: "This profile only", voucher: "Voucher", restaurantIcon: "Restaurant icon (optional)",
    iconHint: "Choose a logo or square image. It will be resized for both the Restaurant and Customer apps.", removeIcon: "Remove icon",
    privateMenu: "PRIVATE MENU", dishesOf: "Menu of", dishes: "dishes", publish: "✓ Publish menu", edit: "✎ Edit",
    menuProtected: "🔒 Menu is protected", menuEditing: "Editing menu", addDish: "Add dish", available: "Available", soldOut: "Sold out",
    status: "STATUS", orderHours: "Order hours", openNow: "Open", notOpen: "Closed", opensAt: "Opens", closesAt: "Closes",
    overnight: "If closing time is earlier than opening time, it is treated as the following day (for example, 10:00 AM → 2:00 AM).", receiveOrders: "Accept orders",
    outsideHours: "Outside opening hours, customers will see “Closed”.", freePlan: "Free trial plan", freePlanHint: "No deposit · No platform fee",
    privateOrders: "PRIVATE ORDERS", testOrder: "＋ Test order", noOrders: "No orders have been sent to this restaurant.", rejectionCount: "Rejected orders",
  },
  zh: {
    settings: "设置", language: "语言", appearance: "外观", light: "浅色", dark: "深色", done: "完成",
    customerPortal: "← 顾客端", restaurantEdition: "餐厅专用版", switchRestaurant: "餐厅信息管理", logout: "退出登录",
    portalTitle: "餐厅管理入口", portalDescription: "每个档案仅管理本餐厅的菜单、营业时间和订单。",
    register: "注册餐厅", registerHint: "免费创建独立档案，无需押金。", restaurantName: "餐厅名称", address: "地址",
    phone: "电话号码", optional: "选填", createProfile: "创建餐厅档案", existingProfile: "已有档案",
    existingHint: "输入专属代码继续管理。", restaurantCode: "餐厅代码", openManager: "打开管理页面",
    privateOnly: "🔒 不显示其他餐厅", privateOnlyHint: "本页面不包含发行方的平台管理工具。",
    wechatAccount: "微信账户", saveCode: "请保存此代码以便再次登录", restaurantOrders: "餐厅订单", sellingDishes: "在售菜品",
    todayRevenue: "今日营业额", customerRating: "顾客评分", noneYet: "暂无", salesReport: "销售报告",
    appRevenue: "应用营业额", confirmedOnly: "仅统计已确认订单", dailyRevenue: "今日营业额",
    monthlyRevenue: "本月营业额", topDish: "本月畅销菜品", noData: "暂无数据", myProfile: "我的档案",
    restaurantInfo: "餐厅信息", onlyProfile: "仅此档案", voucher: "优惠券", restaurantIcon: "餐厅图标（选填）",
    iconHint: "请选择标志或方形图片。图标会自动适配餐厅端和顾客端。", removeIcon: "删除图标",
    privateMenu: "专属菜单", dishesOf: "菜品来自", dishes: "道菜", publish: "✓ 确认发布", edit: "✎ 编辑",
    menuProtected: "🔒 菜单已受保护", menuEditing: "正在编辑菜单", addDish: "添加菜品", available: "有货", soldOut: "售罄",
    status: "状态", orderHours: "接单时间", openNow: "营业中", notOpen: "未营业", opensAt: "开门", closesAt: "关门",
    overnight: "关门时间早于开门时间时，将视为次日，例如上午 10:00 → 次日凌晨 2:00。", receiveOrders: "允许接单",
    outsideHours: "营业时间之外，顾客会看到“未营业”。", freePlan: "免费试用方案", freePlanHint: "无需押金 · 无平台费",
    privateOrders: "专属订单", testOrder: "＋ 测试订单", noOrders: "暂无发送到此餐厅的订单。", rejectionCount: "拒单次数",
  },
} as const;

function isWithinOperatingHours(openTime: string, closeTime: string, date = new Date()) {
  const toMinutes = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : -1;
  };
  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  const current = date.getHours() * 60 + date.getMinutes();
  if (open < 0 || close < 0) return false;
  if (open === close) return true;
  if (open < close) return current >= open && current < close;
  return current >= open || current < close;
}

const PROFILE_KEY = "kuai-dao-restaurant-profiles-v1";
const DELETED_PROFILE_KEY = "kuai-dao-deleted-restaurant-profiles-v1";
const SESSION_KEY = "kuai-dao-restaurant-session-v1";
const ORDER_KEY = "kuai-dao-restaurant-orders-v1";
const CUSTOMER_WECHAT_KEY = "kuai-dao-customer-wechat-v1";
const RATING_KEY = "kuai-dao-customer-ratings-v1";
const LANGUAGE_KEY = "kuai-dao-restaurant-language-v1";
const THEME_KEY = "kuai-dao-restaurant-theme-v1";

const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)}₫`;

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

const accountWechatId = (profile: RestaurantProfile) => (profile.accountWechatId || profile.wechatId).trim().toLowerCase();

async function resizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scanScale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height));
  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = Math.max(1, Math.round(bitmap.width * scanScale));
  scanCanvas.height = Math.max(1, Math.round(bitmap.height * scanScale));
  const scanContext = scanCanvas.getContext("2d", { willReadFrequently: true });
  if (!scanContext) throw new Error("Không thể xử lý ảnh");
  scanContext.drawImage(bitmap, 0, 0, scanCanvas.width, scanCanvas.height);
  const pixels = scanContext.getImageData(0, 0, scanCanvas.width, scanCanvas.height).data;
  let left = scanCanvas.width;
  let top = scanCanvas.height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < scanCanvas.height; y += 2) {
    for (let x = 0; x < scanCanvas.width; x += 2) {
      const index = (y * scanCanvas.width + x) * 4;
      const visible = pixels[index + 3] > 20 && (pixels[index] < 242 || pixels[index + 1] < 242 || pixels[index + 2] < 242);
      if (visible) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right <= left || bottom <= top) {
    left = 0;
    top = 0;
    right = scanCanvas.width;
    bottom = scanCanvas.height;
  }
  const sourceScaleX = bitmap.width / scanCanvas.width;
  const sourceScaleY = bitmap.height / scanCanvas.height;
  let sourceX = left * sourceScaleX;
  let sourceY = top * sourceScaleY;
  let sourceWidth = Math.max(1, (right - left) * sourceScaleX);
  let sourceHeight = Math.max(1, (bottom - top) * sourceScaleY);
  const padding = Math.max(sourceWidth, sourceHeight) * 0.08;
  sourceX = Math.max(0, sourceX - padding);
  sourceY = Math.max(0, sourceY - padding);
  sourceWidth = Math.min(bitmap.width - sourceX, sourceWidth + padding * 2);
  sourceHeight = Math.min(bitmap.height - sourceY, sourceHeight + padding * 2);
  const targetAspect = 720 / 620;
  if (sourceWidth / sourceHeight < targetAspect) {
    const expandedWidth = Math.min(bitmap.width, sourceHeight * targetAspect);
    sourceX = Math.max(0, Math.min(bitmap.width - expandedWidth, sourceX - (expandedWidth - sourceWidth) / 2));
    sourceWidth = expandedWidth;
  } else {
    const expandedHeight = Math.min(bitmap.height, sourceWidth / targetAspect);
    sourceY = Math.max(0, Math.min(bitmap.height - expandedHeight, sourceY - (expandedHeight - sourceHeight) / 2));
    sourceHeight = expandedHeight;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 620;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể xử lý ảnh");
  context.fillStyle = "#fffaf7";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function RestaurantSettingsDialog({
  open,
  language,
  theme,
  onLanguageChange,
  onThemeChange,
  onClose,
}: {
  open: boolean;
  language: RestaurantLanguage;
  theme: RestaurantTheme;
  onLanguageChange: (language: RestaurantLanguage) => void;
  onThemeChange: (theme: RestaurantTheme) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const copy = RESTAURANT_COPY[language];
  return (
    <div className={styles.settingsBackdrop} onClick={onClose}>
      <section className={styles.settingsDialog} role="dialog" aria-modal="true" aria-label={copy.settings} onClick={(event) => event.stopPropagation()}>
        <div className={styles.settingsHead}>
          <div><span className={styles.settingsDialogIcon} aria-hidden="true"><span className={`${styles.topActionSprite} ${styles.settingsSprite}`} /></span><div><small>ZHÀO XǏ</small><h2>{copy.settings}</h2></div></div>
          <button className={styles.settingsClose} onClick={onClose} aria-label={copy.done}>×</button>
        </div>
        <div className={styles.settingsGroup}>
          <b>{copy.appearance}</b>
          <div className={styles.themeChoices}>
            <button className={theme === "light" ? styles.settingSelected : ""} onClick={() => onThemeChange("light")}><span>☀</span>{copy.light}</button>
            <button className={theme === "dark" ? styles.settingSelected : ""} onClick={() => onThemeChange("dark")}><span>☾</span>{copy.dark}</button>
          </div>
        </div>
        <div className={styles.settingsGroup}>
          <b>{copy.language}</b>
          <div className={styles.languageChoices}>
            <button className={language === "vi" ? styles.settingSelected : ""} onClick={() => onLanguageChange("vi")}><span>VI</span>Tiếng Việt</button>
            <button className={language === "en" ? styles.settingSelected : ""} onClick={() => onLanguageChange("en")}><span>EN</span>English</button>
            <button className={language === "zh" ? styles.settingSelected : ""} onClick={() => onLanguageChange("zh")}><span>中</span>中文</button>
          </div>
        </div>
        <button className={styles.settingsDone} onClick={onClose}>{copy.done}</button>
      </section>
    </div>
  );
}

export default function RestaurantPortal() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [form, setForm] = useState({ name: "", address: "", phone: "", wechatId: "" });
  const [loginCode, setLoginCode] = useState("");
  const [notice, setNotice] = useState("");
  const [newDish, setNewDish] = useState({ name: "", price: "", image: "" });
  const [editMode, setEditMode] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState<"create" | "unlock" | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [previewDish, setPreviewDish] = useState<Dish | null>(null);
  const [pendingRestaurantIcon, setPendingRestaurantIcon] = useState<{ data: string; restaurantId: string } | null>(null);
  const [restaurantBannerSlide, setRestaurantBannerSlide] = useState(0);
  const [prepTimes, setPrepTimes] = useState<Record<string, number>>({});
  const [refusalDialogOrderId, setRefusalDialogOrderId] = useState("");
  const [refusalReason, setRefusalReason] = useState("");
  const [refusalError, setRefusalError] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [accountRestaurants, setAccountRestaurants] = useState<RestaurantProfile[]>([]);
  const [restaurantSwitcherOpen, setRestaurantSwitcherOpen] = useState(false);
  const [addRestaurantOpen, setAddRestaurantOpen] = useState(false);
  const [deleteRestaurantId, setDeleteRestaurantId] = useState("");
  const [deletedRestaurants, setDeletedRestaurants] = useState<DeletedRestaurant[]>([]);
  const [showDeletedRestaurants, setShowDeletedRestaurants] = useState(false);
  const [editRestaurantId, setEditRestaurantId] = useState("");
  const [restaurantEditForm, setRestaurantEditForm] = useState({ name: "", address: "", wechatId: "", phone: "" });
  const [additionalForm, setAdditionalForm] = useState({ name: "", address: "", phone: "" });
  const [language, setLanguage] = useState<RestaurantLanguage>("vi");
  const [theme, setTheme] = useState<RestaurantTheme>("light");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const copy = RESTAURANT_COPY[language];

  useEffect(() => {
    ensureLegacyDemoState();
    const savedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    if (savedLanguage === "vi" || savedLanguage === "en" || savedLanguage === "zh") setLanguage(savedLanguage);
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    const profiles = readJson<Record<string, RestaurantProfile>>(PROFILE_KEY, {});
    const deletedProfiles = readJson<Record<string, DeletedRestaurant>>(DELETED_PROFILE_KEY, {});
    const activeDeletedProfiles = Object.fromEntries(Object.entries(deletedProfiles).filter(([, item]) => new Date(item.expiresAt).getTime() > Date.now()));
    if (Object.keys(activeDeletedProfiles).length !== Object.keys(deletedProfiles).length) window.localStorage.setItem(DELETED_PROFILE_KEY, JSON.stringify(activeDeletedProfiles));
    const sessionId = window.localStorage.getItem(SESSION_KEY);
    if (sessionId && profiles[sessionId]) {
      const activeProfile = profiles[sessionId];
      setProfile(activeProfile);
      setAccountRestaurants(Object.values(profiles).filter((item) => accountWechatId(item) === accountWechatId(activeProfile)));
      setDeletedRestaurants(Object.values(activeDeletedProfiles).filter((item) => accountWechatId(item.profile) === accountWechatId(activeProfile)));
    } else {
      setDeletedRestaurants(Object.values(activeDeletedProfiles));
    }
    setOrders(readJson<RestaurantOrder[]>(ORDER_KEY, []));
    setRatings(readJson<Record<string, number>>(RATING_KEY, {}));
    setReady(true);
    const syncSharedData = (event: StorageEvent) => {
      if (event.key === ORDER_KEY) setOrders(readJson<RestaurantOrder[]>(ORDER_KEY, []));
      if (event.key === RATING_KEY) setRatings(readJson<Record<string, number>>(RATING_KEY, {}));
    };
    window.addEventListener("storage", syncSharedData);
    return () => window.removeEventListener("storage", syncSharedData);
  }, []);

  function changeLanguage(nextLanguage: RestaurantLanguage) {
    setLanguage(nextLanguage);
    window.localStorage.setItem(LANGUAGE_KEY, nextLanguage);
  }

  function changeTheme(nextTheme: RestaurantTheme) {
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_KEY, nextTheme);
  }

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const restaurantBannerImages = useMemo(
    () => profile?.dishes.map((dish) => dish.image).filter((image): image is string => Boolean(image)) || [],
    [profile],
  );

  useEffect(() => {
    setRestaurantBannerSlide(0);
    if (restaurantBannerImages.length < 2) return;
    const timer = window.setInterval(() => setRestaurantBannerSlide((current) => (current + 1) % restaurantBannerImages.length), 3400);
    return () => window.clearInterval(timer);
  }, [restaurantBannerImages.length, profile?.id]);

  const ownOrders = useMemo(
    () => profile ? orders.filter((order) => order.restaurantId === profile.id) : [],
    [orders, profile],
  );

  const isOpen = useMemo(() => {
    if (!profile) return false;
    return isWithinOperatingHours(profile.openTime, profile.closeTime, new Date(clockTick));
  }, [clockTick, profile]);

  function saveProfile(next: RestaurantProfile) {
    const profiles = readJson<Record<string, RestaurantProfile>>(PROFILE_KEY, {});
    profiles[next.id] = next;
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    setProfile(next);
    setAccountRestaurants(Object.values(profiles).filter((item) => accountWechatId(item) === accountWechatId(next)));
  }

  function registerRestaurant() {
    if (!form.name.trim() || !form.address.trim() || !form.wechatId.trim()) {
      setNotice("Vui lòng nhập tên nhà hàng, địa chỉ và WeChat ID.");
      return;
    }
    const profiles = readJson<Record<string, RestaurantProfile>>(PROFILE_KEY, {});
    const linkedRestaurants = Object.values(profiles).filter((item) => accountWechatId(item) === form.wechatId.trim().toLowerCase());
    if (linkedRestaurants.length >= 5) {
      setNotice("Tài khoản WeChat này đã đạt giới hạn 5 nhà hàng.");
      return;
    }
    const id = `KD-NH-${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const next: RestaurantProfile = {
      id,
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      wechatId: form.wechatId.trim(),
      accountWechatId: form.wechatId.trim(),
      voucher: "",
      openTime: "08:00",
      closeTime: "22:00",
      receivingOrders: true,
      refusals: 0,
      dishes: [],
    };
    profiles[id] = next;
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    window.localStorage.setItem(SESSION_KEY, id);
    setProfile(next);
    setAccountRestaurants([...linkedRestaurants, next]);
    setForm({ name: "", address: "", phone: "", wechatId: "" });
    setNotice("Đã tạo nhà hàng mới trong tài khoản WeChat.");
  }

  function loginRestaurant() {
    const profiles = readJson<Record<string, RestaurantProfile>>(PROFILE_KEY, {});
    const identity = loginCode.trim();
    const code = identity.toUpperCase();
    const activeProfile = profiles[code] || Object.values(profiles).find((item) => accountWechatId(item).toLocaleLowerCase("vi") === identity.toLocaleLowerCase("vi"));
    if (!activeProfile) {
      setNotice("Không tìm thấy tài khoản WeChat hoặc mã nhà hàng này trên thiết bị.");
      return;
    }
    window.localStorage.setItem(SESSION_KEY, activeProfile.id);
    setProfile(activeProfile);
    setAccountRestaurants(Object.values(profiles).filter((item) => accountWechatId(item) === accountWechatId(activeProfile)));
    setEditMode(false);
    setNotice("");
  }

  function logoutRestaurant() {
    window.localStorage.removeItem(SESSION_KEY);
    setProfile(null);
    setAccountRestaurants([]);
    setEditMode(false);
    setPasswordDialog(null);
    setRestaurantSwitcherOpen(false);
    setAddRestaurantOpen(false);
    setLoginCode("");
    setNotice("");
  }

  function switchRestaurant(restaurantId: string) {
    if (!profile) return;
    const profiles = readJson<Record<string, RestaurantProfile>>(PROFILE_KEY, {});
    const next = profiles[restaurantId];
    if (!next || accountWechatId(next) !== accountWechatId(profile)) return;
    window.localStorage.setItem(SESSION_KEY, restaurantId);
    setProfile(next);
    setEditMode(false);
    setPasswordDialog(null);
    setPreviewDish(null);
    setRestaurantSwitcherOpen(false);
    setAddRestaurantOpen(false);
    setNotice(`Đã chuyển sang ${next.name}.`);
  }

  function createAdditionalRestaurant() {
    if (!profile) return;
    if (!additionalForm.name.trim() || !additionalForm.address.trim()) {
      setNotice("Vui lòng nhập tên và địa chỉ nhà hàng mới.");
      return;
    }
    const profiles = readJson<Record<string, RestaurantProfile>>(PROFILE_KEY, {});
    const linkedRestaurants = Object.values(profiles).filter((item) => accountWechatId(item) === accountWechatId(profile));
    if (linkedRestaurants.length >= 5) {
      setNotice("Tài khoản WeChat này đã đạt giới hạn 5 nhà hàng.");
      return;
    }
    const id = `KD-NH-${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const next: RestaurantProfile = {
      id,
      name: additionalForm.name.trim(),
      address: additionalForm.address.trim(),
      phone: additionalForm.phone.trim(),
      wechatId: profile.wechatId,
      accountWechatId: profile.accountWechatId || profile.wechatId,
      voucher: "",
      openTime: "08:00",
      closeTime: "22:00",
      receivingOrders: true,
      refusals: 0,
      dishes: [],
    };
    profiles[id] = next;
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    window.localStorage.setItem(SESSION_KEY, id);
    setProfile(next);
    setAccountRestaurants([...linkedRestaurants, next]);
    setAdditionalForm({ name: "", address: "", phone: "" });
    setRestaurantSwitcherOpen(false);
    setAddRestaurantOpen(false);
    setEditMode(false);
    setNotice("Đã thêm nhà hàng mới và chuyển sang hồ sơ này.");
  }

  function deleteRestaurant() {
    if (!profile || !deleteRestaurantId) return;
    const profiles = readJson<Record<string, RestaurantProfile>>(PROFILE_KEY, {});
    const target = profiles[deleteRestaurantId];
    if (!target || accountWechatId(target) !== accountWechatId(profile)) {
      setDeleteRestaurantId("");
      return;
    }

    const deletedAt = new Date();
    const expiresAt = new Date(deletedAt.getTime() + 2 * 24 * 60 * 60 * 1000);
    const deletedProfiles = readJson<Record<string, DeletedRestaurant>>(DELETED_PROFILE_KEY, {});
    deletedProfiles[target.id] = { profile: target, deletedAt: deletedAt.toISOString(), expiresAt: expiresAt.toISOString() };
    window.localStorage.setItem(DELETED_PROFILE_KEY, JSON.stringify(deletedProfiles));
    delete profiles[deleteRestaurantId];
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    const remaining = Object.values(profiles).filter((item) => accountWechatId(item) === accountWechatId(profile));
    setAccountRestaurants(remaining);
    setDeletedRestaurants(Object.values(deletedProfiles).filter((item) => accountWechatId(item.profile) === accountWechatId(profile)));
    setDeleteRestaurantId("");
    setRestaurantSwitcherOpen(false);
    setAddRestaurantOpen(false);
    setEditMode(false);
    setPasswordDialog(null);
    setPreviewDish(null);

    if (profile.id === target.id) {
      const next = remaining[0];
      if (next) {
        window.localStorage.setItem(SESSION_KEY, next.id);
        setProfile(next);
        setNotice(`Đã xóa ${target.name} và chuyển sang ${next.name}. Bạn có 2 ngày để khôi phục.`);
      } else {
        window.localStorage.removeItem(SESSION_KEY);
        setProfile(null);
        setNotice(`Đã xóa nhà hàng ${target.name}. Bạn có 2 ngày để khôi phục; lịch sử đơn hàng vẫn được lưu trên Nền tảng.`);
      }
      return;
    }

    setNotice(`Đã xóa nhà hàng ${target.name}. Bạn có 2 ngày để khôi phục; lịch sử đơn hàng vẫn được lưu trên Nền tảng.`);
  }

  function restoreRestaurant(restaurantId: string) {
    const deletedProfiles = readJson<Record<string, DeletedRestaurant>>(DELETED_PROFILE_KEY, {});
    const record = deletedProfiles[restaurantId];
    if (!record || new Date(record.expiresAt).getTime() <= Date.now()) return;
    if (profile && accountWechatId(record.profile) !== accountWechatId(profile)) return;
    const profiles = readJson<Record<string, RestaurantProfile>>(PROFILE_KEY, {});
    profiles[restaurantId] = record.profile;
    delete deletedProfiles[restaurantId];
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    window.localStorage.setItem(DELETED_PROFILE_KEY, JSON.stringify(deletedProfiles));
    const ownerId = accountWechatId(record.profile);
    const activeRestaurants = Object.values(profiles).filter((item) => accountWechatId(item) === ownerId);
    setAccountRestaurants(activeRestaurants);
    setDeletedRestaurants(Object.values(deletedProfiles).filter((item) => accountWechatId(item.profile) === ownerId));
    if (!profile) {
      window.localStorage.setItem(SESSION_KEY, restaurantId);
      setProfile(record.profile);
    }
    setShowDeletedRestaurants(false);
    setNotice(`Đã khôi phục nhà hàng ${record.profile.name}.`);
  }

  function openRestaurantEditor(restaurant: RestaurantProfile) {
    setEditRestaurantId(restaurant.id);
    setRestaurantEditForm({ name: restaurant.name, address: restaurant.address, wechatId: restaurant.wechatId, phone: restaurant.phone });
  }

  function saveRestaurantDetails() {
    if (!profile || !editRestaurantId) return;
    if (!restaurantEditForm.name.trim() || !restaurantEditForm.address.trim() || !restaurantEditForm.wechatId.trim()) {
      setNotice("Vui lòng nhập tên, địa chỉ và WeChat ID liên hệ của nhà hàng.");
      return;
    }
    const profiles = readJson<Record<string, RestaurantProfile>>(PROFILE_KEY, {});
    const current = profiles[editRestaurantId];
    if (!current || accountWechatId(current) !== accountWechatId(profile)) return;
    const updated: RestaurantProfile = {
      ...current,
      name: restaurantEditForm.name.trim(),
      address: restaurantEditForm.address.trim(),
      wechatId: restaurantEditForm.wechatId.trim(),
      phone: restaurantEditForm.phone.trim(),
      accountWechatId: current.accountWechatId || current.wechatId,
    };
    profiles[updated.id] = updated;
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    setAccountRestaurants(Object.values(profiles).filter((item) => accountWechatId(item) === accountWechatId(profile)));
    if (profile.id === updated.id) setProfile(updated);
    setEditRestaurantId("");
    setNotice(`Đã cập nhật thông tin ${updated.name} trên cả ba ứng dụng.`);
  }

  function updateProfile<K extends keyof RestaurantProfile>(key: K, value: RestaurantProfile[K]) {
    if (!profile) return;
    saveProfile({ ...profile, [key]: value });
  }

  async function pickDishImage(event: ChangeEvent<HTMLInputElement>, dishId?: string) {
    const file = event.target.files?.[0];
    if (!file || !profile || !editMode) return;
    try {
      const image = await resizeImage(file);
      if (dishId) {
        saveProfile({ ...profile, dishes: profile.dishes.map((dish) => dish.id === dishId ? { ...dish, image } : dish) });
      } else {
        setNewDish((current) => ({ ...current, image }));
      }
    } catch {
      setNotice("Không thể xử lý ảnh này. Vui lòng chọn ảnh JPG hoặc PNG khác.");
    }
    event.target.value = "";
  }

  async function pickRestaurantIcon(event: ChangeEvent<HTMLInputElement>, restaurantId = profile?.id || "") {
    const file = event.target.files?.[0];
    if (!file || !restaurantId) return;
    try {
      const icon = await resizeImage(file);
      setPendingRestaurantIcon({ data: icon, restaurantId });
    } catch {
      setNotice("Không thể xử lý icon này. Vui lòng chọn ảnh JPG hoặc PNG khác.");
    }
    event.target.value = "";
  }

  function confirmRestaurantIcon() {
    if (!profile || !pendingRestaurantIcon) return;
    const profiles = readJson<Record<string, RestaurantProfile>>(PROFILE_KEY, {});
    const target = profiles[pendingRestaurantIcon.restaurantId];
    if (!target || accountWechatId(target) !== accountWechatId(profile)) return;
    const updated = { ...target, icon: pendingRestaurantIcon.data };
    profiles[updated.id] = updated;
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    setAccountRestaurants(Object.values(profiles).filter((item) => accountWechatId(item) === accountWechatId(profile)));
    if (profile.id === updated.id) setProfile(updated);
    setPendingRestaurantIcon(null);
    setNotice("Đã cập nhật icon nhà hàng trên cả ba ứng dụng.");
  }

  function addDish() {
    if (!profile || !editMode || !newDish.name.trim() || Number(newDish.price) <= 0) {
      setNotice("Vui lòng nhập tên món và giá hợp lệ.");
      return;
    }
    const dish: Dish = {
      id: `dish-${Date.now()}`,
      name: newDish.name.trim(),
      price: Number(newDish.price),
      available: true,
      image: newDish.image || undefined,
    };
    saveProfile({ ...profile, dishes: [...profile.dishes, dish] });
    setNewDish({ name: "", price: "", image: "" });
    setNotice("");
  }

  function updateDish(dishId: string, changes: Partial<Dish>) {
    if (!profile || !editMode) return;
    saveProfile({ ...profile, dishes: profile.dishes.map((dish) => dish.id === dishId ? { ...dish, ...changes } : dish) });
  }

  function removeDish(dishId: string) {
    if (!profile || !editMode || !window.confirm("Xóa món ăn này khỏi thực đơn?")) return;
    saveProfile({ ...profile, dishes: profile.dishes.filter((dish) => dish.id !== dishId) });
  }

  function openMenuEditor() {
    if (!profile) return;
    setPasswordInput("");
    setPasswordConfirm("");
    setPasswordError("");
    setPasswordDialog(profile.editPasswordHash ? "unlock" : "create");
  }

  async function confirmEditPassword() {
    if (!profile || !passwordDialog) return;
    if (passwordInput.length < 4) {
      setPasswordError("Mật khẩu phải có ít nhất 4 ký tự.");
      return;
    }
    if (passwordDialog === "create" && passwordInput !== passwordConfirm) {
      setPasswordError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    const passwordHash = await hashPassword(passwordInput);
    if (passwordDialog === "unlock" && passwordHash !== profile.editPasswordHash) {
      setPasswordError("Mật khẩu chỉnh sửa không đúng.");
      return;
    }
    if (passwordDialog === "create") saveProfile({ ...profile, editPasswordHash: passwordHash });
    setEditMode(true);
    setPasswordDialog(null);
    setPasswordInput("");
    setPasswordConfirm("");
    setPasswordError("");
    setNotice(passwordDialog === "create" ? "Đã tạo mật khẩu. Thực đơn đang ở chế độ chỉnh sửa." : "Đã mở khóa chỉnh sửa thực đơn.");
  }

  function publishMenu() {
    if (!profile || !editMode) return;
    const publishedAt = new Date().toLocaleString("vi-VN");
    saveProfile({ ...profile, menuPublishedAt: publishedAt });
    setEditMode(false);
    setNewDish({ name: "", price: "", image: "" });
    setNotice(`Đã xác nhận đăng ${profile.dishes.length} món lúc ${publishedAt}. Thực đơn đã được khóa chỉnh sửa.`);
  }

  function createTestOrder() {
    if (!profile || profile.dishes.length === 0) {
      setNotice("Hãy thêm ít nhất một món trước khi tạo đơn kiểm tra.");
      return;
    }
    const dish = profile.dishes.find((item) => item.available) || profile.dishes[0];
    const order: RestaurantOrder = {
      id: `KD-${String(Date.now()).slice(-6)}`,
      restaurantId: profile.id,
      customer: "Khách hàng WeChat",
      customerPhone: "Khách chưa cung cấp SĐT",
      deliveryAddress: "28 Nguyễn Chí Thanh, Hải Châu, Đà Nẵng",
      items: [{ name: dish.name, quantity: 1, price: dish.price }],
      status: "new",
      createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      createdTimestamp: new Date().toISOString(),
    };
    const next = [order, ...orders];
    setOrders(next);
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(next));
    setNotice("");
  }

  function acceptOrder(orderId: string) {
    if (!profile) return;
    const prepMinutes = prepTimes[orderId] || 15;
    const readyAt = new Date(Date.now() + prepMinutes * 60_000).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const wechatMessage = `您的订单 #${orderId} 已被 ${profile.name} 确认。预计 ${prepMinutes} 分钟后完成（约 ${readyAt}）。我们会尽快为您准备餐点。`;
    const nextOrders = orders.map((order) => order.id === orderId && order.restaurantId === profile.id
      ? { ...order, status: "accepted" as const, prepMinutes, estimatedReadyAt: readyAt, wechatMessage }
      : order);
    setOrders(nextOrders);
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(nextOrders));
    sendCustomerWechatNotification(orderId, wechatMessage);
    window.alert(`${wechatMessage}\n\nĐã gửi thông báo WeChat thử cho khách hàng.`);
  }

  function openRefusalDialog(orderId: string) {
    setRefusalDialogOrderId(orderId);
    setRefusalReason("");
    setRefusalError("");
  }

  function confirmRefusal() {
    if (!profile || !refusalDialogOrderId) return;
    const reason = refusalReason.trim();
    if (reason.length < 3) {
      setRefusalError("Vui lòng nhập lý do từ chối cụ thể.");
      return;
    }
    const orderId = refusalDialogOrderId;
    const wechatMessage = `很抱歉，您的订单 #${orderId} 已被 ${profile.name} 拒绝。原因：${reason}。给您带来不便，敬请谅解。`;
    const nextOrders = orders.map((order) => order.id === orderId && order.restaurantId === profile.id
      ? { ...order, status: "refused" as const, refusalReason: reason, wechatMessage }
      : order);
    setOrders(nextOrders);
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(nextOrders));
    sendCustomerWechatNotification(orderId, wechatMessage);
    const refusals = Math.min(3, profile.refusals + 1);
    saveProfile({ ...profile, refusals, receivingOrders: refusals >= 3 ? false : profile.receivingOrders });
    setRefusalDialogOrderId("");
    setRefusalReason("");
    setRefusalError("");
    window.alert(`${wechatMessage}\n\nĐã gửi lý do từ chối cho khách hàng qua tin nhắn WeChat.`);
  }

  function sendCustomerWechatNotification(orderId: string, message: string) {
    if (!profile) return;
    const notifications = readJson<CustomerWechatNotification[]>(CUSTOMER_WECHAT_KEY, []);
    const notification: CustomerWechatNotification = {
      id: `MSG-${Date.now()}`,
      orderId,
      restaurantId: profile.id,
      restaurantName: profile.name,
      message,
      createdAt: new Date().toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }),
    };
    window.localStorage.setItem(CUSTOMER_WECHAT_KEY, JSON.stringify([notification, ...notifications]));
  }

  function advanceOrderStatus(orderId: string, status: "ready" | "handed_to_grab") {
    if (!profile) return;
    const updatedAt = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const message = status === "ready"
      ? `您的订单 #${orderId} 已制作完成。餐厅正在等待 Grab 配送员取餐。`
      : `您的订单 #${orderId} 已交给 Grab 配送员，正在送往您的地址。请留意电话。`;
    const nextOrders = orders.map((order) => order.id === orderId && order.restaurantId === profile.id
      ? { ...order, status, wechatMessage: message, ...(status === "ready" ? { readyAt: updatedAt } : { handedToGrabAt: updatedAt }) }
      : order);
    setOrders(nextOrders);
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(nextOrders));
    sendCustomerWechatNotification(orderId, message);
    window.alert(`${message}\n\nĐã gửi thông báo WeChat thử cho khách hàng.`);
  }

  if (!ready) return <main className={styles.loading}>Đang mở cổng Nhà hàng…</main>;

  if (!profile) {
    return (
      <main className={`${styles.portal} ${theme === "dark" ? styles.dark : ""}`} lang={language === "zh" ? "zh-CN" : language}>
        <header className={styles.topbar}><div className={styles.topBrand} aria-label="赵喜 · Bản Nhà hàng"><span className={`${styles.topLogo} ${styles.brandSprite}`} aria-hidden="true" /></div><nav className={styles.topActions} aria-label="Chức năng Nhà hàng"><button className={styles.topIconButton} onClick={() => setSettingsOpen(true)} aria-label={copy.settings} title={copy.settings}><span className={`${styles.topActionSprite} ${styles.settingsSprite}`} aria-hidden="true" /></button><button className={styles.switchTopButton} onClick={() => document.getElementById("restaurant-wechat-login")?.focus()} aria-label={copy.switchRestaurant} title={copy.switchRestaurant}><span className={`${styles.topActionSprite} ${styles.manageSprite}`} aria-hidden="true" /></button><button className={styles.topLoginButton} onClick={() => document.getElementById("restaurant-wechat-login")?.focus()} aria-label={language === "vi" ? "Đăng nhập WeChat" : language === "en" ? "Sign in with WeChat" : "微信登录"} title={language === "vi" ? "Đăng nhập WeChat" : language === "en" ? "Sign in with WeChat" : "微信登录"}><span className={`${styles.topActionSprite} ${styles.authSprite}`} aria-hidden="true" /></button></nav></header>
        <section className={styles.authShell}>
          <div className={styles.brand}><span>筷</span><div><small>赵喜 · ZHÀO XǏ</small><h1>{copy.portalTitle}</h1><p>{copy.portalDescription}</p></div></div>
          <div className={styles.authGrid}>
            <section className={styles.authCard}>
              <div className={styles.cardTitle}><span>01</span><div><h2>{copy.register}</h2><p>{copy.registerHint}</p></div></div>
              <label>{copy.restaurantName}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={copy.restaurantName} /></label>
              <label>{copy.address}<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder={copy.address} /></label>
              <label>WeChat ID<input value={form.wechatId} onChange={(event) => setForm({ ...form, wechatId: event.target.value })} placeholder="WeChat của nhà hàng" /></label>
              <label>{copy.phone}<input inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder={copy.optional} /></label>
              <button className={styles.primaryButton} onClick={registerRestaurant}>{copy.createProfile}</button>
            </section>
            <section className={styles.authCard}>
              <div className={styles.cardTitle}><span>02</span><div><h2>{copy.existingProfile}</h2><p>{copy.existingHint}</p></div></div>
              <label>WeChat ID / {copy.restaurantCode}<input id="restaurant-wechat-login" value={loginCode} onChange={(event) => setLoginCode(event.target.value)} placeholder="WeChat ID / KD-NH-XXXXXX" /></label>
              <button className={styles.secondaryButton} onClick={loginRestaurant}>{copy.openManager}</button>
              <div className={styles.privacyNote}><b>{copy.privateOnly}</b><p>{copy.privateOnlyHint}</p></div>
            </section>
          </div>
          {deletedRestaurants.length > 0 && <section className={styles.loginRecovery}><div><small>KHÔI PHỤC TRONG 2 NGÀY</small><h2>Nhà hàng đã xóa gần đây</h2><p>Bạn vẫn có thể khôi phục hồ sơ, thực đơn và cài đặt của nhà hàng.</p></div>{deletedRestaurants.map((record) => <article key={record.profile.id}><div><b>{record.profile.name}</b><small>{record.profile.address}</small></div><button onClick={() => restoreRestaurant(record.profile.id)}>Khôi phục</button></article>)}</section>}
          {notice && <p className={styles.notice}>{notice}</p>}
        </section>
        <RestaurantSettingsDialog open={settingsOpen} language={language} theme={theme} onLanguageChange={changeLanguage} onThemeChange={changeTheme} onClose={() => setSettingsOpen(false)} />
      </main>
    );
  }

  const locked = profile.refusals >= 3;
  const customerRating = ratings[profile.id] || 0;
  const confirmedOrders = ownOrders.filter((order) => ["accepted", "ready", "handed_to_grab"].includes(order.status));
  const now = new Date();
  const orderDate = (order: RestaurantOrder) => order.createdTimestamp ? new Date(order.createdTimestamp) : now;
  const todayOrders = confirmedOrders.filter((order) => {
    const date = orderDate(order);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  });
  const monthOrders = confirmedOrders.filter((order) => {
    const date = orderDate(order);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const orderRevenue = (order: RestaurantOrder) => order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const todayRevenue = todayOrders.reduce((sum, order) => sum + orderRevenue(order), 0);
  const monthRevenue = monthOrders.reduce((sum, order) => sum + orderRevenue(order), 0);
  const dishSales = monthOrders.reduce<Record<string, number>>((sales, order) => {
    order.items.forEach((item) => { sales[item.name] = (sales[item.name] || 0) + item.quantity; });
    return sales;
  }, {});
  const topDish = Object.entries(dishSales).sort((a, b) => b[1] - a[1])[0];

  return (
    <main className={`${styles.portal} ${theme === "dark" ? styles.dark : ""}`} lang={language === "zh" ? "zh-CN" : language}>
      <header className={styles.topbar}><div className={styles.topBrand} aria-label="赵喜 · Bản Nhà hàng"><span className={`${styles.topLogo} ${styles.brandSprite}`} aria-hidden="true" /></div><nav className={styles.topActions} aria-label="Chức năng Nhà hàng"><button className={styles.topIconButton} onClick={() => setSettingsOpen(true)} aria-label={copy.settings} title={copy.settings}><span className={`${styles.topActionSprite} ${styles.settingsSprite}`} aria-hidden="true" /></button><button className={styles.switchTopButton} onClick={() => setRestaurantSwitcherOpen(true)} aria-label={copy.switchRestaurant} title={copy.switchRestaurant}><span className={`${styles.topActionSprite} ${styles.manageSprite}`} aria-hidden="true" /></button><button className={styles.topLogoutButton} onClick={logoutRestaurant} aria-label={copy.logout} title={copy.logout}><span className={`${styles.topActionSprite} ${styles.authSprite}`} aria-hidden="true" /></button></nav></header>
      <div className={styles.dashboard}>
        <section className={styles.restaurantHero}>
          <div className={styles.restaurantHeroSlides} aria-hidden="true">{restaurantBannerImages.length ? restaurantBannerImages.map((image, index) => <img className={index === restaurantBannerSlide ? styles.restaurantHeroSlideActive : ""} key={`${image.slice(0, 36)}-${index}`} src={image} alt="" />) : <div className={styles.restaurantHeroFallback}>餐厅 · 美食</div>}</div>
          <div className={styles.restaurantHeroOverlay} />
          <div className={styles.restaurantHeroCopy}>{profile.icon ? <img src={profile.icon} alt={`Icon ${profile.name}`} /> : <span>店</span>}<div><small>{copy.wechatAccount} · {accountRestaurants.length}/5</small><h1>{profile.name}</h1><p>{profile.address}</p><em>菜品与营业状态由本餐厅实时更新</em></div></div>
          <strong className={styles.restaurantHeroMark}>餐厅</strong>
        </section>

        <section className={styles.restaurantQuickInfo}>
          <article><small>{copy.restaurantCode}</small><b>{profile.id}</b><span>{copy.saveCode}</span></article>
          <label><small>{copy.voucher}</small><input value={profile.voucher} onChange={(event) => updateProfile("voucher", event.target.value)} placeholder="GIAM20 · Giảm 20.000đ" /><span>Voucher sẽ hiển thị trên bản Khách hàng</span></label>
        </section>

        {locked && <div className={styles.lockedNotice}><b>Nhà hàng đã bị khóa nhận đơn</b><span>Đã từ chối 3 đơn. Liên hệ Nền tảng để yêu cầu mở lại.</span></div>}

        <div className={styles.stats}>
          <article><small>{copy.restaurantOrders}</small><b>{ownOrders.length}</b></article>
          <article><small>{copy.sellingDishes}</small><b>{profile.dishes.filter((dish) => dish.available).length}</b></article>
          <article><small>{copy.todayRevenue}</small><b>{money(todayRevenue)}</b></article>
          <article><small>{copy.customerRating}</small><b>{customerRating ? `${customerRating}/5 ★` : copy.noneYet}</b></article>
        </div>

        <section className={styles.revenuePanel}>
          <div className={styles.revenueHead}><div><small>{copy.salesReport}</small><h2>{copy.appRevenue}</h2></div><span>{copy.confirmedOnly}</span></div>
          <div className={styles.revenueGrid}>
            <article><span>日</span><div><small>{copy.dailyRevenue}</small><strong>{money(todayRevenue)}</strong><p>{todayOrders.length} {copy.confirmedOnly.toLowerCase()}</p></div></article>
            <article><span>月</span><div><small>{copy.monthlyRevenue}</small><strong>{money(monthRevenue)}</strong><p>{monthOrders.length} {copy.restaurantOrders.toLowerCase()}</p></div></article>
            <article><span>冠</span><div><small>{copy.topDish}</small><strong>{topDish ? topDish[0] : copy.noData}</strong><p>{topDish ? `${topDish[1]} ${copy.dishes}` : copy.noData}</p></div></article>
          </div>
        </section>

        <div className={styles.columns}>
          <div>
            <section className={styles.panel}>
              <div className={styles.panelHead}><div className={styles.menuTitle}>{profile.icon ? <img src={profile.icon} alt="" /> : <span>店</span>}<div><small>{copy.privateMenu}</small><h2><em>{copy.dishesOf}</em> <strong>{profile.name}</strong></h2></div></div><div className={styles.menuActions}><span>{profile.dishes.length} {copy.dishes}</span>{editMode ? <button className={styles.publishButton} onClick={publishMenu}>{copy.publish}</button> : <button className={styles.editButton} onClick={openMenuEditor}>{copy.edit}</button>}</div></div>
              {editMode ? <div className={styles.editUnlocked}><b>{copy.menuEditing}</b><span>Bạn có thể thêm, đổi ảnh, sửa giá hoặc xóa món. Bấm xác nhận khi hoàn tất.</span></div> : <div className={styles.editLocked}><b>{copy.menuProtected}</b><span>{profile.menuPublishedAt ? `Đăng gần nhất: ${profile.menuPublishedAt}` : "Bấm Chỉnh sửa để tạo mật khẩu cho lần đầu."}</span></div>}
              {editMode && <div className={styles.addDish}>
                <label className={styles.imagePicker}>{newDish.image ? <img src={newDish.image} alt="Ảnh món mới" /> : <span>＋ Ảnh món</span>}<input type="file" accept="image/*" onChange={(event) => pickDishImage(event)} /></label>
                <input value={newDish.name} onChange={(event) => setNewDish({ ...newDish, name: event.target.value })} placeholder="Tên món ăn" />
                <input type="number" min="0" value={newDish.price} onChange={(event) => setNewDish({ ...newDish, price: event.target.value })} placeholder="Giá món (₫)" />
                <button onClick={addDish}>{copy.addDish}</button>
              </div>}
              <div className={styles.dishList}>
                {profile.dishes.length === 0 && <div className={styles.empty}>Nhà hàng chưa đăng món nào. Hãy thêm món đầu tiên phía trên.</div>}
                {profile.dishes.map((dish) => <article className={`${styles.dishRow} ${!editMode ? styles.previewableDish : ""}`} key={dish.id} role={!editMode ? "button" : undefined} tabIndex={!editMode ? 0 : -1} aria-label={!editMode ? `Xem ảnh lớn món ${dish.name}` : undefined} onClick={(event) => { if (!editMode && !(event.target as HTMLElement).closest("button,input,label")) setPreviewDish(dish); }} onKeyDown={(event) => { if (!editMode && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setPreviewDish(dish); } }}>
                  {editMode ? <label className={styles.dishPhoto}>{dish.image ? <img src={dish.image} alt={dish.name} /> : <span>🍽</span>}<input type="file" accept="image/*" onChange={(event) => pickDishImage(event, dish.id)} /></label> : <div className={styles.dishPhoto}>{dish.image ? <img src={dish.image} alt={dish.name} /> : <span>🍽</span>}</div>}
                  {editMode ? <div><input value={dish.name} onChange={(event) => updateDish(dish.id, { name: event.target.value })} /><input type="number" min="0" value={dish.price} onChange={(event) => updateDish(dish.id, { price: Number(event.target.value) })} /></div> : <div className={styles.dishReadOnly}><b>{dish.name}</b><strong>{money(dish.price)}</strong></div>}
                  {editMode ? <button className={dish.available ? styles.available : styles.soldOut} onClick={() => updateDish(dish.id, { available: !dish.available })}>{dish.available ? copy.available : copy.soldOut}</button> : <span className={dish.available ? styles.available : styles.soldOut}>{dish.available ? copy.available : copy.soldOut}</span>}
                  {editMode && <button className={styles.deleteButton} onClick={() => removeDish(dish.id)} aria-label={`Xóa ${dish.name}`}>×</button>}
                </article>)}
              </div>
            </section>
          </div>

          <aside>
            <section className={styles.panel}>
              <div className={styles.panelHead}><div><small>{copy.status}</small><h2>{copy.orderHours}</h2></div><span className={isOpen ? styles.openBadge : styles.closedBadge}>{isOpen ? copy.openNow : copy.notOpen}</span></div>
              <div className={styles.hours}><label>{copy.opensAt}<input type="time" value={profile.openTime} onChange={(event) => updateProfile("openTime", event.target.value)} /></label><label>{copy.closesAt}<input type="time" value={profile.closeTime} onChange={(event) => updateProfile("closeTime", event.target.value)} /></label></div>
              <p className={styles.overnightHint}>{copy.overnight}</p>
              <label className={styles.receiveToggle}><input type="checkbox" checked={profile.receivingOrders && !locked} disabled={locked} onChange={(event) => updateProfile("receivingOrders", event.target.checked)} /><span><b>{copy.receiveOrders}</b><small>{copy.outsideHours}</small></span></label>
              <div className={styles.freeNote}><b>{copy.freePlan}</b><span>{copy.freePlanHint}</span></div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHead}><div><small>{copy.privateOrders}</small><h2>{copy.restaurantOrders}</h2></div><button className={styles.testButton} onClick={createTestOrder}>{copy.testOrder}</button></div>
              <div className={styles.orderList}>
                {ownOrders.length === 0 && <div className={styles.empty}>{copy.noOrders}</div>}
                {ownOrders.map((order) => {
                  const foodTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                  const total = foodTotal + (order.deliveryFee || 0);
                  const prepMinutes = prepTimes[order.id] || 15;
                  return <article className={styles.orderCard} key={order.id}>
                    <div><b>#{order.id}</b><span>{order.createdAt}</span><strong>{money(total)}</strong></div>
                    {order.items.map((item, index) => <p key={index}>{item.quantity}× {item.name}</p>)}
                    {Boolean(order.deliveryFee) && <p>🚗 Phí giao: 15.000đ/2 km đầu + 8.000đ/km tiếp theo ({order.deliveryDistanceKm} km) = <b>{money(order.deliveryFee || 0)}</b></p>}
                    <address><small>Giao đến</small>{order.deliveryAddress}<br />{order.customerPhone}</address>
                    {order.status === "new" ? <>
                      <div className={styles.prepPicker}><span>Thời gian hoàn thành món</span><div>{[10, 15, 20, 30].map((minutes) => <button key={minutes} className={prepMinutes === minutes ? styles.prepSelected : ""} onClick={() => setPrepTimes((current) => ({ ...current, [order.id]: minutes }))}>{minutes} phút</button>)}</div><small>Khách sẽ nhận tin nhắn WeChat với thời gian dự kiến này.</small></div>
                      <div className={styles.orderActions}><button onClick={() => openRefusalDialog(order.id)} disabled={locked}>Từ chối</button><button onClick={() => acceptOrder(order.id)} disabled={locked || !profile.receivingOrders}>Xác nhận đơn · {prepMinutes} phút</button></div>
                    </> : order.status === "refused" ? <div className={styles.refusedStatus}>Đã từ chối{order.refusalReason ? <><br /><small>Lý do: {order.refusalReason}</small></> : null}</div> : <div className={styles.fulfillmentBlock}>
                      {order.status === "accepted" && <><div className={styles.acceptedStatus}>✓ Đã nhận đơn · Hoàn thành trong {order.prepMinutes || 15} phút{order.estimatedReadyAt ? ` (khoảng ${order.estimatedReadyAt})` : ""}<br /><small>Khách đã nhận thông báo bắt đầu chuẩn bị món.</small></div><button className={styles.readyAction} onClick={() => advanceOrderStatus(order.id, "ready")}>✓ Đơn đã xong</button></>}
                      {order.status === "ready" && <><div className={styles.readyStatus}>✓ Món đã hoàn thành{order.readyAt ? ` lúc ${order.readyAt}` : ""}<br /><small>Đã báo khách · Đang chờ Grab nhận món.</small></div><button className={styles.grabAction} onClick={() => advanceOrderStatus(order.id, "handed_to_grab")}>Đã giao cho Grab</button></>}
                      {order.status === "handed_to_grab" && <div className={styles.grabStatus}>✓ Đã giao cho Grab{order.handedToGrabAt ? ` lúc ${order.handedToGrabAt}` : ""}<br /><small>Khách đã nhận thông báo đơn đang được giao.</small></div>}
                    </div>}
                  </article>;
                })}
              </div>
              <div className={styles.refusalCount}>{copy.rejectionCount}: <b>{profile.refusals} / 3</b></div>
            </section>
          </aside>
        </div>
        {notice && <p className={styles.notice}>{notice}</p>}
      </div>
      <RestaurantSettingsDialog open={settingsOpen} language={language} theme={theme} onLanguageChange={changeLanguage} onThemeChange={changeTheme} onClose={() => setSettingsOpen(false)} />
      {pendingRestaurantIcon && <div className={`${styles.passwordBackdrop} ${styles.iconConfirmBackdrop}`} onClick={() => setPendingRestaurantIcon(null)}><section className={styles.iconConfirmDialog} role="dialog" aria-modal="true" aria-label="Xác nhận thay đổi icon nhà hàng" onClick={(event) => event.stopPropagation()}><div className={styles.iconConfirmPreview}><span>{accountRestaurants.find((restaurant) => restaurant.id === pendingRestaurantIcon.restaurantId)?.icon ? <img src={accountRestaurants.find((restaurant) => restaurant.id === pendingRestaurantIcon.restaurantId)?.icon} alt="Icon hiện tại" /> : <i>店</i>}<small>Hiện tại</small></span><b>→</b><span><img src={pendingRestaurantIcon.data} alt="Icon mới" /><small>Icon mới</small></span></div><h2>Thay đổi icon nhà hàng?</h2><p>Icon mới sẽ được hiển thị đồng thời trên bản Nhà hàng, Khách hàng và Nền tảng.</p><div><button onClick={() => setPendingRestaurantIcon(null)}>Hủy</button><button onClick={confirmRestaurantIcon}>Xác nhận thay đổi</button></div></section></div>}
      {restaurantSwitcherOpen && <div className={styles.accountBackdrop} onClick={() => { setRestaurantSwitcherOpen(false); setAddRestaurantOpen(false); setShowDeletedRestaurants(false); }}>
        <section className={styles.accountDialog} onClick={(event) => event.stopPropagation()}>
          <div className={styles.accountDialogHead}><div><small>TÀI KHOẢN WECHAT</small><h2>Quản lý nhà hàng</h2><p>{profile.accountWechatId || profile.wechatId} · {accountRestaurants.length}/5 nhà hàng</p></div><button onClick={() => { setRestaurantSwitcherOpen(false); setAddRestaurantOpen(false); setShowDeletedRestaurants(false); }} aria-label="Đóng">×</button></div>
          <div className={styles.managementToolbar}><button onClick={() => { setAddRestaurantOpen(true); setShowDeletedRestaurants(false); }} disabled={accountRestaurants.length >= 5}>＋ Thêm nhà hàng</button><button onClick={() => { setShowDeletedRestaurants((value) => !value); setAddRestaurantOpen(false); }}>↶ Khôi phục {deletedRestaurants.length ? `(${deletedRestaurants.length})` : ""}</button></div>
          {showDeletedRestaurants ? <div className={styles.deletedRestaurantList}><div><b>Nhà hàng đã xóa</b><small>Nhà hàng chỉ được khôi phục trong vòng 2 ngày.</small></div>{deletedRestaurants.length ? deletedRestaurants.map((record) => <article key={record.profile.id}>{record.profile.icon ? <img src={record.profile.icon} alt="" /> : <span>店</span>}<div><b>{record.profile.name}</b><small>{record.profile.address}</small><em>Còn {Math.max(1, Math.ceil((new Date(record.expiresAt).getTime() - Date.now()) / 86400000))} ngày để khôi phục</em></div><button onClick={() => restoreRestaurant(record.profile.id)}>Khôi phục</button></article>) : <p>Không có nhà hàng nào đang chờ khôi phục.</p>}</div> : <div className={styles.accountRestaurantList}>{accountRestaurants.map((restaurant) => <article className={restaurant.id === profile.id ? styles.currentRestaurant : ""} key={restaurant.id}><div className={styles.accountRestaurantMain}>{restaurant.icon ? <img src={restaurant.icon} alt="" /> : <span>店</span>}<div><b>{restaurant.name}</b><small>{restaurant.address}</small><em>{restaurant.id}</em></div>{restaurant.id === profile.id && <strong>Đang quản lý</strong>}</div><div className={styles.restaurantManagementActions}><button disabled={restaurant.id === profile.id} onClick={() => switchRestaurant(restaurant.id)}>Chuyển</button><button onClick={() => openRestaurantEditor(restaurant)}>Chỉnh sửa</button><button onClick={() => setDeleteRestaurantId(restaurant.id)}>Xóa</button></div></article>)}</div>}
          {addRestaurantOpen && <div className={styles.additionalRestaurantForm}><h3>Thêm nhà hàng mới</h3><p>Nhà hàng mới sẽ dùng chung tài khoản WeChat <b>{profile.accountWechatId || profile.wechatId}</b>, nhưng có dữ liệu quản lý riêng.</p><label>Tên nhà hàng<input value={additionalForm.name} onChange={(event) => setAdditionalForm({ ...additionalForm, name: event.target.value })} placeholder="Tên nhà hàng hoặc chi nhánh" /></label><label>Địa chỉ<input value={additionalForm.address} onChange={(event) => setAdditionalForm({ ...additionalForm, address: event.target.value })} placeholder="Địa chỉ lấy món" /></label><label>Số điện thoại<input inputMode="tel" value={additionalForm.phone} onChange={(event) => setAdditionalForm({ ...additionalForm, phone: event.target.value })} placeholder="Không bắt buộc" /></label><div><button onClick={() => setAddRestaurantOpen(false)}>Hủy</button><button onClick={createAdditionalRestaurant}>Tạo và chuyển sang</button></div></div>}
          <div className={styles.accountSafety}>🔒 Thay đổi thông tin nhà hàng sẽ tự đồng bộ sang ứng dụng Khách hàng và Nền tảng.</div>
        </section>
      </div>}
      {deleteRestaurantId && <div className={`${styles.passwordBackdrop} ${styles.deleteRestaurantBackdrop}`} onClick={() => setDeleteRestaurantId("")}><section className={styles.deleteRestaurantDialog} role="dialog" aria-modal="true" aria-label="Xác nhận xóa nhà hàng" onClick={(event) => event.stopPropagation()}><span>删</span><h2>Xác nhận xóa nhà hàng?</h2><p>Bạn sắp xóa <b>{accountRestaurants.find((restaurant) => restaurant.id === deleteRestaurantId)?.name}</b>. Nhà hàng sẽ ngừng xuất hiện trên bản Khách hàng và Nền tảng ngay lập tức.</p><strong className={styles.restoreWarning}>Bạn sẽ có 2 ngày để khôi phục lại nhà hàng này.</strong><div><button onClick={() => setDeleteRestaurantId("")}>Hủy</button><button onClick={deleteRestaurant}>Xóa nhà hàng</button></div></section></div>}
      {editRestaurantId && <div className={`${styles.passwordBackdrop} ${styles.restaurantEditBackdrop}`} onClick={() => setEditRestaurantId("")}><section className={styles.restaurantEditDialog} role="dialog" aria-modal="true" aria-label="Chỉnh sửa thông tin nhà hàng" onClick={(event) => event.stopPropagation()}><div><small>THÔNG TIN LIÊN KẾT 3 ỨNG DỤNG</small><h2>Chỉnh sửa nhà hàng</h2><p>Thông tin sau khi lưu sẽ hiển thị trên bản Nhà hàng, Khách hàng và Nền tảng.</p></div><label>Tên nhà hàng<input value={restaurantEditForm.name} onChange={(event) => setRestaurantEditForm({ ...restaurantEditForm, name: event.target.value })} /></label><label>Địa chỉ nhà hàng<input value={restaurantEditForm.address} onChange={(event) => setRestaurantEditForm({ ...restaurantEditForm, address: event.target.value })} /></label><label>WeChat ID liên hệ<input value={restaurantEditForm.wechatId} onChange={(event) => setRestaurantEditForm({ ...restaurantEditForm, wechatId: event.target.value })} /></label><label>Số điện thoại liên hệ<input inputMode="tel" value={restaurantEditForm.phone} onChange={(event) => setRestaurantEditForm({ ...restaurantEditForm, phone: event.target.value })} placeholder="Không bắt buộc" /></label><div className={styles.manageRestaurantIcon}><span>{accountRestaurants.find((restaurant) => restaurant.id === editRestaurantId)?.icon ? <img src={accountRestaurants.find((restaurant) => restaurant.id === editRestaurantId)?.icon} alt="Icon nhà hàng" /> : <i>店</i>}</span><div><b>Icon nhà hàng</b><small>Ảnh sẽ tự thu gọn và đồng bộ trên cả ba ứng dụng.</small><label>Chọn icon mới<input type="file" accept="image/*" onChange={(event) => pickRestaurantIcon(event, editRestaurantId)} /></label></div></div><div className={styles.restaurantEditActions}><button onClick={() => setEditRestaurantId("")}>Hủy</button><button onClick={saveRestaurantDetails}>Lưu thay đổi</button></div></section></div>}
      {refusalDialogOrderId && <div className={styles.passwordBackdrop} onClick={() => setRefusalDialogOrderId("")}><section className={styles.refusalDialog} onClick={(event) => event.stopPropagation()}><span>✕</span><h2>Lý do từ chối đơn</h2><p>Đơn #{refusalDialogOrderId}. Lý do này sẽ được gửi trực tiếp cho khách hàng bằng tin nhắn WeChat.</p><div className={styles.refusalReasons}>{["Món đã hết", "Nhà hàng quá tải", "Sắp đóng cửa", "Không thể chuẩn bị đúng giờ"].map((reason) => <button key={reason} className={refusalReason === reason ? styles.refusalReasonSelected : ""} onClick={() => { setRefusalReason(reason); setRefusalError(""); }}>{reason}</button>)}</div><label>Nhập lý do cụ thể<textarea value={refusalReason} onChange={(event) => { setRefusalReason(event.target.value); setRefusalError(""); }} placeholder="Ví dụ: Món A1 đã hết nguyên liệu…" autoFocus /></label>{refusalError && <small className={styles.refusalError}>{refusalError}</small>}<div className={styles.refusalActions}><button onClick={() => setRefusalDialogOrderId("")}>Hủy</button><button onClick={confirmRefusal}>Xác nhận từ chối và gửi WeChat</button></div></section></div>}
      {passwordDialog && <div className={styles.passwordBackdrop} onClick={() => setPasswordDialog(null)}><section className={styles.passwordDialog} onClick={(event) => event.stopPropagation()}><span className={styles.passwordIcon}>🔐</span><h2>{passwordDialog === "create" ? "Tạo mật khẩu chỉnh sửa" : "Nhập mật khẩu chỉnh sửa"}</h2><p>{passwordDialog === "create" ? "Mật khẩu này sẽ được yêu cầu mỗi khi mở chế độ thêm, sửa hoặc xóa món." : "Nhập mật khẩu đã tạo ở lần chỉnh sửa đầu tiên."}</p><label>Mật khẩu<input type="password" autoFocus value={passwordInput} onChange={(event) => { setPasswordInput(event.target.value); setPasswordError(""); }} onKeyDown={(event) => { if (event.key === "Enter" && passwordDialog === "unlock") void confirmEditPassword(); }} /></label>{passwordDialog === "create" && <label>Nhập lại mật khẩu<input type="password" value={passwordConfirm} onChange={(event) => { setPasswordConfirm(event.target.value); setPasswordError(""); }} onKeyDown={(event) => { if (event.key === "Enter") void confirmEditPassword(); }} /></label>}{passwordError && <span className={styles.passwordError}>{passwordError}</span>}<div><button onClick={() => setPasswordDialog(null)}>Hủy</button><button onClick={() => void confirmEditPassword()}>{passwordDialog === "create" ? "Tạo và chỉnh sửa" : "Mở khóa chỉnh sửa"}</button></div></section></div>}
      {previewDish && <div className={styles.dishPreviewBackdrop} onClick={() => setPreviewDish(null)}><section className={styles.dishPreviewDialog} onClick={(event) => event.stopPropagation()}><button className={styles.previewClose} onClick={() => setPreviewDish(null)} aria-label="Đóng ảnh món ăn">×</button><div className={styles.previewImage}>{previewDish.image ? <img src={previewDish.image} alt={previewDish.name} /> : <span>🍽</span>}</div><div className={styles.previewInfo}><small>MÓN CỦA {profile.name.toUpperCase()}</small><h2>{previewDish.name}</h2><strong>{money(previewDish.price)}</strong><span className={previewDish.available ? styles.available : styles.soldOut}>{previewDish.available ? "Còn món" : "Hết món"}</span></div></section></div>}
    </main>
  );
}
