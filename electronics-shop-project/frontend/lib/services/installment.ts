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
  downPaymentPct?: number,
): Promise<InstallmentOptionsResponse> {
  const { data } = await apiClient.get<InstallmentOptionsResponse>("/installment-options", {
    params: { amount, inst_type: type, down_payment_pct: downPaymentPct },
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
  downPaymentPct?: number,
): Promise<InstallmentCalculatorResponse> {
  const { data } = await apiClient.get<InstallmentCalculatorResponse>("/installment-calculator", {
    params: { amount, months, inst_type: type, down_payment_pct: downPaymentPct },
  });
  return data;
}

export async function getInstallmentPlan(orderId: string): Promise<InstallmentPlanOut> {
  const { data } = await apiClient.get<InstallmentPlanOut>(`/orders/${orderId}/installment`);
  return data;
}

// ---- Local Calculation for speed ----
export function calculateInstallmentOptionsLocal(
  amount: number,
  type: InstallmentType,
  info: InstallmentInfo,
  downPaymentPct: number = 0
): InstallmentOption[] {
  if (type === "finance") {
    const pct = downPaymentPct || (info.finance.down_payment_pct / 100);
    const downPaymentAmount = Math.round(amount * pct);
    const loanAmount = amount - downPaymentAmount;
    const monthlyRate = info.finance.monthly_interest_rate / 100;

    return info.finance.tenures.map(months => {
      let monthlyPayment = 0;
      if (monthlyRate === 0) {
        monthlyPayment = Math.round(loanAmount / months);
      } else {
        const factor = Math.pow(1 + monthlyRate, months);
        monthlyPayment = Math.round((loanAmount * monthlyRate * factor) / (factor - 1));
      }
      const totalInterest = Math.round(monthlyPayment * months - loanAmount);
      const totalAmount = loanAmount + totalInterest;

      return {
        type: "finance",
        months,
        down_payment_pct: pct * 100,
        down_payment_amount: downPaymentAmount,
        loan_amount: loanAmount,
        annual_interest_rate: info.finance.annual_interest_rate,
        monthly_interest_rate: info.finance.monthly_interest_rate,
        total_interest: totalInterest,
        total_amount: totalAmount,
        monthly_amount: monthlyPayment,
        monthly_payment: monthlyPayment
      };
    });
  } else {
    // Credit card
    const pct = downPaymentPct || 0;
    const downPaymentAmount = Math.round(amount * pct);
    const loanAmount = amount - downPaymentAmount;

    return info.credit_card.tenures.map(months => {
      const feePct = info.credit_card.fees[String(months)] || 0;
      const feeAmount = Math.round((loanAmount * feePct) / 100);
      const totalLoanWithFee = loanAmount + feeAmount;
      const monthlyAmount = Math.round(totalLoanWithFee / months);

      return {
        type: "credit_card",
        months,
        conversion_fee: feePct,
        fee_amount: feeAmount,
        down_payment_pct: pct * 100,
        down_payment_amount: downPaymentAmount,
        loan_amount: loanAmount,
        total_amount: totalLoanWithFee,
        monthly_amount: monthlyAmount,
        monthly_payment: monthlyAmount
      };
    });
  }
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
