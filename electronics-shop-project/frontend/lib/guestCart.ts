/**
 * Giỏ hàng cho KHÁCH VÃNG LAI (chưa đăng nhập) — lưu hoàn toàn ở trình duyệt (localStorage),
 * khác với giỏ hàng của khách đã đăng nhập (lưu ở Backend qua `lib/services/cart.ts`).
 *
 * Luồng hoạt động:
 * 1. Khách chưa đăng nhập bấm "Thêm vào giỏ" → lưu vào localStorage qua module này.
 * 2. Trang /cart đọc từ đây (nếu chưa đăng nhập) thay vì gọi API giỏ hàng.
 * 3. Lúc thanh toán (/checkout), nếu vẫn chưa đăng nhập → khách điền thêm họ tên/SĐT/địa chỉ,
 *    toàn bộ giỏ hàng này được gửi thẳng lên `POST /orders/guest` (xem lib/services/orders.ts).
 * 4. Sau khi đặt hàng thành công → xoá giỏ hàng khách vãng lai bằng `clearGuestCart()`.
 */

const STORAGE_KEY = "guest_cart";

export interface GuestCartItem {
  productId: string;
  quantity: number;
}

function readCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(items: GuestCartItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getGuestCart(): GuestCartItem[] {
  return readCart();
}

export function addGuestCartItem(productId: string, quantity = 1): GuestCartItem[] {
  const items = readCart();
  const existing = items.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({ productId, quantity });
  }
  writeCart(items);
  return items;
}

export function updateGuestCartItemQuantity(productId: string, quantity: number): GuestCartItem[] {
  let items = readCart();
  if (quantity <= 0) {
    items = items.filter((i) => i.productId !== productId);
  } else {
    const existing = items.find((i) => i.productId === productId);
    if (existing) existing.quantity = quantity;
  }
  writeCart(items);
  return items;
}

export function removeGuestCartItem(productId: string): GuestCartItem[] {
  const items = readCart().filter((i) => i.productId !== productId);
  writeCart(items);
  return items;
}

export function clearGuestCart(): void {
  writeCart([]);
}

export function getGuestCartCount(): number {
  return readCart().reduce((sum, i) => sum + i.quantity, 0);
}
