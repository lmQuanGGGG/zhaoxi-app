"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ZhaoXiFoundationApp } from "@zhaoxi/platform";
import { ZhaoXiI18nProvider } from "@zhaoxi/i18n";
import { ZhaoXiThemeProvider } from "@zhaoxi/theme";
import PartnerOrderAlerts from "./PartnerOrderAlerts";
import PartnerOrderSystemNotifications from "./PartnerOrderSystemNotifications";
import HousingNotificationAlerts from "./HousingNotificationAlerts";
import TravelNotificationAlerts from "./TravelNotificationAlerts";
import PaymentSupportNotificationAlerts from "./PaymentSupportNotificationAlerts";
import PartnerWorkspaceNav from "./PartnerWorkspaceNav";
import PartnerSessionKeepAlive from "./PartnerSessionKeepAlive";
import OnboardingShell from "./onboarding/OnboardingShell";

/**
 * Three shells:
 * - `/auth/handoff` signs a browser/WebView in by itself, so it must run before any gate;
 * - `/onboarding` is store sign-up: any signed-in ZhaoXi account (a customer opening it from the
 *   app included) may apply, so it is not behind the partner-only gate;
 * - everything else is the partner workspace (partner session required).
 */
export default function AppProviders({ children }: { children: ReactNode }) {
  const path = usePathname() || "/";
  if (path.startsWith("/auth/handoff")) return <ZhaoXiI18nProvider><ZhaoXiThemeProvider>{children}</ZhaoXiThemeProvider></ZhaoXiI18nProvider>;
  if (path === "/onboarding" || path.startsWith("/onboarding/")) return <OnboardingShell>{children}</OnboardingShell>;
  return <ZhaoXiFoundationApp role="partner" alerts={<><PartnerOrderAlerts/><HousingNotificationAlerts/><TravelNotificationAlerts/><PaymentSupportNotificationAlerts/></>}><PartnerSessionKeepAlive/><div className="zx-partner-web-frame"><header className="zx-partner-web-header"><PartnerWorkspaceNav placement="frame"/></header><PartnerOrderSystemNotifications/>{children}</div></ZhaoXiFoundationApp>;
}
