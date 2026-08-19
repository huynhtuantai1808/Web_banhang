"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Minus, Plus, Trash2, ArrowLeft, CreditCard } from "lucide-react";
import { getCart, updateCartItem, removeCartItem, CartOut, CartItemOut } from "@/lib/services/cart";
import { getProduct } from "@/lib/services/products";
import {
  getGuestCart, updateGuestCartItemQuantity, removeGuestCartItem,
} from "@/lib/guestCart";
import { getMediaUrl } from "@/lib/media";
import { ApiError } from "@/lib/apiClient";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

/** Dựng lại thông tin hiển thị cho giỏ hàng khách vãng lai (chỉ có productId+quantity trong
 * localStorage) bằng cách tra cứu chi tiết từng sản phẩm — để hiển thị giống hệt giỏ hàng của
 * khách đã đăng nhập (ảnh, tên, giá). */
async function hydrateGuestCart(): Promise<CartOut> {
  const guestItems = getGuestCart();
  const items: CartItemOut[] = [];
  let total = 0;

  for (const line of guestItems) {
    try {
      const product = await getProduct(line.productId);
      const unitPrice = product.discount_price ?? product.price;
      total += unitPrice * line.quantity;
      items.push({
        id: line.productId, // dùng productId làm id vì khách vãng lai không có CartItem thật trong DB
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        product_discount_price: product.discount_price ?? null,
        product_image_url: product.primary_image_url ?? null,
        is_installment_eligible: product.is_installment_eligible,
        quantity: line.quantity,
      });
    } catch {
      // sản phẩm có thể đã bị xoá/ngừng bán — bỏ qua khỏi hiển thị
    }
  }

  return { items, total_amount: total };
}

export default function CartPage() {
  const [cart, setCart] = useState<CartOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const loggedIn = isCustomerLoggedIn();

  async function loadCart() {
    setLoading(true);
    setError(null);
    try {
      const data = loggedIn ? await getCart() : await hydrateGuestCart();
      setCart(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được giỏ hàng");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleQuantityChange(itemId: string, nextQty: number) {
    setUpdatingId(itemId);
    try {
      if (loggedIn) {
        setCart(await updateCartItem(itemId, nextQty));
      } else {
        updateGuestCartItemQuantity(itemId, nextQty); // itemId ở đây chính là productId
        setCart(await hydrateGuestCart());
      }
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRemove(itemId: string) {
    setUpdatingId(itemId);
    try {
      if (loggedIn) {
        setCart(await removeCartItem(itemId));
      } else {
        removeGuestCartItem(itemId);
        setCart(await hydrateGuestCart());
      }
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xoá thất bại");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <SiteHeader />

      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-circuit-muted hover:text-circuit-copperLight mb-6"
      >
        <ArrowLeft size={16} /> Tiếp tục mua sắm
      </Link>

      <h1 className="font-display text-2xl text-circuit-text mb-2">Giỏ hàng của bạn</h1>
      {!loggedIn && (
        <p className="text-sm text-circuit-muted mb-6">
          Bạn đang mua sắm không cần tài khoản — giỏ hàng được lưu tạm trên trình duyệt này.{" "}
          <Link href="/login" className="text-circuit-copperLight hover:underline">Đăng nhập</Link> nếu muốn
          đồng bộ giỏ hàng và tra cứu đơn hàng dễ dàng hơn.
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-circuit-muted">
          <Loader2 className="animate-spin mr-2" size={18} /> Đang tải giỏ hàng...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300 mb-6">
          {error}
        </div>
      )}

      {!loading && cart && cart.items.length === 0 && (
        <div className="text-center py-20 text-circuit-muted">
          Giỏ hàng đang trống.{" "}
          <Link href="/" className="text-circuit-copperLight hover:underline">
            Khám phá sản phẩm ngay
          </Link>
        </div>
      )}

      {!loading && cart && cart.items.length > 0 && (
        <div className="space-y-4">
          {cart.items.map((item) => {
            const unitPrice = item.product_discount_price ?? item.product_price;
            const isUpdating = updatingId === item.id;
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-lg border border-circuit-line bg-circuit-panel p-4"
              >
                <div className="w-16 h-16 shrink-0 rounded-md bg-circuit-bg/60 overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getMediaUrl(item.product_image_url) || "/placeholder-product.png"}
                    alt={item.product_name}
                    className="object-contain w-full h-full"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-circuit-text truncate">{item.product_name}</p>
                  <p className="text-sm text-circuit-signal font-mono">{formatVND(unitPrice)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={isUpdating}
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    className="p-1.5 rounded border border-circuit-line hover:border-circuit-copper text-circuit-muted hover:text-circuit-copperLight disabled:opacity-50"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-circuit-text">{item.quantity}</span>
                  <button
                    disabled={isUpdating}
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    className="p-1.5 rounded border border-circuit-line hover:border-circuit-copper text-circuit-muted hover:text-circuit-copperLight disabled:opacity-50"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <p className="w-28 text-right font-mono text-circuit-text">
                  {formatVND(unitPrice * item.quantity)}
                </p>

                <button
                  disabled={isUpdating}
                  onClick={() => handleRemove(item.id)}
                  className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-red-400 disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            );
          })}

          <div className="flex items-center justify-between rounded-lg border border-circuit-line bg-circuit-panel p-4">
            <span className="text-circuit-muted">Tổng cộng</span>
            <span className="font-display text-xl text-circuit-signal">
              {formatVND(cart.total_amount)}
            </span>
          </div>

          <Link
            href="/checkout"
            className="w-full flex items-center justify-center gap-2 rounded-md bg-circuit-copper py-3 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors"
          >
            <CreditCard size={18} /> Tiến hành thanh toán
          </Link>
        </div>
      )}

      <SiteFooter />
    </main>
  );
}
