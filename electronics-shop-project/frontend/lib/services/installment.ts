import { apiClient } from "../apiClient";

export type InstallmentType = "credit_card" | "finance";

export interface InstallmentCalculatorResponse {
  type: InstallmentType;
  months: number;
  monthly_amount: number;
  total_amount: number;
  interest_rate: number;
  fee_amount: number;
  down_payment_amount: number;
  loan_amount: number;
  total_interest: number;
}

export interface InstallmentOption {
  type: InstallmentType;
  months: number;
  conversion_fee?: number;
  fee_amount?: number;
  down_payment_pct?: number;
  down_payment_amount?: number;
  loan_amount?: number;
  annual_interest_rate?: number;
  monthly_interest_rate?: number;
  total_interest?: number;
  total_amount: number;
  monthly_amount: number;
  monthly_payment?: number;
}

export interface InstallmentOptionsResponse {
  amount: number;
  options: InstallmentOption[];
}

export interface InstallmentInfo {
  credit_card: {
    tenures: number[];
    fees: Record<string, number>;
  };
  finance: {
    tenures: number[];
    down_payment_pct: number;
    annual_interest_rate: number;
    monthly_interest_rate: number;
  };
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

export const CREDIT_CARD_MONTHS = [3, 6, 9, 12, 18, 24] as const;
export const FINANCE_MONTHS = [6, 12, 18, 24, 36] as const;

/** Trả về bảng phương án trả góp theo loại. */
export async function getInstallmentOptions(
  amount: number,
  type: InstallmentType = "credit_card",
): Promise<InstallmentOptionsResponse> {
  const { data } = await apiClient.get<InstallmentOptionsResponse>("/installment-options", {
    params: { amount, inst_type: type },
  });
  return data;
}

/** Lấy thông tin cấu hình trả góp. */
export async function getInstallmentInfo(): Promise<InstallmentInfo> {
  const { data } = await apiClient.get<InstallmentInfo>("/installment-info");
  return data;
}

/** Máy tính một phương án cụ thể. */
export async function calculateInstallment(
  amount: number,
  months: number,
  type: InstallmentType = "credit_card",
): Promise<InstallmentCalculatorResponse> {
  const { data } = await apiClient.get<InstallmentCalculatorResponse>("/installment-calculator", {
    params: { amount, months, inst_type: type },
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
