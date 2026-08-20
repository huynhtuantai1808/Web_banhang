/**
 * Wishlist cho KHÁCH VÃNG LAI (chưa đăng nhập) — lưu hoàn toàn ở trình duyệt (localStorage).
 * Với khách đã đăng nhập, backend sẽ lưu wishlist trong DB
 * (endpoint: GET/POST/DELETE /wishlist — xem backend).
 *
 * Luồng hoạt động:
 * 1. Khách bấm ♡ → lưu productId vào localStorage.
 * 2. Trang /wishlist đọc từ đây (nếu chưa đăng nhập) thay vì gọi API.
 * 3. Sau khi đăng nhập, có thể merge wishlist localStorage vào DB.
 */

const STORAGE_KEY = "guest_wishlist";

export interface GuestWishlistItem {
  productId: string;
  addedAt: number; // timestamp
}

function readWishlist(): GuestWishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeWishlist(items: GuestWishlistItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getGuestWishlist(): GuestWishlistItem[] {
  return readWishlist();
}

export function getGuestWishlistCount(): number {
  return readWishlist().length;
}

export function isInGuestWishlist(productId: string): boolean {
  return readWishlist().some((i) => i.productId === productId);
}

export function addGuestWishlistItem(productId: string): GuestWishlistItem[] {
  const items = readWishlist();
  if (!items.some((i) => i.productId === productId)) {
    items.push({ productId, addedAt: Date.now() });
    writeWishlist(items);
  }
  return items;
}

export function removeGuestWishlistItem(productId: string): GuestWishlistItem[] {
  const items = readWishlist().filter((i) => i.productId !== productId);
  writeWishlist(items);
  return items;
}

export function toggleGuestWishlist(productId: string): boolean {
  const items = readWishlist();
  const exists = items.some((i) => i.productId === productId);
  if (exists) {
    writeWishlist(items.filter((i) => i.productId !== productId));
  } else {
    items.push({ productId, addedAt: Date.now() });
    writeWishlist(items);
  }
  return !exists; // returns true = added, false = removed
}

export function clearGuestWishlist(): void {
  writeWishlist([]);
}
