import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "./AppProviders";
import { SHARED_SYNC_SCRIPT } from "@zhaoxi/platform/sync";
import { RuntimeGate } from "@zhaoxi/runtime-control";


export const metadata: Metadata = {
  title: "ZhaoXi Partner",
  description: "ZhaoXi Partner Center",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html>
      <head><script dangerouslySetInnerHTML={{ __html: SHARED_SYNC_SCRIPT }} /></head>
      <body><AppProviders><RuntimeGate app="partner">{children}</RuntimeGate></AppProviders></body>
    </html>
  );
}