/**
 * Quản lý token đăng nhập tại MỘT nơi duy nhất — tránh mỗi trang tự đọc/ghi
 * `localStorage` với key khác nhau (nguyên nhân gây lỗi trước đây).
 *
 * Có 2 loại token riêng biệt vì 2 nhóm người dùng khác nhau:
 * - employee_token: nhân viên quản lý, dùng cho các route /admin/*
 * - customer_token : khách hàng, dùng cho các route mua hàng (cart/order — sẽ nối API sau)
 */

const EMPLOYEE_TOKEN_KEY = "employee_token";
const CUSTOMER_TOKEN_KEY = "customer_token";

function readToken(key: string): string | null {
  if (typeof window === "undefined") return null; // tránh lỗi khi chạy ở server (SSR)
  return localStorage.getItem(key);
}

function writeToken(key: string, token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, token);
}

function removeToken(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

// ---- Nhân viên ----
export const getEmployeeToken = () => readToken(EMPLOYEE_TOKEN_KEY);
export const setEmployeeToken = (token: string) => writeToken(EMPLOYEE_TOKEN_KEY, token);
export const clearEmployeeToken = () => removeToken(EMPLOYEE_TOKEN_KEY);
export const isEmployeeLoggedIn = () => !!getEmployeeToken();

// ---- Khách hàng ----
export const getCustomerToken = () => readToken(CUSTOMER_TOKEN_KEY);
export const setCustomerToken = (token: string) => writeToken(CUSTOMER_TOKEN_KEY, token);
export const clearCustomerToken = () => removeToken(CUSTOMER_TOKEN_KEY);
export const isCustomerLoggedIn = () => !!getCustomerToken();
