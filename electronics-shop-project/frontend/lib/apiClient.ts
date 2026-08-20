import axios, { AxiosError, AxiosInstance } from "axios";
import { API_BASE_URL, API_TIMEOUT_MS } from "./config";
import { getEmployeeToken, getCustomerToken } from "./auth-storage";

/**
 * Instance axios DUY NHẤT cho toàn bộ app. Mọi service (products, employees, auth, cart...)
 * phải dùng qua đây, để đảm bảo baseURL (đọc từ NEXT_PUBLIC_API_BASE_URL) và cách gắn
 * token luôn nhất quán.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});

// Tự động gắn đúng loại Bearer token theo nhóm route:
// - /cart/*, /orders/*                        → token khách hàng (customer_token)
// - /promotions/mine, /promotions/validate     → token khách hàng (customer_token)
// - còn lại (mặc định, kể cả /promotions khác) → token nhân viên (employee_token)
function isCustomerRoute(url: string): boolean {
  if (url.startsWith("/cart") || url.startsWith("/orders")) return true;
  if (url.startsWith("/wishlist")) return true;
  if (url.startsWith("/promotions/mine") || url.startsWith("/promotions/validate")) return true;
  if (/\/products\/[^/]+\/reviews?/.test(url)) return true;
  return false;
}

apiClient.interceptors.request.use((requestConfig) => {
  const url = requestConfig.url || "";
  const token = isCustomerRoute(url) ? getCustomerToken() : getEmployeeToken();

  if (token) {
    requestConfig.headers = requestConfig.headers ?? {};
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }
  return requestConfig;
});

/** Kiểu lỗi chuẩn hoá để hiển thị cho người dùng, tránh phải parse AxiosError thủ công ở từng nơi. */
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new ApiError("Kết nối tới máy chủ quá thời gian chờ. Vui lòng thử lại."));
    }
    if (!error.response) {
      // Không nhận được phản hồi từ BE => rất có thể do sai API_BASE_URL hoặc BE chưa chạy/CORS chặn
      const hint =
        `Không kết nối được tới Backend tại ${API_BASE_URL}. ` +
        "Kiểm tra: (1) Backend đã chạy 'uvicorn app.main:app --reload' chưa, " +
        "(2) NEXT_PUBLIC_API_BASE_URL trong .env.local có đúng địa chỉ/port không, " +
        "(3) CORS_ORIGINS ở Backend .env có chứa origin của FE không.";
      return Promise.reject(new ApiError(hint));
    }

    const detail = error.response.data?.detail;
    return Promise.reject(
      new ApiError(detail || error.message || "Có lỗi xảy ra khi gọi API", error.response.status)
    );
  }
);
