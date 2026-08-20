import { apiClient } from "../apiClient";
import { getCustomerToken } from "../auth-storage";

export interface WishlistItemOut {
  id: number;
  product_id: string;
  product_name: string;
  product_price: number;
  product_discount_price: number | null;
  product_image_url: string | null;
  added_at: string;
}

export interface WishlistCountOut {
  count: number;
}

function authHeaders(): Record<string, string> {
  const token = getCustomerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getWishlist(): Promise<WishlistItemOut[]> {
  const { data } = await apiClient.get<WishlistItemOut[]>("/wishlist", {
    headers: authHeaders(),
  });
  return data;
}

export async function getWishlistCount(): Promise<number> {
  try {
    const { data } = await apiClient.get<WishlistCountOut>("/wishlist/count", {
      headers: authHeaders(),
    });
    return data.count;
  } catch {
    return 0;
  }
}

export async function addToWishlist(productId: string): Promise<void> {
  await apiClient.post(`/wishlist/${productId}`, {}, { headers: authHeaders() });
}

export async function removeFromWishlist(productId: string): Promise<void> {
  await apiClient.delete(`/wishlist/${productId}`, { headers: authHeaders() });
}
