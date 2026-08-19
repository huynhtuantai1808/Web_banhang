import { apiClient } from "../apiClient";

export interface DiscountRuleOut {
  id: string;
  category_id?: number | null;
  category_name?: string | null;
  brand_id?: number | null;
  brand_name?: string | null;
  min_quantity: number;
  discount_percent: number;
  valid_from?: string | null;
  valid_to?: string | null;
}

export interface DiscountRuleInput {
  category_id?: number;
  brand_id?: number;
  min_quantity: number;
  discount_percent: number;
}

export async function listDiscountRules(): Promise<DiscountRuleOut[]> {
  const { data } = await apiClient.get<DiscountRuleOut[]>("/discount-rules");
  return data;
}

export async function createDiscountRule(payload: DiscountRuleInput): Promise<DiscountRuleOut> {
  const { data } = await apiClient.post<DiscountRuleOut>("/discount-rules", payload);
  return data;
}

export async function updateDiscountRule(id: string, payload: Partial<DiscountRuleInput>): Promise<DiscountRuleOut> {
  const { data } = await apiClient.put<DiscountRuleOut>(`/discount-rules/${id}`, payload);
  return data;
}

export async function deleteDiscountRule(id: string): Promise<void> {
  await apiClient.delete(`/discount-rules/${id}`);
}
