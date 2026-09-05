"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useZhaoXiLocale } from "@zhaoxi/i18n";

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
  const redirect = searchParams.get("redirect") || "/";

  const targetUrl = redirect.startsWith("/") ? redirect : "/";

  useEffect(() => { router.replace(targetUrl); }, [router, targetUrl]);
  return <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>{copy[locale].loading}</div>;
}

export default function LoginPage() {
  const { locale } = useZhaoXiLocale();
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>{copy[locale].loading}</div>}>
      <LoginContent />
    </Suspense>
  );
}
