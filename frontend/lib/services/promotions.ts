import { apiClient } from "../apiClient";

export interface PromotionOut {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discount_type: "percent" | "amount";
  discount_value: number;
  start_date?: string | null;
  end_date?: string | null;
  max_usage?: number | null;
  used_count: number;
  is_active: boolean;
  is_targeted: boolean; // true = đã phân bổ riêng, không còn công khai
}

export interface PromotionCreateInput {
  code: string;
  name: string;
  description?: string;
  discount_type: "percent" | "amount";
  discount_value: number;
  start_date?: string;
  end_date?: string;
  max_usage?: number;
}

export interface PromotionUpdateInput {
  name?: string;
  description?: string;
  discount_type?: "percent" | "amount";
  discount_value?: number;
  start_date?: string;
  end_date?: string;
  max_usage?: number;
  is_active?: boolean;
}

export interface ValidatePromoResponse {
  valid: boolean;
  discount_amount: number;
  message: string;
}

// ---- Admin ----
export async function listPromotions(): Promise<PromotionOut[]> {
  const { data } = await apiClient.get<PromotionOut[]>("/promotions");
  return data;
}

export async function createPromotion(payload: PromotionCreateInput): Promise<PromotionOut> {
  const { data } = await apiClient.post<PromotionOut>("/promotions", payload);
  return data;
}

export async function updatePromotion(id: string, payload: PromotionUpdateInput): Promise<PromotionOut> {
  const { data } = await apiClient.put<PromotionOut>(`/promotions/${id}`, payload);
  return data;
}

export async function deactivatePromotion(id: string): Promise<void> {
  await apiClient.delete(`/promotions/${id}`);
}

export async function assignPromotionToCustomer(
  promotionId: string,
  customerPhone: string
): Promise<{ message: string }> {
  const { data } = await apiClient.post(`/promotions/${promotionId}/assign`, { customer_phone: customerPhone });
  return data;
}

// ---- Khách hàng ----
export async function listMyPromotions(): Promise<PromotionOut[]> {
  const { data } = await apiClient.get<PromotionOut[]>("/promotions/mine");
  return data;
}

export async function validatePromoCode(code: string): Promise<ValidatePromoResponse> {
  const { data } = await apiClient.post<ValidatePromoResponse>("/promotions/validate", { code });
  return data;
}
