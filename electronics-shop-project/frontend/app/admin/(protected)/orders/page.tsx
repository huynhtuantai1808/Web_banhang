"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Loader2, Search, X, Truck, PackageCheck } from "lucide-react";
import { listAllOrders, updateOrderStatus, sendOrderInvoiceEmail, AdminOrderOut } from "@/lib/services/adminOrders";
import {
  createShipment, updateShipmentStatus, getShipmentForAdmin, ShipmentOut, ShipmentStatus,
  SUGGESTED_CARRIERS, SHIPMENT_STATUS_LABEL,
} from "@/lib/services/shipments";
import { ApiError } from "@/lib/apiClient";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xác nhận", confirmed: "Đã xác nhận", shipping: "Đang giao",
  completed: "Hoàn thành", cancelled: "Đã huỷ",
};
const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABEL);

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderOut[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<AdminOrderOut | null>(null);
  const [shipment, setShipment] = useState<ShipmentOut | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [emailSending, setEmailSending] = useState<"confirmation" | "invoice" | null>(null);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  async function handleSendEmail(orderId: string, type: "confirmation" | "invoice") {
    setEmailSending(type);
    setEmailMessage(null);
    try {
      const res = await sendOrderInvoiceEmail(orderId, type);
      setEmailMessage(res.message);
      setTimeout(() => setEmailMessage(null), 3000);
    } catch (err) {
      setEmailMessage(err instanceof ApiError ? err.message : "Gửi email thất bại");
    } finally {
      setEmailSending(null);
    }
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAllOrders({ keyword: keyword || undefined, status: statusFilter || undefined });
      setOrders(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function openDetail(order: AdminOrderOut) {
    setSelected(order);
    setDetailLoading(true);
    setShipment(null);
    try {
      const s = await getShipmentForAdmin(order.id);
      setShipment(s);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleUpdateOrderStatus(newStatus: string) {
    if (!selected) return;
    try {
      const updated = await updateOrderStatus(selected.id, newStatus);
      setSelected(updated);
      await fetchOrders();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    }
  }

  return (
    <main className="px-8 py-8 text-circuit-text">
      <header className="mb-6">
        <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
        <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
          <ClipboardList size={22} /> Quản lý đơn hàng
        </h1>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="flex-1 min-w-[280px] max-w-md flex items-center gap-3 rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-2.5 glass-panel focus-within:border-circuit-copper focus-within:shadow-glow transition-all">
          <Search size={18} className="text-circuit-muted" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
            placeholder="Tìm theo mã đơn, tên, SĐT..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-circuit-muted/70 text-circuit-text"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-2.5 text-sm text-circuit-text glass-panel outline-none focus:border-circuit-copper transition-colors cursor-pointer"
        >
          <option value="">Tất cả trạng thái</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl glass-panel border border-circuit-line/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-circuit-bg/60 text-circuit-copperLight font-mono text-[11px] uppercase tracking-widest border-b border-circuit-line/60">
              <tr>
                <th className="text-left px-6 py-4 font-semibold">Mã đơn</th>
                <th className="text-left px-6 py-4 font-semibold">Khách hàng</th>
                <th className="text-right px-6 py-4 font-semibold">Tổng tiền</th>
                <th className="text-left px-6 py-4 font-semibold">Thanh toán</th>
                <th className="text-left px-6 py-4 font-semibold">Trạng thái</th>
                <th className="text-left px-6 py-4 font-semibold">Ngày đặt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-circuit-line/40">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-circuit-muted">
                  <Loader2 className="inline animate-spin mr-2" size={18} /> Đang tải...
                </td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-circuit-muted font-mono">Không có đơn hàng nào.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => openDetail(o)}
                    className="hover:bg-circuit-bg/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4 font-mono text-circuit-text font-semibold group-hover:text-circuit-copperLight transition-colors">#{o.order_code}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-circuit-text">{o.customer_name}</p>
                      <p className="text-xs text-circuit-muted/80 mt-0.5">{o.customer_phone}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-circuit-signal drop-shadow-[0_0_8px_rgba(48,223,147,0.2)]">{formatVND(o.final_amount)}</td>
                    <td className="px-6 py-4">
                      <p className={`text-xs font-semibold uppercase tracking-wider ${o.payment_status === "paid" ? "text-circuit-signal" : o.payment_status === "failed" ? "text-red-400" : "text-amber-400"}`}>
                        {o.payment_status === "paid" ? "Đã TT" : o.payment_status === "failed" ? "Thất bại" : "Chờ TT"}
                      </p>
                      <p className="text-[10px] text-circuit-muted uppercase tracking-widest mt-1">{o.payment_gateway === "vnpay" ? "VNPay" : "COD"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-widest border ${
                        o.status === 'completed' ? 'border-circuit-signal/50 bg-circuit-signal/10 text-circuit-signal' :
                        o.status === 'cancelled' ? 'border-red-400/50 bg-red-400/10 text-red-400' :
                        'border-circuit-copper/50 bg-circuit-copper/10 text-circuit-copperLight'
                      }`}>
                        {ORDER_STATUS_LABEL[o.status] || o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-circuit-muted font-mono text-xs">
                      {new Date(o.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-circuit-bg/80 backdrop-blur-md px-4 p-6">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-circuit-copper/30 bg-circuit-panel/90 shadow-[0_0_40px_rgba(200,127,69,0.15)] p-8 custom-scrollbar">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-circuit-line/60">
              <h2 className="font-display text-2xl text-circuit-text flex items-center gap-3">
                <PackageCheck size={28} className="text-circuit-copperLight" />
                #{selected.order_code}
              </h2>
              <button onClick={() => setSelected(null)} className="p-2 rounded-full hover:bg-circuit-line/50 text-circuit-muted hover:text-circuit-text transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-circuit-bg/40 p-4 rounded-xl border border-circuit-line/40">
                <p className="text-[11px] font-mono text-circuit-copperLight uppercase tracking-widest font-semibold mb-2">Khách hàng</p>
                <p className="text-circuit-text font-medium">{selected.customer_name}</p>
                <p className="text-sm text-circuit-muted mt-1">{selected.customer_phone}</p>
              </div>
              <div className="bg-circuit-bg/40 p-4 rounded-xl border border-circuit-line/40">
                <p className="text-[11px] font-mono text-circuit-copperLight uppercase tracking-widest font-semibold mb-2">Giao hàng đến</p>
                <p className="text-sm text-circuit-muted leading-relaxed">{selected.shipping_address}</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-[11px] font-mono text-circuit-copperLight uppercase tracking-widest font-semibold mb-3">Sản phẩm ({selected.items.length})</p>
              <div className="space-y-2 bg-circuit-bg/30 p-4 rounded-xl border border-circuit-line/30">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-2 border-b border-circuit-line/40 last:border-0 last:pb-0">
                    <span className="text-circuit-text font-medium">{item.product_name} <span className="text-circuit-muted font-mono ml-1">× {item.quantity}</span></span>
                    <span className="text-circuit-text font-mono font-semibold">{formatVND(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-end font-display pt-4 mt-2 px-2">
                <span className="text-lg text-circuit-text">Tổng thanh toán</span>
                <span className="text-2xl text-circuit-signal font-bold drop-shadow-[0_0_8px_rgba(48,223,147,0.3)]">{formatVND(selected.final_amount)}</span>
              </div>
            </div>

            {/* Cập nhật trạng thái đơn hàng */}
            <div className="mb-8 p-5 rounded-2xl border border-circuit-copper/20 bg-circuit-copper/5">
              <p className="text-[11px] font-mono text-circuit-copperLight uppercase tracking-widest font-semibold mb-3">Cập nhật trạng thái</p>
              <div className="flex flex-wrap gap-3">
                {ORDER_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleUpdateOrderStatus(s)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all duration-300 hover:scale-[1.02] ${
                      selected.status === s
                        ? "border-circuit-copper bg-circuit-copper text-circuit-bg shadow-glow"
                        : "border-circuit-line/60 bg-circuit-panel text-circuit-muted hover:border-circuit-copper/60 hover:text-circuit-copperLight"
                    }`}
                  >
                    {ORDER_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Hành động */}
            <div className="mb-8 p-5 rounded-2xl border border-circuit-signal/20 bg-circuit-signal/5">
              <p className="text-[11px] font-mono text-circuit-signal uppercase tracking-widest font-semibold mb-3">Gửi Email Cho Khách</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleSendEmail(selected.id, "confirmation")}
                  disabled={emailSending !== null}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border border-circuit-copper bg-circuit-copper/10 text-circuit-copperLight hover:bg-circuit-copper/20 transition-all duration-300 disabled:opacity-50"
                >
                  {emailSending === "confirmation" ? <Loader2 size={14} className="animate-spin" /> : null}
                  Gửi Xác Nhận Đơn
                </button>
                <button
                  onClick={() => handleSendEmail(selected.id, "invoice")}
                  disabled={emailSending !== null}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border border-circuit-signal bg-circuit-signal/10 text-circuit-signal hover:bg-circuit-signal/20 transition-all duration-300 disabled:opacity-50"
                >
                  {emailSending === "invoice" ? <Loader2 size={14} className="animate-spin" /> : null}
                  Gửi Hóa Đơn Điện Tử
                </button>
              </div>
              {emailMessage && (
                <p className={`mt-3 text-xs p-2 rounded ${emailMessage.includes("thất bại") ? "bg-red-400/10 text-red-400 border border-red-400/20" : "bg-circuit-signal/10 text-circuit-signal border border-circuit-signal/20"}`}>
                  {emailMessage}
                </p>
              )}
            </div>

            {/* Vận chuyển */}
            <div>
              <p className="text-[11px] font-mono text-circuit-copperLight uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
                <Truck size={16} /> Thông tin vận chuyển
              </p>
              <div className="p-5 rounded-2xl bg-circuit-bg/40 border border-circuit-line/50">
                {detailLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="animate-spin text-circuit-copperLight" size={24} /></div>
                ) : shipment ? (
                  <ShipmentStatusEditor
                    shipment={shipment}
                    onUpdated={(s) => setShipment(s)}
                  />
                ) : (
                  <CreateShipmentForm orderId={selected.id} onCreated={(s) => setShipment(s)} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CreateShipmentForm({ orderId, onCreated }: { orderId: string; onCreated: (s: ShipmentOut) => void }) {
  const [carrier, setCarrier] = useState(SUGGESTED_CARRIERS[0]);
  const [trackingCode, setTrackingCode] = useState("");
  const [fee, setFee] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const s = await createShipment(orderId, { carrier, tracking_code: trackingCode || undefined, shipping_fee: fee });
      onCreated(s);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo vận đơn thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20">{error}</p>}
      <select
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper transition-colors cursor-pointer"
      >
        {SUGGESTED_CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        value={trackingCode}
        onChange={(e) => setTrackingCode(e.target.value)}
        placeholder="Mã vận đơn (nếu có)"
        className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper transition-colors focus:shadow-[0_0_10px_rgba(200,127,69,0.15)]"
      />
      <input
        type="number"
        min={0}
        value={fee}
        onChange={(e) => setFee(Number(e.target.value))}
        placeholder="Phí vận chuyển"
        className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper transition-colors focus:shadow-[0_0_10px_rgba(200,127,69,0.15)]"
      />
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-circuit-copper py-3 text-sm font-bold text-circuit-bg hover:bg-circuit-copperLight transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 size={16} className="animate-spin" />} TẠO VẬN ĐƠN
      </button>
    </form>
  );
}

function ShipmentStatusEditor({
  shipment, onUpdated,
}: {
  shipment: ShipmentOut;
  onUpdated: (s: ShipmentOut) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statuses: ShipmentStatus[] = ["pending", "picked_up", "in_transit", "delivered", "failed", "returned"];

  async function handleChange(status: ShipmentStatus) {
    setUpdating(true);
    setError(null);
    try {
      const updated = await updateShipmentStatus(shipment.id, status);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-circuit-text flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-circuit-copper inline-block" />
        {shipment.carrier} {shipment.tracking_code && <span className="text-circuit-muted font-mono bg-circuit-bg/50 px-2 py-0.5 rounded text-xs ml-2 border border-circuit-line/30">{shipment.tracking_code}</span>}
      </p>
      {error && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            disabled={updating}
            onClick={() => handleChange(s)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-widest border transition-all duration-300 disabled:opacity-50 hover:scale-[1.02] ${
              shipment.status === s
                ? "border-circuit-signal bg-circuit-signal text-circuit-bg shadow-[0_0_10px_rgba(48,223,147,0.3)]"
                : "border-circuit-line/60 bg-circuit-bg/50 text-circuit-muted hover:border-circuit-copper/60 hover:text-circuit-copperLight"
            }`}
          >
            {SHIPMENT_STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-0 relative before:absolute before:inset-0 before:ml-[5px] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-circuit-line/60 before:to-transparent">
        {[...shipment.logs].reverse().map((log, i) => (
          <div key={i} className="relative flex items-center mb-3 last:mb-0 group">
            <div className={`flex items-center justify-center w-3 h-3 rounded-full border-2 bg-circuit-bg z-10 shrink-0 ${
                i === 0 ? "border-circuit-signal shadow-[0_0_8px_rgba(48,223,147,0.5)]" : "border-circuit-line/60"
              }`}
            />
            <div className="ml-4 p-3 rounded-xl border border-circuit-line/30 bg-circuit-bg/30 flex-1">
              <p className={`font-semibold text-xs mb-1 ${i === 0 ? 'text-circuit-signal' : 'text-circuit-text'}`}>
                {SHIPMENT_STATUS_LABEL[log.status]}
              </p>
              <p className="text-[11px] text-circuit-muted font-mono">
                {new Date(log.created_at).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
