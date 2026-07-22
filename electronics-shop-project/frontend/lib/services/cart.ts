import { apiClient } from "../apiClient";

export interface CartItemOut {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_discount_price?: number | null;
  product_image_url?: string | null;
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
