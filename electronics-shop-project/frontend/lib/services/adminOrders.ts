import { apiClient } from "../apiClient";
import { OrderItemOut } from "./orders";

/** Dữ liệu hóa đơn đầy đủ - dùng để in / gửi email cho khách. */
export interface InvoiceData {
  order_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  shipping_address?: string | null;
  payment_method: string;
  payment_gateway: string;
  payment_status: string;
  status: string;
  created_at: string;
  items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
  subtotal: number;
  discount_amount: number;
  final_amount: number;
  promotion_code?: string | null;
}

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

export interface PaginatedAdminOrders {
  items: AdminOrderOut[];
  total: number;
  page: number;
  total_pages: number;
}

/** Toàn bộ đơn hàng của khách — mọi nhân viên đã đăng nhập đều xem được. */
export async function listAllOrders(filters: AdminOrderFilters = {}): Promise<PaginatedAdminOrders> {
  const { data } = await apiClient.get<PaginatedAdminOrders>("/admin/orders", { params: filters });
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

/** Lấy dữ liệu hóa đơn đầy đủ cho 1 đơn hàng. */
export async function getOrderInvoice(orderId: string): Promise<InvoiceData> {
  const { data } = await apiClient.get<InvoiceData>(`/admin/orders/${orderId}/invoice`);
  return data;
}

/** Gửi hóa đơn qua email cho khách hàng. */
export async function sendOrderInvoiceEmail(orderId: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(`/admin/orders/${orderId}/send-email`);
  return data;
}
