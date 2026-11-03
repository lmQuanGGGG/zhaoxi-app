import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { Platform } from "react-native";
import { getAccountAccess, getMiniAppCatalog } from "../api/endpoints";
import type { AccountAccess } from "../api/types";
import { useSession } from "../hooks";
import { keys } from "../query";
import { applyMiniAppCatalog, type MiniAppAudience, type MiniAppEntry } from "./registry";

/**
 * Tài khoản thuộc nhóm `audience` không. Chỉ dùng khi chưa có danh mục backend (backend đã lọc sẵn)
 * và chỉ để ẩn/hiện: backend kiểm lại khi mini app xin phiên partner.
 */
function inAudience(audience: MiniAppAudience, account: AccountAccess | undefined) {
  if (!account) return false;
  if (audience === "members") return true;
  if (audience === "internal") return account.roles.includes("admin");
  // Đổi phiên sang partner (`/api/auth/role-switch/create`) cần là thành viên gian hàng đang hoạt động;
  // người có vai trò partner nhưng chưa gắn gian hàng vẫn thấy mini app và đăng nhập Partner bằng tay.
  return account.roles.includes("partner") || account.organizations.some((organization) => (organization.status ?? "active") === "active");
}

/**
 * Quyền thấy/mở mini app. Nguồn chính: danh mục backend `GET /api/miniapps` (lọc theo quyền, chọn
 * bản rollout cho từng người, giữ qua lần mở app nhờ persister của react-query). Khi chưa hỏi được
 * backend: dùng `registry.ts` dự phòng + `entry.audience` tính từ `/api/account/me`. Guest không thuộc nhóm nào.
 * `ready` false khi đang hỏi lần đầu: màn chứa chờ, danh sách tạm ẩn mục chưa chắc.
 */
export function useMiniAppAccess() {
  const { userId, guest } = useSession();
  const enabled = Boolean(userId) && !guest;
  const account = useQuery({ queryKey: keys.accountAccess(userId), queryFn: getAccountAccess, enabled, staleTime: 5 * 60_000 });
  const catalog = useQuery({ queryKey: keys.miniAppCatalog(Platform.OS, userId), queryFn: () => getMiniAppCatalog(Platform.OS), staleTime: 5 * 60_000, retry: 1 });
  // Áp ngay trong lúc render (không làm gì nếu đã áp mảng này) để màn gọi hook thấy danh mục mới ở cùng lần render.
  const serverIds = catalog.data ? applyMiniAppCatalog(catalog.data) : null;
  const ready = serverIds !== null || (catalog.isFetched && (!enabled || account.isFetched));
  const data = enabled ? account.data : undefined;
  const canOpen = useCallback(
    (entry: MiniAppEntry) => {
      if (serverIds?.has(entry.id)) return true;
      // Có danh mục backend: mục backend không trả thì không mở, trừ mục dự phòng ở bản dev (thử với CDN cục bộ).
      if (serverIds && !(__DEV__ && !entry.release)) return false;
      return !entry.audience || inAudience(entry.audience, data);
    },
    [serverIds, data],
  );
  return { ready, canOpen };
}
