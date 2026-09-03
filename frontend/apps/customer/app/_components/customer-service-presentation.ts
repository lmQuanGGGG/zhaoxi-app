import type { CustomerIconName } from "./CustomerIcon";

export type CustomerServiceGroup =
  | "all"
  | "life"
  | "food"
  | "housing"
  | "travel"
  | "transport"
  | "finance"
  | "community"
  | "support";
export type CustomerServicePresentation = {
  icon: CustomerIconName;
  asset?: string;
  group: CustomerServiceGroup;
  accent: string;
  tint: string;
  description: Record<string, string>;
};

const asset = (name: string) => `/ui/18.3.2/service-icons/${name}.webp`;
export const CUSTOMER_SERVICE_PRESENTATION_RELEASE = "18.3.4";

export const customerServicePresentation: Record<
  string,
  CustomerServicePresentation
> = {
  food: {
    icon: "food",
    asset: asset("food"),
    group: "food",
    accent: "var(--zx-service-food)",
    tint: "var(--zx-service-food-soft)",
    description: {
      "vi-VN": "Món ăn và cửa hàng gần bạn",
      "en-US": "Food and nearby restaurants",
      "zh-CN": "餐饮与附近商家",
      "zh-TW": "餐飲與附近商家",
    },
  },
  housing: {
    icon: "housing",
    asset: asset("housing"),
    group: "housing",
    accent: "var(--zx-service-housing)",
    tint: "var(--zx-service-housing-soft)",
    description: {
      "vi-VN": "Nhà và phòng tại Đà Nẵng",
      "en-US": "Homes and rooms in Da Nang",
      "zh-CN": "岘港住房与房源",
      "zh-TW": "峴港住房與房源",
    },
  },
  visa: {
    icon: "passport",
    asset: asset("visa"),
    group: "travel",
    accent: "var(--zx-service-visa)",
    tint: "var(--zx-service-visa-soft)",
    description: {
      "vi-VN": "Hộ chiếu, thị thực và giấy tờ",
      "en-US": "Passport, visa and documents",
      "zh-CN": "护照、签证与证件",
      "zh-TW": "護照、簽證與證件",
    },
  },
  "car-rental": {
    icon: "car",
    asset: asset("car-rental"),
    group: "transport",
    accent: "var(--zx-service-car)",
    tint: "var(--zx-service-car-soft)",
    description: {
      "vi-VN": "Thuê xe và di chuyển",
      "en-US": "Car rental and transport",
      "zh-CN": "租车与出行",
      "zh-TW": "租車與出行",
    },
  },
  translation: {
    icon: "translation",
    asset: asset("translation"),
    group: "life",
    accent: "var(--zx-service-translation)",
    tint: "var(--zx-service-translation-soft)",
    description: {
      "vi-VN": "Phiên dịch và hỗ trợ ngôn ngữ",
      "en-US": "Interpretation and language help",
      "zh-CN": "翻译与语言协助",
      "zh-TW": "翻譯與語言協助",
    },
  },
  travel: {
    icon: "travel",
    asset: asset("travel"),
    group: "travel",
    accent: "var(--zx-service-travel)",
    tint: "var(--zx-service-travel-soft)",
    description: {
      "vi-VN": "Trải nghiệm và lịch trình địa phương",
      "en-US": "Local experiences and itineraries",
      "zh-CN": "本地体验与行程",
      "zh-TW": "本地體驗與行程",
    },
  },
  payment: {
    icon: "payment",
    asset: asset("payment"),
    group: "finance",
    accent: "var(--zx-service-payment)",
    tint: "var(--zx-service-payment-soft)",
    description: {
      "vi-VN": "Thanh toán dịch vụ và hỗ trợ",
      "en-US": "Service payment and support",
      "zh-CN": "服务支付与支持",
      "zh-TW": "服務支付與支援",
    },
  },
  community: {
    icon: "community",
    asset: asset("community"),
    group: "community",
    accent: "var(--zx-service-community)",
    tint: "var(--zx-service-community-soft)",
    description: {
      "vi-VN": "Kết nối cộng đồng Người Hoa",
      "en-US": "Connect with the Chinese community",
      "zh-CN": "华人社区连接",
      "zh-TW": "華人社區連結",
    },
  },
  market: {
    icon: "market",
    asset: asset("market"),
    group: "community",
    accent: "var(--zx-service-market)",
    tint: "var(--zx-service-market-soft)",
    description: {
      "vi-VN": "Hàng hóa và dịch vụ cộng đồng",
      "en-US": "Community goods and services",
      "zh-CN": "社区商品与服务",
      "zh-TW": "社區商品與服務",
    },
  },
  emergency: {
    icon: "emergency",
    asset: asset("emergency"),
    group: "support",
    accent: "var(--zx-service-emergency)",
    tint: "var(--zx-service-emergency-soft)",
    description: {
      "vi-VN": "Y tế, công an và cứu hộ",
      "en-US": "Medical, police and rescue",
      "zh-CN": "医疗、公安与救援",
      "zh-TW": "醫療、公安與救援",
    },
  },
};


export const customerServiceRoutes: Record<string, string> = {
  food: "/services/food",
  housing: "/thue-nha",
  visa: "/ho-chieu-thi-thuc",
  "car-rental": "/thue-xe",
  translation: "/phien-dich",
  travel: "/du-lich",
  payment: "/thanh-toan",
  community: "/cong-dong",
  market: "/cho-trung-quoc",
  emergency: "/khan-cap",
};

export function getCustomerServiceHref(code?: string | null, fallback = "/services") {
  return (code && customerServiceRoutes[code]) || fallback;
}

export function getCustomerServicePresentation(code?: string) {
  return (
    customerServicePresentation[code || ""] || {
      icon: "services" as const,
      group: "life" as const,
      accent: "var(--zx-brand)",
      tint: "var(--zx-brand-soft)",
      description: {
        "vi-VN": "Dịch vụ đời sống ZhaoXi",
        "en-US": "ZhaoXi life service",
        "zh-CN": "赵喜生活服务",
        "zh-TW": "趙喜生活服務",
      },
    }
  );
}
