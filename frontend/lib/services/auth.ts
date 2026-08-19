import { apiClient } from "../apiClient";
import { setCustomerToken, clearCustomerToken } from "../auth-storage";

export interface RegisterPayload {
  full_name: string;
  phone: string;
  email?: string;
  password: string;
  address?: string;
}

export interface LoginStepOneResponse {
  message: string;
  otp_token: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export async function register(payload: RegisterPayload) {
  const { data } = await apiClient.post("/auth/register", payload);
  return data;
}

export async function loginStep1(phone: string, password: string): Promise<LoginStepOneResponse> {
  const { data } = await apiClient.post<LoginStepOneResponse>("/auth/login", { phone, password });
  return data;
}

export async function verifyOtp(otpToken: string, otpCode: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/login/verify-otp", {
    otp_token: otpToken,
    otp_code: otpCode,
  });
  setCustomerToken(data.access_token);
  return data;
}

export function customerLogout(): void {
  clearCustomerToken();
}
