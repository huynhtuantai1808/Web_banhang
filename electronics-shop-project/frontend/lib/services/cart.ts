import { apiClient } from "../apiClient";

export interface CartItemOut {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_discount_price?: number | null;
  product_image_url?: string | null;
  is_installment_eligible: boolean;
  quantity: number;
}

export interface CartOut {
  items: CartItemOut[];
  total_amount: number;
}

export async function getCart(): Promise<CartOut> {
  const { data } = await apiClient.get<CartOut>("/cart");
  return data;
}

/** Xem trước chiết khấu TỰ ĐỘNG (theo hãng/danh mục/số lượng) áp dụng cho giỏ hàng hiện tại —
 * không cần khách nhập mã, khác với mã khuyến mãi. */
export async function getAutoDiscountPreview(): Promise<number> {
  const { data } = await apiClient.get<{ auto_discount_amount: number }>("/cart/auto-discount");
  return data.auto_discount_amount;
}

export async function addToCart(productId: string, quantity = 1): Promise<CartOut> {
  const { data } = await apiClient.post<CartOut>("/cart/items", {
    product_id: productId,
    quantity,
  });
  return data;
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartOut> {
  const { data } = await apiClient.put<CartOut>(`/cart/items/${itemId}`, null, {
    params: { quantity },
  });
  return data;
}

export async function removeCartItem(itemId: string): Promise<CartOut> {
  const { data } = await apiClient.delete<CartOut>(`/cart/items/${itemId}`);
  return data;
}
