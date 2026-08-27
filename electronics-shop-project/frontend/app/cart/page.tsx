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
    <div className="min-h-screen flex flex-col bg-circuit-bg text-circuit-text">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-6 pb-10">

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
        <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-6 py-4 text-sm text-red-300 mb-6 backdrop-blur-sm">
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
                className="flex items-center gap-4 rounded-2xl glass-panel p-5 transition-all duration-300 hover:border-circuit-copper/30 hover:shadow-glow group"
              >
                <div className="w-20 h-20 shrink-0 rounded-xl bg-circuit-bg/40 border border-circuit-line/30 overflow-hidden flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getMediaUrl(item.product_image_url) || "/placeholder-product.png"}
                    alt={item.product_name}
                    className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product_id}`} className="text-circuit-text truncate hover:text-circuit-copperLight transition-colors block text-lg font-medium">
                    {item.product_name}
                  </Link>
                  <p className="text-sm text-circuit-signal font-mono mt-1">{formatVND(unitPrice)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={isUpdating}
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-circuit-line hover:border-circuit-copper hover:bg-circuit-copper/10 text-circuit-muted hover:text-circuit-copperLight disabled:opacity-50 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-circuit-text font-medium">{item.quantity}</span>
                  <button
                    disabled={isUpdating}
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-circuit-line hover:border-circuit-copper hover:bg-circuit-copper/10 text-circuit-muted hover:text-circuit-copperLight disabled:opacity-50 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <p className="w-32 text-right font-mono text-circuit-text font-semibold">
                  {formatVND(unitPrice * item.quantity)}
                </p>

                <button
                  disabled={isUpdating}
                  onClick={() => handleRemove(item.id)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-500/10 text-circuit-muted hover:text-red-400 disabled:opacity-50 transition-all hover:scale-105"
                  title="Xoá"
                >
                  {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
              </div>
            );
          })}

          <div className="flex items-center justify-between rounded-2xl glass-panel p-6 mt-6 border-t-4 border-t-circuit-copper/50">
            <span className="text-circuit-muted uppercase tracking-widest text-sm font-mono">Tổng cộng</span>
            <span className="font-display text-2xl text-circuit-signal font-bold drop-shadow-[0_0_8px_rgba(48,223,147,0.4)]">
              {formatVND(cart.total_amount)}
            </span>
          </div>

          <Link
            href="/checkout"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-circuit-copper to-circuit-copperLight py-4 text-base font-bold text-circuit-bg hover:shadow-glow hover:-translate-y-1 transition-all duration-300 mt-6"
          >
            <CreditCard size={20} /> TIẾN HÀNH THANH TOÁN
          </Link>
        </div>
      )}

      </main>
      <SiteFooter />
    </div>
  );
}
