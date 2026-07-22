/**
 * Cấu hình thương hiệu (tên site, tagline, icon) tại MỘT nơi duy nhất.
 * Muốn đổi tên shop hoặc logo, chỉ cần sửa file này — không phải tìm/sửa rải rác
 * trong SiteHeader, trang admin, hay <title> của trang.
 *
 * Cách đổi logo:
 * 1) Đổi biểu tượng: đổi `iconName` sang tên icon bất kỳ trong bộ https://lucide.dev/icons
 *    (import tương ứng trong components/Logo.tsx).
 * 2) Dùng ảnh logo riêng: đặt file vào frontend/public/logo.png rồi set `logoImageSrc: "/logo.png"`
 *    — khi có giá trị này, <Logo> sẽ ưu tiên hiển thị ảnh thay vì icon.
 */
export const BRANDING = {
  siteName: "TechTrace",
  tagline: "Công nghệ chính hãng, kết nối đúng nhu cầu của bạn.",
  description:
    "Điện thoại, laptop, máy tính bảng, PC gaming — trả góp 0% lãi suất, bảo hành chính hãng, giao nhanh toàn quốc.",
  iconName: "cpu" as const, // xem components/Logo.tsx để biết danh sách icon hỗ trợ sẵn
  logoImageSrc: null as string | null, // VD: "/logo.png" — để null nếu dùng icon
};
