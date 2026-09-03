"use client";
import type { ReactNode } from "react";
import { ZhaoXiFoundationApp } from "@zhaoxi/platform";
import CustomerOrderAlerts from "./CustomerOrderAlerts";
import SavedSearchAlerts from "./SavedSearchAlerts";
export default function AppProviders({ children }: { children: ReactNode }) { return <ZhaoXiFoundationApp role="customer" alerts={<><CustomerOrderAlerts/><SavedSearchAlerts/></>}>{children}</ZhaoXiFoundationApp>; }
