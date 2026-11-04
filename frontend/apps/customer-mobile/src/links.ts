import type { Href } from "expo-router";
import { encodeLaunchParams } from "./miniapps/launch";

// The backend speaks in PWA paths (recommendation hrefs, notification hrefs,
// push payload urls). Map them onto native routes so every link opens the
// matching screen instead of a web page.
const moduleAliases: Record<string, string> = {
  "/thue-nha": "housing",
  "/housing": "housing",
  "/ho-chieu-thi-thuc": "visa",
  "/visa": "visa",
  "/thue-xe": "car-rental",
  "/car-rental": "car-rental",
  "/phien-dich": "translation",
  "/translation": "translation",
  "/du-lich": "travel",
  "/travel": "travel",
  "/thanh-toan": "payment",
  "/cong-dong": "community",
  "/community": "community",
  "/cho-trung-quoc": "market",
  "/market": "market",
  "/food": "food",
};

const staticRoutes: Record<string, string> = {
  "/": "/",
  "/search": "/explore",
  "/discover": "/explore",
  "/messages": "/messages",
  "/orders": "/orders",
  "/profile": "/profile",
  "/account": "/profile",
  "/cart": "/cart",
  "/coupons": "/coupons",
  "/favorites": "/favorites",
  "/history": "/history",
  "/notifications": "/notifications",
  "/payment": "/payments",
  "/payments": "/payments",
  "/khan-cap": "/emergency",
  "/emergency": "/emergency",
  "/support": "/support",
  "/help": "/help",
  "/language": "/language",
  "/services": "/services",
  "/housing/requests": "/inquiries/housing",
  "/travel/requests": "/inquiries/travel",
  "/feedback": "/feedback",
  "/profile/security": "/account/security",
};

// A service's `publicHref` is `<module route>/<serviceId>` (backend unified-service-discovery-service.ts
// `route()`: `/visa/<id>`, `/car-rental/<id>`, `/market/<id>`…), so every module head, PWA alias
// included, opens the native service detail. Unknown heads used to fall back to "/", which from the
// Home tab is a no-op: the card looked dead.
const serviceDetailHeads = new Set(["service", "request", "payment", "emergency", "khan-cap", ...Object.keys(moduleAliases).map((path) => path.slice(1))]);

export function routeForWebHref(href?: string | null): Href {
  if (!href) return "/";
  let url: URL;
  try {
    url = new URL(href, "https://zhaoxi.app");
  } catch {
    return "/";
  }
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const params = url.searchParams;
  const thread = params.get("thread");
  if (path === "/messages" && thread) return `/chat/${encodeURIComponent(thread)}`;
  if (path === "/search" && params.get("q")) return `/explore?q=${encodeURIComponent(params.get("q") || "")}`;
  if (staticRoutes[path]) return staticRoutes[path] as Href;
  if (moduleAliases[path]) return `/services/${moduleAliases[path]}`;
  const [, head, id] = path.split("/");
  if (!head || !id) return "/";
  const decoded = decodeURIComponent(id);
  switch (head) {
    case "order":
      return `/order/${decoded}`;
    case "restaurant":
    case "partners":
      return `/restaurant/${decoded}`;
    case "services":
      return `/services/${decoded}`;
    case "messages":
    case "chat":
      return `/chat/${encodeURIComponent(decoded)}`;
    case "help":
      return `/help/${decoded}`;
    case "miniapp": {
      // `/miniapp/zhaoxi.partner?screen=orders&order=<id>`: query thành `context.launch` của mini app
      // (khoá dành riêng của router như `screen` được đổi tên, màn chứa đổi lại: miniapps/launch.ts).
      const query = encodeLaunchParams(params).toString();
      return `/miniapp/${encodeURIComponent(decoded)}${query ? `?${query}` : ""}`;
    }
    default:
      return serviceDetailHeads.has(head) ? `/service/${decoded}` : "/";
  }
}
