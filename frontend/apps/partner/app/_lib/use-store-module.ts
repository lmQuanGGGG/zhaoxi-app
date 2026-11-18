"use client";
import { useEffect, useState } from "react";
import { useZhaoXiSession } from "@zhaoxi/auth";
import { dominantModule, storeModuleOf, type WorkspaceModule } from "./store-modules";

/** Inferred kind per store, shared by every screen so the catalogue is read once per store. */
const inferred = new Map<string, WorkspaceModule>();
const pending = new Map<string, Promise<WorkspaceModule>>();

function inferFromCatalogue(organizationId: string): Promise<WorkspaceModule> {
  const known = inferred.get(organizationId);
  if (known) return Promise.resolve(known);
  let request = pending.get(organizationId);
  if (!request) {
    request = fetch(`/api/platform-services?organizationId=${encodeURIComponent(organizationId)}&includeDrafts=1`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        const rows: { moduleCode?: string | null }[] = Array.isArray(payload?.data) ? payload.data : [];
        const module = dominantModule(rows.map((row) => row.moduleCode)) ?? "general";
        inferred.set(organizationId, module);
        return module;
      })
      .catch(() => "general" as const)
      .finally(() => pending.delete(organizationId));
    pending.set(organizationId, request);
  }
  return request;
}

/**
 * Kind of the store the workspace is showing, following the store switcher.
 * From the organization type first; a type that says nothing ("Tech", typos) falls back to the
 * module most of the store's catalogue lives in. null while the session (or that lookup) loads.
 */
export function useStoreModule(): WorkspaceModule | null {
  const session = useZhaoXiSession();
  const organizationId = session?.organizationId || "";
  const byType = storeModuleOf(session?.organizationType);
  const [fromCatalogue, setFromCatalogue] = useState<{ organizationId: string; module: WorkspaceModule } | null>(null);

  useEffect(() => {
    if (byType !== "general" || !organizationId) return;
    let active = true;
    void inferFromCatalogue(organizationId).then((module) => { if (active) setFromCatalogue({ organizationId, module }); });
    return () => { active = false; };
  }, [byType, organizationId]);

  if (byType !== "general") return byType;
  const cached = inferred.get(organizationId);
  if (cached) return cached;
  return fromCatalogue?.organizationId === organizationId ? fromCatalogue.module : null;
}
