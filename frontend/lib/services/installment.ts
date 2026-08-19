import { apiClient } from "../apiClient";

export interface InstallmentCalculatorResponse {
  months: number;
  monthly_amount: number;
  total_amount: number;
  interest_rate: number;
}

export interface InstallmentPaymentOut {
  id: string;
  period_no: number;
  due_date: string;
  amount: number;
  status: "unpaid" | "paid" | "overdue";
}

export interface InstallmentPlanOut {
  id: string;
  order_id: string;
  total_months: number;
  monthly_amount: number;
  interest_rate: number;
  down_payment: number;
  status: string;
  created_at: string;
  payments: InstallmentPaymentOut[];
}

export interface InstallmentPlanAdminOut extends InstallmentPlanOut {
  order_code: string;
  customer_name: string;
  customer_phone: string;
}

export const ALLOWED_INSTALLMENT_MONTHS = [3, 6, 9, 12] as const;

/** Máy tính trả góp công khai — không cần đăng nhập. */
export async function calculateInstallment(amount: number, months: number): Promise<InstallmentCalculatorResponse> {
  const { data } = await apiClient.get<InstallmentCalculatorResponse>("/installment-calculator", {
    params: { amount, months },
  });
  return data;
}

export async function getInstallmentPlan(orderId: string): Promise<InstallmentPlanOut> {
  const { data } = await apiClient.get<InstallmentPlanOut>(`/orders/${orderId}/installment`);
  return data;
}

// ---- Admin ----
export async function listInstallmentPlansAdmin(): Promise<InstallmentPlanAdminOut[]> {
  const { data } = await apiClient.get<InstallmentPlanAdminOut[]>("/admin/installment-plans");
  return data;
}

export async function markInstallmentPaymentPaid(paymentId: string): Promise<InstallmentPaymentOut> {
  const { data } = await apiClient.put<InstallmentPaymentOut>(`/admin/installment-payments/${paymentId}/mark-paid`);
  return data;
}
