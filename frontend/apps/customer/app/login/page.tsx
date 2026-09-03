"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useZhaoXiSession, IdentityUpgradeSheet } from "@zhaoxi/auth";
import { CustomerShell, CustomerPageHeader } from "../_components/CustomerShell";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useZhaoXiSession();
  const redirect = searchParams.get("redirect") || "/";

  const targetUrl = redirect.startsWith("/") ? redirect : "/";

  return (
    <CustomerShell>
      <CustomerPageHeader
        title="Tài khoản ZhaoXi"
        eyebrow="Xác thực danh tính"
        backHref={targetUrl}
      />
      <div style={{ maxWidth: 460, margin: "16px auto 40px", padding: "0 4px" }}>
        <IdentityUpgradeSheet
          role="customer"
          open={true}
          inline={true}
          onClose={() => router.push(targetUrl)}
          onVerified={() => router.replace(targetUrl)}
        />
      </div>
    </CustomerShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Đang tải…</div>}>
      <LoginContent />
    </Suspense>
  );
}
