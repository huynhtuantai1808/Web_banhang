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

export interface BannerInput {
  title: string;
  image_url: string;
  subtitle?: string;
  description?: string;
  link_url?: string;
  cta_label?: string;
  position?: string;
  display_order?: number;
  is_active?: boolean;
}

/** Upload ảnh banner, trả về URL. */
export async function uploadBannerImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await apiClient.post<{ image_url: string }>("/banners/upload-image", fd);
  return data.image_url;
}

/** Xoá file ảnh banner đã upload (theo đường dẫn URL). */
export async function deleteBannerImage(imageUrl: string): Promise<void> {
  const path = encodeURIComponent(imageUrl);
  await apiClient.delete(`/banners/images/${path}`);
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

export async function createBanner(input: BannerInput): Promise<Banner> {
  const { data } = await apiClient.post<Banner>("/banners", input);
  return data;
}

export async function updateBanner(id: string, payload: Partial<BannerInput>): Promise<Banner> {
  const { data } = await apiClient.put<Banner>(`/banners/${id}`, payload);
  return data;
}

export async function deleteBanner(id: string): Promise<void> {
  await apiClient.delete(`/banners/${id}`);
}
