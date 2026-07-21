import { apiClient } from "../apiClient";
import { setEmployeeToken, clearEmployeeToken } from "../auth-storage";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export async function employeeLogin(email: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/employees/login", { email, password });
  setEmployeeToken(data.access_token);
  return data;
}

export function employeeLogout(): void {
  clearEmployeeToken();
}
