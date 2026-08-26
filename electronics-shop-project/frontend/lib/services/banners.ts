import { apiClient } from "../apiClient";

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string;
  link_url: string | null;
  cta_label: string | null;
  valid_from: string | null;
  valid_to: string | null;
  position: "hero" | "promo" | "sidebar" | string;
  display_order: number;
  is_active: boolean;
}

/** Danh sách banner công khai — dùng cho trang chủ (chỉ lấy banner đang active). */
export async function listActiveBanners(position?: string): Promise<Banner[]> {
  const { data } = await apiClient.get<Banner[]>("/banners", {
    params: { active_only: true, ...(position ? { position } : {}) },
  });
  return data;
}

/** Danh sách banner cho admin (thấy cả banner ẩn). */
export async function listAllBanners(): Promise<Banner[]> {
  const { data } = await apiClient.get<Banner[]>("/banners");
  return data;
}

export async function createBanner(formData: FormData): Promise<Banner> {
  const { data } = await apiClient.post<Banner>("/banners", formData);
  return data;
}

export async function updateBanner(id: string, payload: Partial<Banner>): Promise<Banner> {
  const { data } = await apiClient.put<Banner>(`/banners/${id}`, payload);
  return data;
}

export async function replaceBannerImage(id: string, file: File): Promise<Banner> {
  const fd = new FormData();
  fd.append("image", file);
  const { data } = await apiClient.put<Banner>(`/banners/${id}/image`, fd);
  return data;
}

export async function deleteBanner(id: string): Promise<void> {
  await apiClient.delete(`/banners/${id}`);
}
