import { Suspense } from "react";
import { appShellStyle } from "@zhaoxi/ui";
import PartnerWorkspaceNav from "../PartnerWorkspaceNav";
import { OrderChatInbox } from "../OrderChat";

export default function PartnerMessagesPage() {
  return (
    <main className="zx-native-workspace" style={{ ...appShellStyle, maxWidth: 1180, margin: "0 auto", padding: "24px 18px" }}>
      <PartnerWorkspaceNav />
      <Suspense fallback={null}>
        <OrderChatInbox />
      </Suspense>
    </main>
  );
}
