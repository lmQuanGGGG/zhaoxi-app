"use client";
import type { ReactNode } from "react";
import { ZhaoXiFoundationApp } from "@zhaoxi/platform";
import PartnerOrderAlerts from "./PartnerOrderAlerts";
import PartnerOrderSystemNotifications from "./PartnerOrderSystemNotifications";
import HousingNotificationAlerts from "./HousingNotificationAlerts";
import TravelNotificationAlerts from "./TravelNotificationAlerts";
import PaymentSupportNotificationAlerts from "./PaymentSupportNotificationAlerts";
import PartnerWorkspaceNav from "./PartnerWorkspaceNav";
export default function AppProviders({ children }: { children: ReactNode }) { return <ZhaoXiFoundationApp role="partner" alerts={<><PartnerOrderAlerts/><HousingNotificationAlerts/><TravelNotificationAlerts/><PaymentSupportNotificationAlerts/></>}><div className="zx-partner-web-frame"><header className="zx-partner-web-header"><PartnerWorkspaceNav/></header><PartnerOrderSystemNotifications/>{children}</div></ZhaoXiFoundationApp>; }
