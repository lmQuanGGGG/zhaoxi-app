"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const currentOrgId = session?.organizationId || "";

  useEffect(() => {
    let active = true;
    async function fetchOrganizations() {
      try {
        const res = await fetch("/api/platform-account/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);
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
      const data = await res.json().catch(() => null);
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
      // Let the session subscribers redraw immediately. A router refresh keeps the
      // current screen mounted, so changing stores does not flash a blank page.
      startTransition(() => {
        window.dispatchEvent(new Event("zhaoxi:partner-organization-changed"));
        router.refresh();
      });
      window.setTimeout(() => setSwitching(false), 260);
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
        gap: 9,
      }}
    >
      <span className="zx-store-switcher-icon" aria-hidden="true">🏪</span>
      <span className="zx-store-switcher-label">{t.label}</span>
      <select
        value={currentOrgId}
        disabled={switching || isPending}
        onChange={(e) => void handleSwitch(e.target.value)}
        aria-label={t.switchStore}
        className="zx-store-switcher-select"
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
      {(switching || isPending) && <span className="zx-store-switcher-progress" role="status">{t.switching}</span>}
    </div>
  );
}
