import { apiClient } from "../apiClient";
import { OrderItemOut } from "./orders";

export interface AdminOrderOut {
  id: string;
  order_code: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: "full" | "installment";
  payment_gateway: "cod" | "vnpay";
  payment_status: "pending" | "paid" | "failed";
  status: string;
  shipping_address?: string | null;
  created_at: string;
  items: OrderItemOut[];
  promotion_code?: string | null;
  has_installment_plan: boolean;
}

export interface AdminOrderFilters {
  keyword?: string;
  status?: string;
  payment_status?: string;
}

/** Toàn bộ đơn hàng của khách — mọi nhân viên đã đăng nhập đều xem được. */
export async function listAllOrders(filters: AdminOrderFilters = {}): Promise<AdminOrderOut[]> {
  const { data } = await apiClient.get<AdminOrderOut[]>("/admin/orders", { params: filters });
  return data;
}

export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderOut> {
  const { data } = await apiClient.get<AdminOrderOut>(`/admin/orders/${orderId}`);
  return data;
}

export async function updateOrderStatus(orderId: string, newStatus: string): Promise<AdminOrderOut> {
  const { data } = await apiClient.put<AdminOrderOut>(`/admin/orders/${orderId}/status`, null, {
    params: { new_status: newStatus },
  });
  return data;
}
