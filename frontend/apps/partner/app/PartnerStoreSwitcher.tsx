"use client";

import { useEffect, useState, useTransition } from "react";
import { updateSession, useZhaoXiSession } from "@zhaoxi/auth";
import { localizeOrganizationName, useZhaoXiLocale, type ZhaoXiLocale } from "@zhaoxi/i18n";

type OrgItem = {
  id: string;
  code?: string;
  name: string;
  type?: string;
  memberRole?: string;
  metadata?: Record<string, unknown>;
};

const copy = {
  "vi-VN": {
    label: "Gian hàng đang quản lý",
    switchStore: "Chuyển gian hàng",
    switching: "Đang chuyển...",
    owner: "Chủ quán",
    manager: "Quản lý",
    staff: "Nhân viên",
  },
  "zh-CN": {
    label: "当前运营店铺",
    switchStore: "切换店铺",
    switching: "正在切换...",
    owner: "店主",
    manager: "店长",
    staff: "员工",
  },
  "zh-TW": {
    label: "目前營運店鋪",
    switchStore: "切換店鋪",
    switching: "正在切換...",
    owner: "店主",
    manager: "店長",
    staff: "員工",
  },
  "en-US": {
    label: "Active store",
    switchStore: "Switch store",
    switching: "Switching...",
    owner: "Owner",
    manager: "Manager",
    staff: "Staff",
  },
} as const;

export default function PartnerStoreSwitcher() {
  const session = useZhaoXiSession();
  const { locale } = useZhaoXiLocale();
  const t = copy[locale];
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [switching, setSwitching] = useState(false);
  const currentOrgId = session?.organizationId || "";

  useEffect(() => {
    let active = true;
    async function fetchOrganizations() {
      try {
        const res = await fetch("/api/platform-account/me", { cache: "no-store" });
        const json = await res.json();
        if (active && json?.ok && Array.isArray(json?.data?.organizations)) {
          setOrgs(json.data.organizations);
        }
      } catch {}
    }
    void fetchOrganizations();
    return () => { active = false; };
  }, [currentOrgId]);

  if (orgs.length <= 1) {
    // If only 1 store, still display active store badge or return null if preferred
    return null;
  }

  async function handleSwitch(targetOrgId: string) {
    if (!targetOrgId || targetOrgId === currentOrgId || switching) return;
    setSwitching(true);
    try {
      const targetOrg = orgs.find((o) => o.id === targetOrgId);
      const res = await fetch("/api/auth/unified/session/organization", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: targetOrgId }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        updateSession({
          organizationId: targetOrgId,
          organizationName: targetOrg?.name,
          organizationCode: targetOrg?.code,
          organizationType: targetOrg?.type,
        });
      } else {
        // Fallback local update
        updateSession({
          organizationId: targetOrgId,
          organizationName: targetOrg?.name,
          organizationCode: targetOrg?.code,
          organizationType: targetOrg?.type,
        });
      }
      try {
        localStorage.setItem("zhaoxi.partner.organizationId", targetOrgId);
      } catch {}
      window.location.reload();
    } catch {
      setSwitching(false);
    }
  }

  return (
    <div
      className="zx-store-switcher"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 12px",
        borderRadius: 999,
        background: "#ffffff",
        border: "1.5px solid #86efac",
        boxShadow: "0 2px 8px rgba(7, 193, 96, 0.08)",
        margin: "6px 0",
      }}
    >
      <span style={{ fontSize: 16 }}>🏪</span>
      <span style={{ fontSize: 12, fontWeight: 750, color: "#166534" }}>{t.label}:</span>
      <select
        value={currentOrgId}
        disabled={switching}
        onChange={(e) => void handleSwitch(e.target.value)}
        style={{
          border: "none",
          background: "transparent",
          fontSize: 13,
          fontWeight: 800,
          color: "#0f172a",
          cursor: "pointer",
          outline: "none",
          paddingRight: 6,
        }}
      >
        {orgs.map((o) => {
          const displayName = localizeOrganizationName(locale, o.code, o.name, o.metadata);
          const roleLabel = o.memberRole && (t as any)[o.memberRole] ? ` (${(t as any)[o.memberRole]})` : "";
          return (
            <option key={o.id} value={o.id}>
              {displayName}{roleLabel}
            </option>
          );
        })}
      </select>
      {switching && <small style={{ color: "#07c160", fontSize: 11, fontWeight: 800 }}>{t.switching}</small>}
    </div>
  );
}
