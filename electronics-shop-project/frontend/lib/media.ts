import { API_ORIGIN } from "./config";

/**
 * Backend trả về path ảnh dạng tương đối, VD: "/uploads/products/<id>/<file>.jpg".
 * Hàm này ghép với API_ORIGIN (http://localhost:8000) để ra URL đầy đủ dùng được trong <img src>.
 * Nếu path đã là URL đầy đủ (http://...) thì giữ nguyên.
 */
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}
