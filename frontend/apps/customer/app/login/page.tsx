"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IdentityUpgradeSheet } from "@zhaoxi/auth";
import { useZhaoXiLocale } from "@zhaoxi/i18n";
import { CustomerShell, CustomerPageHeader } from "../_components/CustomerShell";

const copy = {
  "zh-CN": { title: "赵喜账户", eyebrow: "身份验证", loading: "正在加载…" },
  "zh-TW": { title: "趙喜帳戶", eyebrow: "身分驗證", loading: "正在載入…" },
  "vi-VN": { title: "Tài khoản ZhaoXi", eyebrow: "Xác thực danh tính", loading: "Đang tải…" },
  "en-US": { title: "ZhaoXi account", eyebrow: "Verify your identity", loading: "Loading…" },
} as const;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useZhaoXiLocale();
  const t = copy[locale];
  const redirect = searchParams.get("redirect") || "/";

  const targetUrl = redirect.startsWith("/") ? redirect : "/";

  return (
    <CustomerShell>
      <CustomerPageHeader
        title={t.title}
        eyebrow={t.eyebrow}
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
  const { locale } = useZhaoXiLocale();
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>{copy[locale].loading}</div>}>
      <LoginContent />
    </Suspense>
  );
}
