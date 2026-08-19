"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, Package } from "lucide-react";
import { lookupOrder, OrderOut } from "@/lib/services/orders";
import { ApiError } from "@/lib/apiClient";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xác nhận", confirmed: "Đã xác nhận", shipping: "Đang giao",
  completed: "Hoàn thành", cancelled: "Đã huỷ",
};

export default function OrderLookupPage() {
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderOut | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const data = await lookupOrder(orderCode.trim(), phone.trim());
      setOrder(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tìm thấy đơn hàng");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <SiteHeader />

      <Link href="/" className="inline-flex items-center gap-2 text-sm text-circuit-muted hover:text-circuit-copperLight mb-6">
        <ArrowLeft size={16} /> Về trang chủ
      </Link>

      <h1 className="font-display text-2xl text-circuit-text mb-2 flex items-center gap-2">
        <Package size={22} /> Tra cứu đơn hàng
      </h1>
      <p className="text-sm text-circuit-muted mb-6">
        Dành cho đơn đặt hàng không cần tài khoản — nhập đúng mã đơn và số điện thoại đã dùng lúc
        đặt hàng để xem tình trạng đơn.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3 mb-8">
        <input
          required
          value={orderCode}
          onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
          placeholder="Mã đơn hàng (VD: DH00000012)"
          className="w-full rounded-md border border-circuit-line bg-circuit-panel px-3 py-2.5 text-sm text-circuit-text outline-none focus:border-circuit-copper"
        />
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Số điện thoại đã dùng lúc đặt hàng"
          className="w-full rounded-md border border-circuit-line bg-circuit-panel px-3 py-2.5 text-sm text-circuit-text outline-none focus:border-circuit-copper"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Tra cứu
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300 mb-6">
          {error}
        </div>
      )}

      {order && (
        <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-circuit-copperLight">{order.order_code}</p>
            <span className="px-2 py-1 rounded-full text-xs bg-circuit-line text-circuit-muted">
              {STATUS_LABEL[order.status] || order.status}
            </span>
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
        </div>
      )}

      <SiteFooter />
    </main>
  );
}
