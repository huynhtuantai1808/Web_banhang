"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Package, ChevronRight } from "lucide-react";
import { listMyOrders, OrderOut } from "@/lib/services/orders";
import { ApiError } from "@/lib/apiClient";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
};

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCustomerLoggedIn()) {
      router.replace("/login");
      return;
    }
    async function load() {
      try {
        const data = await listMyOrders();
        setOrders(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Không tải được danh sách đơn hàng");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <SiteHeader />

      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-circuit-muted hover:text-circuit-copperLight mb-6"
      >
        <ArrowLeft size={16} /> Về trang chủ
      </Link>

      <h1 className="font-display text-2xl text-circuit-text mb-6 flex items-center gap-2">
        <Package size={22} /> Đơn hàng của tôi
      </h1>

      {loading && (
        <div className="flex items-center justify-center py-20 text-circuit-muted">
          <Loader2 className="animate-spin mr-2" size={18} /> Đang tải...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-20 text-circuit-muted">
          Bạn chưa có đơn hàng nào.{" "}
          <Link href="/" className="text-circuit-copperLight hover:underline">
            Mua sắm ngay
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block rounded-lg border border-circuit-line bg-circuit-panel p-5 hover:border-circuit-copper transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-circuit-copperLight">{order.order_code}</p>
                <p className="text-xs text-circuit-muted mt-1">
                  {new Date(order.created_at).toLocaleString("vi-VN")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="px-2 py-1 rounded-full text-xs bg-circuit-line text-circuit-muted">
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                  <p
                    className={`text-xs mt-1 ${
                      order.payment_status === "paid" ? "text-circuit-signal" : "text-circuit-muted"
                    }`}
                  >
                    {PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status} ·{" "}
                    {order.payment_gateway === "vnpay" ? "VNPay" : "COD"}
                  </p>
                </div>
                <ChevronRight size={18} className="text-circuit-muted" />
              </div>
            </div>

            <div className="space-y-1 mb-3">
              {order.items.map((item, i) => (
                <p key={i} className="text-sm text-circuit-muted">
                  {item.product_name} × {item.quantity}
                </p>
              ))}
            </div>

            <div className="flex justify-between border-t border-circuit-line pt-3">
              <span className="text-circuit-muted text-sm">Tổng tiền</span>
              <span className="font-display text-circuit-signal">{formatVND(order.final_amount)}</span>
            </div>
          </Link>
        ))}
      </div>

      <SiteFooter />
    </main>
  );
}
