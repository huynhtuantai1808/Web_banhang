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

      <h1 className="font-display text-3xl text-circuit-text mb-8 flex items-center gap-3">
        <Package size={28} className="text-circuit-copperLight drop-shadow-[0_0_8px_rgba(200,127,69,0.5)]" />
        Đơn hàng của tôi
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

      <div className="space-y-6">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block rounded-2xl glass-panel p-6 transition-all duration-300 hover:border-circuit-copper/40 hover:shadow-glow group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-circuit-copper/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div>
                <p className="font-mono text-circuit-copperLight text-lg font-bold flex items-center gap-2">
                  #{order.order_code}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-sans font-semibold border ${
                    order.status === 'completed' ? 'border-circuit-signal bg-circuit-signal/10 text-circuit-signal' :
                    order.status === 'cancelled' ? 'border-red-400/50 bg-red-400/10 text-red-400' :
                    'border-circuit-copper/50 bg-circuit-copper/10 text-circuit-copperLight'
                  }`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </p>
                <p className="text-xs text-circuit-muted mt-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-circuit-muted inline-block" />
                  {new Date(order.created_at).toLocaleString("vi-VN")}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      order.payment_status === "paid" ? "text-circuit-signal" : "text-amber-400"
                    }`}
                  >
                    {PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status}
                  </p>
                  <p className="text-[11px] text-circuit-muted mt-1 uppercase tracking-wide">
                    {order.payment_gateway === "vnpay" ? "VNPay" : "Tiền mặt (COD)"}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-circuit-line/30 flex items-center justify-center group-hover:bg-circuit-copper/20 group-hover:text-circuit-copperLight transition-colors">
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4 relative z-10 bg-circuit-bg/30 p-3 rounded-xl border border-circuit-line/30">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <p className="text-sm text-circuit-text truncate pr-4">
                    {item.product_name}
                  </p>
                  <p className="text-sm text-circuit-muted font-mono whitespace-nowrap">
                    × {item.quantity}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-end border-t border-circuit-line/60 pt-4 relative z-10">
              <span className="text-circuit-muted text-[11px] uppercase tracking-widest font-mono font-semibold">Tổng cộng</span>
              <span className="font-display text-xl text-circuit-signal font-bold drop-shadow-[0_0_8px_rgba(48,223,147,0.3)]">{formatVND(order.final_amount)}</span>
            </div>
          </Link>
        ))}
      </div>

      <SiteFooter />
    </main>
  );
}
