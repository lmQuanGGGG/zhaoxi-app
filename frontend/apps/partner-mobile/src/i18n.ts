export type Language = "vi" | "en" | "zh";

export const LANGUAGE_STORAGE_KEY = "zhaoxi_partner_language_v1";

export const LANGUAGES: Array<{ code: Language; label: string; sub: string }> = [
  { code: "vi", label: "Tiếng Việt", sub: "VI" },
  { code: "en", label: "English", sub: "EN" },
  { code: "zh", label: "中文", sub: "中" },
];

export const I18N = {
  vi: {
    // Navigation
    orders: "Đơn hàng",
    revenue: "Doanh thu",
    settings: "Cài đặt",
    storeSettings: "Cài đặt cửa hàng",
    language: "Ngôn ngữ",
    languageDesc: "Chọn ngôn ngữ hiển thị trên ứng dụng",
    switchStore: "⌂  Đổi gian hàng đang quản lý",
    switchStoreTitle: "Đổi gian hàng",
    switchStoreDesc: "Chọn gian hàng mà tài khoản này được cấp quyền quản lý.",
    currentStore: "Đang chọn",
    testPushChannel: "Kiểm tra kênh thông báo",
    logout: "Đăng xuất",
    close: "Đóng",

    // Tabs / Stages
    stageWaiting: "Chờ nhận",
    stagePreparing: "Đang làm",
    stageReady: "Chờ lấy",
    processingView: "Đang xử lý",
    historyView: "Đã xử lý",

    // Filters
    filterAll: "Tất cả",
    filterCompleted: "Đã hoàn thành",
    filterCancelled: "Đã hủy",

    // Section Titles
    waitingOrdersTitle: "Đơn mới chờ nhận",
    waitingOrdersCount: (n: number) => `${n} đơn cần nhận`,
    preparingOrdersTitle: "Đang chuẩn bị",
    preparingOrdersCount: (n: number) => `${n} đơn`,
    readyOrdersTitle: "Chờ giao & Đang giao",
    lateOrdersCount: (n: number) => `${n} đơn trễ`,
    ordersCount: (n: number) => `${n} đơn`,

    // Empty states
    emptyWaitingTitle: "Chưa có đơn chờ nhận",
    emptyWaitingDesc: "Khi khách đặt món, đơn mới sẽ xuất hiện ở đây và phát chuông thông báo.",
    emptyPreparingTitle: "Chưa có món đang làm",
    emptyPreparingDesc: "Nhận đơn ở mục \"Chờ nhận\" để chuyển đơn sang khu vực bếp.",
    emptyReadyTitle: "Chưa có đơn chờ lấy",
    emptyReadyDesc: "Khi làm xong món, bấm \"Sẵn sàng giao\" để chuyển đơn sang đây chờ tài xế.",
    emptyHistoryTitle: (kind: string) => `Chưa có đơn ${kind}`,
    emptyHistoryDesc: "Các đơn đã xử lý sẽ xuất hiện ở đây.",

    // Order card & Stages
    lateTime: (m: number) => `Trễ ${m}m`,
    statusCompleted: "Đã hoàn thành",
    statusCancelled: "Đã hủy",
    stageLabel: {
      assigned: "Chờ nhận",
      preparing: "Đang làm",
      ready_for_pickup: "Chờ tài xế",
      courier_booked: "Đang giao",
      handed_off: "Đang giao",
      delivered: "Đã giao",
    } as Record<string, string>,
    nextAction: {
      assigned: { label: "Nhận đơn", action: "accept" },
      preparing: { label: "Sẵn sàng giao", action: "ready_for_pickup" },
      ready_for_pickup: { label: "Đã giao cho tài xế", action: "handed_off" },
      courier_booked: { label: "Đã giao cho tài xế", action: "handed_off" },
      handed_off: { label: "Đã hoàn thành", action: "delivered" },
    } as Record<string, { label: string; action: string }>,
    customerPaysDelivery: "Khách tự trả ship",
    externalDelivery: "Giao hàng bên ngoài",
    elapsedTime: (m: number) => `Đã xử lý: ${m} phút`,
    adjustPrepTime: (m: number) => `Điều chỉnh thời gian: ${m} phút`,
    adjustTimeLabel: "Điều chỉnh thời gian:",
    cancelOrder: "Hủy đơn",

    // Priority
    priorityNormal: "Bình thường",
    priorityHigh: "Ưu tiên",
    priorityUrgent: "Khẩn",

    // Detail grid
    quantity: "Số lượng:",
    itemSubtotal: "Tiền món:",
    grossDeliveryFee: "Phí giao hàng gốc:",
    customerDeliveryFee: "Khách trả phí giao:",
    deliveryDistance: "Quãng đường:",
    totalAmount: "Tổng đơn:",
    payment: "Thanh toán:",
    bankTransfer: "Chuyển khoản",
    cashOnDelivery: "Tiền mặt",
    paid: "Đã thanh toán",
    orderTime: "Thời gian đặt:",

    // OrderModal
    modalSingleNewOrder: "🔔 ĐƠN HÀNG MỚI CẦN NHẬN",
    modalQueueOrderProgress: (idx: number, total: number, remaining: number) =>
      remaining > 0 ? `🔔 ĐƠN MỚI (${idx}/${total}) · CÒN ${remaining} ĐƠN TIẾP THEO` : `🔔 ĐƠN MỚI (${idx}/${total}) · ĐƠN CUỐI CẦN DUYỆT`,
    prepTimeSection: "Thời gian chuẩn bị",
    minutesSuffix: "phút",
    rejectButton: "Từ chối",
    acceptButton: (m: number) => `Nhận đơn (${m}p)`,

    // Confirmation dialogs
    confirmCancelTitle: "Hủy đơn này?",
    confirmCancelDesc: "Đơn sẽ được chuyển sang trạng thái đã hủy.",
    confirmAdvanceTitle: "Chuyển trạng thái đơn?",
    confirmAdvanceDesc: (act: string) => `Xác nhận: ${act}?`,
    btnNo: "Không",
    btnLater: "Để sau",
    btnConfirm: "Xác nhận",
    btnCancelAction: "Hủy đơn",

    // Success toast
    successTitle: "Đơn hàng đã hoàn thành",

    // Push status
    pushSettingUp: "Đang thiết lập thông báo…",
    pushReady: "Push server đang bật",
    pushLocalOnly: "Chuông trên máy đang bật · Push server chưa nối",

    // Login
    loginTitle: "ZhaoXi Partner",
    loginSub: "Đăng nhập gian hàng để quản lý đơn",
    loginTabPassword: "Mật khẩu",
    loginTabPhone: "Số điện thoại",
    accountOrEmail: "Tài khoản hoặc email",
    accountPlaceholder: "quang hoặc email...",
    passwordLabel: "Mật khẩu",
    phoneNumberLabel: "Số điện thoại",
    loginButton: "Đăng nhập",
    loginNotice: "Đăng nhập bằng tài khoản hoặc số điện thoại đã đăng ký quản lý gian hàng trên hệ thống ZhaoXi.",

    // Revenue & Analytics
    revenueTitle: "Phân tích kinh doanh",
    revenueSubtitle: "Theo dõi doanh thu, đơn hàng và món bán chạy",
    d7: "7 ngày",
    d30: "30 ngày",
    d90: "90 ngày",
    revenueFood: "Doanh thu món",
    revenueGmv: "Tổng khách trả",
    revenueAov: "Đơn trung bình",
    ordersTotal: "Tổng đơn",
    completedCount: "Hoàn thành",
    cancelledCount: "Đã hủy",
    inProgressCount: "Đang xử lý",
    completionRate: "Tỷ lệ hoàn thành",
    cancellationRate: "Tỷ lệ hủy",
    avgPrepMinutes: "Chuẩn bị trung bình",
    financialBreakdown: "Chi tiết tài chính",
    itemPromotionDiscount: "Ưu đãi món",
    couponDiscount: "Giảm qua mã coupon",
    deliverySubsidy: "Trợ giá ship",
    analyticsCustomerShipping: "Phí ship khách trả",
    dailyTrend: "Xu hướng doanh thu theo ngày",
    topItems: "Món bán chạy nhất",
    quantitySold: (q: number, o: number) => `Đã bán: ${q} · ${o} đơn`,
    loadingAnalytics: "Đang tải số liệu doanh thu…",
    emptyAnalytics: "Chưa có dữ liệu kinh doanh trong kỳ này",
    refreshAnalytics: "Làm mới",
  },
  en: {
    // Navigation
    orders: "Orders",
    revenue: "Revenue",
    settings: "Settings",
    storeSettings: "Store Settings",
    language: "Language",
    languageDesc: "Choose display language for the app",
    switchStore: "⌂  Switch managed store",
    switchStoreTitle: "Switch Store",
    switchStoreDesc: "Select the store profile this account is authorized to manage.",
    currentStore: "Active",
    testPushChannel: "Test notification channel",
    logout: "Log out",
    close: "Close",

    // Tabs / Stages
    stageWaiting: "Waiting",
    stagePreparing: "Preparing",
    stageReady: "Ready",
    processingView: "Active",
    historyView: "History",

    // Filters
    filterAll: "All",
    filterCompleted: "Completed",
    filterCancelled: "Cancelled",

    // Section Titles
    waitingOrdersTitle: "New orders waiting",
    waitingOrdersCount: (n: number) => `${n} to accept`,
    preparingOrdersTitle: "Preparing",
    preparingOrdersCount: (n: number) => `${n} orders`,
    readyOrdersTitle: "Ready & Delivering",
    lateOrdersCount: (n: number) => `${n} delayed`,
    ordersCount: (n: number) => `${n} orders`,

    // Empty states
    emptyWaitingTitle: "No waiting orders",
    emptyWaitingDesc: "When customers place orders, new orders will appear here with an alert chime.",
    emptyPreparingTitle: "No orders being prepared",
    emptyPreparingDesc: "Accept orders from 'Waiting' to send them to the kitchen queue.",
    emptyReadyTitle: "No orders ready for pickup",
    emptyReadyDesc: "When food is ready, tap 'Ready for pickup' to move orders here for drivers.",
    emptyHistoryTitle: (kind: string) => `No ${kind} orders`,
    emptyHistoryDesc: "Processed orders will appear here.",

    // Order card & Stages
    lateTime: (m: number) => `Late ${m}m`,
    statusCompleted: "Completed",
    statusCancelled: "Cancelled",
    stageLabel: {
      assigned: "Waiting",
      preparing: "Preparing",
      ready_for_pickup: "Ready",
      courier_booked: "Delivering",
      handed_off: "Delivering",
      delivered: "Delivered",
    } as Record<string, string>,
    nextAction: {
      assigned: { label: "Accept order", action: "accept" },
      preparing: { label: "Ready for pickup", action: "ready_for_pickup" },
      ready_for_pickup: { label: "Hand to driver", action: "handed_off" },
      courier_booked: { label: "Hand to driver", action: "handed_off" },
      handed_off: { label: "Complete order", action: "delivered" },
    } as Record<string, { label: string; action: string }>,
    customerPaysDelivery: "Customer pays delivery",
    externalDelivery: "External delivery",
    elapsedTime: (m: number) => `Elapsed: ${m} min`,
    adjustPrepTime: (m: number) => `Adjust time: ${m} min`,
    adjustTimeLabel: "Adjust time:",
    cancelOrder: "Reject",

    // Priority
    priorityNormal: "Normal",
    priorityHigh: "High",
    priorityUrgent: "Urgent",

    // Detail grid
    quantity: "Quantity:",
    itemSubtotal: "Item subtotal:",
    grossDeliveryFee: "Gross delivery fee:",
    customerDeliveryFee: "Customer delivery fee:",
    deliveryDistance: "Distance:",
    totalAmount: "Total:",
    payment: "Payment:",
    bankTransfer: "Bank transfer",
    cashOnDelivery: "Cash on delivery",
    paid: "Paid",
    orderTime: "Order time:",

    // OrderModal
    modalSingleNewOrder: "🔔 NEW ORDER REQUIRES ACCEPTANCE",
    modalQueueOrderProgress: (idx: number, total: number, remaining: number) =>
      remaining > 0 ? `🔔 NEW ORDER (${idx}/${total}) · ${remaining} MORE IN QUEUE` : `🔔 NEW ORDER (${idx}/${total}) · LAST IN QUEUE`,
    prepTimeSection: "Preparation time",
    minutesSuffix: "min",
    rejectButton: "Reject",
    acceptButton: (m: number) => `Accept (${m}m)`,

    // Confirmation dialogs
    confirmCancelTitle: "Cancel this order?",
    confirmCancelDesc: "The order will be moved to cancelled status.",
    confirmAdvanceTitle: "Update order status?",
    confirmAdvanceDesc: (act: string) => `Confirm: ${act}?`,
    btnNo: "No",
    btnLater: "Later",
    btnConfirm: "Confirm",
    btnCancelAction: "Cancel order",

    // Success toast
    successTitle: "Order completed",

    // Push status
    pushSettingUp: "Configuring notifications…",
    pushReady: "Push notifications active",
    pushLocalOnly: "In-app alerts on · Push server not connected",

    // Login
    loginTitle: "ZhaoXi Partner",
    loginSub: "Sign in to manage store orders",
    loginTabPassword: "Password",
    loginTabPhone: "Phone number",
    accountOrEmail: "Username or email",
    accountPlaceholder: "username or email...",
    passwordLabel: "Password",
    phoneNumberLabel: "Phone number",
    loginButton: "Log in",
    loginNotice: "Sign in with registered credentials to access your ZhaoXi partner store portal.",

    // Revenue & Analytics
    revenueTitle: "Business Analytics",
    revenueSubtitle: "Track revenue, orders and bestselling items",
    d7: "7 days",
    d30: "30 days",
    d90: "90 days",
    revenueFood: "Food revenue",
    revenueGmv: "Customer GMV",
    revenueAov: "Avg order value",
    ordersTotal: "Total orders",
    completedCount: "Completed",
    cancelledCount: "Cancelled",
    inProgressCount: "In progress",
    completionRate: "Completion rate",
    cancellationRate: "Cancellation rate",
    avgPrepMinutes: "Avg prep time",
    financialBreakdown: "Financial breakdown",
    itemPromotionDiscount: "Item discounts",
    couponDiscount: "Coupon discounts",
    deliverySubsidy: "Delivery subsidy",
    analyticsCustomerShipping: "Customer shipping",
    dailyTrend: "Daily revenue trend",
    topItems: "Top-selling items",
    quantitySold: (q: number, o: number) => `Sold: ${q} · ${o} orders`,
    loadingAnalytics: "Loading revenue analytics…",
    emptyAnalytics: "No business data for this period",
    refreshAnalytics: "Refresh",
  },
  zh: {
    // Navigation
    orders: "订单",
    revenue: "营收",
    settings: "设置",
    storeSettings: "门店设置",
    language: "语言",
    languageDesc: "选择应用界面语言",
    switchStore: "⌂  切换管理的店铺",
    switchStoreTitle: "切换店铺",
    switchStoreDesc: "选择此账号有权管理的店铺档案。",
    currentStore: "当前选中",
    testPushChannel: "检查通知渠道",
    logout: "退出登录",
    close: "关闭",

    // Tabs / Stages
    stageWaiting: "待接单",
    stagePreparing: "制作中",
    stageReady: "待取餐",
    processingView: "处理中",
    historyView: "已处理",

    // Filters
    filterAll: "全部",
    filterCompleted: "已完成",
    filterCancelled: "已取消",

    // Section Titles
    waitingOrdersTitle: "新订单待接单",
    waitingOrdersCount: (n: number) => `${n} 笔待处理`,
    preparingOrdersTitle: "制作中",
    preparingOrdersCount: (n: number) => `${n} 笔`,
    readyOrdersTitle: "待取餐与配送中",
    lateOrdersCount: (n: number) => `${n} 笔超时`,
    ordersCount: (n: number) => `${n} 笔`,

    // Empty states
    emptyWaitingTitle: "暂无待接订单",
    emptyWaitingDesc: "顾客下单后，新订单将在此处显示并播放提示音。",
    emptyPreparingTitle: "暂无制作中订单",
    emptyPreparingDesc: "在“待接单”中接单以将订单转入后厨制作。",
    emptyReadyTitle: "暂无待取餐订单",
    emptyReadyDesc: "餐品制作完成后，点击“出餐完成”转至此处等待骑手。",
    emptyHistoryTitle: (kind: string) => `暂无${kind}订单`,
    emptyHistoryDesc: "已处理的订单将显示在此处。",

    // Order card & Stages
    lateTime: (m: number) => `超时 ${m} 分钟`,
    statusCompleted: "已完成",
    statusCancelled: "已取消",
    stageLabel: {
      assigned: "待接单",
      preparing: "制作中",
      ready_for_pickup: "待取餐",
      courier_booked: "配送中",
      handed_off: "配送中",
      delivered: "已送达",
    } as Record<string, string>,
    nextAction: {
      assigned: { label: "确认接单", action: "accept" },
      preparing: { label: "出餐完成", action: "ready_for_pickup" },
      ready_for_pickup: { label: "移交骑手", action: "handed_off" },
      courier_booked: { label: "移交骑手", action: "handed_off" },
      handed_off: { label: "完成订单", action: "delivered" },
    } as Record<string, { label: string; action: string }>,
    customerPaysDelivery: "顾客自付运费",
    externalDelivery: "第三方配送",
    elapsedTime: (m: number) => `已用时：${m} 分钟`,
    adjustPrepTime: (m: number) => `调整制作时间：${m} 分钟`,
    adjustTimeLabel: "调整制作时间：",
    cancelOrder: "拒单",

    // Priority
    priorityNormal: "普通",
    priorityHigh: "优先",
    priorityUrgent: "加急",

    // Detail grid
    quantity: "数量：",
    itemSubtotal: "菜品金额：",
    grossDeliveryFee: "原始配送费：",
    customerDeliveryFee: "顾客付运费：",
    deliveryDistance: "配送距离：",
    totalAmount: "订单总额：",
    payment: "支付方式：",
    bankTransfer: "转账",
    cashOnDelivery: "货到付款",
    paid: "已支付",
    orderTime: "下单时间：",

    // OrderModal
    modalSingleNewOrder: "🔔 有新订单待接单",
    modalQueueOrderProgress: (idx: number, total: number, remaining: number) =>
      remaining > 0 ? `🔔 新订单 (${idx}/${total}) · 还有 ${remaining} 笔待处理` : `🔔 新订单 (${idx}/${total}) · 最后一笔待处理`,
    prepTimeSection: "备餐制作时间",
    minutesSuffix: "分钟",
    rejectButton: "拒单",
    acceptButton: (m: number) => `接单 (${m}分钟)`,

    // Confirmation dialogs
    confirmCancelTitle: "取消此订单？",
    confirmCancelDesc: "订单将被转为已取消状态。",
    confirmAdvanceTitle: "更新订单状态？",
    confirmAdvanceDesc: (act: string) => `确认：${act}？`,
    btnNo: "取消",
    btnLater: "稍后",
    btnConfirm: "确认",
    btnCancelAction: "确认取消",

    // Success toast
    successTitle: "订单已完成",

    // Push status
    pushSettingUp: "正在配置通知…",
    pushReady: "推送服务已开启",
    pushLocalOnly: "本地提醒已开启 · 推送服务未连接",

    // Login
    loginTitle: "赵喜 商家端",
    loginSub: "登录商家后台管理店铺订单",
    loginTabPassword: "密码登录",
    loginTabPhone: "手机登录",
    accountOrEmail: "账号或邮箱",
    accountPlaceholder: "账号或邮箱...",
    passwordLabel: "密码",
    phoneNumberLabel: "手机号码",
    loginButton: "登录",
    loginNotice: "使用已开通商家权限的账号或手机号登录赵喜配送平台。",

    // Revenue & Analytics
    revenueTitle: "餐厅经营分析",
    revenueSubtitle: "追踪菜品营收、订单与热销商品",
    d7: "7天",
    d30: "30天",
    d90: "90天",
    revenueFood: "餐品实际收入",
    revenueGmv: "客户支付总额",
    revenueAov: "平均客单价",
    ordersTotal: "总订单数",
    completedCount: "已完成",
    cancelledCount: "已取消",
    inProgressCount: "处理中",
    completionRate: "完成率",
    cancellationRate: "取消率",
    avgPrepMinutes: "平均备餐时间",
    financialBreakdown: "财务收支细目",
    itemPromotionDiscount: "菜品促销减免",
    couponDiscount: "优惠券抵扣",
    deliverySubsidy: "配送运费补贴",
    analyticsCustomerShipping: "客户实付运费",
    dailyTrend: "每日营收趋势",
    topItems: "热销菜品排行",
    quantitySold: (q: number, o: number) => `已售: ${q} · ${o} 笔订单`,
    loadingAnalytics: "正在加载营收数据…",
    emptyAnalytics: "此周期暂无经营数据",
    refreshAnalytics: "刷新",
  },
};
