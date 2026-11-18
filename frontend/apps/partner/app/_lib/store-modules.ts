/**
 * One profile per kind of store a partner can run. Store sign-up (/onboarding) and the partner
 * workspace both read it, so a car-rental company is asked about its fleet when it applies and,
 * once approved, lands on vehicle management without a kitchen queue.
 *
 * The codes are the backend SERVICE_MODULES (backend/lib/core/domain.ts). STORE_MODULES are the ones
 * a partner can apply for; the workspace also serves stores ZhaoXi runs itself (community, emergency,
 * payment) and "general" for a store whose kind cannot be told.
 */
import type { ZhaoXiLocale } from "@zhaoxi/i18n";

export const STORE_MODULES = ["food", "market", "housing", "travel", "car-rental", "translation", "visa"] as const;
export type StoreModule = (typeof STORE_MODULES)[number];
export const isStoreModule = (value: unknown): value is StoreModule => STORE_MODULES.includes(value as StoreModule);

/** Service modules a store's catalogue can live in (same codes as backend SERVICE_MODULES, minus none). */
export const SERVICE_MODULES = [...STORE_MODULES, "community", "emergency", "payment"] as const;
export type ServiceModule = (typeof SERVICE_MODULES)[number];
export const isServiceModule = (value: unknown): value is ServiceModule => SERVICE_MODULES.includes(value as ServiceModule);

/** What the workspace adapts to: a service module, or "general" when the kind of store is unknown. */
export type WorkspaceModule = ServiceModule | "general";

/**
 * Store types in production are free text set when each store was created ("restaurant",
 * "translation-interpreting", "real-estate", "grocery-store", "tour-operator", "visa-service",
 * "community-hub", "emergency-assistance", "payment-assistance", "life-service", "Tech"…), so
 * the type is matched by words, in English, Vietnamese (accents stripped) and Chinese.
 * Order matters: the more specific kinds are tried first ("grocery-store" is a shop, not food).
 */
const RULES: [ServiceModule, RegExp][] = [
  ["car-rental", /(^|-)(car|cars|vehicle|vehicles|xe|chauffeur|limo|limousine|transport)(-|$)|car-?rental|thue-?xe|租车|租車|包车|包車/],
  ["translation", /translat|interpret|phien-?dich|dich-?thuat|翻译|翻譯|口译|口譯/],
  ["visa", /visa|immigration|(^|-)permit|thi-?thuc|签证|簽證/],
  ["emergency", /emergenc|rescue|khan-?cap|cuu-?ho|紧急|緊急|急救/],
  ["payment", /payment|(^|-)pay(-|$)|top-?up|thanh-?toan|支付|缴费|繳費/],
  ["housing", /real-?estate|housing|apartment|homestay|accommodation|property|lodging|(^|-)nha-?o(-|$)|bat-?dong-?san|can-?ho|房/],
  ["travel", /travel|(^|-)tours?(-|$)|tour-?operator|touris|du-?lich|旅/],
  ["market", /market|grocer|(^|-)(shop|store|retail|mart|supermarket|cho)(-|$)|cua-?hang|tap-?hoa|商城|超市|商店/],
  ["community", /communit|life-?service|(^|-)(club|association|hub)(-|$)|cong-?dong|社区|社區|生活/],
  ["food", /food|restaurant|(^|-)(cafe|coffee|bakery|tea|eatery|bistro|kitchen|bar)(-|$)|nha-?hang|quan-?an|an-?uong|ca-?phe|餐|饮|飲|咖啡/],
];

const normalize = (value: string) => value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[\s_/]+/g, "-");

/**
 * Kind of store from its organization type. null: no type yet (session still loading);
 * "general": a type that matches nothing (the workspace may still infer it from the catalogue).
 */
export function storeModuleOf(type: string | null | undefined): WorkspaceModule | null {
  const raw = String(type || "").trim();
  if (!raw) return null;
  const code = normalize(raw);
  if (isServiceModule(code)) return code;
  return RULES.find(([, rule]) => rule.test(code))?.[0] ?? "general";
}

/** The catalogue module that holds most of a store's items (used when its type says nothing). */
export function dominantModule(moduleCodes: (string | null | undefined)[]): ServiceModule | null {
  const counts = new Map<ServiceModule, number>();
  for (const code of moduleCodes) if (isServiceModule(code)) counts.set(code, (counts.get(code) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

type L = Record<ZhaoXiLocale, string>;
const L = (vi: string, en: string, zh: string, tw = zh): L => ({ "vi-VN": vi, "en-US": en, "zh-CN": zh, "zh-TW": tw });

export type StoreFeatures = {
  /** Kitchen queue, opening hours & kitchen capacity, coupons, dish promotions. */
  kitchen: boolean;
  /** Dedicated inventory screen in the workspace nav. */
  inventory: "housing" | "travel" | null;
};

export const STORE_FEATURES: Record<WorkspaceModule, StoreFeatures> = {
  food: { kitchen: true, inventory: null },
  market: { kitchen: false, inventory: null },
  housing: { kitchen: false, inventory: "housing" },
  travel: { kitchen: false, inventory: "travel" },
  "car-rental": { kitchen: false, inventory: null },
  translation: { kitchen: false, inventory: null },
  visa: { kitchen: false, inventory: null },
  community: { kitchen: false, inventory: null },
  emergency: { kitchen: false, inventory: null },
  payment: { kitchen: false, inventory: null },
  general: { kitchen: false, inventory: null },
};

/** Words that change with the kind of store: what an order is called and what the catalogue holds. */
export const STORE_WORDS: Record<WorkspaceModule, { catalog: L; orders: L; inProgress: L; revenue: L; top: L }> = {
  food: { catalog: L("Thực đơn", "Menu", "菜单", "菜單"), orders: L("Đơn món ăn", "Food orders", "餐饮订单", "餐飲訂單"), inProgress: L("Đang chuẩn bị", "Preparing", "备餐中", "備餐中"), revenue: L("Doanh thu món", "Food revenue", "菜品收入", "餐點收入"), top: L("Món bán chạy", "Best sellers", "热销菜品", "熱銷餐點") },
  market: { catalog: L("Sản phẩm", "Products", "商品"), orders: L("Đơn hàng", "Orders", "订单", "訂單"), inProgress: L("Đang đóng gói", "Packing", "打包中"), revenue: L("Doanh thu hàng", "Product revenue", "商品收入"), top: L("Sản phẩm bán chạy", "Best-selling products", "热销商品", "熱銷商品") },
  housing: { catalog: L("Nhà/phòng cho thuê", "Listings", "房源"), orders: L("Yêu cầu thuê", "Rental inquiries", "租房咨询", "租屋諮詢"), inProgress: L("Đang tư vấn", "In progress", "跟进中", "跟進中"), revenue: L("Doanh thu cho thuê", "Rental revenue", "租赁收入", "租賃收入"), top: L("Nhà/phòng được quan tâm", "Most requested listings", "热门房源", "熱門房源") },
  travel: { catalog: L("Tour & trải nghiệm", "Tours & experiences", "旅游产品", "旅遊產品"), orders: L("Booking tour", "Tour bookings", "旅游预约", "旅遊預約"), inProgress: L("Đã xác nhận", "Confirmed", "已确认", "已確認"), revenue: L("Doanh thu tour", "Tour revenue", "旅游收入", "旅遊收入"), top: L("Tour đặt nhiều", "Most booked tours", "热门行程", "熱門行程") },
  "car-rental": { catalog: L("Xe cho thuê", "Vehicles", "车辆", "車輛"), orders: L("Đơn thuê xe", "Rental bookings", "租车订单", "租車訂單"), inProgress: L("Đang chuẩn bị xe", "Preparing vehicle", "备车中", "備車中"), revenue: L("Doanh thu thuê xe", "Rental revenue", "租车收入", "租車收入"), top: L("Xe được thuê nhiều", "Most rented vehicles", "热门车辆", "熱門車輛") },
  translation: { catalog: L("Gói phiên dịch", "Translation services", "翻译服务", "翻譯服務"), orders: L("Yêu cầu phiên dịch", "Translation requests", "翻译需求", "翻譯需求"), inProgress: L("Đang thực hiện", "In progress", "进行中", "進行中"), revenue: L("Doanh thu dịch vụ", "Service revenue", "服务收入", "服務收入"), top: L("Dịch vụ dùng nhiều", "Most used services", "热门服务", "熱門服務") },
  visa: { catalog: L("Gói thủ tục", "Visa services", "签证服务", "簽證服務"), orders: L("Hồ sơ khách", "Client cases", "客户案件", "客戶案件"), inProgress: L("Đang xử lý hồ sơ", "Processing", "办理中", "辦理中"), revenue: L("Doanh thu dịch vụ", "Service revenue", "服务收入", "服務收入"), top: L("Dịch vụ dùng nhiều", "Most used services", "热门服务", "熱門服務") },
  community: { catalog: L("Hoạt động & dịch vụ", "Activities & services", "活动与生活服务", "活動與生活服務"), orders: L("Đăng ký tham gia", "Sign-ups", "报名", "報名"), inProgress: L("Đang xử lý", "In progress", "处理中", "處理中"), revenue: L("Doanh thu", "Revenue", "收入"), top: L("Hoạt động được quan tâm", "Most popular", "热门活动", "熱門活動") },
  emergency: { catalog: L("Dịch vụ hỗ trợ", "Assistance services", "援助服务", "援助服務"), orders: L("Yêu cầu hỗ trợ", "Assistance requests", "求助请求", "求助請求"), inProgress: L("Đang hỗ trợ", "Assisting", "处理中", "處理中"), revenue: L("Doanh thu dịch vụ", "Service revenue", "服务收入", "服務收入"), top: L("Dịch vụ được gọi nhiều", "Most requested", "常用服务", "常用服務") },
  payment: { catalog: L("Dịch vụ thanh toán", "Payment services", "支付服务", "支付服務"), orders: L("Yêu cầu thanh toán", "Payment requests", "支付请求", "支付請求"), inProgress: L("Đang xử lý", "Processing", "处理中", "處理中"), revenue: L("Doanh thu phí dịch vụ", "Fee revenue", "服务费收入", "服務費收入"), top: L("Dịch vụ dùng nhiều", "Most used services", "热门服务", "熱門服務") },
  general: { catalog: L("Sản phẩm & dịch vụ", "Products & services", "商品与服务", "商品與服務"), orders: L("Đơn hàng", "Orders", "订单", "訂單"), inProgress: L("Đang xử lý", "In progress", "处理中", "處理中"), revenue: L("Doanh thu", "Revenue", "收入"), top: L("Dịch vụ dùng nhiều", "Most used", "热门服务", "熱門服務") },
};

/* ---------------------------------------------------------------- sign-up questions */

export type SignupQuestion = {
  key: string;
  /** Vietnamese label doubles as the line written into the application notes Admin reads. */
  label: L;
  kind: "text" | "number" | "choice" | "multi";
  required?: boolean;
  placeholder?: L;
  options?: { value: string; label: L }[];
  max?: number;
};

const o = (value: string, label: L) => ({ value, label });

/** Extra questions per kind of store, asked right after the store picks its service. */
export const SIGNUP_QUESTIONS: Record<StoreModule, SignupQuestion[]> = {
  food: [
    { key: "cuisine", kind: "text", required: true, max: 120, label: L("Món/ẩm thực chính", "Main cuisine", "主营菜系", "主營菜系"), placeholder: L("Ví dụ: cơm gà, phở, món Hoa", "e.g. chicken rice, pho, Chinese dishes", "例如：鸡饭、河粉、中餐", "例如：雞飯、河粉、中餐") },
    { key: "hours", kind: "text", required: true, max: 60, label: L("Giờ mở cửa", "Opening hours", "营业时间", "營業時間"), placeholder: L("07:00–21:00", "07:00–21:00", "07:00–21:00") },
    { key: "fulfilment", kind: "multi", required: true, label: L("Hình thức phục vụ", "How customers get food", "服务方式", "服務方式"), options: [o("delivery", L("Giao tận nơi", "Delivery", "外卖配送", "外送")), o("pickup", L("Khách tự lấy", "Pickup", "到店自取")), o("dinein", L("Ăn tại quán", "Dine-in", "堂食", "內用"))] },
  ],
  market: [
    { key: "goods", kind: "text", required: true, max: 160, label: L("Mặt hàng chính", "Main products", "主营商品", "主營商品"), placeholder: L("Ví dụ: tạp hoá Trung Quốc, mỹ phẩm, đặc sản", "e.g. Chinese groceries, cosmetics, local specialties", "例如：中国杂货、美妆、特产", "例如：中國雜貨、美妝、特產") },
    { key: "channel", kind: "choice", required: true, label: L("Hình thức bán", "Sales channel", "销售方式", "銷售方式"), options: [o("shop", L("Có cửa hàng", "Physical shop", "实体店", "實體店")), o("online", L("Chỉ bán online", "Online only", "仅线上")), o("both", L("Cả hai", "Both", "两者都有", "兩者都有"))] },
    { key: "deliveryArea", kind: "text", max: 120, label: L("Khu vực giao hàng", "Delivery area", "配送范围", "配送範圍"), placeholder: L("Ví dụ: toàn Đà Nẵng", "e.g. all of Da Nang", "例如：岘港全市", "例如：峴港全市") },
  ],
  housing: [
    { key: "propertyKinds", kind: "multi", required: true, label: L("Loại hình cho thuê", "Property types", "房源类型", "房源類型"), options: [o("apartment", L("Căn hộ", "Apartment", "公寓")), o("room", L("Phòng trọ", "Room", "单间", "雅房")), o("house", L("Nhà nguyên căn", "Whole house", "整栋", "整棟")), o("homestay", L("Homestay / khách sạn mini", "Homestay / mini hotel", "民宿 / 小酒店"))] },
    { key: "units", kind: "number", required: true, max: 5, label: L("Số căn/phòng đang có", "Number of units", "房源数量", "房源數量"), placeholder: L("Ví dụ: 6", "e.g. 6", "例如：6") },
    { key: "priceRange", kind: "text", max: 80, label: L("Khoảng giá thuê", "Rent range", "租金范围", "租金範圍"), placeholder: L("Ví dụ: 5–12 triệu/tháng", "e.g. 5–12 million VND/month", "例如：每月 500–1200 万越盾", "例如：每月 500–1200 萬越盾") },
    { key: "areas", kind: "text", max: 120, label: L("Khu vực", "Areas", "所在区域", "所在區域"), placeholder: L("Ví dụ: Sơn Trà, Ngũ Hành Sơn", "e.g. Son Tra, Ngu Hanh Son", "例如：山茶郡、五行山郡") },
  ],
  travel: [
    { key: "tourKinds", kind: "multi", required: true, label: L("Sản phẩm du lịch", "What you offer", "旅游产品", "旅遊產品"), options: [o("day", L("Tour trong ngày", "Day tours", "一日游", "一日遊")), o("multi", L("Tour nhiều ngày", "Multi-day tours", "多日游", "多日遊")), o("ticket", L("Vé tham quan", "Tickets", "门票", "門票")), o("guide", L("Hướng dẫn viên riêng", "Private guide", "私人导游", "私人導遊"))] },
    { key: "languages", kind: "multi", required: true, label: L("Ngôn ngữ phục vụ", "Service languages", "服务语言", "服務語言"), options: [o("zh", L("Tiếng Trung", "Chinese", "中文")), o("vi", L("Tiếng Việt", "Vietnamese", "越南语", "越南語")), o("en", L("Tiếng Anh", "English", "英语", "英語")), o("ko", L("Tiếng Hàn", "Korean", "韩语", "韓語"))] },
    { key: "travelLicense", kind: "text", max: 60, label: L("Giấy phép lữ hành", "Tour operator licence", "旅行社许可证", "旅行社許可證"), placeholder: L("Số giấy phép (nếu có)", "Licence number, if any", "许可证编号（如有）", "許可證編號（如有）") },
  ],
  "car-rental": [
    { key: "vehicleKinds", kind: "multi", required: true, label: L("Loại xe", "Vehicle types", "车型", "車型"), options: [o("scooter", L("Xe máy", "Scooters", "摩托车", "機車")), o("car", L("Ô tô 4–7 chỗ", "Cars (4–7 seats)", "轿车 4–7 座", "轎車 4–7 座")), o("van", L("Xe 16 chỗ trở lên", "Vans (16+ seats)", "16 座以上", "16 座以上")), o("ev", L("Xe điện", "Electric", "电动车", "電動車"))] },
    { key: "fleet", kind: "number", required: true, max: 4, label: L("Số xe đang có", "Fleet size", "车辆数量", "車輛數量"), placeholder: L("Ví dụ: 10", "e.g. 10", "例如：10") },
    { key: "driver", kind: "choice", required: true, label: L("Hình thức thuê", "Rental type", "租车方式", "租車方式"), options: [o("driver", L("Có tài xế", "With driver", "带司机", "附司機")), o("self", L("Tự lái", "Self-drive", "自驾", "自駕")), o("both", L("Cả hai", "Both", "两者都有", "兩者都有"))] },
  ],
  translation: [
    { key: "pairs", kind: "multi", required: true, label: L("Cặp ngôn ngữ", "Language pairs", "语言组合", "語言組合"), options: [o("zh-vi", L("Trung – Việt", "Chinese – Vietnamese", "中文 – 越南语", "中文 – 越南語")), o("zh-en", L("Trung – Anh", "Chinese – English", "中文 – 英语", "中文 – 英語")), o("vi-en", L("Việt – Anh", "Vietnamese – English", "越南语 – 英语", "越南語 – 英語")), o("ko-vi", L("Hàn – Việt", "Korean – Vietnamese", "韩语 – 越南语", "韓語 – 越南語"))] },
    { key: "formats", kind: "multi", required: true, label: L("Hình thức", "Formats", "服务形式", "服務形式"), options: [o("onsite", L("Phiên dịch trực tiếp", "On-site interpreting", "现场口译", "現場口譯")), o("remote", L("Phiên dịch online", "Remote interpreting", "线上口译", "線上口譯")), o("documents", L("Dịch tài liệu", "Document translation", "文件翻译", "文件翻譯")), o("notarized", L("Dịch công chứng", "Notarised translation", "公证翻译", "公證翻譯"))] },
    { key: "certificates", kind: "text", max: 120, label: L("Bằng cấp / chứng chỉ", "Qualifications", "资质证书", "資質證書"), placeholder: L("Ví dụ: HSK 6, cử nhân ngôn ngữ Trung", "e.g. HSK 6, BA in Chinese", "例如：HSK 6、中文本科", "例如：HSK 6、中文學士") },
  ],
  visa: [
    { key: "visaServices", kind: "multi", required: true, label: L("Dịch vụ thủ tục", "Services", "办理项目", "辦理項目"), options: [o("extension", L("Gia hạn visa", "Visa extension", "签证续签", "簽證延期")), o("trc", L("Thẻ tạm trú", "Temporary residence card", "暂住证", "居留證")), o("workpermit", L("Giấy phép lao động", "Work permit", "工作许可", "工作許可")), o("outbound", L("Visa đi nước khác", "Visas for other countries", "其他国家签证", "其他國家簽證"))] },
    { key: "processing", kind: "text", required: true, max: 60, label: L("Thời gian xử lý thường gặp", "Typical processing time", "一般办理时间", "一般辦理時間"), placeholder: L("Ví dụ: 5–7 ngày làm việc", "e.g. 5–7 working days", "例如：5–7 个工作日", "例如：5–7 個工作天") },
    { key: "serviceLicense", kind: "text", max: 60, label: L("Giấy phép hành nghề", "Practice licence", "执业许可", "執業許可"), placeholder: L("Số giấy phép (nếu có)", "Licence number, if any", "许可证编号（如有）", "許可證編號（如有）") },
  ],
};

export type SignupAnswers = Record<string, string | string[]>;

export function questionError(question: SignupQuestion, answer: string | string[] | undefined): "required" | "choose" | "tooLong" | "number" | null {
  const value = Array.isArray(answer) ? answer : String(answer ?? "").trim();
  if (question.required && (Array.isArray(value) ? value.length === 0 : !value)) return question.options ? "choose" : "required";
  if (typeof value === "string" && value) {
    if (question.kind === "number" && !/^\d+$/.test(value)) return "number";
    if (question.max && value.length > question.max) return "tooLong";
  }
  return null;
}

/** "Label: value" lines in Vietnamese for the application notes (Admin reviews in Vietnamese). */
export function answersToLines(module: StoreModule, answers: SignupAnswers): string[] {
  return SIGNUP_QUESTIONS[module].flatMap((question) => {
    const answer = answers[question.key];
    const values = Array.isArray(answer) ? answer : [String(answer ?? "").trim()].filter(Boolean);
    if (!values.length) return [];
    const shown = question.options ? values.map((v) => question.options?.find((opt) => opt.value === v)?.label["vi-VN"] || v) : values;
    return [`${question.label["vi-VN"]}: ${shown.join(", ")}`];
  });
}

/** Reads answers back from note lines written by answersToLines (unknown lines are left to the caller). */
export function answersFromLines(module: StoreModule, lines: Map<string, string>): SignupAnswers {
  const out: SignupAnswers = {};
  for (const question of SIGNUP_QUESTIONS[module]) {
    const raw = lines.get(question.label["vi-VN"]);
    if (raw === undefined) continue;
    if (question.options) {
      const values = raw.split(",").map((part) => part.trim()).map((part) => question.options?.find((opt) => opt.label["vi-VN"] === part)?.value).filter((v): v is string => Boolean(v));
      out[question.key] = question.kind === "multi" ? values : values[0] || "";
    } else out[question.key] = raw;
  }
  return out;
}

/** Every Vietnamese question label, so the notes parser can tell module answers from free text. */
export const ALL_QUESTION_LABELS = new Set(STORE_MODULES.flatMap((module) => SIGNUP_QUESTIONS[module].map((q) => q.label["vi-VN"])));
