import { localizeServiceModuleName, type ZhaoXiLocale } from "@zhaoxi/i18n";
import type { ApiModule } from "./api/types";

export type ServiceGroup = "life" | "food" | "housing" | "travel" | "transport" | "finance" | "community" | "support";

// Mirrors customer-service-presentation.ts in the PWA.
export const moduleCatalog: Array<{ code: string; group: ServiceGroup; description: Record<ZhaoXiLocale, string> }> = [
  { code: "food", group: "food", description: { "vi-VN": "Món ăn và cửa hàng gần bạn", "en-US": "Food and nearby restaurants", "zh-CN": "餐饮与附近商家", "zh-TW": "餐飲與附近商家" } },
  { code: "housing", group: "housing", description: { "vi-VN": "Nhà và phòng tại Đà Nẵng", "en-US": "Homes and rooms in Da Nang", "zh-CN": "岘港住房与房源", "zh-TW": "峴港住房與房源" } },
  { code: "travel", group: "travel", description: { "vi-VN": "Trải nghiệm và lịch trình địa phương", "en-US": "Local experiences and itineraries", "zh-CN": "本地体验与行程", "zh-TW": "本地體驗與行程" } },
  { code: "car-rental", group: "transport", description: { "vi-VN": "Thuê xe và di chuyển", "en-US": "Car rental and transport", "zh-CN": "租车与出行", "zh-TW": "租車與出行" } },
  { code: "visa", group: "travel", description: { "vi-VN": "Hộ chiếu, thị thực và giấy tờ", "en-US": "Passport, visa and documents", "zh-CN": "护照、签证与证件", "zh-TW": "護照、簽證與證件" } },
  { code: "translation", group: "life", description: { "vi-VN": "Phiên dịch và hỗ trợ ngôn ngữ", "en-US": "Interpretation and language help", "zh-CN": "翻译与语言协助", "zh-TW": "翻譯與語言協助" } },
  { code: "market", group: "community", description: { "vi-VN": "Hàng hóa và dịch vụ cộng đồng", "en-US": "Community goods and services", "zh-CN": "社区商品与服务", "zh-TW": "社區商品與服務" } },
  { code: "community", group: "community", description: { "vi-VN": "Kết nối cộng đồng Người Hoa", "en-US": "Connect with the Chinese community", "zh-CN": "华人社区连接", "zh-TW": "華人社區連結" } },
  { code: "payment", group: "finance", description: { "vi-VN": "Thanh toán dịch vụ và hỗ trợ", "en-US": "Service payment and support", "zh-CN": "服务支付与支持", "zh-TW": "服務支付與支援" } },
  { code: "emergency", group: "support", description: { "vi-VN": "Y tế, công an và cứu hộ", "en-US": "Medical, police and rescue", "zh-CN": "医疗、公安与救援", "zh-TW": "醫療、公安與救援" } },
];

export type DisplayModule = { code: string; name: string; description: string; group: ServiceGroup };

export function resolveModules(apiModules: ApiModule[] | undefined, locale: ZhaoXiLocale): DisplayModule[] {
  const known = new Map(moduleCatalog.map((item) => [item.code, item]));
  const codes = apiModules?.length ? apiModules.map((item) => item.code).filter((code): code is string => Boolean(code)) : moduleCatalog.map((item) => item.code);
  if (!codes.includes("emergency")) codes.push("emergency");
  return codes.map((code) => {
    const api = apiModules?.find((item) => item.code === code);
    const meta = known.get(code);
    return {
      code,
      // Same precedence as the PWA home grid: API name first, then local labels.
      name: api?.name || localizeServiceModuleName(locale, code),
      description: meta?.description[locale] || api?.description || "",
      group: meta?.group || "life",
    };
  });
}

/** Native route for a module tile. */
export function moduleRoute(code: string) {
  if (code === "emergency") return "/emergency" as const;
  if (code === "payment") return "/payments" as const;
  return `/services/${code}` as const;
}
