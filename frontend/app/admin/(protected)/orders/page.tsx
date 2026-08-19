"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Loader2, Search, X, Truck, PackageCheck } from "lucide-react";
import { listAllOrders, updateOrderStatus, AdminOrderOut } from "@/lib/services/adminOrders";
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

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await listAllOrders({ keyword: keyword || undefined, status: statusFilter || undefined }));
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

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 rounded-full border border-circuit-line bg-circuit-panel px-4 py-2 max-w-xs">
          <Search size={16} className="text-circuit-muted" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
            placeholder="Tìm theo mã đơn, tên, SĐT..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-circuit-muted"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-circuit-line bg-circuit-panel px-3 py-2 text-sm text-circuit-text"
        >
          <option value="">Tất cả trạng thái</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-circuit-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-circuit-panel text-circuit-muted font-mono text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Mã đơn</th>
              <th className="text-left px-4 py-3">Khách hàng</th>
              <th className="text-right px-4 py-3">Tổng tiền</th>
              <th className="text-left px-4 py-3">Thanh toán</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-left px-4 py-3">Ngày đặt</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-circuit-muted">
                <Loader2 className="inline animate-spin mr-2" size={16} /> Đang tải...
              </td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-circuit-muted">Không có đơn hàng nào.</td></tr>
            ) : (
              orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => openDetail(o)}
                  className="border-t border-circuit-line hover:bg-circuit-panel/60 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-circuit-copperLight">{o.order_code}</td>
                  <td className="px-4 py-3">
                    <p>{o.customer_name}</p>
                    <p className="text-xs text-circuit-muted">{o.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatVND(o.final_amount)}</td>
                  <td className="px-4 py-3 text-circuit-muted text-xs">
                    {o.payment_status === "paid" ? "Đã TT" : o.payment_status === "failed" ? "Thất bại" : "Chờ TT"}
                    {" · "}{o.payment_gateway === "vnpay" ? "VNPay" : "COD"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-circuit-line text-circuit-muted">
                      {ORDER_STATUS_LABEL[o.status] || o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-circuit-muted text-xs">
                    {new Date(o.created_at).toLocaleDateString("vi-VN")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-circuit-line bg-circuit-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-circuit-text">{selected.order_code}</h2>
              <button onClick={() => setSelected(null)} className="text-circuit-muted hover:text-circuit-text">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-1 text-sm mb-4">
              <p className="text-circuit-muted">{selected.customer_name} — {selected.customer_phone}</p>
              <p className="text-circuit-muted">{selected.shipping_address}</p>
            </div>

            <div className="space-y-1 mb-4 border-t border-circuit-line pt-3">
              {selected.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.product_name} × {item.quantity}</span>
                  <span className="text-circuit-muted font-mono">{formatVND(item.unit_price * item.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between font-display text-circuit-signal pt-2 border-t border-circuit-line mt-2">
                <span>Tổng cộng</span>
                <span>{formatVND(selected.final_amount)}</span>
              </div>
            </div>

            {/* Cập nhật trạng thái đơn hàng */}
            <div className="mb-5">
              <p className="text-xs font-mono text-circuit-muted uppercase mb-2">Trạng thái đơn hàng</p>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleUpdateOrderStatus(s)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      selected.status === s
                        ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight"
                        : "border-circuit-line text-circuit-muted hover:border-circuit-copper"
                    }`}
                  >
                    {ORDER_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Vận chuyển */}
            <div className="border-t border-circuit-line pt-4">
              <p className="text-xs font-mono text-circuit-muted uppercase mb-2 flex items-center gap-1.5">
                <Truck size={13} /> Vận chuyển
              </p>
              {detailLoading ? (
                <Loader2 className="animate-spin text-circuit-muted" size={16} />
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
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && <p className="text-xs text-red-300">{error}</p>}
      <select
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        className="w-full rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text"
      >
        {SUGGESTED_CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        value={trackingCode}
        onChange={(e) => setTrackingCode(e.target.value)}
        placeholder="Mã vận đơn (nếu có)"
        className="w-full rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
      />
      <input
        type="number"
        min={0}
        value={fee}
        onChange={(e) => setFee(Number(e.target.value))}
        placeholder="Phí vận chuyển"
        className="w-full rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
      />
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-circuit-copper py-2 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 size={14} className="animate-spin" />} Tạo vận đơn
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
    <div className="space-y-2">
      <p className="text-sm text-circuit-text">
        {shipment.carrier} {shipment.tracking_code && `— ${shipment.tracking_code}`}
      </p>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            disabled={updating}
            onClick={() => handleChange(s)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors disabled:opacity-50 ${
              shipment.status === s
                ? "border-circuit-signal bg-circuit-signal/15 text-circuit-signal"
                : "border-circuit-line text-circuit-muted hover:border-circuit-copper"
            }`}
          >
            {SHIPMENT_STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="mt-2 space-y-1">
        {shipment.logs.map((log, i) => (
          <p key={i} className="text-xs text-circuit-muted flex items-center gap-1.5">
            <PackageCheck size={11} /> {SHIPMENT_STATUS_LABEL[log.status]} —{" "}
            {new Date(log.created_at).toLocaleString("vi-VN")}
          </p>
        ))}
      </div>
    </div>
  );
}
