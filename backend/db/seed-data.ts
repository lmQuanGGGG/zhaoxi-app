export const languageSeed = [
  { code: "zh-CN", name: "Simplified Chinese", nativeName: "简体中文", isDefault: true, sortOrder: 1 },
  { code: "zh-TW", name: "Traditional Chinese", nativeName: "繁體中文", isDefault: false, sortOrder: 2 },
  { code: "vi-VN", name: "Vietnamese", nativeName: "Tiếng Việt", isDefault: false, sortOrder: 3 },
  { code: "en-US", name: "English", nativeName: "English", isDefault: false, sortOrder: 4 },
] as const;

export const moduleSeed = [
  { code: "food", icon: "🍜", route: "/food", sortOrder: 1, names: { "zh-CN": "外卖订餐", "zh-TW": "外賣訂餐", "vi-VN": "Đặt món", "en-US": "Food delivery" } },
  { code: "housing", icon: "🏠", route: "/housing", sortOrder: 2, names: { "zh-CN": "岘港租房", "zh-TW": "峴港租房", "vi-VN": "Thuê nhà Đà Nẵng", "en-US": "Da Nang housing" } },
  { code: "visa", icon: "🛂", route: "/visa", sortOrder: 3, names: { "zh-CN": "护照签证", "zh-TW": "護照簽證", "vi-VN": "Hộ chiếu và thị thực", "en-US": "Passport and visa" } },
  { code: "car-rental", icon: "🚗", route: "/car-rental", sortOrder: 4, names: { "zh-CN": "租车服务", "zh-TW": "租車服務", "vi-VN": "Thuê xe", "en-US": "Car rental" } },
  { code: "translation", icon: "🗣️", route: "/translation", sortOrder: 5, names: { "zh-CN": "翻译服务", "zh-TW": "翻譯服務", "vi-VN": "Phiên dịch", "en-US": "Interpretation" } },
  { code: "travel", icon: "🏝️", route: "/travel", sortOrder: 6, names: { "zh-CN": "旅游服务", "zh-TW": "旅遊服務", "vi-VN": "Du lịch", "en-US": "Travel" } },
  { code: "payment", icon: "💳", route: "/payment", sortOrder: 7, names: { "zh-CN": "支付服务", "zh-TW": "支付服務", "vi-VN": "Thanh toán", "en-US": "Payments" } },
  { code: "community", icon: "👥", route: "/community", sortOrder: 8, names: { "zh-CN": "华人社区", "zh-TW": "華人社區", "vi-VN": "Cộng đồng Người Hoa", "en-US": "Chinese community" } },
  { code: "market", icon: "🛍️", route: "/market", sortOrder: 9, names: { "zh-CN": "华人商城", "zh-TW": "華人商城", "vi-VN": "Chợ Người Hoa", "en-US": "Chinese market" } },
  { code: "emergency", icon: "🆘", route: "/emergency", sortOrder: 10, isEmergency: true, names: { "zh-CN": "紧急帮助", "zh-TW": "緊急幫助", "vi-VN": "Hỗ trợ khẩn cấp", "en-US": "Emergency help" } },
] as const;
