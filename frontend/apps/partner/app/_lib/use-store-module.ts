"use client";
import { useZhaoXiSession } from "@zhaoxi/auth";
import { storeModuleOf, type StoreModule } from "./store-modules";

/** The kind of store the workspace is showing; null when unknown (older free-text type): show everything. */
export function useStoreModule(): StoreModule | null {
  const session = useZhaoXiSession();
  return storeModuleOf(session?.organizationType);
}
