import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppProviders from "./AppProviders";
import { SHARED_SYNC_SCRIPT } from "@zhaoxi/platform/sync";
import { RuntimeGate } from "@zhaoxi/runtime-control";
import PullToRefresh from "./PullToRefresh";


export const metadata: Metadata = { title: "ZhaoXi", description: "ZhaoXi life services." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html>
      <head><script dangerouslySetInnerHTML={{ __html: SHARED_SYNC_SCRIPT }} /></head>
      <body><AppProviders><PullToRefresh/><RuntimeGate app="customer">{children}</RuntimeGate></AppProviders></body>
    </html>
  );
}
