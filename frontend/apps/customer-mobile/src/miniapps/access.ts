import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { getAccountAccess } from "../api/endpoints";
import type { AccountAccess } from "../api/types";
import { useSession } from "../hooks";
import { keys } from "../query";
import type { MiniAppAudience, MiniAppEntry } from "./registry";

/** Tài khoản thuộc nhóm `audience` không. Chỉ để ẩn/hiện: backend kiểm lại khi mini app xin phiên partner. */
function inAudience(audience: MiniAppAudience, account: AccountAccess | undefined) {
  if (!account) return false;
  // Đổi phiên sang partner (`/api/auth/role-switch/create`) cần là thành viên gian hàng đang hoạt động;
  // người có vai trò partner nhưng chưa gắn gian hàng vẫn thấy mini app và đăng nhập Partner bằng tay.
  return account.roles.includes("partner") || account.organizations.some((organization) => (organization.status ?? "active") === "active");
}

/**
 * Quyền thấy/mở mini app theo `entry.audience`. Khách guest không thuộc nhóm nào.
 * `ready` false khi đang hỏi `/api/account/me`: màn chứa chờ, danh sách tạm ẩn mục có audience.
 */
export function useMiniAppAccess() {
  const { userId, guest } = useSession();
  const enabled = Boolean(userId) && !guest;
  const account = useQuery({ queryKey: keys.accountAccess(userId), queryFn: getAccountAccess, enabled, staleTime: 5 * 60_000 });
  const ready = !enabled || account.isFetched;
  const data = enabled ? account.data : undefined;
  const canOpen = useCallback((entry: MiniAppEntry) => !entry.audience || inAudience(entry.audience, data), [data]);
  return { ready, canOpen };
}
