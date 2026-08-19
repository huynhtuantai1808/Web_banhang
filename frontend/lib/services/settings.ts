import { apiClient } from "../apiClient";

export interface SiteSettingsOut {
  site_name: string;
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
  footer_intro?: string | null;
  banner_image_url?: string | null;
  logo_image_url?: string | null;
  accent_color: string;
}

export interface SiteSettingsUpdateInput {
  site_name?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_description?: string;
  footer_intro?: string;
  accent_color?: string;
}

/** Đọc cấu hình hiển thị hiện tại — API công khai, không cần đăng nhập. */
export async function getSiteSettings(): Promise<SiteSettingsOut> {
  const { data } = await apiClient.get<SiteSettingsOut>("/settings");
  return data;
}

/** Cập nhật cấu hình — chỉ admin (Quản lý). */
export async function updateSiteSettings(payload: SiteSettingsUpdateInput): Promise<SiteSettingsOut> {
  const { data } = await apiClient.put<SiteSettingsOut>("/settings", payload);
  return data;
}

export async function uploadBannerImage(file: File): Promise<SiteSettingsOut> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<SiteSettingsOut>("/settings/banner-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function uploadLogoImage(file: File): Promise<SiteSettingsOut> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<SiteSettingsOut>("/settings/logo-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
