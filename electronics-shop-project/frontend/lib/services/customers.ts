import { apiClient } from "../apiClient";

export interface CustomerOut {
  id: string;
  customer_code: string;
  full_name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CustomerDetailOut extends CustomerOut {
  total_orders: number;
  total_spent: number;
}

export interface CustomerUpdateInput {
  full_name?: string;
  email?: string;
  address?: string;
  is_active?: boolean;
  new_password?: string;
}

export async function listCustomers(keyword?: string): Promise<CustomerOut[]> {
  const { data } = await apiClient.get<CustomerOut[]>("/customers", { params: keyword ? { keyword } : {} });
  return data;
}

export async function getCustomer(id: string): Promise<CustomerDetailOut> {
  const { data } = await apiClient.get<CustomerDetailOut>(`/customers/${id}`);
  return data;
}

export async function updateCustomer(id: string, payload: CustomerUpdateInput): Promise<CustomerOut> {
  const { data } = await apiClient.put<CustomerOut>(`/customers/${id}`, payload);
  return data;
}
