import { apiClient } from "../apiClient";

export interface TopProduct {
  name: string;
  quantity_sold: number;
  revenue: number;
}

export interface TopCustomer {
  name: string;
  order_count: number;
  total_spend: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
}

export interface RevenueReport {
  period: string;
  from_date: string;
  to_date: string;
  total_revenue: number;
  order_count: number;
  top_products: TopProduct[];
  top_customers: TopCustomer[];
  daily_revenue: DailyRevenue[];
}

export interface RevenueFilters {
  period?: "daily" | "weekly" | "monthly";
  date?: string; // YYYY-MM-DD
}

/** Lấy báo cáo doanh thu - chỉ admin mới xem được. */
export async function getRevenueReport(filters: RevenueFilters = {}): Promise<RevenueReport> {
  const { data } = await apiClient.get<RevenueReport>("/admin/reports/revenue", { params: filters });
  return data;
}

/** Gửi báo cáo doanh thu qua email - chỉ admin mới gửi được. */
export async function sendRevenueEmail(
  toEmail: string,
  period: string,
  date?: string
): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(
    "/admin/reports/send-email",
    null,
    { params: { period, date, to_email: toEmail } }
  );
  return data;
}
