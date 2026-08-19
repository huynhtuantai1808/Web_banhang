/**
 * Giải mã phần payload của JWT ở phía client để đọc thông tin hiển thị (VD: employee_role
 * để ẩn/hiện menu "Nhân viên" trên UI). CHỈ dùng để hiển thị — không dùng để quyết định
 * quyền truy cập thật sự, vì đó luôn là trách nhiệm của Backend (các dependency
 * require_admin/require_permission đã kiểm tra lại ở server).
 */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;
    const json = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export interface EmployeeTokenPayload {
  sub: string;
  role: "employee";
  employee_role: "admin" | "staff";
  permissions?: { can_create?: boolean; can_edit?: boolean; can_delete?: boolean };
  exp: number;
}
