const PROFILE_KEY = "kuai-dao-restaurant-profiles-v1";
const ORDER_KEY = "kuai-dao-restaurant-orders-v1";
const RATING_KEY = "kuai-dao-customer-ratings-v1";
const STORE_SYNC_KEY = "kuai-dao-existing-store-sync-v3";

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
  address: string;
  phone: string;
  wechatId: string;
  accountWechatId?: string;
  voucher: string;
  openTime: string;
  closeTime: string;
  receivingOrders: boolean;
  refusals: number;
  menuPublishedAt?: string;
  icon?: string;
  dishes: Dish[];
  [key: string]: unknown;
};

type RestaurantOrder = {
  id: string;
  restaurantId: string;
  customer?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  [key: string]: unknown;
};

const canonicalProfiles: Record<string, RestaurantProfile> = {
  "KD-NH-9KFUES": {
    id: "KD-NH-9KFUES",
    name: "Hỷ Media",
    address: "15 Trung Lương 16",
    phone: "0961499943",
    wechatId: "qingli1307",
    accountWechatId: "qingli1307",
    voucher: "",
    openTime: "08:00",
    closeTime: "22:00",
    receivingOrders: true,
    refusals: 0,
    menuPublishedAt: "23:54:48 1/8/2026",
    icon: "/restaurants/KD-NH-9KFUES/icon.jpg",
    dishes: [
      { id: "dish-1785540488852", name: "A1- 黑咖啡（滴漏/咖啡机）", price: 20000, available: true, image: "/restaurants/KD-NH-9KFUES/dish-1.jpg" },
      { id: "dish-1785540516689", name: "A2 炼乳咖啡（滴漏/咖啡机）", price: 25000, available: true, image: "/restaurants/KD-NH-9KFUES/dish-2.jpg" },
      { id: "dish-1785540736253", name: "A3 越南白咖啡", price: 28000, available: true, image: "/restaurants/KD-NH-9KFUES/dish-3.jpg" },
      { id: "dish-1785540755185", name: "A4 海盐咖啡", price: 35000, available: true, image: "/restaurants/KD-NH-9KFUES/dish-4.jpg" },
      { id: "dish-1785540775292", name: "A5 鸡蛋咖啡", price: 35000, available: true, image: "/restaurants/KD-NH-9KFUES/dish-5.jpg" },
    ],
  },
  "KD-NH-9DS1KU": {
    id: "KD-NH-9DS1KU",
    name: "Hamburger Tasting & Milktea Chamagudao",
    address: "525 Trần Hưng Đạo, An Hải Tây, Đà Nẵng",
    phone: "0961499943",
    wechatId: "qingli1307",
    accountWechatId: "qingli1307",
    voucher: "",
    openTime: "10:00",
    closeTime: "02:00",
    receivingOrders: true,
    refusals: 1,
    menuPublishedAt: "05:49:59 1/8/2026",
    icon: "/restaurants/KD-NH-9DS1KU/icon.jpg",
    dishes: [
      { id: "dish-1785528956695", name: "A1-藤椒鸡块", price: 68000, available: true, image: "/restaurants/KD-NH-9DS1KU/dish-1.jpg" },
      { id: "dish-1785528978865", name: "A2 -避风塘蟹堡", price: 68000, available: true, image: "/restaurants/KD-NH-9DS1KU/dish-2.jpg" },
      { id: "dish-1785528998251", name: "A3 - 孜然鸭肉堡", price: 68000, available: true, image: "/restaurants/KD-NH-9DS1KU/dish-3.jpg" },
      { id: "dish-1785529221736", name: "A4- 板烧凤梨堡", price: 68000, available: true, image: "/restaurants/KD-NH-9DS1KU/dish-4.jpg" },
      { id: "dish-1785529238774", name: "A5-香辣鸡腿堡", price: 68000, available: true, image: "/restaurants/KD-NH-9DS1KU/dish-5.jpg" },
      { id: "dish-1785538095527", name: "A6-双拼鸡虾堡", price: 68000, available: true, image: "/restaurants/KD-NH-9DS1KU/dish-6.jpg" },
      { id: "dish-1785538120162", name: "A7-鳕鱼堡", price: 68000, available: true, image: "/restaurants/KD-NH-9DS1KU/dish-7.jpg" },
      { id: "dish-1785538138089", name: "A8- 奥尔良鸡腿堡", price: 68000, available: true, image: "/restaurants/KD-NH-9DS1KU/dish-8.jpg" },
      { id: "dish-1785538156218", name: "A9-培根煎蛋堡", price: 68000, available: true, image: "/restaurants/KD-NH-9DS1KU/dish-9.jpg" },
      { id: "dish-1785538174490", name: "A10-老北京鸡肉卷", price: 68000, available: true, image: "/restaurants/KD-NH-9DS1KU/dish-10.jpg" },
      { id: "dish-1785538197936", name: "A11-墨西哥鸡肉卷", price: 68000, available: true, image: "/restaurants/KD-NH-9DS1KU/dish-11.jpg" },
    ],
  },
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function mergeCanonicalProfile(existing: RestaurantProfile | undefined, canonical: RestaurantProfile) {
  const existingDishes = new Map((existing?.dishes || []).map((dish) => [dish.id, dish]));
  const dishes = canonical.dishes.map((dish) => {
    const existingDish = existingDishes.get(dish.id);
    return { ...existingDish, ...dish, image: existingDish?.image || dish.image };
  });

  return {
    ...existing,
    ...canonical,
    icon: existing?.icon || canonical.icon,
    dishes,
  };
}

function migrateDemoOrders(orders: RestaurantOrder[]) {
  return orders.map((order) => {
    if (order.restaurantId === "KD-NH-DEMO01") {
      return {
        ...order,
        restaurantId: "KD-NH-9DS1KU",
        customer: order.customer === "Khách hàng WeChat" ? "Khách hàng WeChat" : order.customer,
        customerPhone: order.customerPhone === "Khách chưa cung cấp SĐT" ? "Khách chưa cung cấp SĐT" : order.customerPhone,
        deliveryAddress: order.deliveryAddress === "Đà Nẵng" ? "Đà Nẵng" : order.deliveryAddress,
        items: order.items?.map((item, index) => ({
          ...item,
          name: canonicalProfiles["KD-NH-9DS1KU"].dishes[index]?.name || item.name,
        })),
      };
    }

    if (order.restaurantId === "KD-NH-DEMO02") {
      return {
        ...order,
        restaurantId: "KD-NH-9KFUES",
        customer: order.customer === "Khách hàng WeChat" ? "Khách hàng WeChat" : order.customer,
        customerPhone: order.customerPhone === "Khách chưa cung cấp SĐT" ? "Khách chưa cung cấp SĐT" : order.customerPhone,
        deliveryAddress: order.deliveryAddress === "Đà Nẵng" ? "Đà Nẵng" : order.deliveryAddress,
        items: order.items?.map((item, index) => ({
          ...item,
          name: canonicalProfiles["KD-NH-9KFUES"].dishes[index]?.name || item.name,
        })),
      };
    }

    return order;
  });
}

export function ensureLegacyDemoState() {
  if (window.localStorage.getItem(STORE_SYNC_KEY) === "complete") return;

  const profiles = readJson<Record<string, RestaurantProfile>>(PROFILE_KEY, {});
  delete profiles["KD-NH-DEMO01"];
  delete profiles["KD-NH-DEMO02"];

  Object.values(canonicalProfiles).forEach((canonical) => {
    profiles[canonical.id] = mergeCanonicalProfile(profiles[canonical.id], canonical);
  });

  const orders = migrateDemoOrders(readJson<RestaurantOrder[]>(ORDER_KEY, []));
  const ratings = readJson<Record<string, number>>(RATING_KEY, {});
  delete ratings["KD-NH-DEMO01"];
  delete ratings["KD-NH-DEMO02"];
  ratings["KD-NH-9DS1KU"] = ratings["KD-NH-9DS1KU"] ?? 5;
  ratings["KD-NH-9KFUES"] = ratings["KD-NH-9KFUES"] ?? 5;

  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  window.localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
  window.localStorage.setItem(RATING_KEY, JSON.stringify(ratings));
  window.localStorage.setItem(STORE_SYNC_KEY, "complete");
}
