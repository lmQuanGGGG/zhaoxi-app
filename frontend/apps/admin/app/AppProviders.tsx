"use client";
import type { ReactNode } from "react";
import { ZhaoXiFoundationApp } from "@zhaoxi/platform";
export default function AppProviders({ children }: { children: ReactNode }) { return <ZhaoXiFoundationApp role="admin">{children}</ZhaoXiFoundationApp>; }
