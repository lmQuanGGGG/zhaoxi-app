import { redirectToLatestApp } from "../redirect";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return redirectToLatestApp(request, "/nen-tang");
}
