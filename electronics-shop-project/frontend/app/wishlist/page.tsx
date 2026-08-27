"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
import { getProduct, ProductOut } from "@/lib/services/products";
import { getWishlist, removeFromWishlist, WishlistItemOut } from "@/lib/services/wishlist";
import {
  getGuestWishlist, removeGuestWishlistItem,
} from "@/lib/wishlist";
import { addGuestCartItem } from "@/lib/guestCart";
import { addToCart } from "@/lib/services/cart";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import { getMediaUrl } from "@/lib/media";
import { ApiError } from "@/lib/apiClient";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

interface WishlistProduct extends WishlistItemOut {
  product?: ProductOut;
  loading?: boolean;
}

async function hydrateGuestWishlist(
  guestItems: { productId: string; addedAt: number }[]
): Promise<WishlistProduct[]> {
  const items: WishlistProduct[] = [];
  for (const line of guestItems) {
    try {
      const product = await getProduct(line.productId);
      items.push({
        id: 0,
        product_id: line.productId,
        product_name: product.name,
        product_price: product.price,
        product_discount_price: product.discount_price ?? null,
        product_image_url: product.primary_image_url ?? null,
        added_at: new Date(line.addedAt).toISOString(),
        product,
      });
    } catch {
      // product deleted
    }
  }
  return items;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingCart, setAddingCart] = useState<string | null>(null);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);
  const loggedIn = isCustomerLoggedIn();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (loggedIn) {
        const data = await getWishlist();
        setItems(data.map((item) => ({ ...item, id: item.id })));
      } else {
        const guestItems = getGuestWishlist();
        const hydrated = await hydrateGuestWishlist(guestItems);
        setItems(hydrated);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được wishlist");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRemove(productId: string) {
    setRemovingId(productId);
    try {
      if (loggedIn) {
        await removeFromWishlist(productId);
      } else {
        removeGuestWishlistItem(productId);
      }
      setItems((prev) => prev.filter((i) => i.product_id !== productId));
      window.dispatchEvent(new Event("wishlist-updated"));
    } catch {
      setError("Xoá khỏi yêu thích thất bại");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleAddToCart(item: WishlistProduct) {
    setAddingCart(item.product_id);
    try {
      if (loggedIn) {
        await addToCart(item.product_id, 1);
      } else {
        addGuestCartItem(item.product_id, 1);
      }
      window.dispatchEvent(new Event("cart-updated"));
      setAddedMsg("Đã thêm vào giỏ hàng!");
      setTimeout(() => setAddedMsg(null), 2000);
    } catch {
      setAddedMsg("Thêm vào giỏ hàng thất bại");
      setTimeout(() => setAddedMsg(null), 2000);
    } finally {
      setAddingCart(null);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-6 pb-10">

      <Link href="/" className="inline-flex items-center gap-2 text-sm text-circuit-muted hover:text-circuit-copperLight mb-6">
        <ArrowLeft size={16} /> Quay lại trang chủ
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Heart size={24} className="text-circuit-copper" />
        <h1 className="font-display text-2xl text-circuit-text">Yêu thích</h1>
        {!loggedIn && (
          <span className="ml-2 text-xs text-circuit-muted bg-circuit-panel border border-circuit-line rounded-full px-2.5 py-0.5">
            Lưu trên trình duyệt
          </span>
        )}
      </div>

      {!loggedIn && (
        <p className="text-sm text-circuit-muted mb-6">
          Đăng nhập để đồng bộ wishlist across devices.{" "}
          <Link href="/login" className="text-circuit-copperLight hover:underline">Đăng nhập</Link>
        </p>
      )}

      {addedMsg && (
        <div className="mb-4 rounded-md border border-circuit-signal/40 bg-circuit-signal/10 px-3 py-2 text-sm text-circuit-signal">
          {addedMsg}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-circuit-muted">
          <Loader2 className="animate-spin mr-2" size={18} /> Đang tải...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-20">
          <Heart size={48} className="mx-auto text-circuit-line mb-4" />
          <p className="text-circuit-muted mb-4">Chưa có sản phẩm yêu thích nào.</p>
          <Link href="/" className="text-circuit-copperLight hover:underline">
            Khám phá sản phẩm
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.product_id}
              className="flex items-center gap-4 rounded-lg border border-circuit-line bg-circuit-panel p-4"
            >
              {/* Image */}
              <Link href={`/products/${item.product_id}`} className="shrink-0">
                <div className="w-20 h-20 rounded-md bg-circuit-bg/60 overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getMediaUrl(item.product_image_url) || "/placeholder-product.png"}
                    alt={item.product_name}
                    className="object-contain w-full h-full"
                  />
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.product_id}`} className="hover:text-circuit-copperLight transition-colors">
                  <p className="text-circuit-text font-medium text-sm line-clamp-2">{item.product_name}</p>
                </Link>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-base text-circuit-signal">
                    {formatVND(item.product_discount_price ?? item.product_price)}
                  </span>
                  {item.product_discount_price && (
                    <span className="text-xs text-circuit-muted line-through">
                      {formatVND(item.product_price)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-circuit-muted mt-1">
                  Thêm {new Date(item.added_at).toLocaleDateString("vi-VN")}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => handleAddToCart(item)}
                  disabled={addingCart === item.product_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-circuit-copper text-circuit-bg text-xs font-medium hover:bg-circuit-copperLight transition-colors disabled:opacity-50"
                >
                  {addingCart === item.product_id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ShoppingCart size={13} />
                  )}
                  Thêm vào giỏ
                </button>
                <button
                  onClick={() => handleRemove(item.product_id)}
                  disabled={removingId === item.product_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-circuit-line text-circuit-muted text-xs hover:border-red-400/60 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {removingId === item.product_id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  Bỏ thích
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      </main>
      <SiteFooter />
    </>
  );
}
