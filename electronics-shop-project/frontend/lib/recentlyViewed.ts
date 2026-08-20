/**
 * Lưu sản phẩm đã xem (client-side localStorage).
 * Mỗi sản phẩm chỉ giữ 1 entry — cập nhật timestamp khi xem lại.
 * Giới hạn tối đa 20 sản phẩm.
 */

const STORAGE_KEY = "recently_viewed";
const MAX_ITEMS = 20;

export interface RecentlyViewedItem {
  productId: string;
  viewedAt: number;
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(productId: string): RecentlyViewedItem[] {
  const items = getRecentlyViewed().filter((i) => i.productId !== productId);
  items.unshift({ productId, viewedAt: Date.now() });
  if (items.length > MAX_ITEMS) items.splice(MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}

export function clearRecentlyViewed(): void {
  localStorage.removeItem(STORAGE_KEY);
}
