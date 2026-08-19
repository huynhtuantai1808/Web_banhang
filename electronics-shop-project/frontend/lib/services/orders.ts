import { apiClient } from "../apiClient";

export interface OrderItemOut {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
}

export interface OrderOut {
  id: string;
  order_code: string;
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

export interface OrderCreateResponse {
  order: OrderOut;
  payment_url?: string | null; // có giá trị nếu chọn VNPay — FE cần redirect (window.location.href) sang đây
}

export interface CreateOrderInput {
  shippingAddress: string;
  gateway?: "cod" | "vnpay";
  paymentMethod?: "full" | "installment";
  installmentMonths?: number;
  promoCode?: string;
}

/** Tạo đơn hàng từ giỏ hàng hiện tại. */
export async function createOrder(input: CreateOrderInput): Promise<OrderCreateResponse> {
  const { data } = await apiClient.post<OrderCreateResponse>("/orders", {
    shipping_address: input.shippingAddress,
    payment_gateway: input.gateway ?? "cod",
    payment_method: input.paymentMethod ?? "full",
    installment_months: input.installmentMonths,
    promo_code: input.promoCode || undefined,
  });
  return data;
}

export async function listMyOrders(): Promise<OrderOut[]> {
  const { data } = await apiClient.get<OrderOut[]>("/orders");
  return data;
}

export async function getOrder(orderId: string): Promise<OrderOut> {
  const { data } = await apiClient.get<OrderOut>(`/orders/${orderId}`);
  return data;
}

export interface GuestOrderInput {
  fullName: string;
  phone: string;
  email?: string;
  shippingAddress: string;
  gateway?: "cod" | "vnpay";
  promoCode?: string;
  items: { productId: string; quantity: number }[];
}

/** Đặt hàng KHÔNG CẦN đăng ký tài khoản — khách điền thông tin ngay lúc đặt hàng. */
export async function createGuestOrder(input: GuestOrderInput): Promise<OrderCreateResponse> {
  const { data } = await apiClient.post<OrderCreateResponse>("/orders/guest", {
    full_name: input.fullName,
    phone: input.phone,
    email: input.email || undefined,
    shipping_address: input.shippingAddress,
    payment_gateway: input.gateway ?? "cod",
    promo_code: input.promoCode || undefined,
    items: input.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
  });
  return data;
}

/** Tra cứu đơn hàng không cần đăng nhập — cần đúng mã đơn + số điện thoại đã dùng lúc đặt hàng. */
export async function lookupOrder(orderCode: string, phone: string): Promise<OrderOut> {
  const { data } = await apiClient.get<OrderOut>("/orders/lookup", { params: { order_code: orderCode, phone } });
  return data;
}
