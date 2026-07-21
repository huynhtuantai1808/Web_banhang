/**
 * Đọc toàn bộ biến môi trường liên quan tới việc gọi API xuống Backend tại MỘT nơi duy nhất.
 * Mọi nơi khác trong code PHẢI import từ đây, KHÔNG được đọc thẳng process.env rải rác
 * (đã là nguyên nhân khiến FE gọi sai/không tới được BE trước đó).
 */

function readApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!raw || raw.trim() === "") {
    // Chỉ cảnh báo ở client, không throw để tránh sập cả trang khi thiếu .env.local
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn(
        "[config] NEXT_PUBLIC_API_BASE_URL chưa được cấu hình trong .env.local — " +
          "đang dùng giá trị mặc định http://localhost:8000/api/v1. " +
          "Tạo file frontend/.env.local (copy từ .env.example) rồi RESTART `npm run dev`."
      );
    }
    return "http://localhost:8000/api/v1";
  }

  // Bỏ dấu "/" thừa ở cuối để tránh lỗi "//" khi nối path
  return raw.replace(/\/+$/, "");
}

export const API_BASE_URL = readApiBaseUrl();

// URL gốc của server (không có "/api/v1") — dùng để dựng link ảnh tĩnh (/uploads/...)
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");

export const API_TIMEOUT_MS = 15000;
