import { apiClient } from "../apiClient";
import { setEmployeeToken, clearEmployeeToken, getEmployeeToken } from "../auth-storage";
import { decodeJwtPayload, EmployeeTokenPayload } from "../jwt";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface PermissionSet {
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface EmployeeOut {
  id: string;
  employee_code: string;
  full_name: string;
  phone: string;
  email: string;
  employee_role: "admin" | "staff";
  permissions: PermissionSet;
  is_active: boolean;
}

export interface EmployeeCreateInput {
  full_name: string;
  phone: string;
  email: string;
  password: string;
  employee_role: "admin" | "staff";
  permissions: PermissionSet;
}

export interface EmployeeUpdateInput {
  full_name?: string;
  phone?: string;
  email?: string;
  password?: string;
  employee_role?: "admin" | "staff";
  permissions?: PermissionSet;
  is_active?: boolean;
}

export async function employeeLogin(email: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/employees/login", { email, password });
  setEmployeeToken(data.access_token);
  return data;
}

export function employeeLogout(): void {
  clearEmployeeToken();
}

/** Đọc thông tin vai trò/quyền của nhân viên đang đăng nhập từ token hiện tại (chỉ để hiển thị UI). */
export function getCurrentEmployeeClaims(): EmployeeTokenPayload | null {
  const token = getEmployeeToken();
  if (!token) return null;
  return decodeJwtPayload<EmployeeTokenPayload>(token);
}

export function isCurrentEmployeeAdmin(): boolean {
  return getCurrentEmployeeClaims()?.employee_role === "admin";
}

/** Danh sách nhân viên — chỉ admin gọi được (BE sẽ trả 403 nếu không phải admin). */
export async function listEmployees(): Promise<EmployeeOut[]> {
  const { data } = await apiClient.get<EmployeeOut[]>("/employees");
  return data;
}

export async function createEmployee(payload: EmployeeCreateInput): Promise<EmployeeOut> {
  const { data } = await apiClient.post<EmployeeOut>("/employees", payload);
  return data;
}

export async function updateEmployee(
  employeeId: string,
  payload: EmployeeUpdateInput
): Promise<EmployeeOut> {
  const { data } = await apiClient.put<EmployeeOut>(`/employees/${employeeId}`, payload);
  return data;
}

export async function deactivateEmployee(employeeId: string): Promise<void> {
  await apiClient.delete(`/employees/${employeeId}`);
}
