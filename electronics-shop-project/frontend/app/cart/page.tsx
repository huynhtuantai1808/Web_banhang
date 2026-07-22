"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Minus, Plus, Trash2, ArrowLeft } from "lucide-react";
import { getCart, updateCartItem, removeCartItem, CartOut } from "@/lib/services/cart";
import { getMediaUrl } from "@/lib/media";
import { ApiError } from "@/lib/apiClient";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import SiteHeader from "@/components/SiteHeader";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadCart() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCart();
      setCart(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được giỏ hàng");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isCustomerLoggedIn()) {
      router.replace("/login");
      return;
    }
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleQuantityChange(itemId: string, nextQty: number) {
    setUpdatingId(itemId);
    try {
      const data = await updateCartItem(itemId, nextQty);
      setCart(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRemove(itemId: string) {
    setUpdatingId(itemId);
    try {
      const data = await removeCartItem(itemId);
      setCart(data);
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

      <h1 className="font-display text-2xl text-circuit-text mb-6">Giỏ hàng của bạn</h1>

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

          <button className="w-full rounded-md bg-circuit-copper py-3 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors">
            Tiến hành thanh toán
          </button>
          <p className="text-center text-xs text-circuit-muted">
            (Chức năng thanh toán/đặt hàng sẽ được nối API ở giai đoạn tiếp theo)
          </p>
        </div>
      )}
    </main>
  );
}
